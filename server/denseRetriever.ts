import { GoogleGenAI } from '@google/genai';
import { TextChunk } from './types.js';

export class DenseRetriever {
  private chunks: TextChunk[] = [];
  private ai: GoogleGenAI | null = null;
  private hasApiKey: boolean = false;
  private embeddings: number[][] = [];

  constructor() {
    const apiKey = (process.env.GEMINI_API_KEY || '').replace(/['"]/g, '').trim();
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.length > 20) {
      try {
        this.ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        this.hasApiKey = true;
      } catch (err) {
        console.warn('Could not initialize GoogleGenAI for embeddings, using fallback:', err);
      }
    }
  }

  // Fallback high-dimensional semantic hash vector (128 dimensions)
  // Encodes character n-grams, semantic clusters (aerospace, radiation, materials, propulsion, life support)
  private computeSemanticVector(text: string): number[] {
    const dim = 128;
    const vec = new Array(dim).fill(0);
    const normalized = text.toLowerCase();

    // Semantic concept clusters
    const clusters: Record<string, string[]> = {
      radiation: ['radiation', 'cosmic', 'gcr', 'hze', 'ionizing', 'msv', 'pel', 'dose', 'sickness', 'cancer', 'biological'],
      shielding: ['shielding', 'shield', 'regolith', 'polyethylene', 'water', 'mass', 'density', 'passive', 'blocks', 'backfill'],
      habitat: ['habitat', 'base', 'living', 'quarters', 'inflatable', 'surface', 'structure', 'crew', 'modules'],
      propulsion: ['propulsion', 'transit', 'ntp', 'nuclear', 'thermal', 'chemical', 'engine', 'speed', 'duration', 'flight', 'days', 'retropropulsion'],
      life_support: ['oxygen', 'air', 'moxie', 'sabatier', 'eclss', 'co2', 'electrolysis', 'thermal', 'radiator', 'breathing', 'water'],
      edl: ['edl', 'entry', 'descent', 'landing', 'hiad', 'supersonic', 'hypersonic', 'deceleration', 'mach', 'retropropulsion', 'heat flux'],
      mars_geography: ['martian', 'mars', 'surface', 'atmosphere', 'planet', 'soil', 'regolith', 'subsurface']
    };

    let clusterOffset = 0;
    for (const [_, words] of Object.entries(clusters)) {
      for (const word of words) {
        if (normalized.includes(word)) {
          vec[clusterOffset % dim] += 2.5;
          vec[(clusterOffset + 1) % dim] += 1.5;
          vec[(clusterOffset + 7) % dim] += 1.0;
        }
      }
      clusterOffset += 16;
    }

    // Substring n-gram hashing
    for (let i = 0; i < normalized.length - 2; i++) {
      const trigram = normalized.substring(i, i + 3);
      let hash = 0;
      for (let j = 0; j < trigram.length; j++) {
        hash = (hash << 5) - hash + trigram.charCodeAt(j);
        hash |= 0;
      }
      const index = Math.abs(hash) % dim;
      vec[index] += 1.0;
    }

    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        vec[i] /= norm;
      }
    }
    return vec;
  }

  public async embedText(text: string): Promise<number[]> {
    if (this.hasApiKey && this.ai) {
      try {
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Embed timeout')), 3000)
        );
        const apiPromise = this.ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: text,
        });
        const response: any = await Promise.race([apiPromise, timeoutPromise]);
        if (response?.embeddings?.[0]?.values) {
          return response.embeddings[0].values;
        }
        if (response?.embedding?.values) {
          return response.embedding.values;
        }
      } catch (err) {
        // Graceful fallback to deterministic high-dimensional vector
      }
    }
    return this.computeSemanticVector(text);
  }

  public async index(chunks: TextChunk[]) {
    this.chunks = chunks;
    this.embeddings = [];

    for (const chunk of chunks) {
      const fullText = `${chunk.sectionHeader}\n${chunk.content}`;
      const emb = await this.embedText(fullText);
      chunk.embedding = emb;
      this.embeddings.push(emb);
    }
  }

  public cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    if (denom === 0) return 0;
    return dot / denom;
  }

  public async score(query: string): Promise<{ chunkIndex: number; score: number }[]> {
    if (this.chunks.length === 0) return [];
    const queryEmb = await this.embedText(query);

    return this.chunks.map((_, i) => {
      const chunkEmb = this.embeddings[i] || this.computeSemanticVector(this.chunks[i].content);
      const sim = this.cosineSimilarity(queryEmb, chunkEmb);
      // Map to positive [0, 1] range
      const normalizedScore = Math.max(0, (sim + 1) / 2);
      return {
        chunkIndex: i,
        score: normalizedScore,
      };
    });
  }
}
