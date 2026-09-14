import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldCheck,
  Key,
  Gauge,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Plus,
  Trash2,
  Power,
  Zap,
  Sparkles,
  Server,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { ProviderConfig, ApiKeyEntry, ApiPoolStatus } from '../types.js';

interface ProvidersViewProps {
  providers: ProviderConfig[];
  mockMode: boolean;
  onUpdateMockMode: (enabled: boolean) => void;
  onRefresh: () => void;
  onOpenHowItWorks?: () => void;
}

export const ProvidersView: React.FC<ProvidersViewProps> = ({
  providers,
  mockMode,
  onUpdateMockMode,
  onRefresh,
  onOpenHowItWorks,
}) => {
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [tempApiKey, setTempApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Multi-key pool state
  const [poolStatus, setPoolStatus] = useState<ApiPoolStatus | null>(null);
  const [loadingPool, setLoadingPool] = useState(false);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [keyInput, setKeyInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState(250); // SerpApi free tier default from image
  const [hourlyLimit, setHourlyLimit] = useState(50); // SerpApi free tier throughput/hr from image
  const [submittingKey, setSubmittingKey] = useState(false);
  const [poolMessage, setPoolMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchPool();
  }, []);

  const fetchPool = async () => {
    setLoadingPool(true);
    try {
      const res = await fetch('/api/keys');
      if (res.ok) {
        const data = await res.json();
        setPoolStatus(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingPool(false);
    }
  };

  const handleAddPoolKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingKey(true);
    setPoolMessage(null);

    try {
      let body: any = {};
      if (addMode === 'bulk') {
        if (!bulkInput.trim()) return;
        body = {
          rawKeysText: bulkInput,
          label: labelInput.trim() || 'SerpApi Free Account',
          monthlyLimit,
          hourlyLimit,
        };
      } else {
        if (!keyInput.trim()) return;
        body = {
          key: keyInput.trim(),
          label: labelInput.trim() || 'SerpApi Free Account',
          providerType: 'serp_api',
          monthlyLimit,
          hourlyLimit,
        };
      }

      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setPoolStatus(data.pool);
        setKeyInput('');
        setBulkInput('');
        setLabelInput('');
        setIsAddingKey(false);
        setPoolMessage({ text: 'API Key(s) added to rotation pool!', type: 'success' });
        onRefresh();
        setTimeout(() => setPoolMessage(null), 3000);
      } else {
        setPoolMessage({ text: data.error || 'Failed to add key', type: 'error' });
      }
    } catch (err: any) {
      setPoolMessage({ text: err.message || 'Network error', type: 'error' });
    } finally {
      setSubmittingKey(false);
    }
  };

  const handleDeletePoolKey = async (id: string) => {
    if (!confirm('Remove this key from rotation pool?')) return;
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setPoolStatus(data.pool);
        onRefresh();
      }
    } catch {
      // ignore
    }
  };

  const handleTogglePoolKey = async (id: string) => {
    try {
      const res = await fetch(`/api/keys/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPoolStatus(data.pool);
        onRefresh();
      }
    } catch {
      // ignore
    }
  };

  const handleResetPoolKey = async (id: string) => {
    try {
      const res = await fetch(`/api/keys/${id}/reset`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPoolStatus(data.pool);
        onRefresh();
      }
    } catch {
      // ignore
    }
  };

  const handleSaveApiKey = async (providerId: string) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/providers/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          apiKey: tempApiKey,
        }),
      });

      if (res.ok) {
        setSaveSuccess(providerId);
        setEditingKeyId(null);
        setTempApiKey('');
        onRefresh();
        setTimeout(() => setSaveSuccess(null), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="providers-view-container" className="max-w-5xl mx-auto space-y-6">
      {/* Title with Guidance Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Provider Architecture &amp; Multi-Key Rotation Pool</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Pool multiple free SERP API keys (250 searches/mo each) with automatic quota skipping and zero-fail live crawler fallback.
          </p>
        </div>

        {onOpenHowItWorks && (
          <button
            onClick={onOpenHowItWorks}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors self-start sm:self-auto shrink-0"
          >
            <HelpCircle className="w-4 h-4 text-teal-400" />
            <span>How Rotation Works</span>
          </button>
        )}
      </div>

      {/* MULTI-KEY ROTATION POOL SECTION */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">
                Multi-API Key Pool (Auto-Skip Limit Engine)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                250 searches/mo preset
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Add multiple SerpApi accounts. If one key reaches its 250 monthly limit or 429 rate limit, the system immediately skips it and seamlessly uses the next key!
            </p>
          </div>

          <button
            onClick={() => setIsAddingKey(!isAddingKey)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingKey ? 'Close Form' : 'Add API Key'}</span>
          </button>
        </div>

        {/* Status Alerts */}
        {poolStatus?.allExhaustedNotice && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs space-y-1">
            <div className="flex items-center space-x-2 text-red-400 font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>ALL CONFIGURED KEYS EXHAUSTED (0 CREDITS LEFT)</span>
            </div>
            <p className="text-slate-300">
              All keys reached their monthly limit. Crawlme has automatically engaged the Live Crawler Consensus Fallback node so your checks continue running. Add a new free account key to restore direct SERP API checks.
            </p>
          </div>
        )}

        {poolStatus?.lowCreditWarning && !poolStatus?.allExhaustedNotice && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-300 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Low Credits Alert:</strong> Only {poolStatus.totalRemainingCredits} searches remaining across keys! Add another free key now.
              </span>
            </div>
            <button
              onClick={() => setIsAddingKey(true)}
              className="px-3 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors ml-2 shrink-0"
            >
              Add Key
            </button>
          </div>
        )}

        {poolMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center space-x-2 ${
              poolMessage.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/15 border-red-500/30 text-red-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{poolMessage.text}</span>
          </div>
        )}

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Pool Capacity</span>
            <span className="text-xl font-extrabold text-white font-mono">{poolStatus?.totalMonthlyQuota || 0}</span>
            <span className="text-[10px] text-slate-500 block">searches/mo</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Remaining Searches</span>
            <span
              className={`text-xl font-extrabold font-mono ${
                (poolStatus?.totalRemainingCredits || 0) <= 100 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {poolStatus?.totalRemainingCredits || 0}
            </span>
            <span className="text-[10px] text-slate-500 block">{poolStatus?.totalUsedSearches || 0} used</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Active Keys</span>
            <span className="text-xl font-extrabold text-white font-mono">{poolStatus?.activeKeys || 0}</span>
            <span className="text-[10px] text-slate-500 block">{poolStatus?.exhaustedKeys || 0} exhausted</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Active Mode</span>
            <span className="text-xs font-bold text-emerald-400 block mt-1 truncate">
              {poolStatus?.fallbackActive ? 'Crawler Fallback' : 'SERP API Multi-Key'}
            </span>
            <span className="text-[10px] text-slate-500 block">Zero-fail protection</span>
          </div>
        </div>

        {/* Add Key Form */}
        {isAddingKey && (
          <form onSubmit={handleAddPoolKey} className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Add API Key to Rotation Engine</span>
              <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setAddMode('single')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    addMode === 'single' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Single Key
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('bulk')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    addMode === 'bulk' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Bulk Paste
                </button>
              </div>
            </div>

            {addMode === 'single' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  API Key Secret <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Paste your API key here..."
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Paste Multiple Keys (one per line) <span className="text-emerald-400">*</span>
                </label>
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  rows={3}
                  placeholder="key_account_1&#10;key_account_2&#10;key_account_3"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Label</label>
                <input
                  type="text"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="e.g. SerpApi Account #2"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Monthly Limit (Searches)</label>
                <input
                  type="number"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Hourly Throughput Limit</label>
                <input
                  type="number"
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                Preset matches SerpApi Free Plan: 250 searches/month, 50 searches/hour.
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddingKey(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingKey}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
                >
                  {submittingKey ? 'Adding...' : 'Add Key to Pool'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Keys List */}
        <div className="space-y-2">
          {poolStatus?.keys.map((key) => {
            const usedPct = Math.min(100, Math.round((key.usedCount / key.monthlyLimit) * 100));
            const remaining = Math.max(0, key.monthlyLimit - key.usedCount);
            const isExhausted = key.status === 'EXHAUSTED' || remaining === 0;

            return (
              <div
                key={key.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isExhausted ? 'bg-slate-950/60 border-slate-800/80 opacity-75' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-xs">{key.label}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          key.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : key.status === 'EXHAUSTED'
                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {key.status}
                        {isExhausted && ' (AUTO-SKIPPED)'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span>Key: {key.maskedKey}</span>
                      <span>•</span>
                      <span>
                        Hourly: <span className="text-cyan-300">{key.usedThisHour}/{key.hourlyLimit}</span>
                      </span>
                      <span>•</span>
                      <span>
                        Monthly:{' '}
                        <strong className="text-white">
                          {key.usedCount} / {key.monthlyLimit}
                        </strong>{' '}
                        ({remaining} left)
                      </span>
                    </div>

                    {/* Mini progress bar */}
                    <div className="w-full max-w-sm h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isExhausted ? 'bg-red-500' : usedPct > 80 ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleResetPoolKey(key.id)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 text-xs"
                      title="Reset usage counter for new billing cycle"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleTogglePoolKey(key.id)}
                      className={`p-1.5 rounded-lg border border-slate-800 text-xs ${
                        key.status === 'DISABLED'
                          ? 'bg-slate-900 text-slate-500'
                          : 'bg-slate-900 text-emerald-400'
                      }`}
                      title={key.status === 'DISABLED' ? 'Enable' : 'Disable'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePoolKey(key.id)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-800 text-xs"
                      title="Delete key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mock Mode Control Banner */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          mockMode
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base text-white">Mock Consensus Mode</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  mockMode
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {mockMode ? 'ENABLED (DEMO DATA)' : 'DISABLED (LIVE TOOLS ACTIVE)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Simulates high-speed consensus responses with realistic latency and deterministic variance.
              All returned records are prominently watermarked as <strong className="text-amber-300 font-mono">DEMO DATA</strong>.
            </p>
          </div>

          <button
            onClick={() => onUpdateMockMode(!mockMode)}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-colors self-start sm:self-auto ${
              mockMode
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20'
            }`}
          >
            {mockMode ? 'Switch to Live Providers' : 'Enable Mock Mode'}
          </button>
        </div>
      </div>

      {/* Provider List Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>Configured Verification Adapters</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((p) => {
            const isEditing = editingKeyId === p.id;
            return (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-base">{p.name}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          p.health === 'HEALTHY'
                            ? 'bg-emerald-400'
                            : p.health === 'DEGRADED'
                            ? 'bg-amber-400'
                            : 'bg-red-400'
                        }`}
                      ></span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono block">ID: {p.id}</span>
                  </div>

                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {p.type.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Rate Limit</span>
                    <span className="font-mono text-emerald-400 font-bold">{p.rateLimitReqPerSec} req/s</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Average Latency</span>
                    <span className="font-mono text-slate-300 font-bold">{p.avgLatencyMs} ms</span>
                  </div>
                </div>

                {/* API Key Configuration */}
                {p.type !== 'mock' && (
                  <div className="pt-2 border-t border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center space-x-1.5">
                        <Key className="w-3.5 h-3.5 text-slate-500" />
                        <span>Dedicated Key Override</span>
                      </span>
                      {p.hasApiKey ? (
                        <span className="text-emerald-400 font-semibold">Custom Configured</span>
                      ) : (
                        <span className="text-slate-500 font-semibold">Using Key Pool</span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 pt-1">
                        <input
                          type="password"
                          value={tempApiKey}
                          onChange={(e) => setTempApiKey(e.target.value)}
                          placeholder="Enter direct override key"
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleSaveApiKey(p.id)}
                            disabled={isSaving}
                            className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors"
                          >
                            Save Override
                          </button>
                          <button
                            onClick={() => {
                              setEditingKeyId(null);
                              setTempApiKey('');
                            }}
                            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingKeyId(p.id);
                          setTempApiKey('');
                        }}
                        className="text-xs text-emerald-400 hover:underline"
                      >
                        {p.hasApiKey ? 'Change Dedicated Override Key' : 'Set Specific Override Key'}
                      </button>
                    )}

                    {saveSuccess === p.id && (
                      <span className="text-emerald-400 text-[11px] block">Updated successfully!</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
