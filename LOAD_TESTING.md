# Load Testing & Throughput Benchmark

## Running the Benchmark
The platform includes an automated benchmarking script configured in `package.json`:

```bash
npm run loadtest
```

### Custom Parameter Options
```bash
# Test 10,000 URLs with 40 concurrent worker threads
URL_COUNT=10000 WORKERS=40 npm run loadtest
```

### Measured Performance Outputs
The load tester measures and reports:
1. **Total URLs processed**
2. **Total duration (seconds)**
3. **Average Speed (URLs/sec)**
4. **Peak processing speed**
5. **p50, p95, and p99 latency percentiles (milliseconds)**
6. **Error rate percentage**

### Throughput vs. Provider Limits
- **Application Processing Layer**: Engineered to achieve 100+ URL jobs/sec.
- **External Provider Layer**: Bound to configured vendor rates and API token limits.
