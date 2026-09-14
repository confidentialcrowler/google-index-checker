import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Plus,
  Trash2,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Server,
  Zap,
  Power,
  Layers,
  Sparkles,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { ApiKeyEntry, ApiPoolStatus } from '../types.js';

interface MultiKeyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPoolUpdated?: () => void;
}

export const MultiKeyManagerModal: React.FC<MultiKeyManagerModalProps> = ({
  isOpen,
  onClose,
  onPoolUpdated,
}) => {
  const [poolStatus, setPoolStatus] = useState<ApiPoolStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');

  // Form states
  const [keyInput, setKeyInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState(250); // SerpApi free tier default from image
  const [hourlyLimit, setHourlyLimit] = useState(50); // SerpApi free tier throughput/hr from image
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchKeys();
    }
  }, [isOpen]);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/keys');
      if (res.ok) {
        const data = await res.json();
        setPoolStatus(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMsg(null);

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
        setIsAdding(false);
        setStatusMsg({ text: 'API Key(s) added successfully to rotation pool!', type: 'success' });
        onPoolUpdated?.();
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        setStatusMsg({ text: data.error || 'Failed to add API key', type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Network error', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Remove this API key from the rotation pool?')) return;
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setPoolStatus(data.pool);
        onPoolUpdated?.();
      }
    } catch {
      // ignore
    }
  };

  const handleToggleKey = async (id: string) => {
    try {
      const res = await fetch(`/api/keys/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPoolStatus(data.pool);
        onPoolUpdated?.();
      }
    } catch {
      // ignore
    }
  };

  const handleResetUsage = async (id: string) => {
    try {
      const res = await fetch(`/api/keys/${id}/reset`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPoolStatus(data.pool);
        onPoolUpdated?.();
      }
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="multi-key-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="multi-key-modal-container"
        className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <Key className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Multi-API Key Rotation &amp; Credit Pool</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Auto-Skip Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pool multiple free SerpApi accounts (250 searches/mo each) with automatic quota skipping &amp; fallback
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-md shadow-emerald-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Close Form' : 'Add API Key'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Status Message Notification */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center space-x-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-500/15 border-red-500/40 text-red-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* CRITICAL WARNING BANNERS */}
          {poolStatus?.allExhaustedNotice && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-xs space-y-2 shadow-lg">
              <div className="flex items-center space-x-2 text-red-400 font-bold text-sm">
                <ShieldAlert className="w-4 h-4" />
                <span>ALL API CREDITS EXHAUSTED (0 Searches Remaining)</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                All configured API keys have reached their monthly limit (250 queries/key).
                <strong className="text-emerald-400 ml-1">
                  The system has automatically engaged Live Crawler Fallback Mode
                </strong>{' '}
                so your checks will continue to run without errors. Please add a new API key to restore high-speed SERP API verification.
              </p>
            </div>
          )}

          {poolStatus?.lowCreditWarning && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs space-y-2 shadow-lg">
              <div className="flex items-center space-x-2 text-amber-300 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>LOW API CREDITS NOTICE: Only {poolStatus.totalRemainingCredits} Searches Remaining!</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Your remaining credit pool is running low ({poolStatus.totalRemainingCredits} searches left across all keys). Add another free SerpApi account key (250 queries) now to prevent any throttling on bulk checks.
              </p>
            </div>
          )}

          {/* Summary Stat Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Credit Pool
              </span>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span className="text-2xl font-extrabold font-mono text-white">
                  {poolStatus?.totalMonthlyQuota || 0}
                </span>
                <span className="text-xs text-slate-500 font-medium">searches/mo</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Across {poolStatus?.totalKeys || 0} configured keys
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Remaining Credits
              </span>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span
                  className={`text-2xl font-extrabold font-mono ${
                    (poolStatus?.totalRemainingCredits || 0) <= 100
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {poolStatus?.totalRemainingCredits || 0}
                </span>
                <span className="text-xs text-slate-500 font-medium">available</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {poolStatus?.totalUsedSearches || 0} searches executed
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Key Pool Health
              </span>
              <div className="mt-1 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-lg font-bold text-white font-mono">
                  {poolStatus?.activeKeys || 0} Active
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {poolStatus?.exhaustedKeys || 0} keys exhausted &amp; skipped
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Engine Mode
              </span>
              <div className="mt-1 flex items-center space-x-1 text-emerald-300 font-bold text-sm">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>{poolStatus?.fallbackActive ? 'Crawler Fallback' : 'SERP API Multi-Key'}</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                50 throughput/hr per key limit
              </span>
            </div>
          </div>

          {/* ADD KEY FORM (COLLAPSIBLE) */}
          {isAdding && (
            <div className="p-5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">Add API Key to Rotation Pool</span>
                </div>
                {/* Single vs Bulk Mode Toggle */}
                <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setAddMode('single')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      addMode === 'single' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Single Key
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMode('bulk')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      addMode === 'bulk' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Bulk Paste
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddKey} className="space-y-4">
                {addMode === 'single' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      API Secret Key <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder="e.g. 7a3c8e9b41f..."
                      required
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Paste Multiple API Keys (One per line) <span className="text-emerald-400">*</span>
                    </label>
                    <textarea
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      rows={3}
                      placeholder="serp_key_account_1&#10;serp_key_account_2&#10;serp_key_account_3"
                      required
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Account / Key Label
                    </label>
                    <input
                      type="text"
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      placeholder="e.g. SerpApi Free Account #2"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Monthly Searches Limit
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={monthlyLimit}
                        onChange={(e) => setMonthlyLimit(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2 text-[10px] text-slate-500">Free: 250</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Hourly Throughput Limit
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={hourlyLimit}
                        onChange={(e) => setHourlyLimit(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2 text-[10px] text-slate-500">Free: 50/hr</span>
                    </div>
                  </div>
                </div>

                {/* Preset Guidance Box based on user image */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      Preset matches <strong>SerpApi Free Plan</strong>: 250 searches/month, 50 searches/hour.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMonthlyLimit(250);
                      setHourlyLimit(50);
                    }}
                    className="text-xs text-emerald-400 hover:underline font-semibold"
                  >
                    Reset Preset (250/50)
                  </button>
                </div>

                <div className="flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    {isSubmitting ? 'Saving to Pool...' : 'Add to Key Pool'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* KEYS LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Key Pool ({poolStatus?.keys.length || 0})
              </h3>
              <span className="text-[11px] text-slate-500">
                Auto-rotates &amp; skips exhausted keys seamlessly
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Loading API keys rotation pool...
              </div>
            ) : !poolStatus?.keys.length ? (
              <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <Key className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-white">No API Keys in Pool</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Add one or more free account keys to enable automated multi-key rotation and avoid rate limits.
                </p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="mt-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
                >
                  Add Your First Key (250 Searches Free)
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {poolStatus.keys.map((key) => {
                  const usedPct = Math.min(100, Math.round((key.usedCount / key.monthlyLimit) * 100));
                  const remaining = Math.max(0, key.monthlyLimit - key.usedCount);
                  const isExhausted = key.status === 'EXHAUSTED' || remaining === 0;

                  return (
                    <div
                      key={key.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isExhausted
                          ? 'bg-slate-950/60 border-slate-800/80 opacity-75'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 shadow-md'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-xs sm:text-sm truncate">
                              {key.label}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                key.status === 'ACTIVE'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : key.status === 'EXHAUSTED'
                                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                  : key.status === 'RATE_LIMITED'
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {key.status}
                              {isExhausted && ' (SKIPPED)'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                            <span>Key: <span className="text-slate-200">{key.maskedKey}</span></span>
                            <span>•</span>
                            <span>Hourly Used: <span className="text-cyan-300">{key.usedThisHour}/{key.hourlyLimit}</span></span>
                            {key.lastUsedAt && (
                              <>
                                <span>•</span>
                                <span className="text-slate-500 text-[11px]">
                                  Last used: {new Date(key.lastUsedAt).toLocaleTimeString()}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1 pt-1 max-w-md">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400">
                                Monthly Searches:{' '}
                                <strong className="text-white font-mono">
                                  {key.usedCount} / {key.monthlyLimit}
                                </strong>
                              </span>
                              <span
                                className={`font-mono font-semibold ${
                                  remaining <= 25 ? 'text-red-400' : 'text-emerald-400'
                                }`}
                              >
                                {remaining} remaining
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-850 overflow-hidden">
                              <div
                                className={`h-full transition-all rounded-full ${
                                  isExhausted
                                    ? 'bg-red-500'
                                    : usedPct > 80
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${usedPct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-1.5 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => handleResetUsage(key.id)}
                            className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 text-xs transition-colors border border-slate-800"
                            title="Reset monthly usage counter (e.g. at start of billing month)"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleKey(key.id)}
                            className={`p-1.5 rounded-lg text-xs transition-colors border ${
                              key.status === 'DISABLED'
                                ? 'bg-slate-850 text-slate-500 border-slate-800 hover:text-emerald-400'
                                : 'bg-slate-850 text-emerald-400 border-slate-800 hover:text-slate-300'
                            }`}
                            title={key.status === 'DISABLED' ? 'Enable Key' : 'Disable Key'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteKey(key.id)}
                            className="p-1.5 rounded-lg bg-slate-850 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs transition-colors border border-slate-800"
                            title="Delete Key from Pool"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono">
            {poolStatus?.totalRemainingCredits || 0} searches left across pool
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
