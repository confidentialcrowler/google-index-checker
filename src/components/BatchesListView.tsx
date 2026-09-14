import React from 'react';
import { Layers, Zap, Clock, ArrowRight, CheckCircle2, Play, Pause } from 'lucide-react';
import { BatchSummary } from '../types.js';
import { formatNumber, formatDateTime } from '../lib/format.js';

interface BatchesListViewProps {
  batches: BatchSummary[];
  onSelectBatch: (batchId: string) => void;
  onNewBatch: () => void;
}

export const BatchesListView: React.FC<BatchesListViewProps> = ({
  batches,
  onSelectBatch,
  onNewBatch,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight">Batch Monitor & History</h2>
          <p className="text-sm text-slate-400">
            Real-time status and historical log of all bulk verification jobs.
          </p>
        </div>
        <button
          onClick={onNewBatch}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20"
        >
          <Layers className="w-4 h-4" />
          <span>New Bulk Check</span>
        </button>
      </div>

      {batches.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Layers className="w-6 h-6" />
          </div>
          <p className="text-base font-semibold text-slate-200">No batches executed yet</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Start a bulk URL verification job to view live progress, processing speed, and Excel reports.
          </p>
          <button
            onClick={onNewBatch}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition-colors"
          >
            Start First Bulk Check
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(batches || []).map((b) => {
            const isRunning = b?.progress?.status === 'RUNNING';
            const progress = b?.progress || {
              processed: 0,
              total: 0,
              percent: 0,
              indexed: 0,
              likelyIndexed: 0,
              notFound: 0,
              errors: 0,
              currentSpeed: 0,
              status: 'PENDING',
            };
            return (
              <div
                key={b.id}
                onClick={() => onSelectBatch(b.id)}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer space-y-4 shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-base text-white">{b.name}</span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          progress.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : progress.status === 'RUNNING'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {progress.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">ID: {b.id}</div>
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-slate-400">
                    <div className="text-right">
                      <span className="font-mono text-white font-bold text-sm">
                        {formatNumber(progress.processed)}
                      </span>{' '}
                      / {formatNumber(progress.total)} URLs ({progress.percent || 0}%)
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${progress.percent || 0}%` }}
                  ></div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="text-emerald-400 font-semibold">{progress.indexed || 0} Indexed</span>
                    <span>•</span>
                    <span className="text-amber-400 font-semibold">{progress.likelyIndexed || 0} Likely</span>
                    <span>•</span>
                    <span className="text-red-400 font-semibold">{progress.notFound || 0} Not Found</span>
                    {(progress.errors || 0) > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-red-400 font-semibold">{progress.errors} Errors</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] font-mono">
                    {isRunning && (
                      <span className="text-emerald-400 font-bold">{progress.currentSpeed || 0} URLs/sec</span>
                    )}
                    <span>{formatDateTime(b.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
