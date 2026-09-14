import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Github,
  Terminal,
  Layers,
  ArrowRight,
  Sparkles,
  RefreshCw,
  FolderArchive,
  ShieldCheck,
} from 'lucide-react';

interface GitHubDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubDeployModal: React.FC<GitHubDeployModalProps> = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('etokom');
  const [repoName, setRepoName] = useState('crawlme-index-checker');
  const [activeTab, setActiveTab] = useState<'actions' | 'cli' | 'checklist'>('actions');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const sanitizedUser = username.trim() || 'your-username';
  const sanitizedRepo = repoName.trim() || 'crawlme-index-checker';

  const gitUrl = `https://github.com/${sanitizedUser}/${sanitizedRepo}.git`;
  const pagesUrl = `https://${sanitizedUser}.github.io/${sanitizedRepo}/`;

  const actionsCommands = `# 1. Add your GitHub repository as remote
git remote add origin ${gitUrl}

# 2. Push code to the main branch
git branch -M main
git push -u origin main

# That's it! GitHub Actions (.github/workflows/deploy.yml) will build and deploy automatically.`;

  const cliCommands = `# 1. Add remote and push source
git remote add origin ${gitUrl}
git push -u origin main

# 2. Run one-command automated build & deployment to gh-pages branch
npm run deploy`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Connect &amp; Deploy to GitHub</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PAGES READY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated GitHub Actions CI/CD workflow &amp; static engine configured
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Status checklist banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-emerald-500/30 flex flex-col justify-between">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px]">Relative Base</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">base: './' in Vite</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-emerald-500/30 flex flex-col justify-between">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px]">Actions CI/CD</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">.github/deploy.yml</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-emerald-500/30 flex flex-col justify-between">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px]">Jekyll Bypass</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">.nojekyll present</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-emerald-500/30 flex flex-col justify-between">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px]">Static Engine</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">localStorage API</span>
            </div>
          </div>

          {/* Repository configuration inputs */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-200">
              Configure Your GitHub Repository Name
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  GitHub Username / Org
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. etokom"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="e.g. crawlme-index-checker"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>

            {/* Target Live URL preview */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
              <span className="text-slate-400 text-[11px]">Target GitHub Pages URL:</span>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-emerald-400 text-[11px] font-semibold">
                  {pagesUrl}
                </span>
                <button
                  onClick={() => handleCopy(pagesUrl, 'pages_url')}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                  title="Copy URL"
                >
                  {copiedKey === 'pages_url' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Deployment Methods Tabs */}
          <div className="space-y-3">
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setActiveTab('actions')}
                className={`pb-2 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-colors ${
                  activeTab === 'actions'
                    ? 'border-purple-500 text-purple-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Method 1: GitHub Actions (Automated)</span>
              </button>

              <button
                onClick={() => setActiveTab('cli')}
                className={`pb-2 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-colors ${
                  activeTab === 'cli'
                    ? 'border-purple-500 text-purple-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Method 2: CLI (npm run deploy)</span>
              </button>

              <button
                onClick={() => setActiveTab('checklist')}
                className={`pb-2 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-colors ${
                  activeTab === 'checklist'
                    ? 'border-purple-500 text-purple-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Pages Settings Guide</span>
              </button>
            </div>

            {/* Tab 1: Actions */}
            {activeTab === 'actions' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Run these commands in your terminal or Git bash to connect your local repository and trigger the automated GitHub Actions workflow:
                </p>

                <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-xs font-mono text-slate-200">
                  <pre className="overflow-x-auto whitespace-pre leading-relaxed">{actionsCommands}</pre>
                  <button
                    onClick={() => handleCopy(actionsCommands, 'actions')}
                    className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium flex items-center space-x-1.5 shadow transition-colors"
                  >
                    {copiedKey === 'actions' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-300" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 space-y-1">
                  <div className="font-bold flex items-center space-x-1.5">
                    <span>✨ Enabling GitHub Pages in 2 clicks:</span>
                  </div>
                  <ol className="list-decimal list-inside text-slate-300 space-y-1 text-[11px] pl-1">
                    <li>
                      Go to your repository on GitHub: <strong>Settings &gt; Pages</strong>
                    </li>
                    <li>
                      Under <strong>Build and deployment &gt; Source</strong>, choose{' '}
                      <strong className="text-purple-300">GitHub Actions</strong>
                    </li>
                    <li>
                      Your site will be live at{' '}
                      <strong className="text-emerald-400">{pagesUrl}</strong> within ~60 seconds!
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* Tab 2: CLI gh-pages */}
            {activeTab === 'cli' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Alternatively, deploy the compiled build directly to the <code className="text-emerald-400">gh-pages</code> branch using the pre-configured npm script:
                </p>

                <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-xs font-mono text-slate-200">
                  <pre className="overflow-x-auto whitespace-pre leading-relaxed">{cliCommands}</pre>
                  <button
                    onClick={() => handleCopy(cliCommands, 'cli')}
                    className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium flex items-center space-x-1.5 shadow transition-colors"
                  >
                    {copiedKey === 'cli' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-300" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-slate-400">
                  Under <strong>Settings &gt; Pages &gt; Source</strong>, choose{' '}
                  <strong>Deploy from a branch</strong> and select <strong>gh-pages / (root)</strong>.
                </div>
              </div>
            )}

            {/* Tab 3: Guide */}
            {activeTab === 'checklist' && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Why This Build Will Never Show a Blank Screen:</span>
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
                    <li>
                      <strong>Relative Base:</strong> Configured with <code className="text-emerald-400">base: './'</code> in Vite, meaning all assets load correctly regardless of whether your repo is hosted at the root or a subpath.
                    </li>
                    <li>
                      <strong>Client Fallback Interceptor:</strong> Automatically detects GitHub Pages and emulates real verification jobs, SerpApi key rotation, and 2-column Google Sheets exports in <code className="text-emerald-400">localStorage</code>.
                    </li>
                    <li>
                      <strong>Jekyll Bypass:</strong> Includes <code className="text-emerald-400">.nojekyll</code> to prevent GitHub Pages from ignoring compiled Vite script files.
                    </li>
                    <li>
                      <strong>404 Router:</strong> Includes <code className="text-emerald-400">404.html</code> to prevent page-not-found errors on browser reload.
                    </li>
                    <li>
                      <strong>React Error Boundary:</strong> Catches unexpected runtime glitches and presents a clear recovery button instead of a white crash.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-950/80">
          <a
            href={`https://github.com/${sanitizedUser}/${sanitizedRepo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open {sanitizedUser}/{sanitizedRepo}</span>
          </a>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleCopy(actionsCommands, 'footer_copy')}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition-colors"
            >
              {copiedKey === 'footer_copy' ? 'Copied Commands!' : 'Copy Push Commands'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
