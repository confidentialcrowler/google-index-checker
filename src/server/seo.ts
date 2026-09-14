import http from 'http';
import https from 'https';
import { validateUrlAgainstSsrf } from './ssrf.js';
import { TechnicalSeoDiagnostics } from '../types.js';

export async function inspectTechnicalSeo(
  targetUrl: string,
  timeoutMs = 6000
): Promise<TechnicalSeoDiagnostics> {
  const defaultDiagnostics: TechnicalSeoDiagnostics = {
    httpStatus: null,
    responseTimeMs: 0,
    finalUrl: targetUrl,
    redirectCount: 0,
    contentType: 'text/html',
    canonicalUrl: null,
    canonicalStatus: 'MISSING',
    robotsTxtStatus: 'ALLOWED',
    robotsMeta: null,
    xRobotsTag: null,
    isIndexableRobots: true,
    sitemapDetected: false,
    title: null,
    metaDescription: null,
    h1: null,
    wordCount: 0,
    hreflangCount: 0,
  };

  const ssrf = await validateUrlAgainstSsrf(targetUrl);
  if (!ssrf.allowed) {
    return {
      ...defaultDiagnostics,
      robotsTxtStatus: 'FETCH_ERROR',
      isIndexableRobots: false,
    };
  }

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Perform HTTP HEAD or GET request (fetch with redirect manual or follow)
    // To handle redirects and inspect final URL accurately:
    let currentUrl = targetUrl;
    let redirectCount = 0;
    let response: Response | null = null;
    const maxRedirects = 5;

    while (redirectCount <= maxRedirects) {
      const stepSsrf = await validateUrlAgainstSsrf(currentUrl);
      if (!stepSsrf.allowed) {
        throw new Error(`Redirect to prohibited address: ${currentUrl}`);
      }

      const res = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) IndexPulse/1.0',
          'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'manual',
        signal: controller.signal,
      });

      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        const location = res.headers.get('location')!;
        currentUrl = new URL(location, currentUrl).toString();
        redirectCount++;
      } else {
        response = res;
        break;
      }
    }

    clearTimeout(timeoutId);

    const responseTimeMs = Date.now() - startTime;
    if (!response) {
      return { ...defaultDiagnostics, responseTimeMs };
    }

    const httpStatus = response.status;
    const contentType = response.headers.get('content-type') || '';
    const xRobotsTag = response.headers.get('x-robots-tag');

    // If HTML, read up to first 250KB for metadata
    let htmlContent = '';
    if (contentType.toLowerCase().includes('text/html') || contentType.toLowerCase().includes('xml')) {
      const arrayBuf = await response.arrayBuffer();
      // Cap at 256KB
      const slice = arrayBuf.slice(0, 262144);
      htmlContent = new TextDecoder('utf-8').decode(slice);
    }

    // Parse HTML tags with fast, resilient regex
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    const metaDescMatch = htmlContent.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
      htmlContent.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : null;

    const h1Match = htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const h1 = h1Match ? h1Match[1].trim() : null;

    const canonicalMatch = htmlContent.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) ||
      htmlContent.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i);
    const canonicalUrl = canonicalMatch ? canonicalMatch[1].trim() : null;

    const robotsMetaMatch = htmlContent.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i) ||
      htmlContent.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["']/i);
    const robotsMeta = robotsMetaMatch ? robotsMetaMatch[1].trim() : null;

    // Hreflang count
    const hreflangMatches = htmlContent.match(/rel=["']alternate["'][^>]+hreflang=/gi) || [];
    const hreflangCount = hreflangMatches.length;

    // Calculate approx word count from stripped HTML text
    const textOnly = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const wordCount = textOnly ? textOnly.split(' ').length : 0;

    // Determine canonical status
    let canonicalStatus: TechnicalSeoDiagnostics['canonicalStatus'] = 'MISSING';
    if (canonicalUrl) {
      try {
        const parsedCanonical = new URL(canonicalUrl, currentUrl);
        const parsedCurrent = new URL(currentUrl);

        if (parsedCanonical.hostname !== parsedCurrent.hostname) {
          canonicalStatus = 'CROSS_DOMAIN';
        } else if (parsedCanonical.pathname.replace(/\/$/, '') === parsedCurrent.pathname.replace(/\/$/, '')) {
          canonicalStatus = 'SELF';
        } else {
          canonicalStatus = 'CROSS_PAGE';
        }
      } catch {
        canonicalStatus = 'CROSS_PAGE';
      }
    }

    // Determine robots indexability
    const robotsCombined = `${robotsMeta || ''} ${xRobotsTag || ''}`.toLowerCase();
    const hasNoindex = robotsCombined.includes('noindex') || robotsCombined.includes('none');
    const isIndexableRobots = !hasNoindex && httpStatus >= 200 && httpStatus < 300;

    // Sitemap check heuristic
    const sitemapDetected = htmlContent.includes('sitemap.xml') || currentUrl.includes('sitemap');

    return {
      httpStatus,
      responseTimeMs,
      finalUrl: currentUrl,
      redirectCount,
      contentType,
      canonicalUrl,
      canonicalStatus,
      robotsTxtStatus: 'ALLOWED',
      robotsMeta,
      xRobotsTag,
      isIndexableRobots,
      sitemapDetected,
      title,
      metaDescription,
      h1,
      wordCount,
      hreflangCount,
    };
  } catch (err: any) {
    return {
      ...defaultDiagnostics,
      responseTimeMs: Date.now() - startTime,
      httpStatus: null,
      robotsTxtStatus: 'FETCH_ERROR',
      isIndexableRobots: false,
    };
  }
}
