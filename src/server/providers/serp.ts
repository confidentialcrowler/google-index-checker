import { VerificationProvider, ProviderCapabilities, RateLimitConfig, ProviderHealth, ProviderVerificationResult } from './types.js';
import { apiKeyPool } from '../keyPool.js';
import { LiveSearchConsensusProvider } from './live.js';

export class SerpVerificationProvider implements VerificationProvider {
  id: string;
  name: string;
  type: 'serp_api' = 'serp_api';
  private apiKey: string;
  private endpointUrl: string;
  private requestsToday = 0;
  private consecutiveErrors = 0;
  private totalLatency = 0;
  private rateLimit: RateLimitConfig;
  private fallbackProvider = new LiveSearchConsensusProvider();

  constructor(id: string, name: string, apiKey: string = '', endpointUrl = 'https://api.serpapi.com/search', reqPerSec = 20, dailyQuota = 50000) {
    this.id = id;
    this.name = name;
    this.apiKey = apiKey;
    this.endpointUrl = endpointUrl;
    this.rateLimit = {
      requestsPerSecond: reqPerSec,
      requestsPerMinute: reqPerSec * 60,
      concurrencyLimit: 20,
      dailyQuota,
    };
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsOfficialVerdict: false,
      supportsCrawlTime: false,
      supportsCanonicalDetection: false,
      supportsCoverageState: false,
      maxBatchSize: 10,
    };
  }

  getRateLimit(): RateLimitConfig {
    return this.rateLimit;
  }

  async getHealth(): Promise<ProviderHealth> {
    const poolStatus = apiKeyPool.getPoolStatus();
    const hasKey = Boolean(this.apiKey && this.apiKey.length > 3) || poolStatus.activeKeys > 0;

    let status: ProviderHealth['status'] = 'HEALTHY';
    let message = `API Provider Pool: ${poolStatus.activeKeys} active keys (${poolStatus.totalRemainingCredits} searches remaining)`;

    if (poolStatus.allExhaustedNotice) {
      status = 'QUOTA_EXHAUSTED';
      message = 'All API keys exhausted (0 credits left). Live crawler fallback active.';
    } else if (poolStatus.lowCreditWarning) {
      status = 'DEGRADED';
      message = `Low credits: Only ${poolStatus.totalRemainingCredits} searches remaining across keys!`;
    } else if (!hasKey) {
      status = 'UNAVAILABLE';
      message = 'No API keys configured. Using live crawler fallback.';
    }

    return {
      status,
      lastCheckedAt: new Date().toISOString(),
      consecutiveErrors: this.consecutiveErrors,
      avgLatencyMs: this.requestsToday > 0 ? Math.round(this.totalLatency / this.requestsToday) : 120,
      totalRequestsToday: this.requestsToday,
      quotaRemaining: poolStatus.totalRemainingCredits,
      message,
    };
  }

  recordResult(success: boolean, latencyMs: number, isRateLimit?: boolean): void {
    this.requestsToday++;
    this.totalLatency += latencyMs;
    if (isRateLimit) {
      this.consecutiveErrors += 2;
    } else if (success) {
      this.consecutiveErrors = 0;
    } else {
      this.consecutiveErrors++;
    }
  }

  async verify(url: string): Promise<ProviderVerificationResult> {
    const start = Date.now();

    // Try up to 3 keys from the multi-key pool before falling back
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;

      // 1. Determine key to use (either direct property or next available key in pool)
      let activeKeyInfo = this.apiKey ? { id: 'manual_key', rawKey: this.apiKey, label: 'Manual Key' } : null;
      if (!activeKeyInfo) {
        activeKeyInfo = apiKeyPool.acquireValidKey();
      }

      if (!activeKeyInfo || activeKeyInfo.rawKey.includes('demo_key')) {
        // No valid keys or all exhausted -> Fall back to live consensus crawler
        const fallbackRes = await this.fallbackProvider.verify(url);
        return {
          ...fallbackRes,
          providerId: this.id,
          providerName: `${this.name} [Live Fallback Node]`,
          rawEvidenceRef: `${fallbackRes.rawEvidenceRef || 'LIVE_CONSENSUS_FALLBACK'} (API Pool Fallback)`,
        };
      }

      try {
        const searchUrl = new URL(this.endpointUrl);
        searchUrl.searchParams.set('q', `site:${url}`);
        searchUrl.searchParams.set('api_key', activeKeyInfo.rawKey);
        searchUrl.searchParams.set('num', '1');

        const response = await fetch(searchUrl.toString(), {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        const latency = Date.now() - start;

        // Check if limit was reached (429 or 403 quota error)
        if (response.status === 429 || response.status === 402 || response.status === 403) {
          const errText = await response.text();
          apiKeyPool.recordUsage(activeKeyInfo.id, false, response.status, errText || 'Monthly quota or rate limit reached');
          this.recordResult(false, latency, true);
          // Loop will immediately try the next available key!
          continue;
        }

        if (!response.ok) {
          apiKeyPool.recordUsage(activeKeyInfo.id, false, response.status, `HTTP ${response.status}`);
          this.recordResult(false, latency, false);
          // Fall back to next key or fallback provider
          continue;
        }

        const data: any = await response.json();

        // Check if JSON response itself indicates limit (some SERP providers return 200 with error property)
        if (data.error && (data.error.includes('limit') || data.error.includes('quota') || data.error.includes('searches per month'))) {
          apiKeyPool.recordUsage(activeKeyInfo.id, false, 429, data.error);
          continue; // skip and try next key
        }

        // Successfully got result from API key!
        apiKeyPool.recordUsage(activeKeyInfo.id, true);
        this.recordResult(true, latency);

        const organicResults = data.organic_results || data.results || [];
        const exactMatch = organicResults.find((r: any) => {
          const link = r.link || r.url || '';
          return link.toLowerCase() === url.toLowerCase() || link.replace(/\/$/, '') === url.replace(/\/$/, '');
        });

        const found = Boolean(exactMatch || organicResults.length > 0);

        return {
          providerId: this.id,
          providerName: `${this.name} (${activeKeyInfo.label})`,
          foundInIndex: found,
          verdict: found ? 'INDEXED' : 'NOT_INDEXED',
          matchedUrl: exactMatch?.link || (found ? organicResults[0]?.link : undefined),
          rawEvidenceRef: found ? `GOOGLE_PAGE_1_MATCH: site:${url}` : `GOOGLE_PAGE_1_ZERO_RESULTS: site:${url}`,
          responseTimeMs: latency,
          isMock: false,
        };
      } catch (err: any) {
        apiKeyPool.recordUsage(activeKeyInfo.id, false, 500, err.message);
      }
    }

    // If all attempts failed or exhausted, seamlessly use the live crawler fallback
    const fallbackRes = await this.fallbackProvider.verify(url);
    return {
      ...fallbackRes,
      providerId: this.id,
      providerName: `${this.name} [Live Fallback Node]`,
      rawEvidenceRef: `${fallbackRes.rawEvidenceRef || 'LIVE_CONSENSUS_FALLBACK'} (All Keys Exhausted Fallback)`,
    };
  }
}
