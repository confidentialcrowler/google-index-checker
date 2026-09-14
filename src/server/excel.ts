import ExcelJS from 'exceljs';
import { BatchSummary, UrlCheckResult } from '../types.js';
import { sanitizeForExcel } from './ssrf.js';

export async function generateExcelReportWorkbook(
  batch: BatchSummary,
  results: UrlCheckResult[],
  duplicateItems: { originalUrl: string; normalizedUrl: string; duplicateGroupId?: string }[] = []
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Google URL Index Checker Platform';
  workbook.lastModifiedBy = 'IndexPulse Engine';
  workbook.created = new Date();
  workbook.modified = new Date();

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Dark slate
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Segoe UI',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  // ==========================================
  // SHEET 1: Summary
  // ==========================================
  const summarySheet = workbook.addWorksheet('Summary', {
    views: [{ showGridLines: true }],
  });

  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 32 },
    { header: 'Value', key: 'value', width: 45 },
  ];

  const durationSec = batch.progress.startedAt && batch.progress.finishedAt
    ? Math.max(1, Math.round((new Date(batch.progress.finishedAt).getTime() - new Date(batch.progress.startedAt).getTime()) / 1000))
    : batch.progress.elapsedSeconds || 1;

  const summaryRows = [
    { metric: 'Project Name', value: sanitizeForExcel(batch.name) },
    { metric: 'Batch ID', value: sanitizeForExcel(batch.id) },
    { metric: 'Status', value: batch.progress.status },
    { metric: 'Check Started At', value: batch.progress.startedAt || 'N/A' },
    { metric: 'Check Finished At', value: batch.progress.finishedAt || 'In Progress' },
    { metric: 'Total Duration', value: `${durationSec} seconds` },
    { metric: 'Total URLs Uploaded', value: batch.progress.total + batch.progress.duplicatesRemoved },
    { metric: 'Unique URLs Processed', value: batch.progress.total },
    { metric: 'Duplicates Excluded', value: batch.progress.duplicatesRemoved },
    { metric: 'Confirmed Indexed', value: batch.progress.indexed },
    { metric: 'Likely Indexed', value: batch.progress.likelyIndexed },
    { metric: 'Not Indexed / Blocked', value: batch.progress.notFound },
    { metric: 'Unknown / Inconclusive', value: batch.progress.unknown },
    { metric: 'Processing Errors', value: batch.progress.errors },
    { metric: 'Average Speed', value: `${batch.progress.averageSpeed} URLs/sec` },
    { metric: 'Peak Processing Speed', value: `${batch.progress.peakSpeed} URLs/sec` },
    { metric: 'Configured Providers', value: batch.providerSelection.join(', ') || 'Consensus Pool' },
  ];

  // Title block
  summarySheet.mergeCells('A1:B1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'BULK GOOGLE URL INDEX VERIFICATION REPORT';
  titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(1).height = 36;

  // Header row
  const sumHeader = summarySheet.getRow(2);
  sumHeader.values = ['Summary Metric', 'Report Value'];
  sumHeader.font = headerFont;
  sumHeader.fill = headerFill;
  sumHeader.height = 24;

  let rIdx = 3;
  for (const row of summaryRows) {
    const r = summarySheet.getRow(rIdx);
    r.values = [row.metric, row.value];
    r.getCell(1).font = { name: 'Segoe UI', bold: true, color: { argb: 'FF334155' } };
    r.getCell(2).font = { name: 'Segoe UI', color: { argb: 'FF0F172A' } };
    r.getCell(1).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    r.getCell(2).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    r.height = 22;
    rIdx++;
  }

  // ==========================================
  // SHEET 2: Full Results
  // ==========================================
  const resultsSheet = workbook.addWorksheet('Full Results', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
  });

  resultsSheet.columns = [
    { header: 'Row', key: 'row', width: 8 },
    { header: 'Original URL', key: 'originalUrl', width: 38 },
    { header: 'Normalized URL', key: 'normalizedUrl', width: 38 },
    { header: 'Final URL', key: 'finalUrl', width: 38 },
    { header: 'Google site:url Query', key: 'googleQuery', width: 42 },
    { header: 'Google Page 1 Status', key: 'googlePage1', width: 22 },
    { header: 'Simple Verdict', key: 'simpleVerdict', width: 16 },
    { header: 'Final Status', key: 'status', width: 20 },
    { header: 'Confidence', key: 'confidence', width: 14 },
    { header: 'Verification Method', key: 'method', width: 26 },
    { header: 'Provider Agreement', key: 'agreement', width: 28 },
    { header: 'Search Console Status', key: 'gscStatus', width: 28 },
    { header: 'Search Evidence', key: 'evidence', width: 36 },
    { header: 'HTTP Status', key: 'httpStatus', width: 14 },
    { header: 'Response Time (ms)', key: 'responseTime', width: 18 },
    { header: 'Redirect Count', key: 'redirects', width: 14 },
    { header: 'Canonical URL', key: 'canonical', width: 35 },
    { header: 'Canonical Status', key: 'canonicalStatus', width: 16 },
    { header: 'Robots.txt', key: 'robotsTxt', width: 14 },
    { header: 'Robots Meta', key: 'robotsMeta', width: 20 },
    { header: 'X-Robots-Tag', key: 'xRobots', width: 16 },
    { header: 'Sitemap', key: 'sitemap', width: 12 },
    { header: 'Page Title', key: 'title', width: 32 },
    { header: 'Meta Description', key: 'description', width: 40 },
    { header: 'H1 Header', key: 'h1', width: 28 },
    { header: 'Word Count', key: 'wordCount', width: 12 },
    { header: 'Checked At', key: 'checkedAt', width: 22 },
    { header: 'Duration (ms)', key: 'duration', width: 14 },
    { header: 'Error', key: 'error', width: 30 },
  ];

  resultsSheet.getRow(1).font = headerFont;
  resultsSheet.getRow(1).fill = headerFill;
  resultsSheet.getRow(1).height = 26;
  resultsSheet.autoFilter = 'A1:Z1';

  let rowCounter = 1;
  for (const item of results) {
    const rawUrl = item.originalUrl || item.normalizedUrl;
    const isIndexed = item.status === 'CONFIRMED_INDEXED' || item.status === 'LIKELY_INDEXED';
    const googleQuery = item.googleSiteQuery || `site:${rawUrl}`;
    const googlePage1 = item.googleFirstPageStatus === 'SHOWING_PAGE_1' ? 'Showing on Page 1' : item.googleFirstPageStatus === 'NOT_SHOWING_PAGE_1' ? 'Not on Page 1' : (isIndexed ? 'Showing on Page 1' : 'Not on Page 1');
    const simpleVerdict = item.simpleVerdict || (isIndexed ? 'Index' : 'No-index');

    const row = resultsSheet.addRow({
      row: rowCounter++,
      originalUrl: sanitizeForExcel(item.originalUrl),
      normalizedUrl: sanitizeForExcel(item.normalizedUrl),
      finalUrl: sanitizeForExcel(item.technicalSeo?.finalUrl || item.normalizedUrl),
      googleQuery: sanitizeForExcel(googleQuery),
      googlePage1: sanitizeForExcel(googlePage1),
      simpleVerdict: sanitizeForExcel(simpleVerdict),
      status: item.status,
      confidence: `${item.confidenceScore}%`,
      method: item.verificationMethod,
      agreement: sanitizeForExcel(item.providerAgreement),
      gscStatus: sanitizeForExcel(item.gscStatus || 'N/A'),
      evidence: sanitizeForExcel(item.searchEvidenceSummary),
      httpStatus: item.technicalSeo?.httpStatus || 'N/A',
      responseTime: item.technicalSeo?.responseTimeMs || 0,
      redirects: item.technicalSeo?.redirectCount || 0,
      canonical: sanitizeForExcel(item.technicalSeo?.canonicalUrl || 'N/A'),
      canonicalStatus: item.technicalSeo?.canonicalStatus || 'N/A',
      robotsTxt: item.technicalSeo?.robotsTxtStatus || 'N/A',
      robotsMeta: sanitizeForExcel(item.technicalSeo?.robotsMeta || 'none'),
      xRobots: sanitizeForExcel(item.technicalSeo?.xRobotsTag || 'none'),
      sitemap: item.technicalSeo?.sitemapDetected ? 'Detected' : 'No',
      title: sanitizeForExcel(item.technicalSeo?.title || ''),
      description: sanitizeForExcel(item.technicalSeo?.metaDescription || ''),
      h1: sanitizeForExcel(item.technicalSeo?.h1 || ''),
      wordCount: item.technicalSeo?.wordCount || 0,
      checkedAt: item.checkedAt,
      duration: item.processingDurationMs,
      error: sanitizeForExcel(item.error || ''),
    });

    // Color code status cell
    const statusCell = row.getCell('status');
    if (item.status === 'CONFIRMED_INDEXED') {
      statusCell.font = { color: { argb: 'FF166534' }, bold: true };
    } else if (item.status === 'LIKELY_INDEXED') {
      statusCell.font = { color: { argb: 'FF854D0E' }, bold: true };
    } else if (item.status === 'NOT_INDEXED' || item.status === 'INDEXING_BLOCKED') {
      statusCell.font = { color: { argb: 'FF991B1B' }, bold: true };
    } else if (item.status === 'ERROR') {
      statusCell.font = { color: { argb: 'FFB91C1C' }, italic: true };
    }
  }

  // ==========================================
  // SHEET 3: Provider Evidence
  // ==========================================
  const evidenceSheet = workbook.addWorksheet('Provider Evidence', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
  });

  evidenceSheet.columns = [
    { header: 'URL', key: 'url', width: 40 },
    { header: 'Provider', key: 'provider', width: 28 },
    { header: 'Provider Status', key: 'status', width: 18 },
    { header: 'Raw Evidence Reference', key: 'rawRef', width: 38 },
    { header: 'Matched URL', key: 'matchedUrl', width: 38 },
    { header: 'Timestamp', key: 'timestamp', width: 24 },
    { header: 'Response Time (ms)', key: 'latency', width: 18 },
    { header: 'Provider Error', key: 'error', width: 32 },
  ];

  evidenceSheet.getRow(1).font = headerFont;
  evidenceSheet.getRow(1).fill = headerFill;
  evidenceSheet.getRow(1).height = 26;
  evidenceSheet.autoFilter = 'A1:H1';

  for (const item of results) {
    if (item.providerEvidence && item.providerEvidence.length > 0) {
      for (const ev of item.providerEvidence) {
        evidenceSheet.addRow({
          url: sanitizeForExcel(item.normalizedUrl),
          provider: sanitizeForExcel(ev.providerName),
          status: ev.found ? 'FOUND' : 'NOT FOUND',
          rawRef: sanitizeForExcel(ev.rawReference || 'N/A'),
          matchedUrl: sanitizeForExcel(ev.matchedUrl || 'N/A'),
          timestamp: ev.timestamp,
          latency: ev.responseTimeMs,
          error: sanitizeForExcel(ev.error || ''),
        });
      }
    }
  }

  // ==========================================
  // SHEET 4: Errors
  // ==========================================
  const errorSheet = workbook.addWorksheet('Errors', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
  });

  errorSheet.columns = [
    { header: 'URL', key: 'url', width: 42 },
    { header: 'Error Type', key: 'errorType', width: 22 },
    { header: 'Error Message', key: 'message', width: 48 },
    { header: 'Provider', key: 'provider', width: 26 },
    { header: 'Retry Count', key: 'retries', width: 14 },
    { header: 'Timestamp', key: 'timestamp', width: 24 },
  ];

  errorSheet.getRow(1).font = headerFont;
  errorSheet.getRow(1).fill = headerFill;
  errorSheet.getRow(1).height = 26;
  errorSheet.autoFilter = 'A1:F1';

  const errorItems = results.filter((r) => r.status === 'ERROR' || Boolean(r.error));
  for (const errItem of errorItems) {
    errorSheet.addRow({
      url: sanitizeForExcel(errItem.originalUrl),
      errorType: 'Processing Failure',
      message: sanitizeForExcel(errItem.error || 'Provider timeout or upstream failure'),
      provider: sanitizeForExcel(errItem.verificationMethod),
      retries: errItem.retryCount,
      timestamp: errItem.checkedAt,
    });
  }

  // ==========================================
  // SHEET 5: Duplicates
  // ==========================================
  const dupSheet = workbook.addWorksheet('Duplicates', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
  });

  dupSheet.columns = [
    { header: 'Original URL', key: 'original', width: 45 },
    { header: 'Normalized URL', key: 'normalized', width: 45 },
    { header: 'Duplicate Group', key: 'group', width: 22 },
  ];

  dupSheet.getRow(1).font = headerFont;
  dupSheet.getRow(1).fill = headerFill;
  dupSheet.getRow(1).height = 26;
  dupSheet.autoFilter = 'A1:C1';

  for (const dup of duplicateItems) {
    dupSheet.addRow({
      original: sanitizeForExcel(dup.originalUrl),
      normalized: sanitizeForExcel(dup.normalizedUrl),
      group: sanitizeForExcel(dup.duplicateGroupId || 'DUPLICATE'),
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Maps complex verification status to simple binary "Index" vs "No-index"
 * matching the user's exact specification ("site:url on google first page -> Index, else No-index").
 */
export function mapStatusToSimpleIndexVerdict(
  status: string,
  includeLikely = true,
  indexedLabel = 'Index',
  nonIndexedLabel = 'No-index'
): string {
  if (status === 'CONFIRMED_INDEXED') {
    return indexedLabel;
  }
  if (status === 'LIKELY_INDEXED') {
    return includeLikely ? indexedLabel : nonIndexedLabel;
  }
  return nonIndexedLabel;
}

export interface SimpleTwoColumnOptions {
  headerLink?: string; // Default: 'Live Link'
  headerIndex?: string; // Default: 'Index'
  useMagentaHeader?: boolean; // Default: true (matches screenshot #FF00FF)
  includeLikelyAsIndexed?: boolean; // Default: true
  indexedLabel?: string; // Default: 'Index'
  nonIndexedLabel?: string; // Default: 'No-index'
}

/**
 * Generates an exact 2-column Excel (.xlsx) workbook with:
 * Column A: "Live Link"
 * Column B: "Index" (values: "Index" / "No-index")
 * Styled with magenta/fuchsia header row matching user's spreadsheet screenshot.
 */
export async function generateSimpleTwoColumnWorkbook(
  results: UrlCheckResult[],
  options: SimpleTwoColumnOptions = {}
): Promise<Buffer> {
  const headerLink = options.headerLink || 'Live Link';
  const headerIndex = options.headerIndex || 'Index';
  const useMagenta = options.useMagentaHeader !== false;
  const includeLikely = options.includeLikelyAsIndexed !== false;
  const indexedLabel = options.indexedLabel || 'Index';
  const nonIndexedLabel = options.nonIndexedLabel || 'No-index';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Google URL Index Checker';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Index Status', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
  });

  sheet.columns = [
    { header: headerLink, key: 'link', width: 45 },
    { header: headerIndex, key: 'index', width: 22 },
  ];

  // Header styling
  const headerRow = sheet.getRow(1);
  headerRow.height = 32;

  if (useMagenta) {
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF00FF' }, // Vivid Magenta / Fuchsia as shown in user screenshot
    };
    headerRow.font = {
      name: 'Segoe UI',
      size: 13,
      bold: true,
      color: { argb: 'FF000000' }, // Bold black text as in user screenshot
    };
  } else {
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    headerRow.font = {
      name: 'Segoe UI',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
  }

  headerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

  for (const item of results) {
    const rawUrl = item.originalUrl || item.normalizedUrl;
    const verdict = mapStatusToSimpleIndexVerdict(
      item.status,
      includeLikely,
      indexedLabel,
      nonIndexedLabel
    );

    const row = sheet.addRow({
      link: sanitizeForExcel(rawUrl),
      index: verdict,
    });

    row.height = 22;

    // Link cell: Left-aligned, blue underline style
    const cellA = row.getCell(1);
    cellA.alignment = { horizontal: 'left', vertical: 'middle' };
    cellA.font = {
      name: 'Segoe UI',
      size: 10,
      color: { argb: 'FF1D4ED8' }, // Subtle link blue
      underline: true,
    };

    // Index verdict cell: centered, bold green for Index, bold red for No-index
    const cellB = row.getCell(2);
    cellB.alignment = { horizontal: 'center', vertical: 'middle' };
    const isIndexed = verdict === indexedLabel || verdict === 'Index' || verdict === 'Indexed';
    if (isIndexed) {
      cellB.font = {
        name: 'Segoe UI',
        size: 10,
        bold: true,
        color: { argb: 'FF15803D' }, // Green
      };
    } else {
      cellB.font = {
        name: 'Segoe UI',
        size: 10,
        bold: true,
        color: { argb: 'FFB91C1C' }, // Red / dark red
      };
    }

    // Border
    cellA.border = {
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
    cellB.border = {
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generates plain CSV formatted as:
 * Live Link,Index
 * https://x.com/...,Index
 * https://github.com/...,No-index
 */
export function generateSimpleTwoColumnCsv(
  results: UrlCheckResult[],
  options: SimpleTwoColumnOptions = {}
): string {
  const headerLink = options.headerLink || 'Live Link';
  const headerIndex = options.headerIndex || 'Index';
  const includeLikely = options.includeLikelyAsIndexed !== false;
  const indexedLabel = options.indexedLabel || 'Index';
  const nonIndexedLabel = options.nonIndexedLabel || 'No-index';

  const rows = [`"${headerLink}","${headerIndex}"`];
  for (const item of results) {
    const rawUrl = sanitizeForExcel(item.originalUrl || item.normalizedUrl);
    const verdict = mapStatusToSimpleIndexVerdict(
      item.status,
      includeLikely,
      indexedLabel,
      nonIndexedLabel
    );
    rows.push(`"${rawUrl}","${verdict}"`);
  }
  return rows.join('\r\n');
}

/**
 * Generates TSV (tab-separated) for direct clipboard paste into Google Sheets
 */
export function generateSimpleTwoColumnTsv(
  results: UrlCheckResult[],
  options: SimpleTwoColumnOptions = {}
): string {
  const headerLink = options.headerLink || 'Live Link';
  const headerIndex = options.headerIndex || 'Index';
  const includeLikely = options.includeLikelyAsIndexed !== false;
  const indexedLabel = options.indexedLabel || 'Index';
  const nonIndexedLabel = options.nonIndexedLabel || 'No-index';

  const rows = [`${headerLink}\t${headerIndex}`];
  for (const item of results) {
    const rawUrl = sanitizeForExcel(item.originalUrl || item.normalizedUrl);
    const verdict = mapStatusToSimpleIndexVerdict(
      item.status,
      includeLikely,
      indexedLabel,
      nonIndexedLabel
    );
    rows.push(`${rawUrl}\t${verdict}`);
  }
  return rows.join('\r\n');
}
