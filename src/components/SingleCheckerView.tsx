import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Server,
  FileText,
  RotateCw,
  Clock,
  Table,
  Copy,
  Check,
} from 'lucide-react';
import { UrlCheckResult } from '../types.js';

export const SingleCheckerView: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UrlCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedRow, setCopiedRow] = useState(false);

  useEffect(() => {
    const pending = sessionStorage.getItem('pending_quick_url');
    if (pending) {
      sessionStorage.removeItem('pending_quick_url');
      setUrl(pending);
      inspectUrl(pending, false);
    }
  }, []);

  const inspectUrl = async (targetUrl: string, forceFresh = false) => {
    if (!targetUrl || !targetUrl.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl.trim(), forceFresh }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification request failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Inspection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inspectUrl(url, false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Single URL Index Verification</h2>
        <p className="text-sm text-slate-400">
          Cross-examine multiple independent index consensus providers and collect real-time Technical SEO signals.
        </p>
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          Target Web Address
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article/deep-dive"
              className="w-full px-4 py-3 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20"
          >
            {loading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Checking Signals...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>CHECK NOW</span>
              </>
            )}
          </button>
        </div>

        {/* Quick sample chips */}
        <div className="flex items-center space-x-2 text-xs text-slate-400 pt-1">
          <span>Sample inputs:</span>
          <button
            type="button"
            onClick={() => {
              setUrl('https://en.wikipedia.org/wiki/Search_engine_indexing');
              inspectUrl('https://en.wikipedia.org/wiki/Search_engine_indexing');
            }}
            className="text-emerald-400 hover:underline font-mono"
          >
            Wikipedia: Indexing
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              setUrl('https://example.com/unindexed-draft-404');
              inspectUrl('https://example.com/unindexed-draft-404');
            }}
            className="text-emerald-400 hover:underline font-mono"
          >
            Unindexed Page (Demo)
          </button>
        </div>
      </form>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Card */}
      {result && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          {/* Main Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-3">
                <span
                  className={`text-xl font-extrabold tracking-tight px-3.5 py-1 rounded-lg ${
                    result.status === 'CONFIRMED_INDEXED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : result.status === 'LIKELY_INDEXED'
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      : result.status === 'NOT_INDEXED' || result.status === 'INDEXING_BLOCKED'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {result.status.replace(/_/g, ' ')}
                </span>

                <span className="text-sm font-semibold text-slate-300 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700">
                  Confidence: {result.confidenceScore}%
                </span>

                {result.isMockData && (
                  <span className="text-xs font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
                    DEMO DATA
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 font-mono break-all pt-1">
                {result.normalizedUrl}
              </p>
            </div>

            <button
              onClick={() => inspectUrl(result.normalizedUrl, true)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Force Fresh Re-Check</span>
            </button>
          </div>

          {/* Google site:url & 2-Column Google Sheet Card */}
          {(() => {
            const isIndexed =
              result.status === 'CONFIRMED_INDEXED' || result.status === 'LIKELY_INDEXED';
            const verdict: 'Index' | 'No-index' = result.simpleVerdict || (isIndexed ? 'Index' : 'No-index');
            const displayUrl = result.originalUrl || result.normalizedUrl;
            const googleQuery = result.googleSiteQuery || `site:${displayUrl}`;
            const googleSearchUrl = result.googleSearchUrl || `https://www.google.com/search?q=${encodeURIComponent(googleQuery)}`;
            const isShowingPage1 = result.googleFirstPageStatus === 'SHOWING_PAGE_1' || (isIndexed && result.googleFirstPageStatus !== 'NOT_SHOWING_PAGE_1');

            const handleCopyRow = async () => {
              const rowText = `${displayUrl}\t${verdict}`;
              await navigator.clipboard.writeText(rowText);
              setCopiedRow(true);
              setTimeout(() => setCopiedRow(false), 2000);
            };

            return (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Table className="w-4 h-4 text-[#FF00FF]" />
                    <span className="text-xs font-bold text-slate-200">Google Search Verification ("site:url")</span>
                    <span className="text-[10px] text-slate-400 font-mono">1st Page Check</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <a
                      href={googleSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold transition-colors flex items-center space-x-1 border border-indigo-500/40"
                    >
                      <span>Check on Google</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      onClick={handleCopyRow}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1.5 border border-slate-700"
                    >
                      {copiedRow ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied Row!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-sky-400" />
                          <span>Copy Row for Sheets</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="rounded-lg overflow-hidden border border-slate-800">
                  <div className="grid grid-cols-12 text-black font-extrabold text-xs py-2 px-3" style={{ backgroundColor: '#FF00FF' }}>
                    <div className="col-span-8">Live Link</div>
                    <div className="col-span-4 text-center">Index</div>
                  </div>
                  <div className="grid grid-cols-12 bg-slate-900 text-xs py-2.5 px-3 border-t border-slate-800/60 items-center">
                    <div className="col-span-8 space-y-0.5 pr-2">
                      <div className="font-mono text-sky-400 truncate">
                        {displayUrl}
                      </div>
                      <div className="text-[10px] flex items-center gap-1.5">
                        <span className="text-slate-400 font-mono">{googleQuery}</span>
                        <span className="text-slate-600">•</span>
                        <span className={isShowingPage1 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                          {isShowingPage1 ? 'Showing on Google 1st Page' : 'Not on Google 1st Page'}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-4 text-center">
                      <span
                        className={`font-extrabold px-3 py-1 rounded-md text-xs tracking-wider inline-block ${
                          verdict === 'Index'
                            ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 shadow-sm'
                            : 'text-red-300 bg-red-500/20 border border-red-500/40 shadow-sm'
                        }`}
                      >
                        {verdict}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Evidence Summary Box */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-slate-300">
                Consensus Evidence Summary
              </span>
              <span>Method: {result.verificationMethod}</span>
            </div>
            <p className="text-sm text-slate-200">{result.searchEvidenceSummary}</p>
            <div className="text-xs text-slate-400">
              Provider Agreement: <span className="font-mono text-emerald-400 font-medium">{result.providerAgreement}</span>
            </div>
          </div>

          {/* Technical SEO Diagnostics Grid */}
          {result.technicalSeo && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Technical SEO & Directives</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">HTTP Response</span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    {result.technicalSeo.httpStatus || 'N/A'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">{result.technicalSeo.responseTimeMs}ms latency</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Canonical Status</span>
                  <span className="text-xs font-bold font-mono block text-emerald-400">
                    {result.technicalSeo.canonicalStatus}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {result.technicalSeo.canonicalUrl ? 'Self-canonical' : 'No link tag'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Robots Directives</span>
                  <span
                    className={`text-xs font-bold block ${
                      result.technicalSeo.isIndexableRobots ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {result.technicalSeo.isIndexableRobots ? 'INDEXABLE' : 'BLOCKED'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {result.technicalSeo.robotsMeta || 'No meta restrictions'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Word Count</span>
                  <span className="text-base font-bold font-mono text-slate-200">
                    {result.technicalSeo.wordCount}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {result.technicalSeo.sitemapDetected ? 'Sitemap found' : 'No sitemap'}
                  </span>
                </div>
              </div>

              {result.technicalSeo.title && (
                <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-400 font-medium">Page Title:</div>
                  <div className="text-slate-200 font-semibold">{result.technicalSeo.title}</div>
                  {result.technicalSeo.metaDescription && (
                    <div className="text-slate-400 text-[11px] pt-1">{result.technicalSeo.metaDescription}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Provider Evidence Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Independent Provider Signals</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.providerEvidence.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{ev.providerName}</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        ev.found ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {ev.found ? 'FOUND' : 'NOT FOUND'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Ref: {ev.rawReference || 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span>Latency: {ev.responseTimeMs}ms</span>
                    <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
