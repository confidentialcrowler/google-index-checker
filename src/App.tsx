import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation.js';
import { DashboardView } from './components/DashboardView.js';
import { SingleCheckerView } from './components/SingleCheckerView.js';
import { BulkCheckerView } from './components/BulkCheckerView.js';
import { BatchDetailView } from './components/BatchDetailView.js';
import { BatchesListView } from './components/BatchesListView.js';
import { ReportsView } from './components/ReportsView.js';
import { ProvidersView } from './components/ProvidersView.js';
import { SearchConsoleView } from './components/SearchConsoleView.js';
import { AdminView } from './components/AdminView.js';
import { HowItWorksModal } from './components/HowItWorksModal.js';
import { MultiKeyManagerModal } from './components/MultiKeyManagerModal.js';
import { GitHubDeployModal } from './components/GitHubDeployModal.js';
import { BatchSummary, ProviderConfig, ApiPoolStatus } from './types.js';
import { HelpCircle, Key, ShieldCheck, CheckCircle2, AlertTriangle, Sparkles, Activity, Github } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [mockMode, setMockMode] = useState(false); // Defaults to Live Verification Mode
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [keyPoolOpen, setKeyPoolOpen] = useState(false);
  const [githubDeployOpen, setGithubDeployOpen] = useState(false);
  const [poolStatus, setPoolStatus] = useState<ApiPoolStatus | null>(null);

  useEffect(() => {
    fetchBatches();
    fetchProviders();
    fetchKeys();

    const interval = setInterval(() => {
      fetchBatches();
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/batches');
      if (res.ok) {
        const data = await res.json();
        setBatches(data);
      }
    } catch {
      // ignore
    }
  };

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
        setMockMode(Boolean(data.mockMode));
      }
    } catch {
      // ignore
    }
  };

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/keys');
      if (res.ok) {
        const data = await res.json();
        setPoolStatus(data);
      }
    } catch {
      // ignore
    }
  };

  const handleUpdateMockMode = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/providers/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockMode: enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setMockMode(data.mockMode);
        fetchProviders();
      }
    } catch {
      // ignore
    }
  };

  const handleNavigate = (tab: string, batchId?: string) => {
    setCurrentTab(tab);
    if (batchId) {
      setActiveBatchId(batchId);
    }
  };

  const handleBatchStarted = (batchId: string) => {
    setActiveBatchId(batchId);
    setCurrentTab('batch-detail');
    fetchBatches();
  };

  const activeRunningBatches = batches.filter((b) => b.progress.status === 'RUNNING').length;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Responsive Navigation */}
      <Navigation
        currentTab={currentTab === 'batch-detail' ? 'batches' : currentTab}
        onSelectTab={(tab) => {
          if (tab === 'batches') {
            const running = batches.find((b) => b.progress.status === 'RUNNING');
            if (running) {
              setActiveBatchId(running.id);
              setCurrentTab('batch-detail');
              return;
            }
          }
          setCurrentTab(tab);
        }}
        mockMode={mockMode}
        onToggleMockMode={handleUpdateMockMode}
        activeBatchCount={activeRunningBatches}
        onOpenHowItWorks={() => setHowItWorksOpen(true)}
        onOpenKeyPool={() => setKeyPoolOpen(true)}
        onOpenGitHubDeploy={() => setGithubDeployOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigate={handleNavigate}
            batches={batches}
            providers={providers}
            mockMode={mockMode}
            onOpenKeyManager={() => setKeyPoolOpen(true)}
          />
        )}

        {currentTab === 'single' && <SingleCheckerView />}

        {currentTab === 'bulk' && (
          <BulkCheckerView
            onBatchStarted={handleBatchStarted}
            providers={providers}
          />
        )}

        {currentTab === 'batches' && (
          <BatchesListView
            batches={batches}
            onSelectBatch={(id) => {
              setActiveBatchId(id);
              setCurrentTab('batch-detail');
            }}
            onNewBatch={() => setCurrentTab('bulk')}
          />
        )}

        {currentTab === 'batch-detail' && activeBatchId && (
          <BatchDetailView
            batchId={activeBatchId}
            onBack={() => setCurrentTab('batches')}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            batches={batches}
            onSelectBatch={(id) => {
              setActiveBatchId(id);
              setCurrentTab('batch-detail');
            }}
          />
        )}

        {currentTab === 'providers' && (
          <ProvidersView
            providers={providers}
            mockMode={mockMode}
            onUpdateMockMode={handleUpdateMockMode}
            onRefresh={() => {
              fetchProviders();
              fetchKeys();
            }}
            onOpenHowItWorks={() => setHowItWorksOpen(true)}
          />
        )}

        {currentTab === 'gsc' && <SearchConsoleView />}

        {currentTab === 'admin' && <AdminView />}
      </main>

      {/* Advanced Responsive Footer with "How Crawlme Works" Popup Button */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md py-6 text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Branding & Status */}
            <div className="flex items-center space-x-3 text-center sm:text-left">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-white text-sm">
                    Crawlme Index Checker Tools
                  </span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                    PRODUCTION LIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Industrial Google Index Verification, Multi-Key Rotation &amp; 2-Column SEO Delivery
                </p>
              </div>
            </div>

            {/* Prominent "How Tools Are Used & Find The Result" Popup Message Button */}
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                id="footer-how-it-works-btn"
                onClick={() => setHowItWorksOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center space-x-2 hover:scale-[1.02] cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 stroke-[2.5]" />
                <span>How This Tool Works &amp; Finds Results</span>
                <Sparkles className="w-3.5 h-3.5 opacity-80" />
              </button>

              <button
                id="footer-api-keys-btn"
                onClick={() => setKeyPoolOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-colors flex items-center space-x-2"
                title="Configure Multiple Free SerpApi Keys (250 queries/mo each)"
              >
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  API Pool:{' '}
                  <strong className="font-mono text-emerald-400">
                    {poolStatus ? `${poolStatus.totalRemainingCredits} credits` : 'Manage Keys'}
                  </strong>
                </span>
              </button>

              <button
                id="footer-github-deploy-btn"
                onClick={() => setGithubDeployOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-200 hover:text-white font-semibold text-xs transition-colors flex items-center space-x-2 cursor-pointer"
                title="Connect repository and deploy to GitHub Pages"
              >
                <Github className="w-3.5 h-3.5 text-purple-400" />
                <span>Deploy to GitHub</span>
              </button>
            </div>
          </div>

          {/* Sub-strip with architectural guarantees */}
          <div className="pt-3 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <span>Zero-Fail Fallback Engine</span>
              <span>•</span>
              <span>Multi-Key 250-Quota Skipping</span>
              <span>•</span>
              <span>Two-Column Google Sheets Mode (Live Link | Index)</span>
              <span>•</span>
              <span>SSRF-Hardened Crawler</span>
            </div>
            <span>© {new Date().getFullYear()} Crawlme Tools • All Systems Operational</span>
          </div>
        </div>
      </footer>

      {/* Popups & Modals */}
      <HowItWorksModal
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
        onOpenKeysManager={() => {
          setHowItWorksOpen(false);
          setKeyPoolOpen(true);
        }}
      />

      <MultiKeyManagerModal
        isOpen={keyPoolOpen}
        onClose={() => setKeyPoolOpen(false)}
        onPoolUpdated={() => {
          fetchKeys();
          fetchProviders();
        }}
      />

      <GitHubDeployModal
        isOpen={githubDeployOpen}
        onClose={() => setGithubDeployOpen(false)}
      />
    </div>
  );
}
