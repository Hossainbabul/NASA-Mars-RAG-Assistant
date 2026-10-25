export interface TechnicalDocument {
  id: string;
  documentId: string;
  title: string;
  sections: TechnicalSection[];
}

export interface TechnicalSection {
  id: string;
  documentId: string;
  title: string;
  sectionNumber: string;
  sectionName: string;
  content: string;
}

export interface TextChunk {
  id: string;
  documentId: string;
  sectionId: string;
  sectionHeader: string;
  content: string;
  tokens: string[];
  embedding?: number[];
  length: number;
}

export interface ScoredChunk {
  chunk: TextChunk;
  bm25Score: number;
  bm25Rank: number;
  vectorScore: number;
  vectorRank: number;
  hybridScore: number;
  combinedRank: number;
  matchedKeywords: string[];
}

export interface RAGQueryRequest {
  query: string;
  topK?: number;
  alpha?: number; // 0 = BM25 only, 1 = Dense only, 0.5 = Balanced Hybrid
  strictGuardrail?: boolean;
  minRelevanceThreshold?: number;
  language?: 'bn' | 'en';
}

export interface RAGQueryResponse {
  query: string;
  answer: string;
  citation: string | null;
  guardrailTriggered: boolean;
  guardrailReason?: string;
  retrievedChunks: {
    id: string;
    documentId: string;
    sectionHeader: string;
    content: string;
    bm25Score: number;
    vectorScore: number;
    hybridScore: number;
    bm25Rank: number;
    vectorRank: number;
    matchedKeywords: string[];
    type: 'bm25' | 'vector' | 'hybrid';
  }[];
  latencyMs: number;
  retrievalMode: 'hybrid' | 'dense' | 'bm25';
  alpha: number;
}

export interface TestMatrixCase {
  id: string;
  category: 'positive_in_context' | 'dense_semantic' | 'negative_guardrail' | 'acronym_lookup';
  query: string;
  queryBn: string;
  expectedBehavior: string;
  expectedBehaviorBn: string;
  expectedCitation?: string;
  shouldDecline: boolean;
}
