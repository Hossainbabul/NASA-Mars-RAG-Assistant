import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { CorpusLoader } from './server/corpusLoader.js';
import { HybridRetriever } from './server/hybridRetriever.js';
import { RAGEngine } from './server/ragEngine.js';
import { RAGQueryRequest, TestMatrixCase } from './server/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// 1. Initialize Corpus & Retrievers
const dataPath = path.resolve(__dirname, 'data/mars_radiation_report.txt');
const corpusLoader = new CorpusLoader(dataPath);
const hybridRetriever = new HybridRetriever();

// Index the corpus
hybridRetriever.index(corpusLoader.getChunks()).then(() => {
  console.log(`[✓] NASA Mars Technical Corpus initialized: ${corpusLoader.getChunks().length} chunks indexed.`);
});

const ragEngine = new RAGEngine(hybridRetriever);

// 2. Standard Test Matrix
const standardTestMatrix: TestMatrixCase[] = [
  {
    id: 'test_1_regolith_shielding',
    category: 'positive_in_context',
    query: 'How much Martian regolith is required for habitat shielding to stay under radiation limits?',
    queryBn: 'রেডিয়েশন লিমিটের নিচে থাকতে বাসস্থান শিল্ডিংয়ের জন্য কতটুকু মার্টিয়ান রেগোলিথ প্রয়োজন?',
    expectedBehavior: 'Answer: 3 to 5 meters of compressed Martian regolith. Citation: SECTION: 2.0 Habitat Design and Regolith Optimization',
    expectedBehaviorBn: 'উত্তর দেবে: ৩ থেকে ৫ মিটার regolith প্রয়োজন। Citation: SECTION: 2.0 Habitat Design',
    expectedCitation: 'SECTION: 2.0 Habitat Design and Regolith Optimization',
    shouldDecline: false,
  },
  {
    id: 'test_2_gcr_passive_materials',
    category: 'positive_in_context',
    query: 'What materials provide the highest mass-efficiency for mitigating Galactic Cosmic Rays (GCR)?',
    queryBn: 'গ্যালাকটিক কসমিক রশ্মি (GCR) প্রশমনে কোন উপাদানগুলো সর্বোচ্চ ভর-দক্ষতা প্রদান করে?',
    expectedBehavior: 'Answer: Polyethylene and water storage walls (hydrogen-dense materials). Citation: SECTION: 1.0 Galactic Cosmic Rays (GCR)',
    expectedBehaviorBn: 'উত্তর দেবে: পলিথিন এবং পানি সঞ্চয়কারী দেয়াল। Citation: SECTION: 1.0',
    expectedCitation: 'SECTION: 1.0 Galactic Cosmic Rays (GCR)',
    shouldDecline: false,
  },
  {
    id: 'test_3_ntp_transit_reduction',
    category: 'acronym_lookup',
    query: 'How does Nuclear Thermal Propulsion (NTP) shorten Mars transit duration?',
    queryBn: 'নিউক্লিয়ার থার্মাল প্রপালশন (NTP) কীভাবে মঙ্গল গ্রহের ট্রানজিট সময় কমিয়ে আনে?',
    expectedBehavior: 'Answer: Shortens transit times to roughly 100 days (versus 6-9 months chemically). Citation: SECTION: 3.0 Transit Duration Constraints',
    expectedBehaviorBn: 'উত্তর দেবে: ট্রানজিট সময় কমিয়ে প্রায় ১০০ দিনে আনে। Citation: SECTION: 3.0',
    expectedCitation: 'SECTION: 3.0 Transit Duration Constraints',
    shouldDecline: false,
  },
  {
    id: 'test_4_negative_moon_landing',
    category: 'negative_guardrail',
    query: 'When did the last human land on the Moon and who was the commander?',
    queryBn: 'কবে শেষ মানুষ চাঁদে অবতরণ করেছিল এবং কমান্ডার কে ছিলেন?',
    expectedBehavior: 'Refusal: "The provided NASA technical report does not contain information regarding this topic." (Zero Hallucination)',
    expectedBehaviorBn: 'উত্তর দেবে: "প্রদত্ত নাসা টেকনিক্যাল রিপোর্টে এই সম্পর্কিত তথ্য উল্লেখ নেই।" (হ্যালুসিনেশন রোধ)',
    shouldDecline: true,
  },
  {
    id: 'test_5_negative_external_trivia',
    category: 'negative_guardrail',
    query: 'What is the recipe for chocolate chip cookies or who won the World Cup?',
    queryBn: 'চকলেট চিপ কুকি তৈরির রেসিপি কী বা বিশ্বকাপ কে জিতেছিল?',
    expectedBehavior: 'Refusal: Immediate decline triggered by guardrail relevance filter.',
    expectedBehaviorBn: 'প্রত্যাখ্যান: স্ট্রিক্ট গার্ডরেইলের কারণে তৎক্ষণাৎ ডিক্লাইন করা হবে।',
    shouldDecline: true,
  },
];

