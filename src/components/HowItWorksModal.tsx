import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  ShieldCheck,
  Search,
  Zap,
  RotateCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Server,
  Layers,
  Sparkles,
} from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenKeysManager?: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({
  isOpen,
  onClose,
  onOpenKeysManager,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'methodology' | 'multikey' | 'verdicts'>('overview');

  if (!isOpen) return null;

  return (
    <div
      id="how-it-works-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="how-it-works-modal-container"
        className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <HelpCircle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <span>How Crawlme Works &amp; Finds Results</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  v2.5 Architecture
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Detailed methodology on live Googlebot crawling, SERP consensus, and multi-key fallback rotation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-4 overflow-x-auto no-scrollbar text-xs font-semibold">
          {[
            { id: 'overview', label: '1. Executive Overview', icon: Sparkles },
            { id: 'methodology', label: '2. Inspection Pipeline', icon: Globe },
            { id: 'multikey', label: '3. Multi-Key 250-Credit Engine', icon: KeyIcon },
            { id: 'verdicts', label: '4. Verdict Accuracy (Index vs No-index)', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
                  active
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-slate-900 to-slate-900 border border-emerald-500/20">
                <h3 className="font-bold text-white text-base mb-1">
                  Autonomous Google URL Index Verification at Scale
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Crawlme is an industrial-grade index verification platform designed for SEO agencies, webmasters, and affiliate publishers who need to inspect thousands of URLs without relying solely on Google Search Console quotas or manual Google searches.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                    <Globe className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-white text-xs">Direct Googlebot Emulation</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Inspects live HTTP status codes, server headers, <code className="text-emerald-300">X-Robots-Tag: noindex</code>, canonical directives, and robots.txt rules.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center mb-2">
                    <Search className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-white text-xs">Google SERP Page 1 Consensus</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Queries Google organic search clusters via <code className="text-sky-300">site:URL</code> to confirm presence in live search results.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-2">
                    <RotateCw className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-white text-xs">Multi-Key Fallback Rotation</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Supports pooling multiple free 250-query API keys. Skips exhausted keys automatically and alerts when credits hit ≤100.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-white block">Ready to paste your API keys?</span>
                  <span className="text-slate-400">Add multiple 250-search free keys to expand your monthly pool.</span>
                </div>
                {onOpenKeysManager && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenKeysManager();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors shrink-0"
                  >
                    Configure API Keys
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'methodology' && (
            <div className="space-y-4">
              <h3 className="font-bold text-white text-sm">Step-by-Step Verification Pipeline</h3>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="space-y-0.5">
                    <h4 className="font-semibold text-white text-xs">URL Ingestion &amp; Deduplication</h4>
                    <p className="text-xs text-slate-400">
                      Normalizes protocol (http vs https), removes tracking query parameters (utm_*, fbclid), handles trailing slashes, and deduplicates in-memory.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="space-y-0.5">
                    <h4 className="font-semibold text-white text-xs">SSRF Safety Guard &amp; Technical SEO Audit</h4>
                    <p className="text-xs text-slate-400">
                      Blocks internal IP ranges, then issues an authentic Googlebot user-agent request to check HTTP 200/301/404, robots.txt, and meta noindex tags.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div className="space-y-0.5">
                    <h4 className="font-semibold text-white text-xs">Organic SERP Page 1 Consensus Check</h4>
                    <p className="text-xs text-slate-400">
                      Queries Google organic search (<code className="text-emerald-300">site:URL</code>) using our multi-key provider pool. If the target URL appears in the first page of organic results, it is confirmed indexed.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <div className="space-y-0.5">
                    <h4 className="font-semibold text-white text-xs">Deterministic Confidence Scoring</h4>
                    <p className="text-xs text-slate-400">
                      Combines HTTP status, robots directive freedom, and multi-node consensus into a 0–100% confidence score and binary <strong className="text-emerald-400">Index</strong> or <strong className="text-amber-400">No-index</strong> verdict.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'multikey' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                  <RotateCw className="w-4 h-4" />
                  <span>How the Multi-Key Rotation Engine Operates</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  SerpApi and similar SERP providers offer a <strong>Free Plan with 250 searches per month</strong> and <strong>50 throughput per hour</strong>. Crawlme allows you to add multiple API keys so you can multiply your free monthly searches!
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="font-bold text-white block mb-1">1. Automatic Quota Skipping</span>
                  <p className="text-slate-400">
                    When an API key reaches its 250 monthly searches or returns HTTP 429 ("searches per month limit reached"), Crawlme immediately marks it as <strong>EXHAUSTED</strong> and seamlessly skips to the next key in your pool.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="font-bold text-white block mb-1">2. Low Credit Early Warning (≤ 100 Remaining)</span>
                  <p className="text-slate-400">
                    When total remaining searches across all active keys drop to <strong>100 or less</strong>, an alert banner appears so you can add another free account key before your batch finishes.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="font-bold text-white block mb-1">3. Zero-Fail Live Crawler Fallback</span>
                  <p className="text-slate-400">
                    If all your API keys exhaust their credits (0 remaining), Crawlme does <strong>not</strong> stop your jobs. It automatically engages its built-in live crawler consensus fallback node so your verifications continue uninterrupted.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'verdicts' && (
            <div className="space-y-4">
              <h3 className="font-bold text-white text-sm">Understanding Verdicts &amp; Export Formats</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verdict: Index</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    The URL returns HTTP 200, has no blocking robots directives, and was positively identified in Google&apos;s organic search index for its exact canonical query.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center space-x-2 text-amber-300 font-bold mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Verdict: No-index</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    The URL returns 0 results for <code className="text-amber-200">site:URL</code> on Google, returns 404/500, or serves a <code className="text-amber-200">noindex</code> directive preventing Google indexing.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-white flex items-center space-x-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Google Sheets 2-Column Delivery Mode</span>
                </span>
                <p className="text-slate-400 text-[11px]">
                  Use the <strong>EXPORT 2-COL SHEET</strong> or <strong>Copy for Google Sheets</strong> button to paste directly into Google Sheets (Ctrl+V) with exact headers:
                </p>
                <div className="bg-slate-900 p-2 rounded-lg font-mono text-[11px] text-emerald-300 border border-slate-800">
                  Live Link &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Index<br/>
                  https://example.com/page-one &nbsp;&nbsp;&nbsp;&nbsp; Index<br/>
                  https://example.com/page-two &nbsp;&nbsp;&nbsp;&nbsp; No-index
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono">Crawlme Index Checker Tools • Production Build</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const KeyIcon = (props: any) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="m21 2-9.6 9.6" />
    <path d="m15.5 7.5 3 3L22 7l-3-3" />
  </svg>
);
