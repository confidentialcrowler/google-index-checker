export type IndexStatus =
  | 'CONFIRMED_INDEXED'
  | 'LIKELY_INDEXED'
  | 'NOT_INDEXED'
  | 'INDEXING_BLOCKED'
  | 'UNKNOWN'
  | 'ERROR';

export type VerificationMethod =
  | 'SEARCH_CONSOLE_OFFICIAL'
  | 'MULTI_PROVIDER_CONSENSUS'
  | 'SERP_DIRECT'
  | 'HTTP_AND_ROBOTS_INFERRED'
  | 'MOCK_DEMO';

export interface ProviderEvidence {
  providerId: string;
  providerName: string;
  found: boolean;
  statusText: string;
  rawReference?: string;
  matchedUrl?: string;
  timestamp: string;
  responseTimeMs: number;
  error?: string;
  isMock?: boolean;
  googleSiteQuery?: string;
  googleFirstPageStatus?: 'SHOWING_PAGE_1' | 'NOT_SHOWING_PAGE_1' | 'UNKNOWN';
  googleRankPosition?: number | null;
}

export interface TechnicalSeoDiagnostics {
  httpStatus: number | null;
  responseTimeMs: number;
  finalUrl: string;
  redirectCount: number;
  contentType: string;
  canonicalUrl: string | null;
  canonicalStatus: 'SELF' | 'CROSS_PAGE' | 'CROSS_DOMAIN' | 'MISSING';
  robotsTxtStatus: 'ALLOWED' | 'DISALLOWED' | 'FETCH_ERROR' | 'SKIPPED';
  robotsMeta: string | null;
  xRobotsTag: string | null;
  isIndexableRobots: boolean;
  sitemapDetected: boolean;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  wordCount: number;
  hreflangCount: number;
}

export interface UrlCheckResult {
  id: string;
  batchId: string;
  originalUrl: string;
  normalizedUrl: string;
  status: IndexStatus;
  confidenceScore: number; // 0 - 100
  confidenceLabel: 'CONFIRMED (99%)' | 'VERY HIGH (95%)' | 'HIGH (85%)' | 'MODERATE (70%)' | 'LOW' | 'INCONCLUSIVE';
  verificationMethod: VerificationMethod;
  providerAgreement: string; // e.g. "3/3 providers agree"
  gscStatus: string | null;
  searchEvidenceSummary: string;
  technicalSeo?: TechnicalSeoDiagnostics;
  providerEvidence: ProviderEvidence[];
  checkedAt: string;
  processingDurationMs: number;
  retryCount: number;
  error?: string;
  isMockData?: boolean;
  googleSiteQuery?: string;
  googleSearchUrl?: string;
  googleFirstPageStatus?: 'SHOWING_PAGE_1' | 'NOT_SHOWING_PAGE_1' | 'UNKNOWN';
  googleRankPosition?: number | null;
  simpleVerdict?: 'Index' | 'No-index';
}

export interface BatchProgress {
  total: number;
  processed: number;
  remaining: number;
  indexed: number;
  likelyIndexed: number;
  notFound: number;
  unknown: number;
  errors: number;
  duplicatesRemoved: number;
  percent: number;
  currentSpeed: number; // URLs/sec
  averageSpeed: number; // URLs/sec
  peakSpeed: number; // URLs/sec
  activeWorkers: number;
  etaSeconds: number;
  elapsedSeconds: number;
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  startedAt: string | null;
  finishedAt: string | null;
}

export interface BatchSummary {
  id: string;
  name: string;
  createdAt: string;
  progress: BatchProgress;
  providerSelection: string[];
  sampleResults?: UrlCheckResult[];
}

export interface GeneratedReport {
  id: string;
  batchId: string;
  batchName: string;
  filename: string;
  fileSizeBytes: number;
  totalUrls: number;
  createdAt: string;
  downloadUrl: string;
  status: 'GENERATING' | 'READY' | 'FAILED';
  progressPercent: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: 'official_gsc' | 'serp_api' | 'index_data' | 'mock';
  enabled: boolean;
  apiKeyConfigured: boolean;
  hasApiKey?: boolean;
  rateLimitReqPerSec: number;
  concurrencyLimit: number;
  dailyQuota: number;
  dailyUsage: number;
  health: 'HEALTHY' | 'DEGRADED' | 'RATE_LIMITED' | 'QUOTA_EXHAUSTED' | 'UNAVAILABLE';
  avgLatencyMs: number;
  isMock: boolean;
}

export interface GscProperty {
  siteUrl: string;
  permissionLevel: 'siteOwner' | 'siteFullUser' | 'siteRestrictedUser';
}

export interface SystemMetrics {
  activeJobs: number;
  urlsPerSecond: number;
  activeWorkers: number;
  queueLength: number;
  completedJobsTotal: number;
  totalBatches: number;
  uptimeSeconds: number;
  databaseHealth: 'OPTIMAL' | 'DEGRADED';
  redisQueueHealth: 'ACTIVE' | 'EMULATED_IN_MEMORY';
  clusterHealth?: string;
  memoryUsageMb?: number;
}

export interface ApiKeyEntry {
  id: string;
  providerType: 'serp_api' | 'google_custom_search' | 'dataforseo' | 'generic';
  label: string;
  maskedKey: string;
  monthlyLimit: number; // e.g. 250 (SerpApi free plan limit)
  hourlyLimit: number; // e.g. 50 (throughput per hour)
  usedCount: number;
  usedThisHour: number;
  status: 'ACTIVE' | 'EXHAUSTED' | 'RATE_LIMITED' | 'DISABLED';
  createdAt: string;
  lastUsedAt?: string;
  lastError?: string;
}

export interface ApiPoolStatus {
  keys: ApiKeyEntry[];
  totalKeys: number;
  activeKeys: number;
  exhaustedKeys: number;
  totalMonthlyQuota: number;
  totalUsedSearches: number;
  totalRemainingCredits: number;
  lowCreditWarning: boolean; // triggers alert when <= 100 searches left
  allExhaustedNotice: boolean; // triggers notice when all keys are exhausted (0 left)
  fallbackActive: boolean; // live crawler fallback engaged
}

export interface ProviderPingResult {
  providerId: string;
  name: string;
  type: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'STANDBY' | 'FALLBACK' | 'OFFLINE';
  badgeColor: 'emerald' | 'amber' | 'sky' | 'rose' | 'slate';
  latencyMs: number;
  message: string;
  lastPingTime: string;
  isMock: boolean;
  rateLimitReqPerSec: number;
  keysActive?: number;
  details?: string;
}

export interface ProviderPingResponse {
  timestamp: string;
  overallStatus: 'ALL_HEALTHY' | 'SOME_DEGRADED' | 'FALLBACK_ACTIVE';
  totalProviders: number;
  healthyCount: number;
  providers: ProviderPingResult[];
}
