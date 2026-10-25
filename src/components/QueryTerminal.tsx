import React, { useState } from 'react';
import { Search, ShieldAlert, CheckCircle2, BookOpen, Clock, Sliders, ChevronDown, ChevronUp, Sparkles, AlertTriangle } from 'lucide-react';

interface QueryTerminalProps {
  language: 'bn' | 'en';
}

interface RetrievedChunk {
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
  type: string;
}

interface RAGResponse {
  query: string;
  answer: string;
  citation: string | null;
  guardrailTriggered: boolean;
  guardrailReason?: string;
  retrievedChunks: RetrievedChunk[];
  latencyMs: number;
  retrievalMode: string;
  alpha: number;
}

export const QueryTerminal: React.FC<QueryTerminalProps> = ({ language }) => {
  const isBn = language === 'bn';

  const [query, setQuery] = useState(
    'How much Martian regolith is required for habitat shielding to keep exposure below 600 mSv PEL?'
  );
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RAGResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Configuration
  const [alpha, setAlpha] = useState<number>(0.5);
  const [strictGuardrail, setStrictGuardrail] = useState<boolean>(true);
  const [topK, setTopK] = useState<number>(3);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [expandedChunkId, setExpandedChunkId] = useState<string | null>('chunk_1');

  // Preset query test cards
  const presets = [
    {
      label: isBn ? 'মার্টিয়ান রেগোলিথ শিল্ডিং' : 'Regolith Shielding (In-Context)',
      text: 'How much Martian regolith is required for habitat shielding to keep exposure below 600 mSv PEL?',
      badge: 'Positive Test',
    },
    {
      label: isBn ? 'কসমিক রশ্মি (GCR) প্যাসিভ ম্যাটেরিয়াল' : 'GCR Passive Shielding (GCR/HZE)',
      text: 'What materials provide the highest mass-efficiency for mitigating Galactic Cosmic Rays (GCR)?',
      badge: 'Positive Test',
    },
    {
      label: isBn ? 'নিউক্লিয়ার থার্মাল ট্রানজিট (NTP)' : 'Nuclear Thermal Propulsion (NTP 100 days)',
      text: 'How does Nuclear Thermal Propulsion (NTP) shorten Mars transit duration compared to chemical propulsion?',
      badge: 'Acronym Lookup',
    },
    {
      label: isBn ? 'চাঁদে অবতরণ (নেগেটিভ গার্ডরেইল)' : 'Moon Landing (Negative Guardrail)',
      text: 'When did the last human land on the Moon and who was the commander of Apollo 17?',
      badge: 'Negative Guardrail',
    },
    {
      label: isBn ? 'মহাকাশ বহির্ভূত প্রশ্ন (কুকি রেসিপি)' : 'External Trivia (Hallucination Probe)',
      text: 'What is the recipe for chocolate chip cookies or who won the soccer World Cup?',
      badge: 'Negative Guardrail',
    },
  ];

  const handleSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          alpha,
          topK,
          strictGuardrail,
          language,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data: RAGResponse = await res.json();
      setResponse(data);
      if (data.retrievedChunks && data.retrievedChunks.length > 0) {
        setExpandedChunkId(data.retrievedChunks[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process query');
    } finally {
      setLoading(false);
    }
  };

  // Run initial query on mount if not yet run
  React.useEffect(() => {
    if (!response) {
      handleSearch(query);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Title & Introduction Banner */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-2">
          {isBn ? '🚀 নাসা মার্স মিশন রিসার্চ অ্যাসিস্ট্যান্ট' : '🚀 NASA Mars Mission Research Assistant'}
        </h1>
        <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
          {isBn
            ? 'হাইব্রিড রিট্রিভাল (BM25 কি-ওয়ার্ড + Dense ভেক্টর সিমিলারিটি), কঠোর জিরো-হ্যালুসিনেশন গার্ডরেইল এবং ডকুমেন্ট সেকশন সাইটেশন যুক্ত প্রোডাকশন RAG সিস্টেম।'
            : 'Production-grade RAG pipeline equipped with Hybrid Retrieval (BM25 sparse + Dense semantic vector), strict zero-hallucination guardrails, and verified NASA document citations.'}
        </p>
      </div>

      {/* Preset Query Pickers */}
      <div className="space-y-2">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
          {isBn ? 'টেস্ট কোয়েরি নির্বাচন করুন:' : 'Select Standard Test Query:'}
        </span>
        <div className="flex flex-wrap gap-2">
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(p.text);
                handleSearch(p.text);
              }}
              className="text-left px-3 py-1.5 text-xs rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/90 text-slate-300 hover:text-white transition-all flex items-center gap-2 group"
            >
              <span>{p.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  p.badge === 'Negative Guardrail'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                    : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                }`}
              >
                {p.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Query Input Bar */}
      <div className="space-y-3">
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
            placeholder={
              isBn
                ? 'মার্স মিশন সম্পর্কিত টেকনিক্যাল প্রশ্ন লিখুন (যেমন: How much Martian regolith is required...)'
                : 'Enter technical question on Mars radiation, regolith shielding, transit NTP, or ECLSS...'
            }
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3.5 pr-28 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
          />
          <button
            onClick={() => handleSearch(query)}
            disabled={loading || !query.trim()}
            className="absolute right-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{loading ? (isBn ? 'সার্চ হচ্ছে...' : 'Searching...') : (isBn ? 'সাবমিট' : 'Submit')}</span>
          </button>
        </div>

        {/* Configuration Accordion Toggle */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="font-mono">
              Retrieval Mode: <strong className="text-cyan-400">Hybrid (BM25 + Dense RRF)</strong>
            </span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="font-mono">
              Guardrail: <strong className={strictGuardrail ? 'text-emerald-400' : 'text-amber-400'}>{strictGuardrail ? 'Strict Active' : 'Relaxed'}</strong>
            </span>
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isBn ? 'রিট্রিভাল প্যারামিটার' : 'Tune Weights & Parameters'}</span>
            {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible Tuning Drawer */}
        {showConfig && (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Alpha slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-300">Alpha Weight (α):</span>
                  <span className="text-cyan-400 tabular-nums">{alpha.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={alpha}
                  onChange={(e) => setAlpha(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>0.0 (Pure BM25)</span>
                  <span>0.5 (Balanced)</span>
                  <span>1.0 (Pure Dense)</span>
                </div>
              </div>

              {/* Strict Guardrail Switch */}
              <div className="space-y-1.5">
                <span className="text-slate-300 font-mono">Guardrail Sensitivity:</span>
                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={strictGuardrail}
                      onChange={(e) => setStrictGuardrail(e.target.checked)}
                      className="accent-cyan-400 rounded"
                    />
                    <span className="text-slate-300">Enforce Strict Decline on Out-of-Domain</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">
                  Refuses to answer when facts are absent instead of hallucinating.
                </p>
              </div>

              {/* Top-K Chunks */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-300">Top-K Retrieved Chunks:</span>
                  <span className="text-cyan-400 tabular-nums">{topK}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  {[2, 3, 5].map((k) => (
                    <button
                      key={k}
                      onClick={() => setTopK(k)}
                      className={`px-3 py-1 rounded border text-xs font-mono transition-colors ${
                        topK === k
                          ? 'border-cyan-400 bg-cyan-950/80 text-cyan-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      K = {k}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-800 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Dual-Column Workspace (Streamlit col1, col2 architecture) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1: System Response (2/3 width = 7/12) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-sm font-semibold tracking-wide text-white uppercase flex items-center gap-2">
              <span>💡</span>
              <span>{isBn ? 'সিস্টেম রেসপন্স (System Response)' : 'System Response'}</span>
            </h2>

            {response && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-400 tabular-nums">{response.latencyMs} ms</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/40 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-mono">
                {isBn
                  ? 'নাসা টেকনিক্যাল রিপোর্ট সার্চ এবং হাইব্রিড স্কোরিং চলছে...'
                  : 'Searching NASA Mars technical corpus and evaluating guardrails...'}
              </p>
            </div>
          ) : response ? (
            <div className="space-y-4">
              {/* Guardrail Status Alert */}
              {response.guardrailTriggered ? (
                <div className="p-4 rounded-xl border border-amber-800/80 bg-amber-950/30 text-amber-200 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-xs text-amber-300">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>
                      {isBn
                        ? 'স্ট্রিক্ট গার্ডরেইল সক্রিয়: তথ্যের অনুপস্থিতিতে হ্যালুসিনেশন রোধ করা হয়েছে'
                        : 'Strict Guardrail Engaged: Hallucination Prevented'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/90 leading-relaxed font-mono">
                    {response.guardrailReason ||
                      (isBn
                        ? 'প্রদত্ত ডকুমেন্টে পর্যাপ্ত প্রযুক্তিগত তথ্য না থাকায় সরাসরি ডিক্লাইন করা হয়েছে।'
                        : 'Direct decline executed: facts not present in NASA technical corpus.')}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-emerald-800/80 bg-emerald-950/30 text-emerald-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>
                      {isBn ? 'ইন-কনটেক্সট ভেরিফাইড উত্তর' : 'In-Context Factually Verified'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-400/80">
                    Confidence: High (Hybrid Match)
                  </span>
                </div>
              )}

              {/* Primary Answer Box */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4 shadow-sm">
                <div className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {response.answer}
                </div>

                {/* Section & Document Citation Badge */}
                {response.citation && (
                  <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-cyan-300">
                      <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="font-mono text-xs">
                        <strong>Citation:</strong> {response.citation}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                      Source: NASA Technical Memorandum
                    </span>
                  </div>
                )}
              </div>

              {/* RAG Architectural Guarantee Footnote */}
              <div className="px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
                <span>
                  {isBn
                    ? 'আর্কিটেকচার: BM25 Okapi + Cosine Dense Vector ➔ Reciprocal Rank Fusion'
                    : 'Pipeline: BM25 Okapi + Cosine Dense Vector ➔ Reciprocal Rank Fusion'}
                </span>
                <span className="font-mono text-slate-500">Temp: 0.0</span>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              {isBn
                ? 'অনুসন্ধান শুরু করতে উপরের সার্চ বক্সে প্রশ্ন লিখুন অথবা প্রিসেট নির্বাচন করুন।'
                : 'Enter a question above or select a preset test query.'}
            </div>
          )}
        </div>

        {/* Column 2: Retrieved Knowledge Chunks Audit Log (1/3 width = 5/12) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-sm font-semibold tracking-wide text-white uppercase flex items-center gap-2">
              <span>🔍</span>
              <span>{isBn ? 'রিট্রিভড নলেজ চাঙ্কস (Audit Log)' : 'Retrieved Knowledge Chunks'}</span>
            </h2>
            {response && (
              <span className="text-xs font-mono text-cyan-400">
                {response.retrievedChunks.length} Chunks
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30 text-center text-xs text-slate-500">
              {isBn ? 'চাঙ্ক রিট্রিভ হচ্ছে...' : 'Retrieving knowledge chunks...'}
            </div>
          ) : response && response.retrievedChunks.length > 0 ? (
            <div className="space-y-3">
              {response.retrievedChunks.map((chunk, index) => {
                const isExpanded = expandedChunkId === chunk.id;
                return (
                  <div
                    key={chunk.id}
                    className={`rounded-xl border transition-all ${
                      index === 0
                        ? 'border-cyan-800/80 bg-slate-900/90'
                        : 'border-slate-800 bg-slate-900/50'
                    }`}
                  >
                    {/* Chunk Expander Header */}
                    <button
                      onClick={() => setExpandedChunkId(isExpanded ? null : chunk.id)}
                      className="w-full p-3.5 text-left flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-white">
                            Chunk #{index + 1}
                          </span>
                          <span className="text-[11px] font-mono text-cyan-400 px-1.5 py-0.2 bg-cyan-950/70 border border-cyan-800/60 rounded">
                            Hybrid Score: {chunk.hybridScore.toFixed(3)}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-300 line-clamp-1">
                          {chunk.sectionHeader}
                        </p>
                      </div>

                      <div className="text-slate-400 pt-0.5">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {/* Detailed Content & Scores */}
                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 space-y-3 border-t border-slate-800/80 pt-3">
                        {/* Score breakdown metrics */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                          <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80">
                            <span className="text-slate-400 block">BM25 Sparse Score:</span>
                            <span className="text-emerald-400 font-bold tabular-nums">
                              {chunk.bm25Score.toFixed(3)}{' '}
                              <span className="text-slate-500 font-normal">
                                (Rank #{chunk.bm25Rank})
                              </span>
                            </span>
                          </div>
                          <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80">
                            <span className="text-slate-400 block">Dense Cosine Sim:</span>
                            <span className="text-cyan-400 font-bold tabular-nums">
                              {chunk.vectorScore.toFixed(3)}{' '}
                              <span className="text-slate-500 font-normal">
                                (Rank #{chunk.vectorRank})
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Matched Keywords */}
                        {chunk.matchedKeywords && chunk.matchedKeywords.length > 0 && (
                          <div className="text-[11px]">
                            <span className="text-slate-400 font-mono">Matched Terms: </span>
                            <span className="text-cyan-300 font-mono">
                              {chunk.matchedKeywords.join(', ')}
                            </span>
                          </div>
                        )}

                        {/* Raw Chunk Content */}
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                          {chunk.content}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              {isBn
                ? 'কোন চাঙ্ক রিট্রিভ করা হয়নি।'
                : 'No retrieved knowledge chunks to audit.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
