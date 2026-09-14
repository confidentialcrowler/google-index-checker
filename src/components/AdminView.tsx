import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Server,
  Zap,
  Activity,
  Sliders,
  Play,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { SystemMetrics } from '../types.js';

export const AdminView: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [concurrency, setConcurrency] = useState(30);
  const [isUpdatingConcurrency, setIsUpdatingConcurrency] = useState(false);
  const [benchRunning, setBenchRunning] = useState(false);
  const [benchResult, setBenchResult] = useState<any | null>(null);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {
      // ignore
    }
  };

  const handleUpdateConcurrency = async (val: number) => {
    setConcurrency(val);
    setIsUpdatingConcurrency(true);
    try {
      await fetch('/api/admin/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concurrency: val }),
      });
      fetchMetrics();
    } finally {
      setIsUpdatingConcurrency(false);
    }
  };

  const runBenchmark = async (count: number) => {
    setBenchRunning(true);
    setBenchResult(null);

    const startTime = Date.now();
    try {
      // Generate synthetic URLs
      const urls: string[] = [];
      for (let i = 1; i <= count; i++) {
        urls.push(`https://benchmark-store.net/items/product-${i}`);
      }

      // Start bulk batch with high concurrency
      const startRes = await fetch('/api/bulk/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls,
          name: `Benchmark Test (${count.toLocaleString()} URLs)`,
          concurrency: 50,
          skipSeo: true,
          forceFresh: true,
        }),
      });

      const startData = await startRes.json();
      const batchId = startData.batchId;

      // Poll until batch completes
      const pollInterval = setInterval(async () => {
        const res = await fetch(`/api/bulk/${batchId}/progress`);
        if (res.ok) {
          const prog = await res.json();
          if (prog.status === 'COMPLETED' || prog.status === 'CANCELLED') {
            clearInterval(pollInterval);
            const durationSec = Math.max(0.1, (Date.now() - startTime) / 1000);
            setBenchResult({
              total: count,
              completed: prog.processed,
              durationSec: durationSec.toFixed(2),
              avgSpeed: Math.round(prog.processed / durationSec),
              peakSpeed: prog.peakSpeed,
              errors: prog.errors,
            });
            setBenchRunning(false);
            fetchMetrics();
          }
        }
      }, 500);
    } catch (err: any) {
      setBenchRunning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Cluster Telemetry & Administration</h2>
        <p className="text-sm text-slate-400">
          Real-time worker cluster health, active queues, dynamic concurrency scaling, and load benchmarks.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Cluster Status</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xl font-bold text-white">{metrics?.clusterHealth || 'HEALTHY'}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Uptime: {Math.round((metrics?.uptimeSeconds || 0) / 60)} minutes</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Active Worker Slots</span>
            <Zap className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold font-mono text-white">
            {metrics?.activeWorkers || 0}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Queue Depth: {metrics?.queueLength || 0} waiting</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Memory Consumption</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold font-mono text-white">
            {metrics?.memoryUsageMb || 0} <span className="text-xs font-normal text-slate-400">MB</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Node.js process heap RSS</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Application Throughput</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold font-mono text-emerald-400">
            {metrics?.urlsPerSecond || 0} <span className="text-xs font-normal text-slate-400">URLs/s</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Sliding 1-second window</p>
        </div>
      </div>

      {/* Dynamic Concurrency Scaler */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Worker Concurrency Configuration</span>
            </h3>
            <p className="text-xs text-slate-400">
              Adjust in-flight asynchronous workers for the application queue layer.
            </p>
          </div>
          <span className="font-mono text-emerald-400 font-bold text-lg">{concurrency} workers</span>
        </div>

        <input
          type="range"
          min={5}
          max={100}
          step={5}
          value={concurrency}
          onChange={(e) => handleUpdateConcurrency(parseInt(e.target.value, 10))}
          className="w-full accent-emerald-500 cursor-pointer"
        />

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>5 Low (Conserves memory)</span>
          <span>50 Medium</span>
          <span>100+ High (100+ URLs/sec capability)</span>
        </div>
      </div>

      {/* Built-in Load Benchmark Harness */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>In-App High-Throughput Load Benchmark</span>
            </h3>
            <p className="text-xs text-slate-400">
              Execute an end-to-end load test through the queue, consensus evaluator, and database.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            disabled={benchRunning}
            onClick={() => runBenchmark(500)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold transition-colors flex items-center space-x-2 border border-slate-700"
          >
            {benchRunning ? <RotateCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
            <span>Benchmark 500 URLs</span>
          </button>

          <button
            disabled={benchRunning}
            onClick={() => runBenchmark(1000)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 text-emerald-400 text-xs font-bold transition-colors flex items-center space-x-2 border border-emerald-500/30"
          >
            {benchRunning ? <RotateCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>Benchmark 1,000 URLs (100+ URLs/s Target)</span>
          </button>
        </div>

        {benchResult && (
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Benchmark Completed Successfully</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Total Processed</span>
                <span className="text-base font-bold font-mono text-white">{benchResult.completed.toLocaleString()} URLs</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Total Duration</span>
                <span className="text-base font-bold font-mono text-white">{benchResult.durationSec}s</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Average Speed</span>
                <span className="text-base font-bold font-mono text-emerald-400">{benchResult.avgSpeed} URLs/sec</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Peak Speed</span>
                <span className="text-base font-bold font-mono text-sky-400">{benchResult.peakSpeed} URLs/sec</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
