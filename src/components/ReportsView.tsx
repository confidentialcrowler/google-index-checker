import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Table,
  FileText,
} from 'lucide-react';
import { GeneratedReport, BatchSummary } from '../types.js';

interface ReportsViewProps {
  batches: BatchSummary[];
  onSelectBatch: (batchId: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ batches, onSelectBatch }) => {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingBatchId, setGeneratingBatchId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (batchId: string) => {
    setGeneratingBatchId(batchId);
    try {
      const res = await fetch(`/api/report/${batchId}/generate`, { method: 'POST' });
      if (res.ok) {
        // Poll for completion
        setTimeout(() => {
          fetchReports();
          setGeneratingBatchId(null);
        }, 1500);
      } else {
        setGeneratingBatchId(null);
      }
    } catch {
      setGeneratingBatchId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Excel Intelligence Reports (.XLSX)</h2>
        <p className="text-sm text-slate-400">
          Download formatted, multi-worksheet spreadsheets including executive summary charts, provider evidence audit trails, and sanitized formulas.
        </p>
      </div>

      {/* Generated Reports List */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Compiled Spreadsheets</span>
          </span>
          <button
            onClick={fetchReports}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Loading generated reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <p className="text-sm font-medium text-slate-300">No Excel reports generated yet</p>
            <p className="text-xs">
              Generate a multi-sheet report from any completed verification batch below.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {reports.map((r) => (
              <div
                key={r.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-slate-200">{r.filename}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      XLSX
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center space-x-3">
                    <span>Batch: <span className="text-slate-300 font-medium">{r.batchName}</span></span>
                    <span>•</span>
                    <span>{r.totalUrls.toLocaleString()} URLs</span>
                    <span>•</span>
                    <span>{formatBytes(r.fileSizeBytes)}</span>
                    <span>•</span>
                    <span>{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <a
                  href={r.downloadUrl}
                  download={r.filename}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition-colors flex items-center justify-center space-x-2 self-start sm:self-auto shadow-lg shadow-emerald-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .XLSX</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Batches to Export */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Generate New Report From Batches</span>
          </span>
        </div>

        <div className="divide-y divide-slate-800">
          {batches.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs">
              No batches available. Run a bulk check first.
            </div>
          ) : (
            batches.map((b) => (
              <div
                key={b.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-slate-200">{b.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {b.progress.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Processed: {b.progress.processed.toLocaleString()} / {b.progress.total.toLocaleString()} URLs • Created {new Date(b.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/api/bulk/${b.id}/export/simple?format=xlsx&magenta=true`}
                    download
                    className="px-3 py-1.5 rounded-lg bg-fuchsia-600/15 hover:bg-fuchsia-600/25 text-fuchsia-300 border border-fuchsia-500/40 text-xs font-bold transition-all flex items-center space-x-1.5"
                    title="Download 2-column Excel file with Live Link and Index columns"
                  >
                    <Table className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span>2-Col Sheet (.xlsx)</span>
                  </a>

                  <a
                    href={`/api/bulk/${b.id}/export/simple?format=csv`}
                    download
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors flex items-center space-x-1.5"
                    title="Download 2-column CSV file"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>2-Col (.csv)</span>
                  </a>

                  <button
                    disabled={generatingBatchId === b.id || b.progress.processed === 0}
                    onClick={() => handleGenerate(b.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors flex items-center space-x-1.5"
                  >
                    {generatingBatchId === b.id ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Compiling...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Full 5-Sheet</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onSelectBatch(b.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                  >
                    View Batch
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
