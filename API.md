# API Reference

## Base URL: `/api`

### 1. Bulk Processing

#### `POST /api/bulk/upload`
Upload and pre-flight parse text/CSV/XLSX for URLs.
- **Request Body**: Raw text or JSON `{ content: string, stripTracking?: boolean }`
- **Response**:
```json
{
  "uploadId": "upload_172600_ab12",
  "totalReceived": 1000,
  "validCount": 980,
  "uniqueCount": 920,
  "duplicateCount": 60,
  "invalidCount": 20,
  "sampleItems": [...]
}
```

#### `POST /api/bulk/start`
Start worker execution on an uploaded batch.
- **Request Body**:
```json
{
  "uploadId": "upload_172600_ab12",
  "name": "E-Commerce Catalog Audit",
  "concurrency": 25,
  "providers": ["provider_a", "provider_b"],
  "skipSeo": false,
  "forceFresh": false
}
```

#### `GET /api/bulk/:id`
Get batch metadata and overall progress.

#### `GET /api/bulk/:id/progress`
Get real-time speed metrics, ETA, and progress counts.
- **Response**:
```json
{
  "total": 10000,
  "processed": 6842,
  "remaining": 3158,
  "indexed": 4901,
  "likelyIndexed": 827,
  "notFound": 613,
  "errors": 501,
  "currentSpeed": 112,
  "averageSpeed": 96,
  "peakSpeed": 137,
  "activeWorkers": 24,
  "etaSeconds": 28,
  "status": "RUNNING"
}
```

#### `GET /api/bulk/:id/results`
Query paginated results with filters.
- **Query Params**: `status`, `search`, `limit`, `offset`.

#### `POST /api/bulk/:id/pause`
Pause active queue execution.

#### `POST /api/bulk/:id/resume`
Resume paused queue execution.

#### `POST /api/bulk/:id/cancel`
Cancel remaining queue items.

#### `POST /api/bulk/:id/retry`
Re-queue failed/errored URLs.

---

### 2. Single Inspection

#### `POST /api/check`
Instant verification for one URL.
- **Request Body**: `{ "url": "https://example.com/page", "forceFresh": false }`
- **Response**: Structured `UrlCheckResult` with multi-provider evidence and technical SEO diagnostics.

---

### 3. Excel Reports

#### `POST /api/report/:id/generate`
Trigger asynchronous `.xlsx` workbook compilation.

#### `GET /api/report/:id/download`
Stream the compiled binary Excel file with headers.

#### `GET /api/reports`
List all generated reports and download links.

---

### 4. Admin & Providers

#### `GET /api/providers`
Retrieve provider statuses, quotas, and health matrix.

#### `POST /api/providers/config`
Update provider keys or toggle mock testing mode.

#### `GET /api/admin/metrics`
Retrieve worker cluster telemetry.
