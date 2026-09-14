export interface NormalizedUrlResult {
  originalUrl: string;
  normalizedUrl: string;
  isValid: boolean;
  validationError?: string;
  isDuplicate: boolean;
  duplicateGroupId?: string;
}

export interface BulkParseSummary {
  totalReceived: number;
  validCount: number;
  invalidCount: number;
  uniqueCount: number;
  duplicateCount: number;
  items: NormalizedUrlResult[];
}

// Common marketing tracking parameters that can optionally be stripped or preserved
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'msclkid',
  'mc_eid',
]);

export function normalizeUrl(rawUrl: string, stripTrackingParams: boolean = false): { normalized: string; error?: string } {
  try {
    let trimmed = rawUrl.trim();
    if (!trimmed) {
      return { normalized: '', error: 'Empty URL' };
    }

    // Auto-prefix protocol if missing (e.g. "example.com/page")
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }

    const url = new URL(trimmed);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { normalized: '', error: `Unsupported protocol: ${url.protocol}` };
    }

    // Lowercase host
    url.hostname = url.hostname.toLowerCase();

    // Remove default ports
    if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) {
      url.port = '';
    }

    // Remove hash/fragment
    url.hash = '';

    // Clean duplicate slashes in pathname
    let cleanPath = url.pathname.replace(/\/{2,}/g, '/');
    
    // Normalize trailing slash: if path is not root and ends with slash, remove it for canonical comparison
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }
    url.pathname = cleanPath;

    // Filter tracking params if enabled
    if (stripTrackingParams && url.search) {
      const searchParams = new URLSearchParams(url.search);
      for (const key of Array.from(searchParams.keys())) {
        if (TRACKING_PARAMS.has(key.toLowerCase())) {
          searchParams.delete(key);
        }
      }
      const newQuery = searchParams.toString();
      url.search = newQuery ? `?${newQuery}` : '';
    }

    // Sort remaining query params for consistent canonical matching
    if (url.search) {
      const searchParams = new URLSearchParams(url.search);
      searchParams.sort();
      url.search = `?${searchParams.toString()}`;
    }

    return { normalized: url.toString() };
  } catch (err: any) {
    return { normalized: '', error: err.message || 'Invalid URL' };
  }
}

/**
 * Process a collection of raw strings/lines into normalized URLs with deduplication.
 */
export function parseAndDeduplicateUrls(rawUrls: string[], stripTracking = false): BulkParseSummary {
  const seenMap = new Map<string, number>(); // normalized -> group index
  const results: NormalizedUrlResult[] = [];

  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  for (const raw of rawUrls) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const { normalized, error } = normalizeUrl(trimmed, stripTracking);

    if (error || !normalized) {
      invalidCount++;
      results.push({
        originalUrl: trimmed,
        normalizedUrl: '',
        isValid: false,
        validationError: error,
        isDuplicate: false,
      });
      continue;
    }

    validCount++;

    if (seenMap.has(normalized)) {
      duplicateCount++;
      const groupNum = seenMap.get(normalized)!;
      results.push({
        originalUrl: trimmed,
        normalizedUrl: normalized,
        isValid: true,
        isDuplicate: true,
        duplicateGroupId: `DUP-${groupNum}`,
      });
    } else {
      const newGroupNum = seenMap.size + 1;
      seenMap.set(normalized, newGroupNum);
      results.push({
        originalUrl: trimmed,
        normalizedUrl: normalized,
        isValid: true,
        isDuplicate: false,
      });
    }
  }

  return {
    totalReceived: results.length,
    validCount,
    invalidCount,
    uniqueCount: seenMap.size,
    duplicateCount,
    items: results,
  };
}

/**
 * Fast streaming line extractor for bulk TXT/CSV text.
 * Efficiently handles 10,000+ to 100,000 lines without regex explosion.
 */
export function extractUrlsFromText(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const extracted: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // If CSV row (e.g. URL,Title,Status or comma/semicolon separated)
    if (trimmed.includes(',') || trimmed.includes(';') || trimmed.includes('\t')) {
      const parts = trimmed.split(/[,;\t]/);
      let foundUrlInLine = false;
      for (const part of parts) {
        const cleaned = part.replace(/^["']|["']$/g, '').trim();
        if (/^https?:\/\//i.test(cleaned) || (cleaned.includes('.') && !cleaned.includes(' '))) {
          extracted.push(cleaned);
          foundUrlInLine = true;
          break;
        }
      }
      if (!foundUrlInLine) {
        // Fallback to first non-empty column
        const first = parts[0].replace(/^["']|["']$/g, '').trim();
        if (first && !first.toLowerCase().startsWith('url') && !first.toLowerCase().startsWith('http status')) {
          extracted.push(first);
        }
      }
    } else {
      // Header skip check
      if (trimmed.toLowerCase() === 'url' || trimmed.toLowerCase() === 'urls') continue;
      extracted.push(trimmed);
    }
  }

  return extracted;
}
