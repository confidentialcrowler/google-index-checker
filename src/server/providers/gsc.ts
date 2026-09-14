import { VerificationProvider, ProviderCapabilities, RateLimitConfig, ProviderHealth, ProviderVerificationResult } from './types.js';

export class GoogleSearchConsoleProvider implements VerificationProvider {
  id = 'google_search_console';
  name = 'Google Search Console (Official API)';
  type: 'official_gsc' = 'official_gsc';

  private requestsToday = 0;
  private consecutiveErrors = 0;
  private totalLatency = 0;
  private rateLimit: RateLimitConfig = {
    requestsPerSecond: 10,       // GSC quota standard ~600/min per project
    requestsPerMinute: 600,
    concurrencyLimit: 5,
    dailyQuota: 2000,           // Standard default URL Inspection API quota
  };

  getCapabilities(): ProviderCapabilities {
    return {
      supportsOfficialVerdict: true,
      supportsCrawlTime: true,
      supportsCanonicalDetection: true,
      supportsCoverageState: true,
      maxBatchSize: 1, // GSC URL Inspection is single URL per call
    };
  }

  getRateLimit(): RateLimitConfig {
    return this.rateLimit;
  }

  async getHealth(): Promise<ProviderHealth> {
    return {
      status: this.consecutiveErrors > 3 ? 'DEGRADED' : 'HEALTHY',
      lastCheckedAt: new Date().toISOString(),
      consecutiveErrors: this.consecutiveErrors,
      avgLatencyMs: this.requestsToday > 0 ? Math.round(this.totalLatency / this.requestsToday) : 180,
      totalRequestsToday: this.requestsToday,
      quotaRemaining: Math.max(0, this.rateLimit.dailyQuota - this.requestsToday),
      message: 'Official Google Search Console URL Inspection API connector ready.',
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

  async verify(url: string, userAccessToken?: string, siteUrl?: string): Promise<ProviderVerificationResult> {
    const start = Date.now();
    this.requestsToday++;

    if (!userAccessToken) {
      return {
        providerId: this.id,
        providerName: this.name,
        foundInIndex: null,
        verdict: 'UNKNOWN',
        responseTimeMs: 0,
        error: 'Google Search Console authentication required. Connect Google OAuth with Search Console permissions.',
        isMock: false,
      };
    }

    try {
      // Determine siteUrl from inspection URL if not passed
      const targetSiteUrl = siteUrl || new URL(url).origin + '/';

      const response = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inspectionUrl: url,
          siteUrl: targetSiteUrl,
          languageCode: 'en-US',
        }),
      });

      const latency = Date.now() - start;
      this.totalLatency += latency;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error?.message || `GSC API error HTTP ${response.status}`;
        
        if (response.status === 429) {
          this.recordResult(false, latency, true);
        } else {
          this.recordResult(false, latency);
        }

        return {
          providerId: this.id,
          providerName: this.name,
          foundInIndex: null,
          verdict: 'ERROR',
          responseTimeMs: latency,
          error: message,
          isMock: false,
        };
      }

      this.recordResult(true, latency);
      const data = await response.json();
      const indexStatus = data.inspectionResult?.indexStatusResult;
      const verdict = indexStatus?.verdict; // 'PASS', 'FAIL', 'NEUTRAL'
      const coverageState = indexStatus?.coverageState || 'Unknown coverage';
      const robotsTxtState = indexStatus?.robotsTxtState;
      const indexingState = indexStatus?.indexingState;

      const isIndexed = verdict === 'PASS';
      const isBlocked = verdict === 'FAIL' && (robotsTxtState === 'DISALLOWED' || indexingState === 'BLOCKED_BY_META_TAG');

      return {
        providerId: this.id,
        providerName: this.name,
        foundInIndex: isIndexed,
        verdict: isBlocked ? 'BLOCKED' : isIndexed ? 'INDEXED' : 'NOT_INDEXED',
        matchedUrl: indexStatus?.googleCanonical || url,
        rawEvidenceRef: `GSC_VERDICT_${verdict}_[${coverageState}]`,
        responseTimeMs: latency,
        isMock: false,
        details: {
          verdict,
          coverageState,
          lastCrawlTime: indexStatus?.lastCrawlTime,
          googleCanonical: indexStatus?.googleCanonical,
          userCanonical: indexStatus?.userCanonical,
          robotsTxtState,
          indexingState,
        },
      };
    } catch (err: any) {
      const latency = Date.now() - start;
      this.recordResult(false, latency);
      return {
        providerId: this.id,
        providerName: this.name,
        foundInIndex: null,
        verdict: 'ERROR',
        responseTimeMs: latency,
        error: err.message,
        isMock: false,
      };
    }
  }
}
