import { BM25Retriever } from './bm25.js';
import { DenseRetriever } from './denseRetriever.js';
import { ScoredChunk, TextChunk } from './types.js';

export class HybridRetriever {
  private bm25: BM25Retriever;
  private dense: DenseRetriever;
  private chunks: TextChunk[] = [];

  constructor() {
    this.bm25 = new BM25Retriever();
    this.dense = new DenseRetriever();
  }

  public async index(chunks: TextChunk[]) {
    this.chunks = chunks;
    this.bm25.index(chunks);
    await this.dense.index(chunks);
  }

  public async search(
    query: string,
    topK: number = 3,
    alpha: number = 0.5 // 0.0 = BM25 only, 1.0 = Dense only, 0.5 = Balanced Hybrid
  ): Promise<ScoredChunk[]> {
    if (this.chunks.length === 0) return [];

    // 1. BM25 Sparse Search
    const bm25RawResults = this.bm25.score(query);
    // Sort descending to assign BM25 ranks
    const bm25Sorted = [...bm25RawResults].sort((a, b) => b.score - a.score);
    const bm25RankMap = new Map<number, number>();
    bm25Sorted.forEach((item, rankIdx) => {
      bm25RankMap.set(item.chunkIndex, rankIdx + 1);
    });

    // 2. Dense Vector Semantic Search
    const denseRawResults = await this.dense.score(query);
    // Sort descending to assign Dense ranks
    const denseSorted = [...denseRawResults].sort((a, b) => b.score - a.score);
    const denseRankMap = new Map<number, number>();
    denseSorted.forEach((item, rankIdx) => {
      denseRankMap.set(item.chunkIndex, rankIdx + 1);
    });

    // 3. Min-Max Normalization for scores
    const maxBm25 = Math.max(...bm25RawResults.map(r => r.score), 0.0001);
    const minBm25 = Math.min(...bm25RawResults.map(r => r.score), 0);
    const bm25Range = maxBm25 - minBm25 || 1;

    const maxDense = Math.max(...denseRawResults.map(r => r.score), 0.0001);
    const minDense = Math.min(...denseRawResults.map(r => r.score), 0);
    const denseRange = maxDense - minDense || 1;

    // 4. Reciprocal Rank Fusion (RRF) & Weighted Hybrid Scoring
    const RRF_K = 60;
    const scoredChunks: ScoredChunk[] = [];

    for (let i = 0; i < this.chunks.length; i++) {
      const bm25Item = bm25RawResults.find(r => r.chunkIndex === i);
      const denseItem = denseRawResults.find(r => r.chunkIndex === i);

      const rawBm25Score = bm25Item ? bm25Item.score : 0;
      const rawDenseScore = denseItem ? denseItem.score : 0;
      const matchedKeywords = bm25Item ? bm25Item.matchedKeywords : [];

      const normBm25 = Math.max(0, (rawBm25Score - minBm25) / bm25Range);
      const normDense = Math.max(0, (rawDenseScore - minDense) / denseRange);

      const bm25Rank = bm25RankMap.get(i) || (this.chunks.length + 1);
      const denseRank = denseRankMap.get(i) || (this.chunks.length + 1);

      // RRF formula
      const rrfBm25 = (1 - alpha) / (RRF_K + bm25Rank);
      const rrfDense = alpha / (RRF_K + denseRank);
      const rrfScore = rrfBm25 + rrfDense;

      // Linear combination of normalized scores
      const linearScore = (1 - alpha) * normBm25 + alpha * normDense;

      // Hybrid blended metric
      const hybridScore = Number((0.6 * linearScore + 0.4 * (rrfScore * 30)).toFixed(4));

      scoredChunks.push({
        chunk: this.chunks[i],
        bm25Score: Number(rawBm25Score.toFixed(3)),
        bm25Rank,
        vectorScore: Number(rawDenseScore.toFixed(3)),
        vectorRank: denseRank,
        hybridScore,
        combinedRank: 0,
        matchedKeywords
      });
    }

    // Sort by hybrid score descending
    scoredChunks.sort((a, b) => b.hybridScore - a.hybridScore);

    // Assign combined rank
    scoredChunks.forEach((item, idx) => {
      item.combinedRank = idx + 1;
    });

    return scoredChunks.slice(0, topK);
  }

  public getBM25Only(query: string, topK: number = 3): ScoredChunk[] {
    const rawResults = this.bm25.score(query);
    const sorted = [...rawResults].sort((a, b) => b.score - a.score);
    return sorted.slice(0, topK).map((item, idx) => ({
      chunk: this.chunks[item.chunkIndex],
      bm25Score: Number(item.score.toFixed(3)),
      bm25Rank: idx + 1,
      vectorScore: 0,
      vectorRank: 0,
      hybridScore: Number(item.score.toFixed(3)),
      combinedRank: idx + 1,
      matchedKeywords: item.matchedKeywords
    }));
  }

  public async getDenseOnly(query: string, topK: number = 3): Promise<ScoredChunk[]> {
    const rawResults = await this.dense.score(query);
    const sorted = [...rawResults].sort((a, b) => b.score - a.score);
    return sorted.slice(0, topK).map((item, idx) => ({
      chunk: this.chunks[item.chunkIndex],
      bm25Score: 0,
      bm25Rank: 0,
      vectorScore: Number(item.score.toFixed(3)),
      vectorRank: idx + 1,
      hybridScore: Number(item.score.toFixed(3)),
      combinedRank: idx + 1,
      matchedKeywords: []
    }));
  }
}
