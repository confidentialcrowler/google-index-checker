import React, { useState, useEffect } from 'react';
import {
  Search,
  Layers,
  FileSpreadsheet,
  Activity,
  Sliders,
  ShieldCheck,
  Zap,
  Globe,
  Key,
  HelpCircle,
  Menu,
  X,
  AlertTriangle,
  ChevronRight,
  Radio,
  ExternalLink,
  Github,
} from 'lucide-react';
import { ApiPoolStatus } from '../types.js';

interface NavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  mockMode: boolean;
  onToggleMockMode?: (enabled: boolean) => void;
  activeBatchCount: number;
  onOpenHowItWorks?: () => void;
  onOpenKeyPool?: () => void;
  onOpenGitHubDeploy?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  mockMode,
  onToggleMockMode,
  activeBatchCount,
  onOpenHowItWorks,
  onOpenKeyPool,
  onOpenGitHubDeploy,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [poolStatus, setPoolStatus] = useState<ApiPoolStatus | null>(null);

  const fetchPoolStatus = async () => {
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

  useEffect(() => {
    fetchPoolStatus();
    const timer = setInterval(fetchPoolStatus, 15000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity, shortLabel: 'Dash' },
    { id: 'single', label: 'Single Check', icon: Search, shortLabel: 'Single' },
    {
      id: 'bulk',
      label: 'Bulk Check',
      icon: Layers,
      shortLabel: 'Bulk',
      badge: activeBatchCount > 0 ? `${activeBatchCount} active` : undefined,
    },
    { id: 'batches', label: 'Batch Monitor', icon: Zap, shortLabel: 'Batches' },
    { id: 'reports', label: 'Reports (.XLSX)', icon: FileSpreadsheet, shortLabel: 'Reports' },
    { id: 'providers', label: 'Providers', icon: Sliders, shortLabel: 'Providers' },
    { id: 'gsc', label: 'Search Console', icon: Globe, shortLabel: 'GSC' },
    { id: 'admin', label: 'Cluster Admin', icon: ShieldCheck, shortLabel: 'Admin' },
  ];

  const handleSelectTab = (tabId: string) => {
    onSelectTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header
      id="crawlme-main-header"
      className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40 transition-all shadow-lg"
    >
      {/* Low credit or all-exhausted top alert bar if applicable */}
      {poolStatus?.allExhaustedNotice && (
        <div className="bg-red-500/20 border-b border-red-500/40 px-4 py-1.5 text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>
              <strong>All API keys reached monthly limit (250/key)!</strong> Live crawler fallback active.
            </span>
          </div>
          <button
            onClick={onOpenKeyPool}
            className="underline text-red-200 hover:text-white font-bold ml-2 shrink-0"
          >
            Add New Key
          </button>
        </div>
      )}

      {poolStatus?.lowCreditWarning && !poolStatus?.allExhaustedNotice && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1 text-xs text-amber-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>Low API Credits Alert:</strong> Only {poolStatus.totalRemainingCredits} searches remaining across keys!
            </span>
          </div>
          <button
            onClick={onOpenKeyPool}
            className="underline text-amber-100 hover:text-white font-bold ml-2 shrink-0"
          >
            Add Key
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between h-16">
        {/* Brand with Crawlme Emblem */}
        <div
          className="flex items-center space-x-3 cursor-pointer group shrink-0"
          onClick={() => handleSelectTab('dashboard')}
        >
          {/* Advanced Radar Spider SVG Logo */}
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-emerald-400/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/10 group-hover:border-emerald-400 transition-all">
            <svg
              className="w-5 h-5 text-emerald-400 transform group-hover:scale-110 transition-transform"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Radar rings */}
              <circle cx="12" cy="12" r="9" className="opacity-40 stroke-teal-500" strokeDasharray="3 3" />
              <circle cx="12" cy="12" r="5" className="opacity-70 stroke-emerald-400" />
              {/* Center crawler spider node */}
              <circle cx="12" cy="12" r="2" className="fill-emerald-400" />
              {/* Search radar beam lines */}
              <path d="m12 3v3" />
              <path d="m12 18v3" />
              <path d="m3 12h3" />
              <path d="m18 12h3" />
              <path d="m5.6 5.6 2.1 2.1" />
              <path d="m16.3 16.3 2.1 2.1" />
            </svg>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-tight text-white text-base sm:text-lg">
                Crawlme <span className="text-emerald-400">Index Checker</span>
              </span>
              <span className="hidden xl:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                TOOLS v2.5
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
              Industrial Google Index Verification &amp; Multi-Key SERP Rotation
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => handleSelectTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'bg-slate-900 text-white border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/25 text-emerald-300 font-bold animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Actions: API Key Credits Pill, How It Works, Mode Badge & Mobile Toggle */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* API Key Credit Pool Quick Button */}
          <button
            onClick={onOpenKeyPool}
            className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              poolStatus?.allExhaustedNotice
                ? 'bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25'
                : poolStatus?.lowCreditWarning
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-emerald-500/50 hover:text-white'
            }`}
            title="Configure Multiple Free SerpApi Keys (250 queries/mo each)"
          >
            <Key className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              API Keys:{' '}
              <strong className="font-mono text-emerald-400">
                {poolStatus ? poolStatus.totalRemainingCredits : '...'}
              </strong>
            </span>
          </button>

          {/* How It Works Button */}
          <button
            onClick={onOpenHowItWorks}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            title="How Crawlme Works & Finds Results"
          >
            <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden md:inline">How It Works</span>
          </button>

          {/* Deploy to GitHub Button */}
          <button
            id="nav-github-deploy-btn"
            onClick={onOpenGitHubDeploy}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-bold transition-all shadow-sm shadow-purple-500/10 cursor-pointer"
            title="Connect repository & deploy to GitHub Pages"
          >
            <Github className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Deploy to GitHub</span>
          </button>

          {/* Live vs Demo Mode Toggle */}
          <div className="hidden sm:block">
            {mockMode ? (
              <button
                onClick={() => onToggleMockMode?.(false)}
                className="group flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                title="Currently in DEMO MODE. Click to switch to LIVE VERIFICATION MODE"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>DEMO</span>
                <span className="text-[10px] text-amber-400/80 group-hover:text-amber-200 underline ml-1">
                  (Switch)
                </span>
              </button>
            ) : (
              <button
                onClick={() => onToggleMockMode?.(true)}
                className="group flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-xs font-bold transition-all shadow-sm shadow-emerald-500/10 cursor-pointer"
                title="Currently in LIVE VERIFICATION MODE. Click for Demo simulation."
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="tracking-wide">LIVE TOOL</span>
              </button>
            )}
          </div>

          {/* Mobile Hamburger Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white lg:hidden transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Horizontal Compact Scroll for Tablets & Large Mobile */}
      <div className="lg:hidden flex overflow-x-auto px-3 py-2 space-x-1.5 border-t border-slate-800/80 bg-slate-950 no-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleSelectTab(item.id)}
            className={`text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              currentTab === item.id
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            {item.shortLabel}
          </button>
        ))}
      </div>

      {/* Full Sliding Mobile Drawer / Modal Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-50 bg-slate-950/95 backdrop-blur-md p-4 overflow-y-auto border-t border-slate-800 animate-fadeIn">
          <div className="space-y-4 max-w-md mx-auto">
            {/* Quick Status Pill */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Engine Status:</span>
              <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{mockMode ? 'Demo Simulation' : 'Live Verification Ready'}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenKeyPool?.();
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-left hover:border-emerald-500/40 transition-colors"
              >
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs mb-1">
                  <Key className="w-3.5 h-3.5" />
                  <span>API Keys Pool</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {poolStatus?.totalRemainingCredits || 0} searches left
                </p>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenHowItWorks?.();
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-left hover:border-emerald-500/40 transition-colors"
              >
                <div className="flex items-center space-x-2 text-teal-400 font-bold text-xs mb-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>How It Works</span>
                </div>
                <p className="text-[11px] text-slate-400">Methodology &amp; guides</p>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenGitHubDeploy?.();
                }}
                className="col-span-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-left hover:bg-purple-500/20 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center space-x-2 text-purple-300 font-bold text-xs">
                  <Github className="w-4 h-4 text-purple-400" />
                  <span>Connect &amp; Deploy to GitHub Pages</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 font-mono">
                  Setup CI/CD
                </span>
              </button>
            </div>

            {/* Navigation Item List */}
            <div className="space-y-1 pt-2 border-t border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 block mb-1">
                Navigation Modules
              </span>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Switch Mode Button inside Drawer */}
            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  onToggleMockMode?.(!mockMode);
                  setMobileMenuOpen(false);
                }}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-colors ${
                  mockMode
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                }`}
              >
                {mockMode ? 'Switch to LIVE VERIFICATION MODE' : 'Switch to Demo Mode'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
