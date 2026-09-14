# Production Deployment Guide

## System Topology
```text
[ Cloud Load Balancer / Nginx Reverse Proxy ]
                     |
         +-----------+-----------+
         |                       |
[ App Server 1 ]          [ App Server 2 ]
  (Express + Vite)          (Express + Vite)
         |                       |
         +-----------+-----------+
                     |
          [ Redis Cluster / PubSub ]
                     |
         +-----------+-----------+
         |                       |
  [ Worker Node 1 ]       [ Worker Node 2 ]
  (Distributed Queue)     (Distributed Queue)
         |                       |
         +-----------+-----------+
                     |
       [ PostgreSQL Relational DB ]
```

## Horizontal Worker Scaling
Concurrency can be dynamically scaled via environment variables or runtime administration:
```bash
# Set concurrency per worker node
export MAX_CONCURRENT_JOBS=50
export TARGET_THROUGHPUT=100
```
With 2 worker nodes executing 50 concurrent jobs each:
`2 nodes × 50 jobs = 100 concurrent URLs in flight`.

## Container Execution
```bash
# Build production bundle
npm run build

# Launch server
npm start
```
Bind Host: `0.0.0.0`, Port: `3000`.

---

## GitHub Pages Deployment

### Why It Showed a White Blank Screen Previously
1. **Absolute Base Path (`/`) vs Subdirectory (`/repo-name/`)**:
   - By default Vite generated paths like `/assets/index.js`.
   - On GitHub Pages (`https://username.github.io/repo-name/`), this requested `https://username.github.io/assets/index.js` which returned **404 Not Found**.
   - **Resolution**: `vite.config.ts` is now configured with `base: './'` (relative paths), which resolves asset links correctly on any GitHub Pages subpath.
2. **Missing Node.js Server on Static Hosting**:
   - GitHub Pages is a static file host with no backend Node.js Express runtime.
   - **Resolution**: An automatic client-side fallback interceptor (`src/lib/clientFallback.ts`) has been integrated. It simulates provider consensus, bulk queue processing, multi-key rotation, and spreadsheet downloads directly in the browser when deployed statically.
3. **Jekyll Filtering & Direct Navigation**:
   - Added `public/.nojekyll` to prevent Jekyll from omitting Vite files.
   - Added `public/404.html` for single-page application fallback.
4. **React Error Boundary**:
   - Added `ErrorBoundary.tsx` wrapping the application root to prevent white screen crashes and provide diagnostic error feedback.

### How to Connect & Deploy to GitHub

#### Step 1: Create a Repository on GitHub
Go to [GitHub](https://github.com/new) and create a new repository (e.g. `crawlme-index-checker`). Leave it empty (without initializing README or license).

#### Step 2: Push Your Local Repository to GitHub
In your terminal, run:
```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/<your-username>/crawlme-index-checker.git

# Set main branch and push
git branch -M main
git push -u origin main
```

#### Step 3: Choose Your Deployment Method

##### Method 1: Automatic GitHub Actions (Recommended)
The repository already includes `.github/workflows/deploy.yml`.
1. Go to your repository on GitHub: **Settings > Pages**.
2. Under **Build and deployment > Source**, choose **GitHub Actions**.
3. Any push to `main` (or clicking "Run workflow" in the Actions tab) automatically builds and deploys your site to `https://<your-username>.github.io/crawlme-index-checker/`!

##### Method 2: One-Command CLI Deploy (`npm run deploy`)
If you prefer deploying directly to a `gh-pages` branch:
```bash
# Builds production files and pushes to gh-pages branch
npm run deploy
```
Then under **Settings > Pages > Source**, choose **Deploy from a branch** and select **gh-pages / (root)**.
