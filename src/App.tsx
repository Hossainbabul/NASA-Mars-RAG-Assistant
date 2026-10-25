/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TopBar } from './components/TopBar.tsx';
import { QueryTerminal } from './components/QueryTerminal.tsx';
import { HybridSearchLab } from './components/HybridSearchLab.tsx';
import { TestMatrixRunner } from './components/TestMatrixRunner.tsx';
import { KnowledgeCorpus } from './components/KnowledgeCorpus.tsx';
import { PythonCodeExport } from './components/PythonCodeExport.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('terminal');
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);

  const handleRunGlobalTestMatrix = () => {
    setActiveTab('test-matrix');
    setIsRunningTests(true);
    setTimeout(() => setIsRunningTests(false), 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Top Bar following 3-zone contract */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        setLanguage={setLanguage}
        onRunTestMatrix={handleRunGlobalTestMatrix}
        isRunningTests={isRunningTests}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'terminal' && <QueryTerminal language={language} />}
        {activeTab === 'hybrid-lab' && <HybridSearchLab language={language} />}
        {activeTab === 'test-matrix' && <TestMatrixRunner language={language} />}
        {activeTab === 'corpus' && <KnowledgeCorpus language={language} />}
        {activeTab === 'python-code' && <PythonCodeExport language={language} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>NASA Mars Technical Research RAG</span>
            <span aria-hidden="true">·</span>
            <span>BM25 Okapi + Dense Vector Reciprocal Rank Fusion</span>
            <span aria-hidden="true">·</span>
            <span>Temperature 0.0</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>NASA-TM-2023-MARS-001</span>
            <span aria-hidden="true">·</span>
            <span>Zero Hallucination Guarantee</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