// 3. API Endpoints
// Status
app.get('/api/system-status', (req, res) => {
  res.json({
    status: 'ONLINE',
    model: 'gemini-3.8-flash',
    documentsCount: corpusLoader.getDocuments().length,
    chunksCount: corpusLoader.getChunks().length,
    retriever: 'BM25Okapi + DenseVector (Hybrid RRF)',
    guardrail: 'Strict Verification & Zero-Hallucination Fallback',
    corpusFile: 'data/mars_radiation_report.txt',
  });
});

// Query
app.post('/api/query', async (req, res) => {
  try {
    const params: RAGQueryRequest = req.body;
    if (!params.query || typeof params.query !== 'string') {
      res.status(400).json({ error: 'Query text is required' });
      return;
    }
    const result = await ragEngine.answerQuery(params);
    res.json(result);
  } catch (err: any) {
    console.error('Error in /api/query:', err);
    res.status(500).json({ error: err.message || 'Internal RAG error' });
  }
});

// Search Compare (Pure BM25 vs Pure Dense vs Hybrid RRF)
app.post('/api/search-compare', async (req, res) => {
  try {
    const { query, topK = 3, alpha = 0.5 } = req.body;
    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    const bm25Results = hybridRetriever.getBM25Only(query, topK);
    const denseResults = await hybridRetriever.getDenseOnly(query, topK);
    const hybridResults = await hybridRetriever.search(query, topK, alpha);

    res.json({
      query,
      bm25: bm25Results,
      dense: denseResults,
      hybrid: hybridResults,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Documents & Chunks
app.get('/api/documents', (req, res) => {
  res.json({
    documents: corpusLoader.getDocuments(),
    chunks: corpusLoader.getChunks(),
  });
});

// Dynamic Ingestion
app.post('/api/ingest', async (req, res) => {
  try {
    const { documentId, sectionNumber, sectionName, content } = req.body;
    if (!content || !documentId) {
      res.status(400).json({ error: 'documentId and content are required' });
      return;
    }

    const newChunk = corpusLoader.addChunk(
      documentId,
      sectionNumber || '1.0',
      sectionName || 'Custom Note',
      content
    );

    // Re-index
    await hybridRetriever.index(corpusLoader.getChunks());

    res.json({
      success: true,
      message: 'New technical chunk successfully indexed into Chroma & BM25 corpus',
      chunk: newChunk,
      totalChunks: corpusLoader.getChunks().length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test Matrix Cases
app.get('/api/test-matrix', (req, res) => {
  res.json({
    testCases: standardTestMatrix,
  });
});

// Run Test Matrix
app.post('/api/test-matrix/run', async (req, res) => {
  try {
    const results = await Promise.all(
      standardTestMatrix.map(async (testCase) => {
        const response = await ragEngine.answerQuery({
          query: testCase.query,
          topK: 3,
          alpha: 0.5,
          strictGuardrail: true,
        });

        const passed = testCase.shouldDecline
          ? response.guardrailTriggered
          : !response.guardrailTriggered && (response.citation !== null || response.answer.length > 20);

        return {
          testCase,
          response,
          passed,
        };
      })
    );

    res.json({
      total: standardTestMatrix.length,
      passedCount: results.filter(r => r.passed).length,
      results,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Python Sources export (for user review and Streamlit local execution)
app.get('/api/python-sources', (req, res) => {
  res.json({
    requirements: `streamlit>=1.35.0
chromadb>=0.5.0
langchain>=0.2.0
langchain-community>=0.2.0
langchain-openai>=0.1.0
rank_bm25>=0.2.2
python-dotenv>=1.0.1
sentence-transformers>=3.0.0`,
    data_mars_radiation: `DOCUMENT_ID: NASA-TM-2023-MARS-001
TITLE: Radiation Shielding Strategies for Human Missions to Mars
SECTION: 1.0 Galactic Cosmic Rays (GCR)
Cosmic radiation represents one of the most critical health risks for astronauts traveling to Mars. Unshielded exposure to Galactic Cosmic Rays (GCR) can result in acute radiation sickness, cumulative cancer risk, and central nervous system damage. Passive shielding using hydrogen-dense materials such as polyethylene and water storage walls provides the highest mass-efficiency for mitigating high-Z and high-energy (HZE) ions.

SECTION: 2.0 Habitat Design and Regolith Optimization
Upon arrival at the Martian surface, utilizing in-situ resources is vital. Martian regolith can be processed into protective blocks or used as backfill over inflatable habitation modules. A minimum thickness of 3 to 5 meters of compressed Martian regolith is required to lower annual ionizing radiation exposure below NASA's career permissible exposure limits (PEL) of 600 mSv.

SECTION: 3.0 Transit Duration Constraints
Using conventional chemical propulsion, transit times to Mars range between 6 to 9 months each way. Nuclear Thermal Propulsion (NTP) is evaluated as a potential risk-reduction technology capable of shortening transit times to roughly 100 days, substantially minimizing overall GCR exposure for the crew during flight.`,
    ingest_py: `import os
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

DATA_PATH = "data/mars_radiation_report.txt"
CHROMA_PATH = "chroma_db"

def run_ingestion():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Missing {DATA_PATH}. Please create the file first.")

    print(f"[*] Ingesting document from: {DATA_PATH}")
    loader = TextLoader(DATA_PATH, encoding="utf-8")
    documents = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=350,
        chunk_overlap=50,
        separators=["\\n\\n", "SECTION: ", "\\n", " "]
    )
    chunks = text_splitter.split_documents(documents)
    print(f"[*] Total chunks created: {len(chunks)}")

    embedding_model = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embedding_model,
        persist_directory=CHROMA_PATH
    )
    print(f"[✓] Successfully stored in Chroma DB at: {CHROMA_PATH}")

if __name__ == "__main__":
    run_ingestion()`,
    hybrid_retriever_py: `import os
from rank_bm25 import BM25Okapi
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

CHROMA_PATH = "chroma_db"

class HybridRetriever:
    def __init__(self):
        self.embedding_model = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        self.vector_store = Chroma(
            persist_directory=CHROMA_PATH,
            embedding_function=self.embedding_model
        )
        all_docs = self.vector_store.get()
        self.corpus = all_docs["documents"]
        self.metadatas = all_docs["metadatas"]
        
        tokenized_corpus = [doc.lower().split() for doc in self.corpus]
        self.bm25 = BM25Okapi(tokenized_corpus)

    def search(self, query: str, top_k: int = 3) -> list[dict]:
        vector_results = self.vector_store.similarity_search_with_relevance_scores(query, k=top_k)
        tokenized_query = query.lower().split()
        bm25_scores = self.bm25.get_scores(tokenized_query)
        top_bm25_indices = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)[:top_k]
        
        combined_results = []
        for doc, score in vector_results:
            combined_results.append({
                "content": doc.page_content,
                "score": float(score),
                "type": "vector"
            })
            
        for idx in top_bm25_indices:
            if bm25_scores[idx] > 0.1:
                combined_results.append({
                    "content": self.corpus[idx],
                    "score": float(bm25_scores[idx]),
                    "type": "bm25"
                })

        unique_results = {}
        for res in combined_results:
            text = res["content"]
            if text not in unique_results:
                unique_results[text] = res
                
        return list(unique_results.values())[:top_k]`,
    rag_engine_py: `import os
from dotenv import load_dotenv
from openai import OpenAI
from hybrid_retriever import HybridRetriever

load_dotenv()

SYSTEM_PROMPT = """You are the NASA Mars Mission Technical Research Assistant.
Your task is to answer user questions strictly based on the provided context.

CRITICAL OPERATIONAL RULES:
1. STRICT TRUTHFULNESS: If the provided context does NOT contain enough explicit technical facts to answer the question, you MUST refuse to answer. Respond with: "প্রদত্ত নাসা টেকনিক্যাল রিপোর্টে এই সম্পর্কিত তথ্য উল্লেখ নেই।"
2. NO HALLUCINATION: Never use outside knowledge or assumptions.
3. CITATION: If you answer, you MUST explicitly cite the specific SECTION or DOCUMENT_ID from the context at the end of your answer.

Format:
Answer: <your concise technical answer>
Citation: <DOCUMENT_ID or SECTION referenced>
"""

class RAGEngine:
    def __init__(self):
        self.retriever = HybridRetriever()
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment or .env file.")
        self.client = OpenAI(api_key=api_key)

    def answer_query(self, query: str) -> dict:
        retrieved_items = self.retriever.search(query, top_k=3)
        if not retrieved_items:
            return {
                "answer": "প্রদত্ত নাসা টেকনিক্যাল রিপোর্টে এই সম্পর্কিত তথ্য উল্লেখ নেই।",
                "citations": [],
                "retrieved_context": []
            }

        context_str = "\\n\\n---\\n\\n".join([item["content"] for item in retrieved_items])
        user_content = f"CONTEXT:\\n{context_str}\\n\\nUSER QUESTION:\\n{query}"

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content}
            ]
        )

        return {
            "answer": response.choices[0].message.content,
            "retrieved_context": retrieved_items
        }`,
    app_py: `import streamlit as st
import os
from rag_engine import RAGEngine

st.set_page_config(page_title="NASA Mars RAG Assistant", page_icon="🚀", layout="wide")

st.title("🚀 NASA Mars Mission Research Assistant")
st.caption("A Production-grade RAG System with Hybrid Search, Fallback Guardrails & Exact Citations.")

@st.cache_resource
def load_rag_engine():
    return RAGEngine()

if not os.path.exists("chroma_db"):
    st.error("ভেক্টর ডেটাবেস পাওয়া যায়নি! অনুগ্রহ করে টার্মিনালে \`python ingest.py\` রান করুন।")
    st.stop()

engine = load_rag_engine()

query = st.text_input(
    "মার্স মিশন সম্পর্কিত টেকনিক্যাল প্রশ্ন জিজ্ঞাসা করুন:",
    placeholder="যেমন: What is the required thickness of Martian regolith to protect humans from radiation?"
)

col1, col2 = st.columns([2, 1])

if st.button("Submit Question", type="primary"):
    if not query.strip():
        st.warning("অনুগ্রহ করে একটি প্রশ্ন লিখুন।")
    else:
        with st.spinner("নাসা রিপোর্ট সার্চ এবং এনালাইসিস করা হচ্ছে..."):
            result = engine.answer_query(query)

        with col1:
            st.subheader("💡 সিস্টেম রেসপন্স")
            st.markdown(result["answer"])

        with col2:
            st.subheader("🔍 রিট্রিভড নলেজ চাঙ্কস (Audit Log)")
            for i, chunk in enumerate(result["retrieved_context"]):
                with st.expander(f"Chunk #{i+1} [Type: {chunk['type']}]"):
                    st.write(chunk["content"])`,
  });
});

// Mount Vite or static files
async function startServer() {
  const PORT = process.env.PORT || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[🚀] NASA Mars RAG Assistant server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
