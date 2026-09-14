import dns from 'dns';
import { promisify } from 'util';

const resolve4Async = promisify(dns.resolve4);
const resolve6Async = promisify(dns.resolve6);

// Private IPv4 ranges
const PRIVATE_IPV4_PATTERNS = [
  /^127\./,                         // Loopback
  /^10\./,                          // RFC1918 Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // RFC1918 Class B
  /^192\.168\./,                    // RFC1918 Class C
  /^169\.254\./,                    // Link-local / Cloud metadata
  /^0\./,                           // Broadcast/zero
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // CGNAT
  /^192\.0\.2\./,                   // TEST-NET-1
  /^198\.51\.100\./,                // TEST-NET-2
  /^203\.0\.113\./,                 // TEST-NET-3
  /^224\./,                         // Multicast
  /^240\./,                         // Reserved
];

export function isPrivateIp(ip: string): boolean {
  if (ip === 'localhost' || ip === '::1') return true;

  // Check IPv4
  for (const pattern of PRIVATE_IPV4_PATTERNS) {
    if (pattern.test(ip)) return true;
  }

  // Check IPv6 private/link-local/unique-local
  const normalized = ip.toLowerCase();
  if (
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:') ||
    normalized === '::1' ||
    normalized === '0:0:0:0:0:0:0:1'
  ) {
    return true;
  }

  return false;
}

export interface SsrfCheckResult {
  allowed: boolean;
  reason?: string;
  sanitizedUrl?: string;
}

export async function validateUrlAgainstSsrf(inputUrl: string): Promise<SsrfCheckResult> {
  try {
    const trimmed = inputUrl.trim();
    const parsed = new URL(trimmed);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { allowed: false, reason: `Disallowed protocol: ${parsed.protocol}. Only HTTP and HTTPS are permitted.` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Direct check for banned keywords & loopback
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return { allowed: false, reason: `Access to local/loopback address is prohibited.` };
    }

    // Direct IP format check
    if (isPrivateIp(hostname)) {
      return { allowed: false, reason: `Direct access to private or reserved IP range (${hostname}) is blocked.` };
    }

    // Prevent cloud metadata endpoints explicitly
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return { allowed: false, reason: `Cloud metadata service access blocked.` };
    }

    // Attempt DNS resolution to protect against DNS rebinding to internal addresses
    try {
      const ipv4s = await resolve4Async(hostname).catch(() => [] as string[]);
      for (const ip of ipv4s) {
        if (isPrivateIp(ip)) {
          return { allowed: false, reason: `Hostname resolves to private IP (${ip}). Request blocked for SSRF prevention.` };
        }
      }
    } catch {
      // In development or if DNS lookup fails temporarily, if hostname is not an IP, we allow with caution
    }

    return { allowed: true, sanitizedUrl: parsed.toString() };
  } catch (err: any) {
    return { allowed: false, reason: `Malformed or unparseable URL: ${err.message}` };
  }
}

/**
 * Escapes strings to prevent Formula Injection (CSV / XLSX Formula Injection).
 * Excel/Sheets interpret cells starting with =, +, -, @, or tab/CR as formulas.
 */
export function sanitizeForExcel(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}
