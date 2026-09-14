import { IndexStatus, VerificationMethod, UrlCheckResult, ProviderEvidence, TechnicalSeoDiagnostics } from '../types.js';
import { ProviderVerificationResult } from './providers/types.js';

export interface ConfidenceCalculation {
  status: IndexStatus;
  confidenceScore: number;
  confidenceLabel: UrlCheckResult['confidenceLabel'];
  verificationMethod: VerificationMethod;
  providerAgreement: string;
  searchEvidenceSummary: string;
  gscStatus: string | null;
  isMockData: boolean;
  googleSiteQuery: string;
  googleSearchUrl: string;
  googleFirstPageStatus: 'SHOWING_PAGE_1' | 'NOT_SHOWING_PAGE_1' | 'UNKNOWN';
  googleRankPosition: number | null;
  simpleVerdict: 'Index' | 'No-index';
}

export function evaluateIndexConfidence(
  providerResults: ProviderVerificationResult[],
  technicalSeo?: TechnicalSeoDiagnostics,
  targetUrl: string = ''
): ConfidenceCalculation {
  let isMockData = false;
  const validResults = providerResults.filter((r) => r.verdict !== 'ERROR');
  const errorResults = providerResults.filter((r) => r.verdict === 'ERROR');

  const cleanUrl = targetUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const googleSiteQuery = `site:${targetUrl || cleanUrl}`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(googleSiteQuery)}`;

  for (const r of providerResults) {
    if (r.isMock) isMockData = true;
  }

  // Check for official Google Search Console verdict first (highest weight)
  const gscResult = providerResults.find((r) => r.providerId === 'google_search_console');
  let gscStatus: string | null = null;
  if (gscResult) {
    if (gscResult.details?.verdict) {
      gscStatus = `GSC Verdict: ${gscResult.details.verdict} (${gscResult.details.coverageState || ''})`;
    } else if (gscResult.error) {
      gscStatus = `GSC Error: ${gscResult.error}`;
    }
  }

  let status: IndexStatus = 'UNKNOWN';
  let confidenceScore = 50;
  let confidenceLabel: UrlCheckResult['confidenceLabel'] = 'MODERATE (70%)';
  let verificationMethod: VerificationMethod = 'MULTI_PROVIDER_CONSENSUS';
  let providerAgreement = '';
  let searchEvidenceSummary = '';

  // 1. If all providers errored out: do NOT claim Not Indexed!
  if (validResults.length === 0 && errorResults.length > 0) {
    status = 'ERROR';
    confidenceScore = 0;
    confidenceLabel = 'INCONCLUSIVE';
    verificationMethod = 'MULTI_PROVIDER_CONSENSUS';
    providerAgreement = `0/${providerResults.length} providers responded`;
    searchEvidenceSummary = `All verification providers returned errors (${errorResults[0]?.error || 'Timeout'}). Could not check Google search.`;
  } else if (validResults.length === 0) {
    status = 'UNKNOWN';
    confidenceScore = 10;
    confidenceLabel = 'INCONCLUSIVE';
    verificationMethod = 'MULTI_PROVIDER_CONSENSUS';
    providerAgreement = 'No provider signals';
    searchEvidenceSummary = `No provider responses received for ${googleSiteQuery} Google search verification.`;
  } else if (gscResult && gscResult.verdict !== 'ERROR' && gscResult.verdict !== 'UNKNOWN') {
    // 2. Official Google Search Console verdict available
    if (gscResult.verdict === 'INDEXED') {
      status = 'CONFIRMED_INDEXED';
      confidenceScore = 99;
      confidenceLabel = 'CONFIRMED (99%)';
      verificationMethod = 'SEARCH_CONSOLE_OFFICIAL';
      providerAgreement = 'Official Google Search Console Confirmed';
      searchEvidenceSummary = `Google Search Console URL Inspection confirmed URL is indexed. Coverage: ${gscResult.details?.coverageState || 'Submitted & Indexed'}.`;
    } else if (gscResult.verdict === 'BLOCKED') {
      status = 'INDEXING_BLOCKED';
      confidenceScore = 98;
      confidenceLabel = 'CONFIRMED (99%)';
      verificationMethod = 'SEARCH_CONSOLE_OFFICIAL';
      providerAgreement = 'Official Google Search Console Blocked';
      searchEvidenceSummary = `Google Search Console confirmed indexing blocked by robots.txt or noindex directive.`;
    } else if (gscResult.verdict === 'NOT_INDEXED') {
      status = 'NOT_INDEXED';
      confidenceScore = 95;
      confidenceLabel = 'VERY HIGH (95%)';
      verificationMethod = 'SEARCH_CONSOLE_OFFICIAL';
      providerAgreement = 'Official Google Search Console Not Indexed';
      searchEvidenceSummary = `Google Search Console confirmed URL is not currently in Google's index.`;
    }
  } else {
    // 3. Multi-provider SERP consensus analysis for site:url on Google 1st page
    const foundCount = validResults.filter((r) => r.foundInIndex === true).length;
    const notFoundCount = validResults.filter((r) => r.foundInIndex === false).length;
    const unknownCount = validResults.filter((r) => r.foundInIndex === null).length;
    const totalCount = validResults.length;

    // Technical SEO directives check (e.g. meta noindex or 404)
    const isNoIndexTagPresent = technicalSeo?.isIndexableRobots === false && technicalSeo?.robotsMeta?.includes('noindex');
    const isHttp404 = technicalSeo?.httpStatus === 404 || technicalSeo?.httpStatus === 410;

    if (isHttp404 && foundCount === 0) {
      status = 'NOT_INDEXED';
      confidenceScore = 90;
      confidenceLabel = 'HIGH (85%)';
      verificationMethod = 'HTTP_AND_ROBOTS_INFERRED';
      providerAgreement = `${notFoundCount}/${totalCount} providers + HTTP ${technicalSeo?.httpStatus}`;
      searchEvidenceSummary = `Page returns HTTP ${technicalSeo?.httpStatus} (Not Found) and is not showing on Google's 1st page for "${googleSiteQuery}".`;
    } else if (isNoIndexTagPresent && foundCount === 0) {
      status = 'INDEXING_BLOCKED';
      confidenceScore = 92;
      confidenceLabel = 'HIGH (85%)';
      verificationMethod = 'HTTP_AND_ROBOTS_INFERRED';
      providerAgreement = `Robots noindex tag + ${notFoundCount}/${totalCount} search signals`;
      searchEvidenceSummary = `Page contains 'noindex' directive and is not showing on Google's 1st page for "${googleSiteQuery}".`;
    } else if (foundCount >= 3 && notFoundCount === 0) {
      status = 'CONFIRMED_INDEXED';
      confidenceScore = 95;
      confidenceLabel = 'VERY HIGH (95%)';
      verificationMethod = isMockData ? 'MOCK_DEMO' : 'MULTI_PROVIDER_CONSENSUS';
      providerAgreement = `${foundCount}/${totalCount} independent providers found target URL on Google Page 1`;
      searchEvidenceSummary = `Showing on Google 1st page for query "${googleSiteQuery}" (Rank #1 matched across ${foundCount} providers).`;
    } else if (foundCount >= 2 && notFoundCount <= 1) {
      status = 'LIKELY_INDEXED';
      confidenceScore = 85;
      confidenceLabel = 'HIGH (85%)';
      verificationMethod = isMockData ? 'MOCK_DEMO' : 'MULTI_PROVIDER_CONSENSUS';
      providerAgreement = `${foundCount}/${totalCount} providers found URL on Google Page 1`;
      searchEvidenceSummary = `Showing on Google 1st page for query "${googleSiteQuery}". URL verified in organic search results.`;
    } else if (foundCount === 1 && notFoundCount === 0 && totalCount === 1) {
      status = 'LIKELY_INDEXED';
      confidenceScore = 70;
      confidenceLabel = 'MODERATE (70%)';
      verificationMethod = isMockData ? 'MOCK_DEMO' : 'SERP_DIRECT';
      providerAgreement = `1/1 provider found URL on Google Page 1`;
      searchEvidenceSummary = `Showing on Google 1st page for query "${googleSiteQuery}".`;
    } else if (foundCount === 0 && notFoundCount >= 2) {
      status = 'NOT_INDEXED';
      confidenceScore = 80;
      confidenceLabel = 'HIGH (85%)';
      verificationMethod = isMockData ? 'MOCK_DEMO' : 'MULTI_PROVIDER_CONSENSUS';
      providerAgreement = `0/${totalCount} providers found URL (${notFoundCount} confirmed zero-results on Google Page 1)`;
      searchEvidenceSummary = `Not showing on Google 1st page for query "${googleSiteQuery}" (0 search results found).`;
    } else if (foundCount === 0 && notFoundCount === 1) {
      status = 'NOT_INDEXED';
      confidenceScore = 65;
      confidenceLabel = 'MODERATE (70%)';
      verificationMethod = isMockData ? 'MOCK_DEMO' : 'SERP_DIRECT';
      providerAgreement = `0/1 provider found URL on Google Page 1`;
      searchEvidenceSummary = `Not showing on Google 1st page for query "${googleSiteQuery}".`;
    } else {
      status = 'UNKNOWN';
      confidenceScore = 40;
      confidenceLabel = 'INCONCLUSIVE';
      verificationMethod = isMockData ? 'MOCK_DEMO' : 'MULTI_PROVIDER_CONSENSUS';
      providerAgreement = `Conflicting signals (${foundCount} found, ${notFoundCount} not found, ${unknownCount} uncertain)`;
      searchEvidenceSummary = `Conflicting signals for query "${googleSiteQuery}". Re-check recommended.`;
    }
  }

  const isIndexed = status === 'CONFIRMED_INDEXED' || status === 'LIKELY_INDEXED';
  const googleFirstPageStatus: 'SHOWING_PAGE_1' | 'NOT_SHOWING_PAGE_1' | 'UNKNOWN' =
    status === 'ERROR' || status === 'UNKNOWN'
      ? 'UNKNOWN'
      : isIndexed
      ? 'SHOWING_PAGE_1'
      : 'NOT_SHOWING_PAGE_1';
  const googleRankPosition = isIndexed ? 1 : null;
  const simpleVerdict: 'Index' | 'No-index' = isIndexed ? 'Index' : 'No-index';

  return {
    status,
    confidenceScore,
    confidenceLabel,
    verificationMethod,
    providerAgreement,
    searchEvidenceSummary,
    gscStatus,
    isMockData,
    googleSiteQuery,
    googleSearchUrl,
    googleFirstPageStatus,
    googleRankPosition,
    simpleVerdict,
  };
}
