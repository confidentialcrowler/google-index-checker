# Verification Providers & Consensus Model

## Provider Pool Concept
The platform decouples verification into an abstract provider interface:

```typescript
interface VerificationProvider {
  id: string;
  name: string;
  type: 'official_gsc' | 'serp_api' | 'index_data' | 'mock';
  verify(url: string, userAccessToken?: string): Promise<ProviderVerificationResult>;
  getCapabilities(): ProviderCapabilities;
  getRateLimit(): RateLimitConfig;
  getHealth(): Promise<ProviderHealth>;
}
```

## Integrated Providers

### 1. Google Search Console (Official API)
- **Endpoint**: `https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`
- **Authentication**: User-authorized Google OAuth 2.0 (`https://www.googleapis.com/auth/webmasters.readonly`)
- **Authority**: Authoritative Google index status, canonical identification, crawl timestamp, and robots directives for verified sites.
- **Quota**: Approximately 2,000 inspections per day per Search Console project.

### 2. SERP Index Sentinel (Provider A)
- Real-time search result operator queries (`site:URL` or exact phrase).
- Concurrency: 20-25 req/sec.

### 3. IndexData Cloud (Provider B)
- Secondary search presence signals.
- Concurrency: 50 req/sec.

### 4. SearchPulse Multi-Cluster (Provider C)
- High-throughput indexing verification signal for third-party consensus.

### 5. High-Throughput Mock Cluster
- Enabled when `MOCK_PROVIDER=true`.
- Visibly watermarked with **`DEMO DATA`** to simulate edge cases, timeouts, and high-throughput benchmarks without making illicit requests or violating third-party terms.

---

## Anti-Abuse & Compliance Policy
- Strictly prohibits CAPTCHA bypasses, residential proxy rotation evasion, fake browser fingerprinting, or circumventing Google rate limits.
- Operates strictly within legal, documented vendor APIs.
