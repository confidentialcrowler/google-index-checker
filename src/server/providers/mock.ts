import { VerificationProvider, ProviderCapabilities, RateLimitConfig, ProviderHealth, ProviderVerificationResult } from './types.js';

export class MockVerificationProvider implements VerificationProvider {
  id: string;
  name: string;
  type: 'mock' = 'mock';
  private requestsToday = 0;
  private consecutiveErrors = 0;
  private totalLatency = 0;
  private rateLimit: RateLimitConfig;

  constructor(id: string, name: string, reqPerSec = 500, dailyQuota = 1000000) {
    this.id = id;
    this.name = name;
    this.rateLimit = {
      requestsPerSecond: reqPerSec,
      requestsPerMinute: reqPerSec * 60,
      concurrencyLimit: 50,
      dailyQuota,
    };
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsOfficialVerdict: false,
      supportsCrawlTime: true,
      supportsCanonicalDetection: true,
      supportsCoverageState: true,
      maxBatchSize: 1000,
    };
  }

  getRateLimit(): RateLimitConfig {
    return this.rateLimit;
  }

  async getHealth(): Promise<ProviderHealth> {
    return {
      status: this.consecutiveErrors > 5 ? 'DEGRADED' : 'HEALTHY',
      lastCheckedAt: new Date().toISOString(),
      consecutiveErrors: this.consecutiveErrors,
      avgLatencyMs: this.requestsToday > 0 ? Math.round(this.totalLatency / this.requestsToday) : 8,
      totalRequestsToday: this.requestsToday,
      quotaRemaining: Math.max(0, this.rateLimit.dailyQuota - this.requestsToday),
      message: 'Demo mock provider operating in high-throughput simulation mode [DEMO DATA]',
    };
  }

  recordResult(success: boolean, latencyMs: number, isRateLimit?: boolean): void {
    this.requestsToday++;
    this.totalLatency += latencyMs;
    if (success) {
      this.consecutiveErrors = 0;
    } else {
      this.consecutiveErrors++;
    }
  }

  async verify(url: string): Promise<ProviderVerificationResult> {
    const start = Date.now();
    this.requestsToday++;

    // Deterministic hash based on URL string so results are consistent for identical URLs
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = (hash << 5) - hash + url.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash);

    // Minor simulated network jitter (1 - 8ms)
    await new Promise((r) => setTimeout(r, 1 + (absHash % 5)));
    const latency = Date.now() - start;
    this.totalLatency += latency;

    // Simulation distribution:
    // URLs with "404" or "not-found" or "draft" -> not indexed
    // URLs with "error" or "broken" -> error (for retry testing)
    // URLs with "new" or "pending" -> unknown
    // Otherwise ~75% indexed, 15% not indexed, 10% unknown
    const urlLower = url.toLowerCase();

    if (urlLower.includes('error-test') || (absHash % 100 === 99)) {
      this.consecutiveErrors++;
      return {
        providerId: this.id,
        providerName: this.name,
        foundInIndex: null,
        verdict: 'ERROR',
        responseTimeMs: latency,
        error: 'Simulated upstream gateway timeout (HTTP 504) [DEMO DATA]',
        isMock: true,
      };
    }

    if (urlLower.includes('404') || urlLower.includes('unindexed') || urlLower.includes('no-index') || (absHash % 100 >= 80 && absHash % 100 < 92)) {
      return {
        providerId: this.id,
        providerName: this.name,
        foundInIndex: false,
        verdict: 'NOT_INDEXED',
        responseTimeMs: latency,
        rawEvidenceRef: `GOOGLE_PAGE_1_ZERO_RESULTS: site:${url} [DEMO DATA]`,
        isMock: true,
      };
    }

    if (urlLower.includes('unknown') || (absHash % 100 >= 92)) {
      return {
        providerId: this.id,
        providerName: this.name,
        foundInIndex: null,
        verdict: 'UNKNOWN',
        responseTimeMs: latency,
        rawEvidenceRef: `GOOGLE_SEARCH_UNCERTAIN: site:${url} [DEMO DATA]`,
        isMock: true,
      };
    }

    // Found on Google Page 1
    return {
      providerId: this.id,
      providerName: this.name,
      foundInIndex: true,
      verdict: 'INDEXED',
      matchedUrl: url,
      rawEvidenceRef: `GOOGLE_PAGE_1_MATCH (Rank #1): site:${url} [DEMO DATA]`,
      responseTimeMs: latency,
      isMock: true,
    };
  }
}
