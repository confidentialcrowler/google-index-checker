import { ProviderEvidence } from '../../types.js';

export interface ProviderCapabilities {
  supportsOfficialVerdict: boolean;
  supportsCrawlTime: boolean;
  supportsCanonicalDetection: boolean;
  supportsCoverageState: boolean;
  maxBatchSize: number;
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  concurrencyLimit: number;
  dailyQuota: number;
}

export interface ProviderHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'RATE_LIMITED' | 'QUOTA_EXHAUSTED' | 'UNAVAILABLE';
  lastCheckedAt: string;
  consecutiveErrors: number;
  avgLatencyMs: number;
  totalRequestsToday: number;
  quotaRemaining: number;
  message?: string;
}

export interface ProviderVerificationResult {
  providerId: string;
  providerName: string;
  foundInIndex: boolean | null; // null = inconclusive / error
  verdict: 'INDEXED' | 'NOT_INDEXED' | 'BLOCKED' | 'UNKNOWN' | 'ERROR';
  rawEvidenceRef?: string;
  matchedUrl?: string;
  responseTimeMs: number;
  error?: string;
  isMock: boolean;
  details?: Record<string, any>;
}

export interface VerificationProvider {
  id: string;
  name: string;
  type: 'official_gsc' | 'serp_api' | 'index_data' | 'mock';
  verify(url: string, userAccessToken?: string): Promise<ProviderVerificationResult>;
  getCapabilities(): ProviderCapabilities;
  getRateLimit(): RateLimitConfig;
  getHealth(): Promise<ProviderHealth>;
  recordResult(success: boolean, latencyMs: number, isRateLimit?: boolean): void;
}
