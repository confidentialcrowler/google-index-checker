import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  Layers,
  ArrowRight,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  FileSpreadsheet,
  Eye,
  EyeOff,
} from 'lucide-react';
import { BatchSummary, SystemMetrics, ProviderConfig } from '../types.js';
import { DataCollectionVisual3D } from './DataCollectionVisual3D.js';
import { BatchSuccessTrendChart } from './BatchSuccessTrendChart.js';
import { SystemStatusPanel } from './SystemStatusPanel.js';
import { AutomatedExcelReportingModule } from './AutomatedExcelReportingModule.js';

interface DashboardViewProps {
  onNavigate: (tab: string, batchId?: string) => void;
  batches: BatchSummary[];
  providers: ProviderConfig[];
  mockMode: boolean;
  onOpenKeyManager?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  batches,
  providers,
  mockMode,
  onOpenKeyManager,
}) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [quickUrl, setQuickUrl] = useState('');
  const [show3dVisual, setShow3dVisual] = useState(true);

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
      // ignore in dev
    }
  };

  const handleQuickCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickUrl.trim()) {
      sessionStorage.setItem('pending_quick_url', quickUrl.trim());
      onNavigate('single');
    }
  };

  const activeBatch = batches.find((b) => b.progress.status === 'RUNNING');
  const recentBatches = batches.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Top Banner / Hero Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Processing Throughput
            </span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {activeBatch ? activeBatch.progress.currentSpeed : metrics?.urlsPerSecond || 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">URLs / sec</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Peak benchmark capability: <span className="text-emerald-400 font-semibold font-mono">100+ URLs/sec</span>
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total URLs Verified
            </span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {(metrics?.completedJobsTotal || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">processed</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Across {batches.length} verification batches
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Workers
            </span>
            <Server className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {activeBatch ? activeBatch.progress.activeWorkers : metrics?.activeWorkers || 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">concurrent slots</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Queue length: {activeBatch ? activeBatch.progress.remaining : metrics?.queueLength || 0}
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Provider Engine
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-lg font-bold text-white">
              {mockMode ? 'Consensus Pool' : 'Multi-Provider Live'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {mockMode ? 'Mock verification pool (Demo Mode)' : 'API limits enforced automatically'}
          </p>
        </div>
      </div>

      {/* 3D Process Data Collection Visualizer */}
      {show3dVisual && (
        <DataCollectionVisual3D
          isCollecting={Boolean(activeBatch)}
          liveMode={!mockMode}
          currentUrl={activeBatch?.name || quickUrl || 'https://google.com/search'}
          speed={activeBatch ? activeBatch.progress.currentSpeed : metrics?.urlsPerSecond || 0}
          processedCount={activeBatch ? activeBatch.progress.processed : metrics?.completedJobsTotal || 0}
          totalCount={activeBatch ? activeBatch.progress.total : 0}
        />
      )}

      {/* Quick URL Checker Action Bar */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 shadow-xl">
        <div className="max-w-3xl">
          <h2 className="text-lg font-bold text-white tracking-tight">Instant Single URL Index Inspection</h2>
          <p className="text-sm text-slate-400 mt-1">
            Query multiple search index consensus signals and inspect HTTP status, canonical tags, and robots directives.
          </p>

          <form onSubmit={handleQuickCheck} className="mt-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                placeholder="https://example.com/blog/sample-post"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20"
            >
              <span>Inspect URL</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('bulk')}
              className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-colors flex items-center justify-center space-x-2"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Bulk 1,000+ Upload</span>
            </button>
          </form>
        </div>
      </div>

      {/* Real-time D3.js Line Chart: Batch Success Rates & Trends */}
      <BatchSuccessTrendChart
        batches={batches}
        onSelectBatch={(id) => onNavigate('batches', id)}
      />

      {/* Automated Excel Reporting Module */}
      <AutomatedExcelReportingModule
        batches={batches}
        onSelectBatch={(id) => onNavigate('batches', id)}
      />

      {/* Two Column Layout: Verification Batches & Small System-Status Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batches Column (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Recent Verification Batches</span>
            </h3>
            <button
              onClick={() => onNavigate('bulk')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
            >
              <span>New Bulk Check</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {batches.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Layers className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-300">No verification batches yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload a TXT, CSV, or XLSX file with 100 to 10,000+ URLs to run high-throughput consensus checks.
              </p>
              <button
                onClick={() => onNavigate('bulk')}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition-colors"
              >
                Upload URL List
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBatches.map((batch) => {
                const isRunning = batch.progress.status === 'RUNNING';
                return (
                  <div
                    key={batch.id}
                    onClick={() => onNavigate('batches', batch.id)}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-semibold text-sm text-slate-100">{batch.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            batch.progress.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : batch.progress.status === 'RUNNING'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {batch.progress.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 font-mono">
                        {batch.progress.processed} / {batch.progress.total} ({batch.progress.percent}%)
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${batch.progress.percent}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center space-x-3 text-[11px]">
                        <span className="text-emerald-400 font-semibold">{batch.progress.indexed} Indexed</span>
                        <span className="text-amber-400 font-semibold">{batch.progress.likelyIndexed} Likely</span>
                        <span className="text-red-400 font-semibold">{batch.progress.notFound} Not Found</span>
                      </div>

                      <div className="flex items-center space-x-2 font-mono text-[11px]">
                        {isRunning && (
                          <span className="text-emerald-400 font-bold">{batch.progress.currentSpeed} URLs/sec</span>
                        )}
                        <span>{new Date(batch.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Small System-Status Panel (1/3) */}
        <div className="space-y-4">
          <SystemStatusPanel onOpenKeyManager={onOpenKeyManager} />
        </div>
      </div>
    </div>
  );
};
