import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Pause,
  Play,
  RotateCcw,
  FileSpreadsheet,
  Download,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  Table,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { BatchSummary, UrlCheckResult } from '../types.js';
import { formatNumber, formatDate, formatDateTime } from '../lib/format.js';
import { UrlDetailModal } from './UrlDetailModal.js';
import { ExportModal } from './ExportModal.js';
import { DataCollectionVisual3D } from './DataCollectionVisual3D.js';

interface BatchDetailViewProps {
  batchId: string;
  onBack: () => void;
}

export const BatchDetailView: React.FC<BatchDetailViewProps> = ({ batchId, onBack }) => {
  const [batch, setBatch] = useState<BatchSummary | null>(null);
  const [results, setResults] = useState<UrlCheckResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const [selectedResult, setSelectedResult] = useState<UrlCheckResult | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [downloadReportUrl, setDownloadReportUrl] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'standard' | 'simple-sheet'>('simple-sheet');
  const [quickCopied, setQuickCopied] = useState(false);
  const [show3dVisual, setShow3dVisual] = useState(true);
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const autoDownloadTriggeredRef = useRef(false);

  useEffect(() => {
    fetchBatch();
    fetchResults();

    const interval = setInterval(() => {
      fetchBatch();
      fetchResults();
    }, 1200);

    return () => clearInterval(interval);
  }, [batchId, statusFilter, searchQuery, page]);

  // Automated Excel Report Trigger on Batch Completion
  useEffect(() => {
    if (
      batch &&
      batch.progress.status === 'COMPLETED' &&
      !autoDownloadTriggeredRef.current
    ) {
      const isAuto = localStorage.getItem('crawlme_auto_download') === 'true';
      if (isAuto) {
        autoDownloadTriggeredRef.current = true;
        setAutoDownloaded(true);
        const link = document.createElement('a');
        link.href = `/api/bulk/${batchId}/export/simple?format=xlsx&magenta=true`;
        link.setAttribute('download', `${batch.name.replace(/[^a-zA-Z0-9]/g, '_')}_LiveLink_Index.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }, [batch, batchId]);

  const fetchBatch = async () => {
    try {
      const res = await fetch(`/api/bulk/${batchId}`);
      if (res.ok) {
        const data = await res.json();
        setBatch(data);
      }
    } catch {
      // ignore
    }
  };

  const fetchResults = async () => {
    try {
      const offset = page * pageSize;
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(offset),
      });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/bulk/${batchId}/results?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.items);
        setTotalResults(data.total);
      }
    } catch {
      // ignore
    }
  };

  const handlePause = async () => {
    await fetch(`/api/bulk/${batchId}/pause`, { method: 'POST' });
    fetchBatch();
  };

  const handleResume = async () => {
    await fetch(`/api/bulk/${batchId}/resume`, { method: 'POST' });
    fetchBatch();
  };

  const handleCancel = async () => {
    if (confirm('Cancel the remaining URLs in this verification batch?')) {
      await fetch(`/api/bulk/${batchId}/cancel`, { method: 'POST' });
      fetchBatch();
    }
  };

  const handleRetryFailed = async () => {
    setIsRetrying(true);
    try {
      await fetch(`/api/bulk/${batchId}/retry`, { method: 'POST' });
      fetchBatch();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setDownloadReportUrl(null);

    try {
      const res = await fetch(`/api/report/${batchId}/generate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.downloadUrl) {
        // Poll for ready status
        setTimeout(() => {
          setDownloadReportUrl(data.downloadUrl);
          setGeneratingReport(false);
        }, 1200);
      } else {
        setGeneratingReport(false);
      }
    } catch {
      setGeneratingReport(false);
    }
  };

  const handleQuickCopy = async () => {
    try {
      const res = await fetch(`/api/bulk/${batchId}/export/clipboard-data?indexedLabel=Index&nonIndexedLabel=No-index`);
      if (res.ok) {
        const data = await res.json();
        await navigator.clipboard.writeText(data.tsv);
        setQuickCopied(true);
        setTimeout(() => setQuickCopied(false), 2000);
      }
    } catch {
      // ignore
    }
  };

  const getSimpleVerdict = (r: UrlCheckResult): 'Index' | 'No-index' => {
    if (r.simpleVerdict) return r.simpleVerdict;
    if (r.status === 'CONFIRMED_INDEXED' || r.status === 'LIKELY_INDEXED') {
      return 'Index';
    }
    return 'No-index';
  };

  const formatEta = (seconds: number) => {
    if (seconds <= 0) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!batch) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm">Loading verification batch data...</p>
      </div>
    );
  }

  const isRunning = batch.progress.status === 'RUNNING';
  const isPaused = batch.progress.status === 'PAUSED';
  const isCompleted = batch.progress.status === 'COMPLETED';

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-white tracking-tight">{batch.name}</h2>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  isRunning
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 animate-pulse'
                    : isCompleted
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {batch.progress.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">Batch ID: {batch.id}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {isRunning && (
            <button
              onClick={handlePause}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1.5"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

          {isPaused && (
            <button
              onClick={handleResume}
              className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition-colors flex items-center space-x-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume</span>
            </button>
          )}

          {isRunning && (
            <button
              onClick={handleCancel}
              className="px-3.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          )}

          {batch.progress.errors > 0 && !isRunning && (
            <button
              onClick={handleRetryFailed}
              disabled={isRetrying}
              className="px-3.5 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry {batch.progress.errors} Errors</span>
            </button>
          )}

          {/* 3D Visualizer Toggle */}
          <button
            onClick={() => setShow3dVisual(!show3dVisual)}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center space-x-1.5 border border-slate-700"
            title="Toggle 3D WebGL data collection visualizer"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>{show3dVisual ? 'Hide 3D View' : 'Show 3D View'}</span>
          </button>

          {/* Quick Copy for Google Sheets (Ctrl+V) */}
          <button
            onClick={handleQuickCopy}
            disabled={batch.progress.processed === 0}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1.5 border border-slate-700"
            title="Copy TSV to clipboard - paste directly into Google Sheets (Ctrl+V)"
          >
            {quickCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied for Sheets!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-sky-400" />
                <span>Copy for Google Sheets</span>
              </>
            )}
          </button>

          {/* Primary 2-Column Download Button (Live Link | Index) */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            disabled={batch.progress.processed === 0}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT 2-COL SHEET</span>
            <span className="text-[10px] bg-slate-950/20 px-1.5 py-0.5 rounded font-mono">Live Link &amp; Index</span>
          </button>

          {/* Excel Comprehensive Report Download Button */}
          {downloadReportUrl ? (
            <a
              href={downloadReportUrl}
              download
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-2 border border-slate-700"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Full XLSX (5 Sheets)</span>
            </a>
          ) : (
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport || batch.progress.processed === 0}
              className="px-3.5 py-2 rounded-lg bg-slate-850 hover:bg-slate-800 disabled:opacity-50 text-slate-300 text-xs font-semibold transition-colors flex items-center space-x-1.5 border border-slate-800"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
              <span>{generatingReport ? 'Compiling 5-Sheet...' : 'Full Audit XLSX'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Automated Excel Report Completion Module Banner */}
      {batch.progress.status === 'COMPLETED' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-sm text-white">
                    Batch Complete — Automated Excel Report Generated
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    100% READY
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {batch.progress.total.toLocaleString()} URLs processed • {batch.progress.indexed} Confirmed Indexed • {batch.progress.notFound} Non-Indexed
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/api/bulk/${batchId}/export/simple?format=xlsx&magenta=true`}
                download
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition-all flex items-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>DOWNLOAD 2-COL EXCEL</span>
              </a>

              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1.5 border border-slate-700"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>{downloadReportUrl ? 'Download 5-Sheet XLSX' : 'Compile 5-Sheet'}</span>
              </button>

              <button
                onClick={handleQuickCopy}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center space-x-1.5 border border-slate-700"
                title="Copy TSV for Google Sheets"
              >
                {quickCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{quickCopied ? 'Copied!' : 'Copy TSV'}</span>
              </button>
            </div>
          </div>

          {autoDownloaded && (
            <div className="text-[11px] text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Automated Excel reporting triggered a download of the report to your device.</span>
            </div>
          )}
        </div>
      )}

      {/* 3D Process Data Collection Visualizer */}
      {show3dVisual && (
        <DataCollectionVisual3D
          isCollecting={isRunning}
          liveMode={!batch.providerSelection?.some((p) => p.includes('mock'))}
          currentUrl={results[0]?.originalUrl || batch.name}
          speed={batch.progress.currentSpeed}
          processedCount={batch.progress.processed}
          totalCount={batch.progress.total}
        />
      )}

      {/* Live Speedometer & Real-Time Metrics Strip */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Current Speed
            </span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold font-mono text-emerald-400">
                {batch.progress.currentSpeed}
              </span>
              <span className="text-[10px] text-slate-400">URLs/s</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Average Speed
            </span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold font-mono text-white">
                {batch.progress.averageSpeed}
              </span>
              <span className="text-[10px] text-slate-400">URLs/s</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Peak Speed
            </span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold font-mono text-sky-400">
                {batch.progress.peakSpeed}
              </span>
              <span className="text-[10px] text-slate-400">URLs/s</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Active Workers
            </span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold font-mono text-white">
                {batch.progress.activeWorkers}
              </span>
              <span className="text-[10px] text-slate-400">slots</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              ETA Countdown
            </span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-xl font-extrabold font-mono text-amber-300">
                {formatEta(batch.progress.etaSeconds)}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Processed / Total
            </span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-xl font-extrabold font-mono text-white">
                {batch.progress.processed.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">/ {batch.progress.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Big Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Overall Batch Progress</span>
            <span className="font-mono text-emerald-400 font-bold">{batch.progress.percent}%</span>
          </div>
          <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                isRunning ? 'bg-emerald-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${batch.progress.percent}%` }}
            ></div>
          </div>
        </div>

        {/* Result Counter Chips */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            All Results ({batch.progress.processed})
          </button>

          <button
            onClick={() => setStatusFilter('CONFIRMED_INDEXED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === 'CONFIRMED_INDEXED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-950 text-emerald-400 border border-slate-800'
            }`}
          >
            Confirmed Indexed: {batch.progress.indexed}
          </button>

          <button
            onClick={() => setStatusFilter('LIKELY_INDEXED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === 'LIKELY_INDEXED'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-950 text-amber-400 border border-slate-800'
            }`}
          >
            Likely Indexed: {batch.progress.likelyIndexed}
          </button>

          <button
            onClick={() => setStatusFilter('NOT_INDEXED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === 'NOT_INDEXED'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : 'bg-slate-950 text-red-400 border border-slate-800'
            }`}
          >
            Not Found: {batch.progress.notFound}
          </button>

          <button
            onClick={() => setStatusFilter('UNKNOWN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === 'UNKNOWN'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            Unknown: {batch.progress.unknown}
          </button>

          {batch.progress.errors > 0 && (
            <button
              onClick={() => setStatusFilter('ERROR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === 'ERROR'
                  ? 'bg-red-600/30 text-red-200 border border-red-500'
                  : 'bg-slate-950 text-red-400 border border-slate-800'
              }`}
            >
              Errors: {batch.progress.errors}
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search URL or title..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* View Mode Toggle: 2-Column Sheet View vs Detailed Technical View */}
        <div className="flex items-center space-x-2 w-full lg:w-auto justify-between lg:justify-end">
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setViewMode('simple-sheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === 'simple-sheet'
                  ? 'bg-[#FF00FF] text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>2-Column Sheet View</span>
            </button>
            <button
              onClick={() => setViewMode('standard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === 'standard'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Detailed SEO View</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono whitespace-nowrap pl-2">
            {totalResults.toLocaleString()} URLs
          </div>
        </div>
      </div>

      {/* Live Results Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          {viewMode === 'simple-sheet' ? (
            /* ==================================================== */
            /* EXACT 2-COLUMN GOOGLE SHEETS VIEW (Matches image)   */
            /* ==================================================== */
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-800" style={{ backgroundColor: '#FF00FF' }}>
                  <th className="py-3 px-4 w-12 text-center text-black/70 font-mono text-[11px] border-r border-black/10">#</th>
                  <th className="py-3 px-6 text-black font-extrabold text-sm tracking-wide border-r border-black/10">
                    Live Link
                  </th>
                  <th className="py-3 px-6 text-black font-extrabold text-sm tracking-wide text-center border-r border-black/10">
                    Index
                  </th>
                  <th className="py-3 px-4 text-black font-bold text-xs text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      {batch.progress.processed === 0
                        ? 'Queue worker started; processing initial URL batch...'
                        : 'No URLs match current filter.'}
                    </td>
                  </tr>
                ) : (
                  results.map((r, idx) => {
                    const verdict = getSimpleVerdict(r);
                    const isIndexed = verdict === 'Index';
                    const displayUrl = r.originalUrl || r.normalizedUrl;
                    const googleQuery = r.googleSiteQuery || `site:${displayUrl}`;
                    const googleSearchUrl = r.googleSearchUrl || `https://www.google.com/search?q=${encodeURIComponent(googleQuery)}`;
                    const isShowingPage1 = r.googleFirstPageStatus === 'SHOWING_PAGE_1' || (isIndexed && r.googleFirstPageStatus !== 'NOT_SHOWING_PAGE_1');

                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedResult(r)}
                        className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-slate-500 text-center border-r border-slate-800/40">
                          {page * pageSize + idx + 1}
                        </td>

                        <td className="py-3 px-6 border-r border-slate-800/40">
                          <div className="space-y-1">
                            <a
                              href={displayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-sky-400 hover:text-sky-300 underline font-mono text-xs truncate max-w-xl block transition-colors"
                            >
                              {displayUrl}
                            </a>
                            <div className="flex items-center space-x-2 text-[10px]">
                              <span
                                className={`font-medium flex items-center gap-1 ${
                                  isShowingPage1 ? 'text-emerald-400' : 'text-slate-400'
                                }`}
                              >
                                {isShowingPage1 ? '● Showing on Google Page 1' : '○ Not on Google Page 1'}
                              </span>
                              <span className="text-slate-600">|</span>
                              <a
                                href={googleSearchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-slate-400 hover:text-indigo-300 font-mono flex items-center gap-0.5 transition-colors"
                                title="Check on Google Search"
                              >
                                <span>{googleQuery}</span>
                                <ExternalLink className="w-2.5 h-2.5 ml-0.5 inline" />
                              </a>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-6 text-center border-r border-slate-800/40">
                          <span
                            className={`inline-block font-extrabold text-xs px-3.5 py-1 rounded-md tracking-wide ${
                              isIndexed
                                ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 shadow-sm'
                                : 'text-red-300 bg-red-500/20 border border-red-500/40 shadow-sm'
                            }`}
                          >
                            {verdict}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedResult(r);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* ==================================================== */
            /* DETAILED TECHNICAL SEO VIEW                          */
            /* ==================================================== */
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 w-12">#</th>
                  <th className="py-3.5 px-4">URL Address</th>
                  <th className="py-3.5 px-4">Consensus Status</th>
                  <th className="py-3.5 px-4">Confidence</th>
                  <th className="py-3.5 px-4">HTTP</th>
                  <th className="py-3.5 px-4">Robots</th>
                  <th className="py-3.5 px-4">Latency</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      {batch.progress.processed === 0
                        ? 'Queue worker started; processing initial URL batch...'
                        : 'No URLs match current filter.'}
                    </td>
                  </tr>
                ) : (
                  results.map((r, idx) => {
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedResult(r)}
                        className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {page * pageSize + idx + 1}
                        </td>

                        <td className="py-3 px-4">
                          <div className="max-w-md truncate font-mono text-slate-200">
                            {r.normalizedUrl}
                          </div>
                          {r.technicalSeo?.title && (
                            <div className="max-w-md truncate text-[11px] text-slate-500">
                              {r.technicalSeo.title}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded font-bold text-[11px] ${
                              r.status === 'CONFIRMED_INDEXED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : r.status === 'LIKELY_INDEXED'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : r.status === 'NOT_INDEXED' || r.status === 'INDEXING_BLOCKED'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : r.status === 'ERROR'
                                ? 'bg-red-600/20 text-red-300 italic'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {r.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-300">
                          {r.confidenceScore}%
                        </td>

                        <td className="py-3 px-4 font-mono">
                          {r.technicalSeo?.httpStatus ? (
                            <span
                              className={
                                r.technicalSeo.httpStatus === 200 ? 'text-emerald-400' : 'text-amber-400'
                              }
                            >
                              {r.technicalSeo.httpStatus}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {r.technicalSeo?.isIndexableRobots ? (
                            <span className="text-emerald-400">Indexable</span>
                          ) : r.technicalSeo?.robotsTxtStatus === 'FETCH_ERROR' ? (
                            <span className="text-slate-500">-</span>
                          ) : (
                            <span className="text-red-400">Blocked</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-400">
                          {r.processingDurationMs}ms
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedResult(r);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {totalResults > pageSize && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
            <span>
              Page {page + 1} of {Math.ceil(totalResults / pageSize)}
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={(page + 1) * pageSize >= totalResults}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Modal */}
      <UrlDetailModal result={selectedResult} onClose={() => setSelectedResult(null)} />

      {/* Export 2-Column Spreadsheet Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        batch={batch}
        sampleResults={results}
      />
    </div>
  );
};
