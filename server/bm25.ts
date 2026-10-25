import { TextChunk } from './types.js';

export class BM25Retriever {
  private chunks: TextChunk[] = [];
  private docLengths: number[] = [];
  private avgDocLength: number = 0;
  private docFrequencies: Map<string, number> = new Map();
  private idfMap: Map<string, number> = new Map();
  private termFreqs: Map<string, number>[] = [];

  // Standard Okapi BM25 hyperparameters
  private k1: number = 1.5;
  private b: number = 0.75;

  constructor(chunks: TextChunk[] = []) {
    if (chunks.length > 0) {
      this.index(chunks);
    }
  }

  public tokenize(text: string): string[] {
    if (!text) return [];
    // Convert to lowercase, replace punctuation while keeping alphanumeric and hyphens in technical codes
    const normalized = text
      .toLowerCase()
      .replace(/[^\w\s\-\d\.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const rawTokens = normalized.split(' ');
    // Filter out common english and bangla stop words while retaining technical terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to',
      'for', 'of', 'with', 'by', 'from', 'as', 'it', 'this', 'that', 'these', 'those',
      'what', 'how', 'when', 'where', 'why', 'which', 'who', 'does', 'do', 'did', 'can',
      'কি', 'কী', 'কেমন', 'কেন', 'কোথায়', 'কখন', 'হবে', 'হয়', 'করে', 'করা', 'এবং', 'বা'
    ]);

    return rawTokens.filter(t => t.length > 1 && !stopWords.has(t));
  }

  public index(chunks: TextChunk[]) {
    this.chunks = chunks;
    this.docLengths = [];
    this.docFrequencies.clear();
    this.idfMap.clear();
    this.termFreqs = [];

    const N = chunks.length;
    let totalLength = 0;

    for (let i = 0; i < N; i++) {
      const chunk = chunks[i];
      const tokens = this.tokenize(chunk.content + ' ' + chunk.sectionHeader + ' ' + chunk.documentId);
      chunk.tokens = tokens;
      chunk.length = tokens.length;

      this.docLengths.push(tokens.length);
      totalLength += tokens.length;

      const tf = new Map<string, number>();
      const seenInDoc = new Set<string>();

      for (const token of tokens) {
        tf.set(token, (tf.get(token) || 0) + 1);
        if (!seenInDoc.has(token)) {
          seenInDoc.add(token);
          this.docFrequencies.set(token, (this.docFrequencies.get(token) || 0) + 1);
        }
      }
      this.termFreqs.push(tf);
    }

    this.avgDocLength = N > 0 ? totalLength / N : 1;

    // Calculate IDF for each term: ln((N - df + 0.5) / (df + 0.5) + 1)
    for (const [term, df] of this.docFrequencies.entries()) {
      const idf = Math.log(((N - df + 0.5) / (df + 0.5)) + 1.0);
      this.idfMap.set(term, Math.max(0.1, idf));
    }
  }

  public score(query: string): { chunkIndex: number; score: number; matchedKeywords: string[] }[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0 || this.chunks.length === 0) {
      return this.chunks.map((_, i) => ({ chunkIndex: i, score: 0, matchedKeywords: [] }));
    }

    const results: { chunkIndex: number; score: number; matchedKeywords: string[] }[] = [];

    for (let i = 0; i < this.chunks.length; i++) {
      let docScore = 0;
      const tfMap = this.termFreqs[i];
      const docLen = this.docLengths[i];
      const matched: string[] = [];

      for (const qToken of queryTokens) {
        // Direct match or substring match for technical prefixes (e.g. "regolith", "moxie", "pel")
        let count = tfMap.get(qToken) || 0;
        
        // Also check if qToken is contained in or contains any document token
        if (count === 0) {
          for (const [docToken, freq] of tfMap.entries()) {
            if (docToken.includes(qToken) || qToken.includes(docToken)) {
              count = Math.max(count, freq * 0.7);
            }
          }
        }

        if (count > 0) {
          matched.push(qToken);
          const idf = this.idfMap.get(qToken) || 0.8;
          const numerator = count * (this.k1 + 1);
          const denominator = count + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLength));
          docScore += idf * (numerator / denominator);
        }
      }

      results.push({
        chunkIndex: i,
        score: docScore,
        matchedKeywords: Array.from(new Set(matched))
      });
    }

    return results;
  }
}
