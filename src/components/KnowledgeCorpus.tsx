import React, { useState, useEffect } from 'react';
import { Database, Plus, Check, FileText, Hash, Layers } from 'lucide-react';

interface KnowledgeCorpusProps {
  language: 'bn' | 'en';
}

interface TechnicalDocument {
  id: string;
  documentId: string;
  title: string;
  sections: {
    id: string;
    sectionNumber: string;
    sectionName: string;
    content: string;
  }[];
}

interface TextChunk {
  id: string;
  documentId: string;
  sectionHeader: string;
  content: string;
  length: number;
}

export const KnowledgeCorpus: React.FC<KnowledgeCorpusProps> = ({ language }) => {
  const isBn = language === 'bn';

  const [documents, setDocuments] = useState<TechnicalDocument[]>([]);
  const [chunks, setChunks] = useState<TextChunk[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Ingestion form state
  const [showForm, setShowForm] = useState(false);
  const [docId, setDocId] = useState('NASA-CR-2024-MARS-ISRU');
  const [sectionNum, setSectionNum] = useState('8.0');
  const [sectionName, setSectionName] = useState('Subsurface Glacial Water Extraction');
  const [content, setContent] = useState(
    'Subsurface ice deposits detected by the Mars Reconnaissance Orbiter (MRO) SHARAD radar at Utopia Planitia lie under 1 to 10 meters of dry regolith overburden. Automated Rodriguez Wells (RodWells) using heated thermal drills can melt pure glacial ice in-situ, yielding up to 350 liters of potable water per sol at an energy expenditure of 4.2 kW-hr/kg.'
  );
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  const fetchCorpus = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      setDocuments(data.documents || []);
      setChunks(data.chunks || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorpus();
  }, []);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !docId.trim()) return;

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: docId,
          sectionNumber: sectionNum,
          sectionName,
          content,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIngestStatus('New chunk successfully indexed into Hybrid vector & BM25 store!');
        fetchCorpus();
        setTimeout(() => setIngestStatus(null), 4000);
        setShowForm(false);
      }
    } catch (err: any) {
      setIngestStatus(`Ingestion failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2 mb-2">
            <Database className="w-6 h-6 text-cyan-400" />
            <span>
              {isBn ? 'নাসা টেকনিক্যাল নলেজ বেস ও ইনজেশন' : 'NASA Technical Corpus & Ingestion'}
            </span>
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            {isBn
              ? 'নাসা মার্স মিশন রিপোর্ট এবং সেকশন ভিত্তিক চাঙ্ক ডাটাবেস। আপনি চাইলে নতুন টেকনিক্যাল পেপার বা সেকশন ইনজেস্ট করে সরাসরি লাইভ রিট্রিভালে যোগ করতে পারেন।'
              : 'Indexed NASA Mars technical documentation, section chunking metadata, and live document ingestion into the hybrid BM25 and vector stores.'}
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? (isBn ? 'ফর্ম বন্ধ করুন' : 'Close Form') : (isBn ? 'নতুন টেকনিক্যাল সেকশন যোগ করুন' : 'Ingest New Section')}</span>
        </button>
      </div>

      {ingestStatus && (
        <div className="p-3.5 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2 font-mono">
          <Check className="w-4 h-4" />
          <span>{ingestStatus}</span>
        </div>
      )}

      {/* Ingestion Modal / Drawer */}
      {showForm && (
        <form onSubmit={handleIngest} className="p-5 rounded-xl border border-cyan-800 bg-slate-900/90 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
              {isBn ? 'নতুন টেকনিক্যাল ডকুমেন্ট ইনজেস্ট করুন' : 'Ingest Custom Technical Text Chunk'}
            </h3>
            <span className="text-[11px] font-mono text-cyan-400">Live Chroma & BM25 Indexing</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-mono">Document ID:</label>
              <input
                type="text"
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:border-cyan-500"
                placeholder="e.g. NASA-TM-2024-MARS-005"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-300 font-mono">Section Number:</label>
              <input
                type="text"
                value={sectionNum}
                onChange={(e) => setSectionNum(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:border-cyan-500"
                placeholder="e.g. 8.0"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-300 font-mono">Section Name:</label>
              <input
                type="text"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:border-cyan-500"
                placeholder="e.g. Subsurface Glacial Extraction"
                required
              />
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <label className="text-slate-300 font-mono">Technical Content:</label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white font-mono focus:border-cyan-500 text-xs leading-relaxed"
              placeholder="Paste or write raw NASA technical report text with parameters, units, and engineering data..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs rounded-lg border border-slate-800 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950"
            >
              Confirm & Index Chunk
            </button>
          </div>
        </form>
      )}

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs font-mono uppercase text-slate-400 block mb-1">
            Registered Documents
          </span>
          <span className="text-2xl font-mono font-bold text-white tabular-nums">
            {documents.length}
          </span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs font-mono uppercase text-slate-400 block mb-1">
            Total Text Chunks
          </span>
          <span className="text-2xl font-mono font-bold text-cyan-400 tabular-nums">
            {chunks.length}
          </span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs font-mono uppercase text-slate-400 block mb-1">
            Avg Chunk Size
          </span>
          <span className="text-2xl font-mono font-bold text-slate-300 tabular-nums">
            {chunks.length > 0
              ? Math.round(chunks.reduce((a, c) => a + c.length, 0) / chunks.length)
              : 0}{' '}
            <span className="text-xs font-normal text-slate-500">words</span>
          </span>
        </div>
      </div>

      {/* Document Chunks List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-white uppercase font-mono">
          {isBn ? 'ইনডেক্সড চাঙ্ক অডিট ট্রেইল' : 'Indexed Chunks Audit Trail'}
        </h2>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-mono">
            Loading technical chunks...
          </div>
        ) : (
          <div className="space-y-3">
            {chunks.map((chunk, idx) => (
              <div
                key={chunk.id}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 transition-colors space-y-2 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-mono border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-400">Chunk #{idx + 1}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-white font-semibold">{chunk.documentId}</span>
                  </div>
                  <span className="text-slate-400">{chunk.length} words</span>
                </div>

                <p className="font-semibold text-slate-200">{chunk.sectionHeader}</p>
                <p className="text-slate-300 font-mono text-[11px] leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  {chunk.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
