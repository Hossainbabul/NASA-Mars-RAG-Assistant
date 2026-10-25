import React from 'react';
import { ShieldCheck, Database, Sliders, PlayCircle, Code2, Globe } from 'lucide-react';

interface TopBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: 'bn' | 'en';
  setLanguage: (lang: 'bn' | 'en') => void;
  onRunTestMatrix: () => void;
  isRunningTests: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  onRunTestMatrix,
  isRunningTests,
}) => {
  const isBn = language === 'bn';

  return (
    <header className="border-b border-slate-800 bg-slate-950/95 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-base sm:text-lg font-semibold tracking-tight text-white whitespace-nowrap">
            NASA Mars RAG Assistant
          </span>
        </div>

        {/* Zone 2: Single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'terminal'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'hover:text-white'
            }`}
          >
            {isBn ? 'মিশন কোয়েরি টার্মিনাল' : 'Query Terminal'}
          </button>
          <button
            onClick={() => setActiveTab('hybrid-lab')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'hybrid-lab'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'hover:text-white'
            }`}
          >
            {isBn ? 'হাইব্রিড সার্চ ল্যাব' : 'Hybrid Search Lab'}
          </button>
          <button
            onClick={() => setActiveTab('test-matrix')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'test-matrix'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'hover:text-white'
            }`}
          >
            {isBn ? 'গার্ডরেইল টেস্ট ম্যাট্রিক্স' : 'Test Matrix Suite'}
          </button>
          <button
            onClick={() => setActiveTab('corpus')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'corpus'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'hover:text-white'
            }`}
          >
            {isBn ? 'নলেজ বেস ও ইনজেশন' : 'Knowledge Corpus'}
          </button>
          <button
            onClick={() => setActiveTab('python-code')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'python-code'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'hover:text-white'
            }`}
          >
            {isBn ? 'পাইথন / স্ট্রিমলিট কোড' : 'Python & Streamlit Export'}
          </button>
        </nav>

        {/* Zone 3: 1 primary action + Language Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setLanguage(isBn ? 'en' : 'bn')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900 transition-colors whitespace-nowrap"
            title="Toggle Language / ভাষা পরিবর্তন"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isBn ? 'English' : 'বাংলা'}</span>
          </button>

          <button
            onClick={onRunTestMatrix}
            disabled={isRunningTests}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-lg transition-colors shadow-sm disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>{isRunningTests ? (isBn ? 'টেস্টিং চলছে...' : 'Running Suite...') : (isBn ? 'রান টেস্ট স্যুট' : 'Run Verification')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
