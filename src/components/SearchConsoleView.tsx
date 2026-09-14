import React, { useState, useEffect } from 'react';
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Key,
  RotateCw,
} from 'lucide-react';

export const SearchConsoleView: React.FC = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState('');

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async (token?: string) => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token || accessToken) {
        headers['Authorization'] = `Bearer ${token || accessToken}`;
      }

      const res = await fetch('/api/gsc/properties', { headers });
      if (res.ok) {
        const data = await res.json();
        setConnected(data.connected);
        setProperties(data.properties || []);
        if (data.properties?.length > 0 && !selectedSite) {
          setSelectedSite(data.properties[0].siteUrl);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessToken.trim()) {
      fetchProperties(accessToken.trim());
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Google Search Console URL Inspection API</h2>
        <p className="text-sm text-slate-400">
          Official Google integration for 100% authoritative index status, crawl timestamps, and Google-selected canonical URLs.
        </p>
      </div>

      {/* Connection Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-base">Connection Status:</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  connected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                }`}
              >
                {connected ? 'CONNECTED TO GOOGLE GSC' : 'STANDALONE / DEMO MODE'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Required Scope: <code className="text-slate-300 font-mono">https://www.googleapis.com/auth/webmasters.readonly</code>
            </p>
          </div>
        </div>

        {/* Property Selector */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            Select Verified Search Console Property
          </label>
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {properties.map((p, idx) => (
              <option key={idx} value={p.siteUrl}>
                {p.siteUrl} ({p.permissionLevel || 'siteOwner'})
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Selected property is passed to the official URL Inspection API when inspecting matching URLs.
          </p>
        </div>

        {/* OAuth Bearer Token Input */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>OAuth 2.0 Access Token Configuration</span>
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Input a valid Google OAuth Bearer Token to access your live verified sites.
          </p>

          <form onSubmit={handleManualTokenSubmit} className="flex gap-2">
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="ya29.a0AfH6SMC..."
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors"
            >
              Verify & Connect
            </button>
          </form>
        </div>

        {/* Quota & Architecture Notice */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2 text-slate-400">
          <div className="font-semibold text-slate-300">Official API Guidelines:</div>
          <ul className="list-disc list-inside space-y-1 text-[11px]">
            <li>Google Search Console URL Inspection API allows approx. 2,000 requests per day per project.</li>
            <li>For massive lists exceeding 2,000 URLs, the platform automatically utilizes multi-provider consensus fallback.</li>
            <li>No synthetic Google results are ever fabricated in production mode.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
