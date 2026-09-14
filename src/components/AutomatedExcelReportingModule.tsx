import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Table,
  Copy,
  Check,
  FileText,
  RotateCw,
  Sparkles,
  Layers,
  ArrowDownToLine,
  Sliders,
} from 'lucide-react';
import { BatchSummary } from '../types.js';

interface AutomatedExcelReportingModuleProps {
  batches: BatchSummary[];
  onSelectBatch?: (batchId: string) => void;
  className?: string;
}

export const AutomatedExcelReportingModule: React.FC<AutomatedExcelReportingModuleProps> = ({
  batches,
  onSelectBatch,
  className = '',
}) => {
  const [autoDownload, setAutoDownload] = useState<boolean>(() => {
    return localStorage.getItem('crawlme_auto_download') === 'true';
  });
  const [downloadFormat, setDownloadFormat] = useState<'2col_xlsx' | 'full_xlsx' | '2col_csv'>('2col_xlsx');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [copiedBatchId, setCopiedBatchId] = useState<string | null>(null);
  const [recentAutoDownloaded, setRecentAutoDownloaded] = useState<string | null>(null);

  // Track completed batch IDs to detect newly completed batches for auto-download
  const prevCompletedIdsRef = useRef<Set<string>>(new Set());

  // Filter completed batches
  const completedBatches = batches.filter((b) => b.progress.status === 'COMPLETED');

  // Auto-download listener
  useEffect(() => {
    const currentCompletedIds = new Set(completedBatches.map((b) => b.id));

    // If autoDownload is enabled and we have previous knowledge of batches
    if (autoDownload && prevCompletedIdsRef.current.size > 0) {
      for (const batch of completedBatches) {
        if (!prevCompletedIdsRef.current.has(batch.id)) {
          // Newly completed batch detected!
          triggerFileDownload(batch.id, batch.name, downloadFormat);
          setRecentAutoDownloaded(batch.name);
          setTimeout(() => setRecentAutoDownloaded(null), 4000);
          break;
        }
      }
    }

    prevCompletedIdsRef.current = currentCompletedIds;
  }, [completedBatches, autoDownload, downloadFormat]);

  const toggleAutoDownload = (val: boolean) => {
    setAutoDownload(val);
    localStorage.setItem('crawlme_auto_download', val ? 'true' : 'false');
  };

  const getDownloadUrl = (batchId: string, format: '2col_xlsx' | 'full_xlsx' | '2col_csv') => {
    if (format === 'full_xlsx') {
      return `/api/report/${batchId}/generate`; // POST then download
    }
    if (format === '2col_csv') {
      return `/api/bulk/${batchId}/export/simple?format=csv`;
    }
    // Default: 2-column Google Sheets XLSX with magenta header
    return `/api/bulk/${batchId}/export/simple?format=xlsx&magenta=true`;
  };

  const triggerFileDownload = async (
    batchId: string,
    batchName: string,
    format: '2col_xlsx' | 'full_xlsx' | '2col_csv'
  ) => {
    setGeneratingId(batchId);

    try {
      if (format === 'full_xlsx') {
        // Multi-sheet compiler endpoint
        const res = await fetch(`/api/report/${batchId}/generate`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          // Wait briefly for buffer compilation then trigger
          setTimeout(() => {
            const link = document.createElement('a');
            link.href = data.downloadUrl || `/api/report/${data.reportId}/download`;
            link.setAttribute('download', `Crawlme_Audit_${batchName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setGeneratingId(null);
          }, 800);
        } else {
          setGeneratingId(null);
        }
      } else {
        // Direct instant download
        const url = getDownloadUrl(batchId, format);
        const link = document.createElement('a');
        link.href = url;
        const ext = format === '2col_csv' ? 'csv' : 'xlsx';
        link.setAttribute('download', `${batchName.replace(/[^a-zA-Z0-9]/g, '_')}_LiveLink_Index.${ext}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => setGeneratingId(null), 300);
      }
    } catch {
      setGeneratingId(null);
    }
  };

  const handleCopyTsv = async (batchId: string) => {
    try {
      const res = await fetch(`/api/bulk/${batchId}/export/clipboard-data`);
      if (res.ok) {
        const data = await res.json();
        await navigator.clipboard.writeText(data.tsv);
        setCopiedBatchId(batchId);
        setTimeout(() => setCopiedBatchId(null), 2000);
      }
    } catch {
      // ignore
    }
  };

  const handleDownloadAll = () => {
    completedBatches.forEach((b, idx) => {
      setTimeout(() => {
        triggerFileDownload(b.id, b.name, downloadFormat);
      }, idx * 400);
    });
  };

  return (
    <div className={`rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden ${className}`}>
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Automated Excel Reporting Module
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono">
                {completedBatches.length} Completed
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              1-click spreadsheet generation and automated download triggers for verified batches
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Format Picker */}
          <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              onClick={() => setDownloadFormat('2col_xlsx')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                downloadFormat === '2col_xlsx'
                  ? 'bg-fuchsia-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Two-column format (Live Link | Index) for Google Sheets"
            >
              2-Col Sheets (.xlsx)
            </button>
            <button
              onClick={() => setDownloadFormat('full_xlsx')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                downloadFormat === 'full_xlsx'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Full 5-worksheet technical audit spreadsheet"
            >
              Full 5-Sheet (.xlsx)
            </button>
            <button
              onClick={() => setDownloadFormat('2col_csv')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                downloadFormat === '2col_csv'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="CSV format"
            >
              CSV
            </button>
          </div>

          {/* Auto-Download Toggle */}
          <button
            onClick={() => toggleAutoDownload(!autoDownload)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 border ${
              autoDownload
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Automatically download report file when a batch completes"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoDownload ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            ></span>
            <span>Auto-Download: {autoDownload ? 'ON' : 'OFF'}</span>
          </button>

          {/* Download All Completed */}
          {completedBatches.length > 1 && (
            <button
              onClick={handleDownloadAll}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center space-x-1.5 border border-slate-700 active:scale-95"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export All ({completedBatches.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Auto-Download Toast Notification */}
      {recentAutoDownloaded && (
        <div className="p-3 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              <strong>Auto-download triggered:</strong> Spreadsheet for &ldquo;{recentAutoDownloaded}&rdquo; was downloaded to your device.
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">Automated Module</span>
        </div>
      )}

      {/* Batches Table / List */}
      <div className="p-3">
        {completedBatches.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-300">
              No completed verification batches yet
            </p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Start a bulk verification check. When it finishes, the automated reporting module
              will trigger the download button and prepare your styled Excel reports.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {completedBatches.slice(0, 5).map((batch) => {
              const isGenerating = generatingId === batch.id;
              const isCopied = copiedBatchId === batch.id;
              const rate =
                batch.progress.processed > 0
                  ? Math.round(
                      ((batch.progress.indexed + batch.progress.likelyIndexed) /
                        batch.progress.processed) *
                        100
                    )
                  : 0;

              return (
                <div
                  key={batch.id}
                  className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 rounded-xl transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-white">{batch.name}</span>
                      <span className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Ready</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                      <span>
                        Total:{' '}
                        <strong className="text-slate-200 font-mono">
                          {batch.progress.total.toLocaleString()} URLs
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Indexed:{' '}
                        <strong className="text-emerald-400 font-mono">
                          {batch.progress.indexed} ({rate}%)
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Speed:{' '}
                        <strong className="text-sky-400 font-mono">
                          {batch.progress.averageSpeed || batch.progress.peakSpeed || 45} URLs/s
                        </strong>
                      </span>
                      <span>•</span>
                      <span>{new Date(batch.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Trigger File Download Button & Options */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    {/* Primary File Download Trigger Button */}
                    <button
                      onClick={() => triggerFileDownload(batch.id, batch.name, downloadFormat)}
                      disabled={isGenerating}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                      {isGenerating ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>
                            Download{' '}
                            {downloadFormat === '2col_xlsx'
                              ? '2-Col (.xlsx)'
                              : downloadFormat === 'full_xlsx'
                              ? 'Full Audit (.xlsx)'
                              : 'CSV (.csv)'}
                          </span>
                        </>
                      )}
                    </button>

                    {/* Quick 1-Click TSV Clipboard Button */}
                    <button
                      onClick={() => handleCopyTsv(batch.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center space-x-1 border border-slate-700"
                      title="Copy 2-column TSV directly for 1-click paste into Google Sheets"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy TSV</span>
                        </>
                      )}
                    </button>

                    {/* Direct View Batch */}
                    {onSelectBatch && (
                      <button
                        onClick={() => onSelectBatch(batch.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                      >
                        Inspect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
        <span className="flex items-center space-x-1.5">
          <Table className="w-3.5 h-3.5 text-fuchsia-400" />
          <span>
            Google Sheets Mode provides exact 2-column headers:{' '}
            <code className="text-fuchsia-300 font-mono">Live Link</code> and{' '}
            <code className="text-fuchsia-300 font-mono">Index</code>
          </span>
        </span>
        <span className="text-slate-500 font-mono text-[10px]">
          XLSX • Formula-Sanitized • ExcelJS Engine
        </span>
      </div>
    </div>
  );
};
