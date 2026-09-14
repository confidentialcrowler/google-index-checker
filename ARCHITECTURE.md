# Distributed System Architecture

```text
               +---------------------------------------------+
               |  Client / Browser UI & Streaming Dashboard  |
               +---------------------------------------------+
                                      |
                      HTTP API / SSE Progress Stream
                                      v
+-------------------------------------------------------------------------+
|                  Express + Node.js API Gateway Layer                    |
|                                                                         |
|  * SSRF & DNS Rebinding Validation   * URL Normalizer & Deduplication   |
|  * Rate Limiter & Token Buckets      * Async XLSX Report Dispatcher     |
+-------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------+
|                Distributed Queue & Worker Cluster Pool                 |
|                                                                         |
|  * Configurable Horizontal Workers (1 - 100+ concurrent slots)          |
|  * Sliding-Window Real-Time Speedometer (1-sec window URLs/sec)         |
|  * Exponential Backoff & Retry Queue * Sliding-Window Caching Layer     |
+-------------------------------------------------------------------------+
                   |                                       |
                   v                                       v
+------------------------------------+   +--------------------------------+
|      Provider Routing Engine       |   |   Technical SEO Crawler        |
|                                    |   |                                |
|  * GSC Official URL Inspection API |   |  * SSRF-Hardened HTTP Fetcher  |
|  * Provider A: SERP Sentinel API   |   |  * Canonical / Robots Checker  |
|  * Provider B: IndexData Cloud     |   |  * Redirect & Metadata Parser  |
|  * Provider C: SearchPulse Cluster |   +--------------------------------+
|  * High-Speed Consensus Mock Pool  |                     |
+------------------------------------+                     |
                   |                                       |
                   +-------------------+-------------------+
                                       |
                                       v
+-------------------------------------------------------------------------+
|                     Evidence & Confidence Engine                        |
|                                                                         |
|  * Evaluates multi-source agreement, GSC official verdict, and          |
|    robots/HTTP status to compute mathematical confidence score.          |
+-------------------------------------------------------------------------+
                                       |
                                       v
+-------------------------------------------------------------------------+
|                      Relational Database & Cache                        |
|                                                                         |
|  * Batched writes for 100,000+ jobs  * Indexed status & batch queries   |
|  * Memory/PostgreSQL/Redis backing   * ExcelJS multi-sheet file storage |
+-------------------------------------------------------------------------+
```

### Core Architecture Highlights

1. **Decoupled Application Speed vs. External Provider Limits**:
   The engine processes queue transitions at 100+ jobs/second, while individual provider rate-limiters ensure external vendor quotas are strictly obeyed without abuse.

2. **Batched Database Writes**:
   Results are batched and indexed to prevent database saturation during massive 100,000 URL operations.

3. **Asynchronous Report Generation**:
   XLSX generation executes in a background thread or worker to prevent event-loop freezing during heavy multi-thousand row exports.
