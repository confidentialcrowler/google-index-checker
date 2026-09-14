# Google URL Index Verification & SEO Intelligence Platform (IndexPulse)

A high-throughput, distributed Google URL Index Verification and SEO Intelligence platform engineered to process from 1 to 100,000+ URLs with real-time multi-provider consensus, live progress tracking, SSRF-hardened technical SEO inspections, and multi-worksheet Excel (.xlsx) reports.

## Key Capabilities

1. **High-Throughput Distributed Processing**:
   - Application queue architecture designed to reach 100+ URL checks/sec processing throughput in cluster mode.
   - Separate distinction between internal application throughput and third-party provider quotas/limits.

2. **Multi-Provider Consensus & Confidence Engine**:
   - Combines signals from Google Search Console (Official API), independent SERP providers, and technical HTTP/robots signals.
   - Outputs clear consensus ratings: `CONFIRMED (99%)`, `VERY HIGH (95%)`, `HIGH (85%)`, `MODERATE (70%)`, `INCONCLUSIVE`.
   - Never classifies uncertain provider failures as "Not Indexed" (`UNKNOWN` with retry mechanism).

3. **Massive Bulk URL Ingestion & Deduplication**:
   - Supports TXT, CSV, and XLSX upload formats for 1,000 to 100,000+ URLs.
   - Pre-flight normalization, scheme fixing, trailing slash canonicalization, and duplicate group tracking.

4. **Technical SEO Diagnostics**:
   - HTTP response time, status code, redirect chain, canonical tag validation (Self vs Cross-Domain), meta robots, X-Robots-Tag, title, meta description, H1, and word counts.
   - Protected against SSRF and DNS rebinding attacks.

5. **Full Multi-Sheet Excel Reports**:
   - Generates authentic `.xlsx` files using `exceljs` (Summary, Full Results, Provider Evidence, Errors, Duplicates).
   - Styled frozen headers, auto-filters, status color codes, and CSV/Formula Injection sanitization.

6. **Official Google Search Console OAuth**:
   - Connect Google account to query verified properties via official URL Inspection API.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode
npm run dev

# 3. Run high-throughput load benchmark
npm run loadtest

# 4. Production build
npm run build
npm start
```
