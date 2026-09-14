import { EventEmitter } from 'events';
import { db } from './db.js';
import { providerManager } from './providers/manager.js';
import { evaluateIndexConfidence } from './confidence.js';
import { inspectTechnicalSeo } from './seo.js';
import { UrlCheckResult, ProviderEvidence } from '../types.js';

export interface QueueJob {
  id: string;
  batchId: string;
  originalUrl: string;
  normalizedUrl: string;
  retryCount: number;
  maxRetries: number;
  skipSeoCheck?: boolean;
  forceFresh?: boolean;
}

interface BatchMetadata {
  batchId: string;
  startTime: number;
  totalCompleted: number;
  peakSpeed: number;
  concurrency: number;
}

export class BulkJobQueue extends EventEmitter {
  private queue: QueueJob[] = [];
  private activeJobsCount = 0;
  private concurrency = 25; // default concurrent worker slots
  private isProcessing = false;
  private isPaused = false;

  // Active batches map to track multiple concurrent or sequential batches
  private activeBatches: Map<string, BatchMetadata> = new Map();

  // Sliding 1-second window for speed calculation
  private completionsInWindow: number[] = [];
  private speedMonitorInterval: NodeJS.Timeout | null = null;
  private gscToken: string | undefined;
  private gscSiteUrl: string | undefined;

  constructor() {
    super();
    this.startWatchdogAndSpeedMonitor();
  }

  setConcurrency(concurrency: number) {
    this.concurrency = Math.max(1, Math.min(200, concurrency));
  }

  getConcurrency(): number {
    return this.concurrency;
  }

