import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Zap,
  ShieldCheck,
  Key,
} from 'lucide-react';
import { ProviderPingResult, ProviderPingResponse } from '../types.js';

interface SystemStatusPanelProps {
  onOpenKeyManager?: () => void;
  className?: string;
}

export const SystemStatusPanel: React.FC<SystemStatusPanelProps> = ({
  onOpenKeyManager,
  className = '',
}) => {
  const [data, setData] = useState<ProviderPingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [lastPingTime, setLastPingTime] = useState<Date>(new Date());
  const [autoPing, setAutoPing] = useState(true);

  const pingAllProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/providers/ping');
      if (res.ok) {
        const json: ProviderPingResponse = await res.json();
        setData(json);
        setLastPingTime(new Date());
      }
    } catch {
      // ignore network glitch in ping polling
    } finally {
      setLoading(false);
    }
  }, []);

  const pingSingleProvider = async (providerId: string) => {
    setPingingId(providerId);
    try {
      const res = await fetch(`/api/providers/${providerId}/ping`, { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            providers: prev.providers.map((p) =>
              p.providerId === providerId
                ? {
                    ...p,
                    latencyMs: result.latencyMs,
                    lastPingTime: result.timestamp,
                    message: result.message,
                  }
                : p
            ),
          };
        });
      }
    } catch {
      // ignore
    } finally {
      setPingingId(null);
    }
  };

  useEffect(() => {
    pingAllProviders();
    if (!autoPing) return;
    const timer = setInterval(() => {
      pingAllProviders();
    }, 15000);
    return () => clearInterval(timer);
  }, [pingAllProviders, autoPing]);

  const getStatusBadge = (p: ProviderPingResult) => {
    switch (p.status) {
      case 'OPERATIONAL':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>OPERATIONAL</span>
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>DEGRADED</span>
          </span>
        );
      case 'FALLBACK':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>FALLBACK ACTIVE</span>
          </span>
        );
      case 'STANDBY':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            <span>STANDBY</span>
          </span>
        );
      case 'OFFLINE':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>OFFLINE</span>
          </span>
        );
    }
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 50) return 'text-emerald-400';
    if (ms < 120) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className={`rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden ${className}`}>
      {/* Header Strip */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white tracking-tight">System Status Panel</h3>
              {data && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    data.overallStatus === 'ALL_HEALTHY'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : data.overallStatus === 'FALLBACK_ACTIVE'
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  }`}
                >
                  {data.overallStatus === 'ALL_HEALTHY'
                    ? 'All Systems Operational'
                    : data.overallStatus === 'FALLBACK_ACTIVE'
                    ? 'Zero-Fail Fallback Engaged'
                    : 'Partial Degradation'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live heartbeat and response latency across verification engines
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setAutoPing(!autoPing)}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              autoPing
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={autoPing ? 'Auto-ping every 15s is ON' : 'Auto-ping is PAUSED'}
          >
            {autoPing ? 'Auto-Ping ON' : 'Auto-Ping OFF'}
          </button>

          <button
            onClick={() => pingAllProviders()}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold transition-all flex items-center space-x-1.5 border border-slate-700 active:scale-95"
            title="Ping all providers now"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Pinging...' : 'Ping All'}</span>
          </button>
        </div>
      </div>

      {/* Provider List */}
      <div className="p-3 space-y-2">
        {!data && loading ? (
          <div className="p-6 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin mx-auto" />
            <p>Pinging configured provider network...</p>
          </div>
        ) : !data || data.providers.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            No active providers detected.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.providers
              .filter((p) => !p.isMock || p.providerId === 'mock_consensus_1')
              .map((p) => {
                const isPingingThis = pingingId === p.providerId;
                return (
                  <div
                    key={p.providerId}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-slate-200">{p.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{p.message}</p>
                      </div>
                      {getStatusBadge(p)}
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center space-x-1">
                          <Activity className="w-3 h-3 text-slate-500" />
                          <span className={`font-mono font-bold ${getLatencyColor(p.latencyMs)}`}>
                            {p.latencyMs}ms
                          </span>
                        </span>

                        {p.keysActive !== undefined && (
                          <span className="flex items-center space-x-1 text-slate-300">
                            <Key className="w-3 h-3 text-amber-400" />
                            <span className="font-mono">{p.keysActive} keys active</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {p.status === 'FALLBACK' && onOpenKeyManager && (
                          <button
                            onClick={onOpenKeyManager}
                            className="text-[10px] text-amber-400 hover:underline font-semibold"
                          >
                            + Add Keys
                          </button>
                        )}

                        <button
                          onClick={() => pingSingleProvider(p.providerId)}
                          disabled={isPingingThis}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                          title="Ping this provider"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${isPingingThis ? 'animate-spin text-emerald-400' : ''}`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Footer Meta Note */}
      <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
        <span>
          Last pinged: {lastPingTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        <span className="flex items-center space-x-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Multi-cluster failover guaranteed</span>
        </span>
      </div>
    </div>
  );
};
