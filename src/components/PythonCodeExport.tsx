import React, { useState, useEffect } from 'react';
import { Code2, Copy, Check, Terminal, ExternalLink, Download } from 'lucide-react';

interface PythonCodeExportProps {
  language: 'bn' | 'en';
}

export const PythonCodeExport: React.FC<PythonCodeExportProps> = ({ language }) => {
  const isBn = language === 'bn';

  const [sources, setSources] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('app.py');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/python-sources')
      .then((res) => res.json())
      .then((data) => {
        setSources({
          'app.py': data.app_py,
          'rag_engine.py': data.rag_engine_py,
          'hybrid_retriever.py': data.hybrid_retriever_py,
          'ingest.py': data.ingest_py,
          'requirements.txt': data.requirements,
          'data/mars_radiation_report.txt': data.data_mars_radiation,
        });
      })
      .catch((err) => console.error(err));
  }, []);

  const handleCopy = () => {
    const text = sources[activeFile] || '';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZipNotice = () => {
    // Generate a simple text file download of the current active script
    const blob = new Blob([sources[activeFile] || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.replace('/', '_');
    a.click();
    URL.revokeObjectURL(url);
  };

  const files = [
    { name: 'app.py', desc: 'Streamlit Web UI' },
    { name: 'rag_engine.py', desc: 'Guardrails & LLM' },
    { name: 'hybrid_retriever.py', desc: 'BM25 + Chroma' },
    { name: 'ingest.py', desc: 'Chunking & Embeddings' },
    { name: 'data/mars_radiation_report.txt', desc: 'NASA Corpus' },
    { name: 'requirements.txt', desc: 'Dependencies' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2 mb-2">
            <Code2 className="w-6 h-6 text-cyan-400" />
            <span>
              {isBn ? 'পাইথন ও স্ট্রিমলিট সোর্স কোড (Streamlit Codebase)' : 'Python & Streamlit Source Code'}
            </span>
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            {isBn
              ? 'ট্রানস্ক্রিপ্টে বর্ণিত সম্পূর্ণ পাইথন স্ট্রিমলিট আরকিটেকচার কোড। আপনি সরাসরি এখান থেকে কপি করে আপনার লোকাল কম্পিউটারে রান করতে পারেন।'
              : 'Complete Python & Streamlit codebase implementing the Hybrid RAG architecture, Chroma vector store, BM25 Okapi, and strict prompt guardrails.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-800 bg-slate-900 text-slate-200 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>

          <button
            onClick={handleDownloadZipNotice}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download File</span>
          </button>
        </div>
      </div>

      {/* Terminal Quick Instructions */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 text-cyan-400 font-bold">
          <Terminal className="w-4 h-4" />
          <span>Local Execution Guide (লোকাল টার্মিনাল নির্দেশনা):</span>
        </div>
        <div className="space-y-1 text-slate-400 text-[11px]">
          <p>1. Install dependencies: <span className="text-white">pip install -r requirements.txt</span></p>
          <p>2. Ingest technical corpus: <span className="text-white">python ingest.py</span></p>
          <p>3. Run Streamlit application: <span className="text-white">streamlit run app.py</span></p>
        </div>
      </div>

      {/* File Selector Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {files.map((f) => (
          <button
            key={f.name}
            onClick={() => setActiveFile(f.name)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 ${
              activeFile === f.name
                ? 'bg-cyan-950 border border-cyan-800 text-cyan-300 font-semibold shadow-sm'
                : 'border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>{f.name}</span>
            <span className="text-[10px] text-slate-500 font-normal">({f.desc})</span>
          </button>
        ))}
      </div>

      {/* Code Viewer */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>{activeFile}</span>
          <span>{sources[activeFile]?.split('\n').length || 0} lines</span>
        </div>
        <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed max-h-[600px] selection:bg-cyan-900">
          <code>{sources[activeFile] || 'Loading source code...'}</code>
        </pre>
      </div>
    </div>
  );
};