  getActiveWorkers(): number {
    return this.activeJobsCount;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  setGscCredentials(token?: string, siteUrl?: string) {
    this.gscToken = token;
    this.gscSiteUrl = siteUrl;
  }

  private startWatchdogAndSpeedMonitor() {
    this.speedMonitorInterval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - 1000;
      this.completionsInWindow = this.completionsInWindow.filter((t) => t > cutoff);
      const currentSpeed = this.completionsInWindow.length;

      // Update all active running batches
      for (const [batchId, meta] of this.activeBatches.entries()) {
        const batch = db.getBatch(batchId);
        if (!batch) {
          this.activeBatches.delete(batchId);
          continue;
        }

        if (batch.progress.status === 'RUNNING') {
          const elapsedSec = Math.max(1, Math.round((now - meta.startTime) / 1000));
          const avgSpeed = Math.round(meta.totalCompleted / elapsedSec);
          if (currentSpeed > meta.peakSpeed) {
            meta.peakSpeed = currentSpeed;
          }

          const remaining = batch.progress.remaining;
          const etaSec = currentSpeed > 0 ? Math.round(remaining / currentSpeed) : avgSpeed > 0 ? Math.round(remaining / avgSpeed) : 0;

          db.updateBatchProgress(batchId, {
            currentSpeed,
            averageSpeed: avgSpeed,
            peakSpeed: meta.peakSpeed,
            activeWorkers: Math.min(this.activeJobsCount, this.concurrency),
            elapsedSeconds: elapsedSec,
            etaSeconds: etaSec,
          });

          // Watchdog reconciler: Check if batch is finished
          const resultCount = db.getBatchResultsCount(batchId);
          const queueJobsForBatch = this.queue.filter((q) => q.batchId === batchId).length;

          if (resultCount >= batch.progress.total || (queueJobsForBatch === 0 && this.activeJobsCount === 0 && resultCount > 0)) {
            db.completeBatch(batchId);
            this.activeBatches.delete(batchId);
            this.emit('completed', { batchId });
          } else {
            this.emit('progress', {
              batchId,
              progress: batch.progress,
            });
          }
        } else if (batch.progress.status === 'COMPLETED' || batch.progress.status === 'CANCELLED') {
          this.activeBatches.delete(batchId);
        }
      }
    }, 500);
  }

  enqueueBatch(
    batchId: string,
    urls: { originalUrl: string; normalizedUrl: string }[],
    options?: { concurrency?: number; skipSeo?: boolean; forceFresh?: boolean }
  ) {
    if (options?.concurrency) {
      this.setConcurrency(options.concurrency);
    }

    this.activeBatches.set(batchId, {
      batchId,
      startTime: Date.now(),
      totalCompleted: 0,
      peakSpeed: 0,
      concurrency: this.concurrency,
    });

    this.isPaused = false;

    db.updateBatchProgress(batchId, {
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
      activeWorkers: this.concurrency,
    });

    for (let i = 0; i < urls.length; i++) {
      const item = urls[i];
      this.queue.push({
        id: `job_${batchId}_${Date.now()}_${i}`,
        batchId,
        originalUrl: item.originalUrl,
        normalizedUrl: item.normalizedUrl,
        retryCount: 0,
        maxRetries: 2,
        skipSeoCheck: options?.skipSeo ?? false,
        forceFresh: options?.forceFresh ?? false,
      });
    }

    this.processQueue();
  }

  pause(batchId?: string) {
    this.isPaused = true;
    if (batchId) {
      db.updateBatchProgress(batchId, { status: 'PAUSED' });
      this.emit('paused', { batchId });
    } else {
      for (const bId of this.activeBatches.keys()) {
        db.updateBatchProgress(bId, { status: 'PAUSED' });
        this.emit('paused', { batchId: bId });
      }
    }
  }

  resume(batchId?: string) {
    this.isPaused = false;
    if (batchId) {
      db.updateBatchProgress(batchId, { status: 'RUNNING' });
      this.emit('resumed', { batchId });
    } else {
      for (const bId of this.activeBatches.keys()) {
        db.updateBatchProgress(bId, { status: 'RUNNING' });
        this.emit('resumed', { batchId: bId });
      }
    }
    this.processQueue();
  }

  cancel(batchId?: string) {
    if (batchId) {
      this.queue = this.queue.filter((job) => job.batchId !== batchId);
      db.updateBatchProgress(batchId, {
        status: 'CANCELLED',
        finishedAt: new Date().toISOString(),
        activeWorkers: 0,
      });
      this.activeBatches.delete(batchId);
      this.emit('cancelled', { batchId });
    } else {
      this.queue = [];
      for (const bId of this.activeBatches.keys()) {
        db.updateBatchProgress(bId, {
          status: 'CANCELLED',
          finishedAt: new Date().toISOString(),
          activeWorkers: 0,
        });
        this.emit('cancelled', { batchId: bId });
      }
      this.activeBatches.clear();
    }
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (!this.isPaused && (this.queue.length > 0 || this.activeJobsCount > 0)) {
        while (this.activeJobsCount < this.concurrency && this.queue.length > 0 && !this.isPaused) {
          const job = this.queue.shift();
          if (!job) break;

          // If the batch was cancelled while in queue, skip job
          const batch = db.getBatch(job.batchId);
          if (batch && (batch.progress.status === 'CANCELLED' || batch.progress.status === 'COMPLETED')) {
            continue;
          }

          this.activeJobsCount++;

          // Execute job with safety timeout and guaranteed completion tracking
          this.executeJobWithSafety(job)
            .catch((err) => {
              console.error(`Unexpected worker rejection for job ${job.id}:`, err);
            })
            .finally(() => {
              this.activeJobsCount = Math.max(0, this.activeJobsCount - 1);
              this.completionsInWindow.push(Date.now());

              const meta = this.activeBatches.get(job.batchId);
              if (meta) {
                meta.totalCompleted++;
              }

              // Check if batch reached total
              const currentBatch = db.getBatch(job.batchId);
              if (currentBatch && currentBatch.progress.status === 'RUNNING') {
                const resultsCount = db.getBatchResultsCount(job.batchId);
                if (resultsCount >= currentBatch.progress.total) {
                  db.completeBatch(job.batchId);
                  this.activeBatches.delete(job.batchId);
                  this.emit('completed', { batchId: job.batchId });
                }
              }
            });
        }

        // Cooperative yield
        await new Promise((r) => setImmediate(r));
        if (this.activeJobsCount >= this.concurrency || this.queue.length === 0) {
          await new Promise((r) => setTimeout(r, 25));
        }
      }
    } finally {
      this.isProcessing = false;

      // Final reconciliation check for any completed batches
      for (const [batchId] of this.activeBatches.entries()) {
        const b = db.getBatch(batchId);
        if (b && b.progress.status === 'RUNNING') {
          const count = db.getBatchResultsCount(batchId);
          if (count >= b.progress.total && b.progress.total > 0) {
            db.completeBatch(batchId);
            this.activeBatches.delete(batchId);
            this.emit('completed', { batchId });
          }
        }
      }
    }
  }

  /**
   * Executes a job with an absolute 12-second safety timeout.
   * Ensures that no worker slot hangs indefinitely and every job writes a valid result to db.
   */
  private async executeJobWithSafety(job: QueueJob): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Job execution exceeded 12s safety timeout')), 12000);
    });

    try {
      await Promise.race([this.executeJob(job), timeoutPromise]);
    } catch (err: any) {
      // If retries remain and it wasn't cancelled, push back to queue
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        this.queue.push(job);
        return;
      }

      // Guaranteed fallback write to prevent incomplete batch status
      const errorResult: UrlCheckResult = {
        id: job.id,
        batchId: job.batchId,
        originalUrl: job.originalUrl,
        normalizedUrl: job.normalizedUrl,
        status: 'ERROR',
        confidenceScore: 0,
        confidenceLabel: 'INCONCLUSIVE',
        verificationMethod: 'MULTI_PROVIDER_CONSENSUS',
        providerAgreement: 'Worker execution failure',
        gscStatus: null,
        searchEvidenceSummary: `Execution error: ${err.message || 'Worker timeout'}. Marked as check failure.`,
        providerEvidence: [],
        checkedAt: new Date().toISOString(),
        processingDurationMs: 0,
        retryCount: job.retryCount,
        error: err.message || 'Worker timeout',
      };

      db.saveBatchResult(job.batchId, errorResult);
    }
  }

  private async executeJob(job: QueueJob) {
    const jobStartTime = Date.now();

    // Check Cache first if not forced fresh
    if (!job.forceFresh) {
      const cached = db.getCached(job.normalizedUrl);
      if (cached) {
        db.saveBatchResult(job.batchId, {
          ...cached,
          id: job.id,
          batchId: job.batchId,
          originalUrl: job.originalUrl,
          processingDurationMs: 1,
        });
        return;
      }
    }

    try {
      const batch = db.getBatch(job.batchId);
      const requestedProviders = batch?.providerSelection || [];

      // Run Verification routing and Technical SEO inspection in parallel
      const [providerResults, techSeo] = await Promise.all([
        providerManager.routeVerification(
          job.normalizedUrl,
          requestedProviders,
          this.gscToken,
          this.gscSiteUrl
        ),
        job.skipSeoCheck
          ? Promise.resolve(undefined)
          : inspectTechnicalSeo(job.normalizedUrl, 4500).catch(() => undefined),
      ]);

      // Calculate confidence through consensus engine with Google site:url first-page check
      const displayUrl = job.originalUrl || job.normalizedUrl;
      const confidence = evaluateIndexConfidence(providerResults, techSeo, displayUrl);

      const evidenceList: ProviderEvidence[] = providerResults.map((pr) => ({
        providerId: pr.providerId,
        providerName: pr.providerName,
        found: Boolean(pr.foundInIndex),
        statusText: pr.verdict,
        rawReference: pr.rawEvidenceRef,
        matchedUrl: pr.matchedUrl,
        timestamp: new Date().toISOString(),
        responseTimeMs: pr.responseTimeMs,
        error: pr.error,
        isMock: pr.isMock,
        googleSiteQuery: `site:${displayUrl}`,
        googleFirstPageStatus: (Boolean(pr.foundInIndex) ? 'SHOWING_PAGE_1' : 'NOT_SHOWING_PAGE_1') as 'SHOWING_PAGE_1' | 'NOT_SHOWING_PAGE_1',
        googleRankPosition: Boolean(pr.foundInIndex) ? 1 : null,
      }));

      const durationMs = Date.now() - jobStartTime;

      const result: UrlCheckResult = {
        id: job.id,
        batchId: job.batchId,
        originalUrl: job.originalUrl,
        normalizedUrl: job.normalizedUrl,
        status: confidence.status,
        confidenceScore: confidence.confidenceScore,
        confidenceLabel: confidence.confidenceLabel,
        verificationMethod: confidence.verificationMethod,
        providerAgreement: confidence.providerAgreement,
        gscStatus: confidence.gscStatus,
        searchEvidenceSummary: confidence.searchEvidenceSummary,
        technicalSeo: techSeo,
        providerEvidence: evidenceList,
        checkedAt: new Date().toISOString(),
        processingDurationMs: durationMs,
        retryCount: job.retryCount,
        isMockData: confidence.isMockData,
        googleSiteQuery: confidence.googleSiteQuery,
        googleSearchUrl: confidence.googleSearchUrl,
        googleFirstPageStatus: confidence.googleFirstPageStatus,
        googleRankPosition: confidence.googleRankPosition,
        simpleVerdict: confidence.simpleVerdict,
      };

      // Retry mechanism: If all providers failed with network/gateway error and retries remain
      if (confidence.status === 'ERROR' && job.retryCount < job.maxRetries) {
        job.retryCount++;
        this.queue.push(job);
        return;
      }

      db.saveBatchResult(job.batchId, result);

      // Cache valid results for 1 hour
      if (result.status !== 'ERROR') {
        db.setCached(job.normalizedUrl, result, 3600);
      }
    } catch (err: any) {
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        this.queue.push(job);
        return;
      }

      const durationMs = Date.now() - jobStartTime;
      const errorResult: UrlCheckResult = {
        id: job.id,
        batchId: job.batchId,
        originalUrl: job.originalUrl,
        normalizedUrl: job.normalizedUrl,
        status: 'ERROR',
        confidenceScore: 0,
        confidenceLabel: 'INCONCLUSIVE',
        verificationMethod: 'MULTI_PROVIDER_CONSENSUS',
        providerAgreement: 'Worker execution failed',
        gscStatus: null,
        searchEvidenceSummary: `Worker exception: ${err.message}. Never classified as Not Indexed.`,
        providerEvidence: [],
        checkedAt: new Date().toISOString(),
        processingDurationMs: durationMs,
        retryCount: job.retryCount,
        error: err.message,
      };

      db.saveBatchResult(job.batchId, errorResult);
    }
  }
}

export const bulkQueue = new BulkJobQueue();
