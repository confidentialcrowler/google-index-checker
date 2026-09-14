import { BatchSummary, BatchProgress, UrlCheckResult, GeneratedReport } from '../types.js';

export interface Project {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
  batchCount: number;
}

export interface CachedVerification {
  result: UrlCheckResult;
  cachedAt: number;
  expiresAt: number;
}

export class DatabaseStore {
  private projects: Map<string, Project> = new Map();
  private batches: Map<string, BatchSummary> = new Map();
  private batchResults: Map<string, UrlCheckResult[]> = new Map();
  private reports: Map<string, GeneratedReport> = new Map();
  private cache: Map<string, CachedVerification> = new Map();

  // Metrics
  private totalCompletedLifetime = 0;
  private peakSpeedLifetime = 0;
  private systemStartTime = Date.now();

  constructor() {
    this.initDefaultProject();
  }

  private initDefaultProject() {
    const defaultProj: Project = {
      id: 'proj_default',
      name: 'Main Production Domain',
      domain: 'example.com',
      createdAt: new Date().toISOString(),
      batchCount: 0,
    };
    this.projects.set(defaultProj.id, defaultProj);
  }

  // --- Projects ---
  getProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  createProject(name: string, domain: string): Project {
    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const proj: Project = {
      id,
      name: name.trim() || 'New Project',
      domain: domain.trim() || 'example.com',
      createdAt: new Date().toISOString(),
      batchCount: 0,
    };
    this.projects.set(id, proj);
    return proj;
  }

  // --- Batches ---
  createBatch(
    name: string,
    totalCount: number,
    duplicateCount: number,
    providerSelection: string[] = []
  ): BatchSummary {
    const id = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const progress: BatchProgress = {
      total: totalCount,
      processed: 0,
      remaining: totalCount,
      indexed: 0,
      likelyIndexed: 0,
      notFound: 0,
      unknown: 0,
      errors: 0,
      duplicatesRemoved: duplicateCount,
      percent: 0,
      currentSpeed: 0,
      averageSpeed: 0,
      peakSpeed: 0,
      activeWorkers: 0,
      etaSeconds: 0,
      elapsedSeconds: 0,
      status: 'PENDING',
      startedAt: null,
      finishedAt: null,
    };

    const batch: BatchSummary = {
      id,
      name: name || `Batch Check #${this.batches.size + 1}`,
      createdAt: new Date().toISOString(),
      progress,
      providerSelection,
    };

    this.batches.set(id, batch);
    this.batchResults.set(id, []);
    return batch;
  }

  getBatch(id: string): BatchSummary | undefined {
    return this.batches.get(id);
  }

