import { VerificationProvider, ProviderHealth, ProviderVerificationResult } from './types.js';
import { GoogleSearchConsoleProvider } from './gsc.js';
import { SerpVerificationProvider } from './serp.js';
import { MockVerificationProvider } from './mock.js';
import { LiveGoogleInspectionProvider, LiveSearchConsensusProvider } from './live.js';
import { ProviderConfig } from '../../types.js';

export class ProviderManager {
  private providers: Map<string, VerificationProvider> = new Map();
  private mockMode: boolean = false; // Live mode is the default fully-working operational mode
  private activeConcurrency: Map<string, number> = new Map();

  constructor() {
    this.mockMode = process.env.MOCK_PROVIDER === 'true';
    this.initDefaultProviders();
  }

  private initDefaultProviders() {
    // 1. Built-in Live Production Verification Providers
    const liveGoogle = new LiveGoogleInspectionProvider();
    this.providers.set(liveGoogle.id, liveGoogle);

    const liveSearch = new LiveSearchConsensusProvider();
    this.providers.set(liveSearch.id, liveSearch);

    // 2. Official Google Search Console URL Inspection API
    const gsc = new GoogleSearchConsoleProvider();
    this.providers.set(gsc.id, gsc);

    // 3. External Paid SERP Cluster (SerpApi, DataForSEO, ScrapingRobot)
    const providerA = new SerpVerificationProvider(
      'provider_a',
      'SERP Index Sentinel (Provider A)',
      process.env.PROVIDER_A_API_KEY || '',
      'https://api.serpapi.com/search',
      25,
      100000
    );
    this.providers.set(providerA.id, providerA);

    const providerB = new SerpVerificationProvider(
      'provider_b',
      'IndexData Cloud (Provider B)',
      process.env.PROVIDER_B_API_KEY || '',
      'https://api.dataforseo.com/v3/serp/google/organic/live/regular',
      50,
      200000
    );
    this.providers.set(providerB.id, providerB);

    const providerC = new SerpVerificationProvider(
      'provider_c',
      'SearchPulse Multi-Cluster (Provider C)',
      process.env.PROVIDER_C_API_KEY || '',
      'https://api.scrapingrobot.com/v1',
      50,
      200000
    );
    this.providers.set(providerC.id, providerC);

    // 4. Optional Demo Cluster for isolated local simulations
    const mock1 = new MockVerificationProvider('mock_consensus_1', 'Demo SERP Alpha [SIMULATION]', 500, 1000000);
    const mock2 = new MockVerificationProvider('mock_consensus_2', 'Demo Index Node Beta [SIMULATION]', 500, 1000000);
    const mock3 = new MockVerificationProvider('mock_consensus_3', 'Demo Search Crawler Gamma [SIMULATION]', 500, 1000000);
    this.providers.set(mock1.id, mock1);
    this.providers.set(mock2.id, mock2);
    this.providers.set(mock3.id, mock3);

    for (const id of this.providers.keys()) {
      this.activeConcurrency.set(id, 0);
    }
  }

  isMockMode(): boolean {
    return this.mockMode;
  }

  setMockMode(enabled: boolean) {
    this.mockMode = enabled;
  }

