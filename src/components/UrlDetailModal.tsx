import React from 'react';
import { X, ExternalLink, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Clock, Server, FileText } from 'lucide-react';
import { UrlCheckResult } from '../types.js';

interface UrlDetailModalProps {
  result: UrlCheckResult | null;
  onClose: () => void;
}

export const UrlDetailModal: React.FC<UrlDetailModalProps> = ({ result, onClose }) => {
  if (!result) return null;

  const isIndexed = result.status === 'CONFIRMED_INDEXED' || result.status === 'LIKELY_INDEXED';
  const isError = result.status === 'ERROR';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/40">
          <div className="space-y-1 pr-6">
            <div className="flex items-center space-x-2.5">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
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

              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                Confidence: {result.confidenceScore}% ({result.confidenceLabel})
              </span>

              {result.isMockData && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  DEMO DATA
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <span className="text-slate-100 font-mono text-sm break-all font-medium">{result.normalizedUrl}</span>
              <a
                href={result.normalizedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Google site:url Search Verification Card */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-indigo-500/30 shadow-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                  Google Search Verification ("site:url")
                </span>
                <span className="text-[11px] text-slate-400">Page 1 Organic Presence</span>
              </div>

              <div className="flex items-center space-x-2">
                <span
                  className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                    result.simpleVerdict === 'Index' || isIndexed
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}
                >
                  Verdict: {result.simpleVerdict || (isIndexed ? 'Index' : 'No-index')}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/90 rounded-md border border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-300 font-mono flex items-center gap-2">
                  <span className="text-slate-400">Google Query:</span>
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded text-amber-300 font-bold">
                    {result.googleSiteQuery || `site:${result.originalUrl || result.normalizedUrl}`}
                  </span>
                </div>

                <a
                  href={result.googleSearchUrl || `https://www.google.com/search?q=${encodeURIComponent(`site:${result.originalUrl || result.normalizedUrl}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
                >
                  <span>Open in Google Search</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                <span className="text-slate-400">Google 1st Page Detection:</span>
                <span
                  className={`font-semibold ${
                    result.googleFirstPageStatus === 'SHOWING_PAGE_1' || (isIndexed && result.googleFirstPageStatus !== 'NOT_SHOWING_PAGE_1')
                      ? 'text-emerald-400 flex items-center gap-1'
                      : 'text-red-400 flex items-center gap-1'
                  }`}
                >
                  {result.googleFirstPageStatus === 'SHOWING_PAGE_1' || (isIndexed && result.googleFirstPageStatus !== 'NOT_SHOWING_PAGE_1') ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Showing on Google First Page (Index)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Not Showing on Google First Page (No-index)</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Consensus Overview Card */}
          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300 uppercase tracking-wider">Consensus Evidence Synthesis</span>
              <span>Method: {result.verificationMethod}</span>
            </div>
            <p className="text-sm text-slate-200">{result.searchEvidenceSummary}</p>
            <div className="text-xs text-slate-400 flex items-center space-x-2">
              <span className="text-slate-300 font-medium">Provider Agreement:</span>
              <span className="font-mono text-emerald-400 font-medium">{result.providerAgreement}</span>
            </div>
            {result.gscStatus && (
              <div className="text-xs bg-slate-900 p-2.5 rounded border border-slate-800 text-slate-300">
                <span className="font-semibold text-sky-400">Search Console: </span>
                {result.gscStatus}
              </div>
            )}
          </div>

          {/* Technical SEO Diagnostics */}
          {result.technicalSeo && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Technical SEO & Directives</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">HTTP Status</span>
                  <span
                    className={`text-base font-bold font-mono ${
                      result.technicalSeo.httpStatus === 200
                        ? 'text-emerald-400'
                        : result.technicalSeo.httpStatus
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {result.technicalSeo.httpStatus || 'N/A'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">{result.technicalSeo.responseTimeMs}ms latency</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Canonical Status</span>
                  <span
                    className={`text-xs font-bold font-mono block truncate ${
                      result.technicalSeo.canonicalStatus === 'SELF'
                        ? 'text-emerald-400'
                        : result.technicalSeo.canonicalStatus === 'MISSING'
                        ? 'text-slate-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {result.technicalSeo.canonicalStatus}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {result.technicalSeo.canonicalUrl ? 'Canonical tag set' : 'No tag found'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Robots Directives</span>
                  <span
                    className={`text-xs font-bold block ${
                      result.technicalSeo.isIndexableRobots ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {result.technicalSeo.isIndexableRobots ? 'INDEXABLE' : 'BLOCKED / NOINDEX'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {result.technicalSeo.robotsMeta || result.technicalSeo.xRobotsTag || 'No restrictions'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">HTML Content</span>
                  <span className="text-base font-bold font-mono text-slate-200">
                    {result.technicalSeo.wordCount} words
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {result.technicalSeo.hreflangCount} hreflang tags
                  </span>
                </div>
              </div>

              {/* Title & Meta */}
              <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Page Title: </span>
                  <span className="text-slate-200 font-medium">{result.technicalSeo.title || 'None detected'}</span>
                </div>
                {result.technicalSeo.metaDescription && (
                  <div>
                    <span className="text-slate-400 font-medium">Meta Description: </span>
                    <span className="text-slate-300">{result.technicalSeo.metaDescription}</span>
                  </div>
                )}
                {result.technicalSeo.canonicalUrl && (
                  <div>
                    <span className="text-slate-400 font-medium">Declared Canonical: </span>
                    <span className="text-slate-300 font-mono break-all">{result.technicalSeo.canonicalUrl}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Provider Evidence Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Independent Provider Evidence Log</span>
            </h4>

            <div className="space-y-2">
              {result.providerEvidence.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-200">{ev.providerName}</span>
                      {ev.isMock && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                          DEMO
                        </span>
                      )}
                    </div>
                    <div className="text-slate-400 font-mono text-[11px]">
                      Ref: {ev.rawReference || 'N/A'}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-semibold text-[11px] ${
                        ev.found
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {ev.found ? 'FOUND' : 'NOT FOUND'}
                    </span>
                    <div className="text-[10px] text-slate-500">{ev.responseTimeMs}ms</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
          <div className="flex items-center space-x-1.5 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>SSRF-hardened & Formula-Injection Protected</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