  getAllBatches(): BatchSummary[] {
    return Array.from(this.batches.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  updateBatchProgress(id: string, partial: Partial<BatchProgress>) {
    const b = this.batches.get(id);
    if (b) {
      b.progress = { ...b.progress, ...partial };
      if (b.progress.currentSpeed > this.peakSpeedLifetime) {
        this.peakSpeedLifetime = b.progress.currentSpeed;
      }
    }
  }

  // --- Batch Results & Bulk Writes ---
  saveBatchResult(batchId: string, result: UrlCheckResult) {
    let list = this.batchResults.get(batchId);
    if (!list) {
      list = [];
      this.batchResults.set(batchId, list);
    }

    // Check if result already exists (by ID or normalizedUrl)
    const existingIndex = list.findIndex((r) => r.id === result.id || r.normalizedUrl === result.normalizedUrl);
    if (existingIndex >= 0) {
      list[existingIndex] = result;
    } else {
      list.push(result);
      this.totalCompletedLifetime++;
    }

    this.recalculateBatchProgress(batchId);
  }

  saveBatchResultsBulk(batchId: string, results: UrlCheckResult[]) {
    let list = this.batchResults.get(batchId);
    if (!list) {
      list = [];
      this.batchResults.set(batchId, list);
    }

    for (const r of results) {
      const existingIndex = list.findIndex((item) => item.id === r.id || item.normalizedUrl === r.normalizedUrl);
      if (existingIndex >= 0) {
        list[existingIndex] = r;
      } else {
        list.push(r);
        this.totalCompletedLifetime++;
      }
    }

    this.recalculateBatchProgress(batchId);
  }

  recalculateBatchProgress(batchId: string) {
    const b = this.batches.get(batchId);
    const list = this.batchResults.get(batchId) || [];
    if (!b) return;

    let indexed = 0;
    let likelyIndexed = 0;
    let notFound = 0;
    let errors = 0;
    let unknown = 0;

    for (const r of list) {
      if (r.status === 'CONFIRMED_INDEXED') indexed++;
      else if (r.status === 'LIKELY_INDEXED') likelyIndexed++;
      else if (r.status === 'NOT_INDEXED' || r.status === 'INDEXING_BLOCKED') notFound++;
      else if (r.status === 'ERROR') errors++;
      else unknown++;
    }

    b.progress.indexed = indexed;
    b.progress.likelyIndexed = likelyIndexed;
    b.progress.notFound = notFound;
    b.progress.errors = errors;
    b.progress.unknown = unknown;

    b.progress.processed = list.length;
    b.progress.remaining = Math.max(0, b.progress.total - list.length);
    b.progress.percent = b.progress.total > 0 ? Math.min(100, Math.round((list.length / b.progress.total) * 100)) : 100;

    // Automatic completion check: if all URLs have been processed and status is still RUNNING
    if (list.length >= b.progress.total && b.progress.total > 0 && b.progress.status === 'RUNNING') {
      b.progress.status = 'COMPLETED';
      b.progress.finishedAt = new Date().toISOString();
      b.progress.activeWorkers = 0;
      b.progress.remaining = 0;
      b.progress.currentSpeed = 0;
    }
  }

  completeBatch(batchId: string) {
    const b = this.batches.get(batchId);
    if (!b) return;
    this.recalculateBatchProgress(batchId);
    b.progress.status = 'COMPLETED';
    b.progress.finishedAt = b.progress.finishedAt || new Date().toISOString();
    b.progress.activeWorkers = 0;
    b.progress.remaining = 0;
    b.progress.currentSpeed = 0;
  }

  prepareBatchRetry(batchId: string): UrlCheckResult[] {
    const b = this.batches.get(batchId);
    let list = this.batchResults.get(batchId) || [];
    if (!b) return [];

    const failedItems = list.filter((r) => r.status === 'ERROR');
    // Keep only non-failed items in list
    const retainedItems = list.filter((r) => r.status !== 'ERROR');
    this.batchResults.set(batchId, retainedItems);

    b.progress.status = 'RUNNING';
    b.progress.finishedAt = null;
    this.recalculateBatchProgress(batchId);

    return failedItems;
  }

  getBatchResultsCount(batchId: string): number {
    return this.batchResults.get(batchId)?.length || 0;
  }

  getBatchResults(
    batchId: string,
    filterStatus?: string,
    searchQuery?: string,
    limit = 100,
    offset = 0
  ): { items: UrlCheckResult[]; total: number } {
    const list = this.batchResults.get(batchId) || [];
    let filtered = list;

    if (filterStatus && filterStatus !== 'ALL') {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.originalUrl.toLowerCase().includes(q) ||
          r.normalizedUrl.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q) ||
          (r.technicalSeo?.title && r.technicalSeo.title.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit);
    return { items, total };
  }

  getAllBatchResultsRaw(batchId: string): UrlCheckResult[] {
    return this.batchResults.get(batchId) || [];
  }

  // --- Cache System ---
  getCached(url: string): UrlCheckResult | null {
    const entry = this.cache.get(url);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(url);
      return null;
    }
    return entry.result;
  }

  setCached(url: string, result: UrlCheckResult, ttlSeconds = 3600) {
    const now = Date.now();
    this.cache.set(url, {
      result,
      cachedAt: now,
      expiresAt: now + ttlSeconds * 1000,
    });
  }

  clearCache() {
    this.cache.clear();
  }

  // --- Reports ---
  saveReport(report: GeneratedReport) {
    this.reports.set(report.id, report);
  }

  getReport(id: string): GeneratedReport | undefined {
    return this.reports.get(id);
  }

  getAllReports(): GeneratedReport[] {
    return Array.from(this.reports.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // --- System Telemetry ---
  getSystemMetrics(activeWorkerCount = 0, queueLength = 0) {
    return {
      activeJobs: queueLength,
      urlsPerSecond: 0,
      activeWorkers: activeWorkerCount,
      queueLength,
      completedJobsTotal: this.totalCompletedLifetime,
      totalBatches: this.batches.size,
      uptimeSeconds: Math.round((Date.now() - this.systemStartTime) / 1000),
      databaseHealth: 'OPTIMAL' as const,
      redisQueueHealth: 'ACTIVE' as const,
      peakSpeedLifetime: this.peakSpeedLifetime,
    };
  }
}

export const db = new DatabaseStore();
