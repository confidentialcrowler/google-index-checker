import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  X,
  FileText,
  Palette,
  ExternalLink,
  Table,
  CheckCircle2,
} from 'lucide-react';
import { BatchSummary, UrlCheckResult } from '../types.js';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: BatchSummary;
  sampleResults?: UrlCheckResult[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  batch,
  sampleResults = [],
}) => {
  const [headerLink, setHeaderLink] = useState('Live Link');
  const [headerIndex, setHeaderIndex] = useState('Index');
  const [useMagentaHeader, setUseMagentaHeader] = useState(true);
  const [includeLikely, setIncludeLikely] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [activeFormat, setActiveFormat] = useState<'simple' | 'comprehensive'>('simple');

  if (!isOpen) return null;

  const handleCopyClipboard = async () => {
    setIsCopying(true);
    try {
      const res = await fetch(
        `/api/bulk/${batch.id}/export/clipboard-data?headerLink=${encodeURIComponent(
          headerLink
        )}&headerIndex=${encodeURIComponent(
          headerIndex
        )}&includeLikely=${includeLikely}&indexedLabel=Index&nonIndexedLabel=No-index`
      );
      if (res.ok) {
        const data = await res.json();
        await navigator.clipboard.writeText(data.tsv);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // fallback
    } finally {
      setIsCopying(false);
    }
  };

  const getSimpleDownloadUrl = (format: 'xlsx' | 'csv' | 'tsv') => {
    const params = new URLSearchParams({
      format,
      headerLink,
      headerIndex,
      magenta: String(useMagentaHeader),
      includeLikely: String(includeLikely),
      indexedLabel: 'Index',
      nonIndexedLabel: 'No-index',
    });
    return `/api/bulk/${batch.id}/export/simple?${params.toString()}`;
  };

  const getVerdict = (status: string) => {
    if (status === 'CONFIRMED_INDEXED') return 'Index';
    if (status === 'LIKELY_INDEXED') return includeLikely ? 'Index' : 'No-index';
    return 'No-index';
  };

  // Preview rows (first 4-5 results)
  const previewItems = sampleResults.length > 0
    ? sampleResults.slice(0, 4)
    : [
        { originalUrl: 'https://x.com/csgamblinguk', status: 'CONFIRMED_INDEXED' },
        { originalUrl: 'https://github.com/csgamblinguk', status: 'NOT_INDEXED' },
        { originalUrl: 'https://example.com/blog-post', status: 'CONFIRMED_INDEXED' },
        { originalUrl: 'https://example.com/login-redirect', status: 'INDEXING_BLOCKED' },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Export Spreadsheet File</h3>
              <p className="text-xs text-slate-400">
                Download as 2-column sheet (Live Link | Index) or full technical audit workbook.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Format Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveFormat('simple')}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                activeFormat === 'simple'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>2-Column Sheet (Live Link & Index)</span>
            </button>
            <button
              onClick={() => setActiveFormat('comprehensive')}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                activeFormat === 'comprehensive'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Full 5-Sheet Audit (.xlsx)</span>
            </button>
          </div>

          {activeFormat === 'simple' ? (
            <div className="space-y-5">
              {/* Visual Spreadsheet Live Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Live Spreadsheet Preview
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    Matches your exact Google Sheet format
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 overflow-hidden bg-white shadow-md font-sans">
                  {/* Google Sheets Header Mock */}
                  <div className="grid grid-cols-12 border-b border-gray-300 text-xs font-bold">
                    <div
                      className="col-span-8 p-2.5 text-center transition-colors border-r border-gray-300"
                      style={{
                        backgroundColor: useMagentaHeader ? '#FF00FF' : '#1E293B',
                        color: useMagentaHeader ? '#000000' : '#FFFFFF',
                      }}
                    >
                      {headerLink}
                    </div>
                    <div
                      className="col-span-4 p-2.5 text-center transition-colors"
                      style={{
                        backgroundColor: useMagentaHeader ? '#FF00FF' : '#1E293B',
                        color: useMagentaHeader ? '#000000' : '#FFFFFF',
                      }}
                    >
                      {headerIndex}
                    </div>
                  </div>

                  {/* Mock rows */}
                  <div className="divide-y divide-gray-200 text-xs">
                    {previewItems.map((item, idx) => {
                      const verdict = getVerdict(item.status);
                      const isIndexed = verdict === 'Index';
                      return (
                        <div key={idx} className="grid grid-cols-12 hover:bg-blue-50/50">
                          <div className="col-span-8 p-2 text-blue-600 underline font-mono text-[11px] truncate border-r border-gray-200">
                            {item.originalUrl || (item as any).normalizedUrl}
                          </div>
                          <div
                            className={`col-span-4 p-2 text-center font-semibold text-xs ${
                              isIndexed ? 'text-emerald-700 bg-emerald-50/40' : 'text-red-700 bg-red-50/40'
                            }`}
                          >
                            {verdict}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Customization Options */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Column A Header</label>
                    <input
                      type="text"
                      value={headerLink}
                      onChange={(e) => setHeaderLink(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Column B Header</label>
                    <input
                      type="text"
                      value={headerIndex}
                      onChange={(e) => setHeaderIndex(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
                  <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={useMagentaHeader}
                      onChange={(e) => setUseMagentaHeader(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="flex items-center space-x-1.5">
                      <span>Magenta Header</span>
                      <span className="w-3.5 h-3.5 rounded-full bg-[#FF00FF] inline-block border border-white/20"></span>
                      <span className="text-[10px] text-slate-500">(Google Sheet screenshot style)</span>
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={includeLikely}
                      onChange={(e) => setIncludeLikely(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Count &quot;Likely Indexed&quot; as Indexed</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons for 2-Column Sheet */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <a
                    href={getSimpleDownloadUrl('xlsx')}
                    download
                    className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 text-center"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download .XLSX</span>
                  </a>

                  <a
                    href={getSimpleDownloadUrl('csv')}
                    download
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center justify-center space-x-2 border border-slate-700 text-center"
                  >
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Download .CSV</span>
                  </a>

                  <button
                    onClick={handleCopyClipboard}
                    disabled={isCopying}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center justify-center space-x-2 border border-slate-700"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-sky-400" />
                        <span>Copy for Google Sheets</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 text-center">
                  💡 Tip: Click &quot;Copy for Google Sheets&quot; and press <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-slate-300">Ctrl+V</kbd> inside any Google Sheet.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-2">
                <p className="font-semibold text-white">Full Diagnostic Workbook Features:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Sheet 1: Executive Summary &amp; Batch Metrics</li>
                  <li>Sheet 2: Full Results with HTTP status, latency, redirect chains, canonical links, robots meta, page title, word count</li>
                  <li>Sheet 3: Raw Provider Evidence logs (GSC, SearchPulse, SerpSentinel, IndexData)</li>
                  <li>Sheet 4: Processing Failure &amp; Error Diagnostic Logs</li>
                  <li>Sheet 5: Deduplication Exclusions Registry</li>
                </ul>
              </div>

              <a
                href={`/api/bulk/${batch.id}/export/simple?format=xlsx&headerLink=${encodeURIComponent(headerLink)}&headerIndex=${encodeURIComponent(headerIndex)}`}
                onClick={async (e) => {
                  e.preventDefault();
                  // Trigger standard comprehensive report generation
                  const res = await fetch(`/api/report/${batch.id}/generate`, { method: 'POST' });
                  const data = await res.json();
                  if (data.downloadUrl) {
                    window.location.href = data.downloadUrl;
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Generate &amp; Download Comprehensive 5-Sheet XLSX</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
