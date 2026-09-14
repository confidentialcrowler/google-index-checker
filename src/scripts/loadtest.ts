/**
 * Standalone High-Throughput Load Testing Script
 * Benchmark: Measures queue latency, processing throughput (URLs/sec), error rate, p95 latency.
 * Usage: npm run loadtest
 * Environment variables:
 *   URL_COUNT=1000 (default 1000, up to 10,000+)
 *   TARGET_RATE=100
 *   WORKERS=25
 */
import { parseAndDeduplicateUrls } from '../server/normalizer.js';
import { evaluateIndexConfidence } from '../server/confidence.js';
import { MockVerificationProvider } from '../server/providers/mock.js';

async function runLoadTest() {
  const urlCount = parseInt(process.env.URL_COUNT || '1000', 10);
  const concurrency = parseInt(process.env.WORKERS || '30', 10);

  console.log('====================================================');
  console.log('  INDEXPULSE HIGH-THROUGHPUT URL BENCHMARK HARNESS  ');
  console.log('====================================================');
  console.log(`Configured URL Count:   ${urlCount.toLocaleString()}`);
  console.log(`Worker Concurrency:     ${concurrency}`);
  console.log(`Generating synthetic URL test set...`);

  // Generate URLs
  const rawUrls: string[] = [];
  for (let i = 0; i < urlCount; i++) {
    rawUrls.push(`https://benchmark-domain.com/catalog/item-${i + 1}?test=1`);
  }

  // Deduplication & Normalization Benchmark
  const normStart = Date.now();
  const parsed = parseAndDeduplicateUrls(rawUrls);
  const normDuration = Date.now() - normStart;
  console.log(`Normalization & Deduplication: ${parsed.totalReceived} items in ${normDuration}ms (${Math.round((parsed.totalReceived / Math.max(1, normDuration)) * 1000)} URLs/sec)`);

  const mockProviderA = new MockVerificationProvider('bench_a', 'Bench Alpha', 1000);
  const mockProviderB = new MockVerificationProvider('bench_b', 'Bench Beta', 1000);

  console.log(`Starting worker cluster queue processing...`);
  const processStart = Date.now();
  const latencies: number[] = [];
  let errorCount = 0;
  let completed = 0;
  let active = 0;
  let index = 0;

  await new Promise<void>((resolve) => {
    const next = () => {
      while (active < concurrency && index < parsed.items.length) {
        const item = parsed.items[index++];
        active++;

        const itemStart = Date.now();
        Promise.all([mockProviderA.verify(item.normalizedUrl), mockProviderB.verify(item.normalizedUrl)])
          .then(([resA, resB]) => {
            const conf = evaluateIndexConfidence([resA, resB]);
            if (conf.status === 'ERROR') errorCount++;
          })
          .catch(() => {
            errorCount++;
          })
          .finally(() => {
            const duration = Date.now() - itemStart;
            latencies.push(duration);
            completed++;
            active--;

            if (completed % 250 === 0 || completed === parsed.items.length) {
              const elapsedSec = Math.max(0.01, (Date.now() - processStart) / 1000);
              const currentSpeed = Math.round(completed / elapsedSec);
              process.stdout.write(`\rProgress: ${completed}/${parsed.items.length} (${Math.round((completed / parsed.items.length) * 100)}%) | Current: ${currentSpeed} URLs/sec`);
            }

            if (completed === parsed.items.length) {
              console.log('\nProcessing complete.');
              resolve();
            } else {
              next();
            }
          });
      }
    };

    next();
  });

  const totalDurationMs = Date.now() - processStart;
  const totalDurationSec = Math.max(0.001, totalDurationMs / 1000);
  const avgSpeed = Math.round(completed / totalDurationSec);

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const errorRate = ((errorCount / completed) * 100).toFixed(2);

  console.log('\n================== BENCHMARK RESULTS ==================');
  console.log(`Total URLs:        ${completed.toLocaleString()}`);
  console.log(`Completed:         ${completed.toLocaleString()}`);
  console.log(`Total Duration:    ${totalDurationSec.toFixed(2)}s`);
  console.log(`Average Speed:     ${avgSpeed} URLs/sec`);
  console.log(`p50 Latency:       ${p50}ms`);
  console.log(`p95 Latency:       ${p95}ms`);
  console.log(`p99 Latency:       ${p99}ms`);
  console.log(`Errors:            ${errorRate}%`);
  console.log('=======================================================');
}

runLoadTest().catch(console.error);
