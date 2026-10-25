import React, { useState } from 'react';
import { Search, Scale, Layers, HelpCircle, ArrowRight } from 'lucide-react';

interface HybridSearchLabProps {
  language: 'bn' | 'en';
}

export const HybridSearchLab: React.FC<HybridSearchLabProps> = ({ language }) => {
  const isBn = language === 'bn';

  const [testQuery, setTestQuery] = useState(
    'What materials mitigate HZE ions and GCR cosmic radiation with highest mass efficiency?'
  );
  const [alpha, setAlpha] = useState<number>(0.5);
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<{
    bm25: any[];
    dense: any[];
    hybrid: any[];
  } | null>(null);

  const sampleQueries = [
    {
      title: 'Acronym & Unit Search',
      query: 'PEL 600 mSv annual career limits and regolith meters',
    },
    {
      title: 'Semantic Paraphrase',
      query: 'What protective materials can astronauts use against deep space cosmic rays?',
    },
    {
      title: 'Engineering Acronym (NTP)',
      query: 'Nuclear Thermal Propulsion NTP transit reduction',
    },
    {
      title: 'Life Support Subsystem',
      query: 'MOXIE solid oxide electrolysis oxygen extraction from CO2',
    },
  ];

  const runComparison = async (q: string, alphaWeight: number = alpha) => {
    setLoading(true);
    try {
      const res = await fetch('/api/search-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, topK: 3, alpha: alphaWeight }),
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error('Comparison error:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    runComparison(testQuery, alpha);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2 mb-2">
          <Scale className="w-6 h-6 text-cyan-400" />
          <span>{isBn ? 'হাইব্রিড সার্চ ল্যাব (BM25 বনাম Dense ভেক্টর)' : 'Hybrid Search Laboratory'}</span>
        </h1>
        <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
          {isBn
            ? 'দেখুন কেন একা ডেন্স ভেক্টর বা একা বিএম২৫ যথেষ্ট নয়। টেকনিক্যাল শব্দ (যেমন PEL, GCR, NTP) এবং সংখ্যাভিত্তিক প্যারামিটারে হাইব্রিড রিট্রিভাল কীভাবে সর্বোচ্চ নির্ভুলতা অর্জন করে।'
            : 'Inspect why Dense Vector or BM25 alone fail on specialized aerospace documentation. Compare how Reciprocal Rank Fusion (RRF) fuses lexical acronym matching with semantic embeddings.'}
        </p>
      </div>

      {/* Query Bar & Presets */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runComparison(testQuery, alpha)}
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            placeholder="Type query to compare BM25 vs Dense vs Hybrid rankings..."
          />
          <button
            onClick={() => runComparison(testQuery, alpha)}
            disabled={loading}
            className="px-5 py-3 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'Running...' : 'Compare'}</span>
          </button>
        </div>

        {/* Quick query presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Presets:</span>
          {sampleQueries.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setTestQuery(s.query);
                runComparison(s.query, alpha);
              }}
              className="text-xs px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Alpha Weight Tuner Banner */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              {isBn ? 'ফিউশন ব্যালেন্সার (Alpha Weight α)' : 'Hybrid Fusion Balancer (Alpha α)'}
            </span>
          </div>
          <span className="text-xs font-mono text-cyan-400 tabular-nums">
            α = {alpha.toFixed(2)} (Sparse BM25: {(1 - alpha).toFixed(2)} · Dense Vector: {alpha.toFixed(2)})
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-emerald-400 whitespace-nowrap">0.0 (BM25 Only)</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={alpha}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setAlpha(val);
              runComparison(testQuery, val);
            }}
            className="w-full accent-cyan-400"
          />
          <span className="text-xs font-mono text-cyan-400 whitespace-nowrap">1.0 (Dense Only)</span>
        </div>
      </div>

      {/* Side-by-Side 3-Column Comparison Matrix */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-mono">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Computing scores across Sparse BM25, Dense Semantic Vector, and RRF Hybrid pipelines...
        </div>
      ) : results ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: Pure BM25 */}
          <div className="rounded-xl border border-emerald-900/70 bg-slate-900/80 p-4 space-y-3">
            <div className="border-b border-emerald-900/60 pb-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase text-emerald-400">
                  1. Sparse BM25 Okapi
                </h3>
                <span className="text-[10px] font-mono text-emerald-500">Lexical Exact</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Best for technical codes, numeric limits (&quot;600 mSv&quot;, &quot;3 to 5 meters&quot;), and rare acronyms.
              </p>
            </div>

            <div className="space-y-2.5">
              {results.bm25.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-400">Rank #{idx + 1}</span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      Score: {item.bm25Score.toFixed(3)}
                    </span>
                  </div>
                  <p className="font-medium text-slate-200 line-clamp-1">{item.chunk.sectionHeader}</p>
                  <p className="text-slate-400 text-[11px] line-clamp-3 font-mono">{item.chunk.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Pure Dense Vector */}
          <div className="rounded-xl border border-purple-900/70 bg-slate-900/80 p-4 space-y-3">
            <div className="border-b border-purple-900/60 pb-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase text-purple-400">
                  2. Dense Vector (Cosine)
                </h3>
                <span className="text-[10px] font-mono text-purple-400">Semantic Meaning</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Best for conceptual questions, synonyms, and natural language phrasing without exact keywords.
              </p>
            </div>

            <div className="space-y-2.5">
              {results.dense.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-purple-400">Rank #{idx + 1}</span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      Cosine Sim: {item.vectorScore.toFixed(3)}
                    </span>
                  </div>
                  <p className="font-medium text-slate-200 line-clamp-1">{item.chunk.sectionHeader}</p>
                  <p className="text-slate-400 text-[11px] line-clamp-3 font-mono">{item.chunk.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Hybrid Reciprocal Rank Fusion */}
          <div className="rounded-xl border border-cyan-800 bg-slate-900/90 p-4 space-y-3 shadow-sm">
            <div className="border-b border-cyan-800/80 pb-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase text-cyan-400">
                  3. Hybrid Fusion (RRF)
                </h3>
                <span className="text-[10px] font-mono text-cyan-300">Production Optimal</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Combines sparse lexical precision with semantic density; immunizes against keyword misses and false semantic drift.
              </p>
            </div>

            <div className="space-y-2.5">
              {results.hybrid.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-800/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-cyan-400">Rank #{idx + 1}</span>
                    <span className="font-mono text-[11px] text-cyan-300 tabular-nums">
                      Hybrid: {item.hybridScore.toFixed(3)}
                    </span>
                  </div>
                  <p className="font-medium text-white line-clamp-1">{item.chunk.sectionHeader}</p>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                    <span>BM25 Rank: #{item.bm25Rank}</span>
                    <span aria-hidden="true">·</span>
                    <span>Dense Rank: #{item.vectorRank}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] line-clamp-3 font-mono">{item.chunk.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