  getProvider(id: string): VerificationProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): VerificationProvider[] {
    return Array.from(this.providers.values());
  }

  async getProviderConfigs(): Promise<ProviderConfig[]> {
    const list: ProviderConfig[] = [];
    for (const p of this.providers.values()) {
      const health = await p.getHealth();
      const rateLimit = p.getRateLimit();
      const isMock = p.type === 'mock';

      let apiKeyConfigured = false;
      if (p.id === 'live_google_crawler' || p.id === 'live_search_consensus') apiKeyConfigured = true;
      if (p.id === 'provider_a') apiKeyConfigured = Boolean(process.env.PROVIDER_A_API_KEY);
      if (p.id === 'provider_b') apiKeyConfigured = Boolean(process.env.PROVIDER_B_API_KEY);
      if (p.id === 'provider_c') apiKeyConfigured = Boolean(process.env.PROVIDER_C_API_KEY);
      if (p.id === 'google_search_console') apiKeyConfigured = Boolean(process.env.GOOGLE_CLIENT_ID);
      if (isMock) apiKeyConfigured = true;

      // Determine enabled state
      const enabled = this.mockMode ? isMock || p.id === 'google_search_console' : !isMock;

      list.push({
        id: p.id,
        name: p.name,
        type: p.type,
        enabled,
        apiKeyConfigured,
        rateLimitReqPerSec: rateLimit.requestsPerSecond,
        concurrencyLimit: rateLimit.concurrencyLimit,
        dailyQuota: rateLimit.dailyQuota,
        dailyUsage: health.totalRequestsToday,
        health: health.status,
        avgLatencyMs: health.avgLatencyMs,
        isMock,
      });
    }
    return list;
  }

  /**
   * Intelligently selects providers for a given URL verification.
   * If mock mode is active, routes to mock consensus providers.
   * If live mode is active, routes to configured real providers with quota checks.
   */
  async routeVerification(
    url: string,
    requestedProviderIds?: string[],
    gscToken?: string,
    gscSiteUrl?: string
  ): Promise<ProviderVerificationResult[]> {
    let targetProviders: VerificationProvider[] = [];

    if (this.mockMode) {
      // Use mock cluster for demo
      targetProviders = [
        this.providers.get('mock_consensus_1')!,
        this.providers.get('mock_consensus_2')!,
        this.providers.get('mock_consensus_3')!,
      ].filter(Boolean);

      // If GSC token is present, we can also query real GSC
      if (gscToken && this.providers.has('google_search_console')) {
        targetProviders.push(this.providers.get('google_search_console')!);
      }
    } else {
      if (requestedProviderIds && requestedProviderIds.length > 0) {
        targetProviders = requestedProviderIds
          .map((id) => this.providers.get(id))
          .filter((p): p is VerificationProvider => p !== undefined && p.type !== 'mock');
      } else {
        // Default Live Pool: Live Google Crawler + Live Search Consensus + GSC + any active API providers
        const liveGoogle = this.providers.get('live_google_crawler');
        const liveSearch = this.providers.get('live_search_consensus');
        if (liveGoogle) targetProviders.push(liveGoogle);
        if (liveSearch) targetProviders.push(liveSearch);

        const candidates = ['provider_a', 'provider_b', 'provider_c'];
        for (const cid of candidates) {
          const prov = this.providers.get(cid);
          if (prov) {
            const health = await prov.getHealth();
            if (health.status !== 'QUOTA_EXHAUSTED' && health.status !== 'UNAVAILABLE') {
              targetProviders.push(prov);
            }
          }
        }
        if (gscToken && this.providers.has('google_search_console')) {
          targetProviders.push(this.providers.get('google_search_console')!);
        }
      }
    }

    if (targetProviders.length === 0) {
      const liveGoogle = this.providers.get('live_google_crawler');
      if (liveGoogle) {
        targetProviders = [liveGoogle];
      } else {
        targetProviders = [
          this.providers.get('mock_consensus_1')!,
          this.providers.get('mock_consensus_2')!,
        ].filter(Boolean);
      }
    }

    // Execute across selected providers in parallel respecting concurrency counters
    const results = await Promise.all(
      targetProviders.map(async (provider) => {
        const currentConc = this.activeConcurrency.get(provider.id) || 0;
        this.activeConcurrency.set(provider.id, currentConc + 1);

        try {
          if (provider.id === 'google_search_console') {
            return await (provider as GoogleSearchConsoleProvider).verify(url, gscToken, gscSiteUrl);
          }
          return await provider.verify(url);
        } finally {
          const c = this.activeConcurrency.get(provider.id) || 1;
          this.activeConcurrency.set(provider.id, Math.max(0, c - 1));
        }
      })
    );

    return results;
  }
}

export const providerManager = new ProviderManager();
