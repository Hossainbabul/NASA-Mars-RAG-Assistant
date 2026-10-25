import React, { useState } from 'react';
import { PlayCircle, CheckCircle2, XCircle, ShieldAlert, BookOpen, Clock, AlertCircle } from 'lucide-react';

interface TestMatrixRunnerProps {
  language: 'bn' | 'en';
}

interface TestRunResult {
  testCase: {
    id: string;
    category: string;
    query: string;
    queryBn: string;
    expectedBehavior: string;
    expectedBehaviorBn: string;
    expectedCitation?: string;
    shouldDecline: boolean;
  };
  response: {
    query: string;
    answer: string;
    citation: string | null;
    guardrailTriggered: boolean;
    guardrailReason?: string;
    latencyMs: number;
  };
  passed: boolean;
}

export const TestMatrixRunner: React.FC<TestMatrixRunnerProps> = ({ language }) => {
  const isBn = language === 'bn';

  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<{
    total: number;
    passedCount: number;
    results: TestRunResult[];
  } | null>(null);

  const runSuite = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test-matrix/run', { method: 'POST' });
      const data = await res.json();
      setTestResults(data);
    } catch (err) {
      console.error('Error running test matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    runSuite();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2 mb-2">
            <ShieldAlert className="w-6 h-6 text-cyan-400" />
            <span>
              {isBn
                ? 'সিস্টেম ভেরিফিকেশন টেস্ট ম্যাট্রিক্স (Test Matrix)'
                : 'System Verification Test Matrix'}
            </span>
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            {isBn
              ? 'প্রোডাকশন-গ্রেড RAG ভেরিফিকেশন: ইন-কনটেক্সট প্রশ্নের সঠিক তথ্য ও সাইটেশন যাচাই এবং আউট-অফ-কনটেক্সট প্রশ্নে জিরো-হ্যালুসিনেশন গার্ডরেইল রিফিউজাল টেস্ট।'
              : 'Verifies production RAG behavior: in-context queries receive exact technical answers with citations, while out-of-bounds questions are strictly declined without hallucination.'}
          </p>
        </div>

        <button
          onClick={runSuite}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap self-start sm:self-auto"
        >
          <PlayCircle className="w-4 h-4" />
          <span>{loading ? (isBn ? 'টেস্ট রান হচ্ছে...' : 'Executing Suite...') : (isBn ? 'রি-রান টেস্ট ম্যাট্রিক্স' : 'Re-Run All Tests')}</span>
        </button>
      </div>

      {/* KPI Overview Strip */}
      {testResults && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60">
            <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Total Tests
            </span>
            <span className="text-2xl font-mono font-bold text-white tabular-nums">
              {testResults.total}
            </span>
          </div>
          <div className="p-3.5 rounded-xl border border-emerald-900/60 bg-emerald-950/20">
            <span className="text-[11px] font-mono uppercase text-emerald-400 block mb-1">
              Passed Verification
            </span>
            <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">
              {testResults.passedCount} / {testResults.total}
            </span>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60">
            <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Guardrail Success Rate
            </span>
            <span className="text-2xl font-mono font-bold text-cyan-400 tabular-nums">
              {Math.round((testResults.passedCount / testResults.total) * 100)}%
            </span>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60">
            <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Avg Latency
            </span>
            <span className="text-2xl font-mono font-bold text-slate-300 tabular-nums">
              {Math.round(
                testResults.results.reduce((acc, r) => acc + r.response.latencyMs, 0) /
                  testResults.results.length
              )}{' '}
              <span className="text-xs font-normal text-slate-500">ms</span>
            </span>
          </div>
        </div>
      )}

      {/* Test Cases Table */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 font-mono">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Running deterministic test suite against NASA technical corpus...
        </div>
      ) : testResults ? (
        <div className="space-y-4">
          {testResults.results.map((item, idx) => (
            <div
              key={item.testCase.id}
              className={`p-4 rounded-xl border transition-all ${
                item.passed
                  ? 'border-slate-800 bg-slate-900/70'
                  : 'border-rose-900/80 bg-rose-950/20'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white">
                      Test Case #{idx + 1}:
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        item.testCase.category === 'negative_guardrail'
                          ? 'border-amber-800 text-amber-300 bg-amber-950/60'
                          : 'border-cyan-800 text-cyan-300 bg-cyan-950/60'
                      }`}
                    >
                      {item.testCase.category.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-200">
                    &ldquo;{isBn ? item.testCase.queryBn : item.testCase.query}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold ${
                      item.passed
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {item.passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span>{item.passed ? 'PASSED' : 'FAILED'}</span>
                  </div>

                  <span className="text-xs font-mono text-slate-500 tabular-nums">
                    {item.response.latencyMs} ms
                  </span>
                </div>
              </div>

              {/* Grid: Expected vs Actual */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-800/80">
                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 font-mono text-[11px] block">
                    Expected Behavior (প্রত্যাশিত ফলাফল):
                  </span>
                  <p className="text-slate-300 leading-relaxed font-mono text-[11px]">
                    {isBn ? item.testCase.expectedBehaviorBn : item.testCase.expectedBehavior}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 font-mono text-[11px] block">
                    Actual System Output (বাস্তব ফলাফল):
                  </span>
                  <p className="text-slate-200 leading-relaxed font-mono text-[11px]">
                    {item.response.answer}
                  </p>
                  {item.response.citation && (
                    <div className="pt-1.5 text-cyan-400 font-mono text-[11px] flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      <span>{item.response.citation}</span>
                    </div>
                  )}
                  {item.response.guardrailTriggered && (
                    <div className="pt-1 text-amber-400 font-mono text-[11px] flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      <span>Zero-Hallucination Guardrail Active</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
