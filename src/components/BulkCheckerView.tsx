import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Layers,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCw,
  Sparkles,
  Info,
} from 'lucide-react';
import { ProviderConfig } from '../types.js';

interface BulkCheckerViewProps {
  onBatchStarted: (batchId: string) => void;
  providers: ProviderConfig[];
}

export const BulkCheckerView: React.FC<BulkCheckerViewProps> = ({
  onBatchStarted,
  providers,
}) => {
  const [inputText, setInputText] = useState('');
  const [batchName, setBatchName] = useState('');
  const [concurrency, setConcurrency] = useState(30);
  const [skipSeo, setSkipSeo] = useState(false);
  const [forceFresh, setForceFresh] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Quick generator for testing 100, 1000, 5000 URLs
  const generateSampleUrls = (count: number) => {
    const urls: string[] = [];
    const domains = ['my-ecommerce-store.com', 'blog-network.org', 'saas-portal.io', 'catalog-hub.net'];
    for (let i = 1; i <= count; i++) {
      const d = domains[i % domains.length];
      urls.push(`https://${d}/products/item-${i}`);
      // Add a few deliberate duplicates to test deduplication engine
      if (i % 25 === 0) {
        urls.push(`https://${d}/products/item-${i}/`);
      }
    }
    setInputText(urls.join('\n'));
    setBatchName(`Bulk Audit (${count.toLocaleString()} URLs)`);
    setUploadResult(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setBatchName(file.name.replace(/\.[^/.]+$/, ''));

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setInputText(content);
      await parseContent(content);
    };
    reader.readAsText(file);
  };

  const parseContent = async (text: string) => {
    if (!text.trim()) return;
    setIsUploading(true);
    setError(null);

    try {
      const res = await fetch('/api/bulk/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse uploaded URLs');
      }

      setUploadResult(data);
    } catch (err: any) {
      setError(err.message || 'Upload processing error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartBatch = async () => {
    if (!uploadResult?.uploadId) {
      // If not parsed yet, parse first
      await parseContent(inputText);
    }

    setIsStarting(true);
    setError(null);

    try {
      const res = await fetch('/api/bulk/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: uploadResult?.uploadId,
          name: batchName || `Bulk Verification Job (${uploadResult?.uniqueCount || 0} URLs)`,
          concurrency,
          providers: selectedProviders,
          skipSeo,
          forceFresh,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start bulk verification job');
      }

      onBatchStarted(data.batchId);
    } catch (err: any) {
      setError(err.message || 'Batch startup failed');
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Bulk URL Verification & Ingestion</h2>
        <p className="text-sm text-slate-400">
          Upload 100 to 10,000+ URLs in TXT, CSV, or XLSX format. Built for streaming server-side deduplication and horizontal worker execution.
        </p>
      </div>

      {/* Preset Benchmarks & Sample Buttons */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Quick Synthetic Benchmarks:</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => generateSampleUrls(100)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            100 URLs
          </button>
          <button
            onClick={() => generateSampleUrls(1000)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            1,000 URLs
          </button>
          <button
            onClick={() => generateSampleUrls(5000)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            5,000 URLs
          </button>
        </div>
      </div>

      {/* Upload Box / Input Area */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Batch Project Name
            </label>
            <span className="text-xs text-slate-500">Optional tag for reporting</span>
          </div>
          <input
            type="text"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="e.g. Q3 Catalog Audit or New Pages Verification"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        {/* File Drop / Select Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-950/40"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.csv,.xlsx"
            className="hidden"
          />
          <UploadCloud className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-200">
            Click to upload TXT, CSV, or XLSX file
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Accepts plain URL lists, CSVs with URL columns, or line-separated addresses
          </p>
        </div>

        {/* Text Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Or Paste URL List (one per line)
            </label>
            {inputText && (
              <span className="text-xs text-slate-400 font-mono">
                {inputText.split(/\r?\n/).filter(Boolean).length.toLocaleString()} lines entered
              </span>
            )}
          </div>
          <textarea
            rows={8}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setUploadResult(null);
            }}
            placeholder={"https://example.com/page-1\nhttps://example.com/page-2\nhttps://example.com/page-3"}
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Pre-flight Deduplication & Validation Button */}
        {!uploadResult && inputText.trim() && (
          <button
            type="button"
            onClick={() => parseContent(inputText)}
            disabled={isUploading}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors flex items-center justify-center space-x-2"
          >
            {isUploading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Validating & Deduplicating URLs...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Run Pre-Flight URL Validation & Deduplication</span>
              </>
            )}
          </button>
        )}

        {/* Pre-Flight Summary Card */}
        {uploadResult && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Pre-Flight Analysis Completed</span>
              </span>
              <span className="text-xs text-slate-400">Ready for queue execution</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Total Detected</span>
                <span className="text-xl font-bold font-mono text-white">
                  {uploadResult.totalReceived.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Unique URLs</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {uploadResult.uniqueCount.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Duplicates Removed</span>
                <span className="text-xl font-bold font-mono text-amber-400">
                  {uploadResult.duplicateCount.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Invalid / Malformed</span>
                <span className="text-xl font-bold font-mono text-slate-400">
                  {uploadResult.invalidCount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Execution Settings */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Worker Concurrency & Optimization</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Worker Concurrency Limit:</span>
              <span className="font-mono text-emerald-400 font-bold text-sm">{concurrency} concurrent workers</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={concurrency}
              onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Higher worker concurrency increases application throughput up to 100+ URLs/sec while respecting configured provider rate limits.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-300">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={skipSeo}
                onChange={(e) => setSkipSeo(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span>Fast Index-Only Mode (Skip deep HTML parsing for ultra-high speed)</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={forceFresh}
                onChange={(e) => setForceFresh(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span>Force Fresh Verification (Bypass 1-hour cache)</span>
            </label>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={handleStartBatch}
          disabled={isStarting || !inputText.trim()}
          className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-base transition-all flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/20"
        >
          {isStarting ? (
            <>
              <RotateCw className="w-5 h-5 animate-spin" />
              <span>Initializing Distributed Queue...</span>
            </>
          ) : (
            <>
              <Layers className="w-5 h-5" />
              <span>START BULK VERIFICATION JOB</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
