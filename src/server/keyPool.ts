import { ApiKeyEntry, ApiPoolStatus } from '../types.js';

export interface InternalApiKey extends ApiKeyEntry {
  rawKey: string;
  hourTimestamps: number[];
}

export class ApiKeyPoolManager {
  private keys: Map<string, InternalApiKey> = new Map();
  private currentIndex = 0;

  constructor() {
    this.initFromEnvironment();
  }

  private initFromEnvironment() {
    // Seed with any environment keys if present
    const envKeys = [
      { key: process.env.SERPAPI_API_KEY || process.env.PROVIDER_A_API_KEY, label: 'SerpApi Primary Key' },
      { key: process.env.PROVIDER_B_API_KEY, label: 'Secondary SERP Key' },
      { key: process.env.PROVIDER_C_API_KEY, label: 'Tertiary SERP Key' },
    ].filter((item) => Boolean(item.key && item.key.length > 5));

    if (envKeys.length > 0) {
      envKeys.forEach((k, idx) => {
        this.addKey(k.key!, k.label, 'serp_api', 250, 50);
      });
    } else {
      // Add initial ready-to-configure demo/starter key slot with 250 searches limit
      const starterKey = 'serp_free_demo_key_ready';
      this.addKey(starterKey, 'SerpApi Free Tier (Starter)', 'serp_api', 250, 50);
    }
  }

  public addKey(
    rawKey: string,
    label: string = 'SerpApi Free Account',
    providerType: ApiKeyEntry['providerType'] = 'serp_api',
    monthlyLimit: number = 250,
    hourlyLimit: number = 50
  ): ApiKeyEntry {
    const trimmed = rawKey.trim();
    const id = `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const maskedKey =
      trimmed.length > 8
        ? `${trimmed.substring(0, 4)}••••••••${trimmed.substring(trimmed.length - 4)}`
        : '••••••••';

    const entry: InternalApiKey = {
      id,
      providerType,
      label: label.trim() || `API Key #${this.keys.size + 1}`,
      rawKey: trimmed,
      maskedKey,
      monthlyLimit: Number(monthlyLimit) || 250,
      hourlyLimit: Number(hourlyLimit) || 50,
      usedCount: 0,
      usedThisHour: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      hourTimestamps: [],
    };

    this.keys.set(id, entry);
    return this.sanitizeEntry(entry);
  }

  public addMultipleKeys(
    rawKeysText: string,
    labelPrefix: string = 'Free SerpApi Account',
    monthlyLimit: number = 250,
    hourlyLimit: number = 50
  ): ApiKeyEntry[] {
    const lines = rawKeysText
      .split(/[\n,;]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 4);

    const added: ApiKeyEntry[] = [];
    lines.forEach((key, idx) => {
      const entry = this.addKey(
        key,
        `${labelPrefix} ${this.keys.size + 1}`,
        'serp_api',
        monthlyLimit,
        hourlyLimit
      );
      added.push(entry);
    });

    return added;
  }

  public deleteKey(id: string): boolean {
    return this.keys.delete(id);
  }

  public toggleKey(id: string): ApiKeyEntry | null {
    const key = this.keys.get(id);
    if (!key) return null;
    key.status = key.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    return this.sanitizeEntry(key);
  }

  public resetKeyUsage(id: string): ApiKeyEntry | null {
    const key = this.keys.get(id);
    if (!key) return null;
    key.usedCount = 0;
    key.usedThisHour = 0;
    key.hourTimestamps = [];
    if (key.status === 'EXHAUSTED' || key.status === 'RATE_LIMITED') {
      key.status = 'ACTIVE';
    }
    key.lastError = undefined;
    return this.sanitizeEntry(key);
  }

  public updateKeyLimits(id: string, monthlyLimit?: number, hourlyLimit?: number, label?: string): ApiKeyEntry | null {
    const key = this.keys.get(id);
    if (!key) return null;
    if (monthlyLimit !== undefined && monthlyLimit > 0) key.monthlyLimit = monthlyLimit;
    if (hourlyLimit !== undefined && hourlyLimit > 0) key.hourlyLimit = hourlyLimit;
    if (label !== undefined && label.trim()) key.label = label.trim();
    return this.sanitizeEntry(key);
  }

  /**
   * Cleans rolling 1-hour window for hourly rate limits
   */
  private cleanHourTimestamps(key: InternalApiKey) {
    const oneHourAgo = Date.now() - 3600000;
    key.hourTimestamps = key.hourTimestamps.filter((ts) => ts > oneHourAgo);
    key.usedThisHour = key.hourTimestamps.length;
  }

  /**
   * Acquires the next valid API key with available credits.
   * If a key is at or over limit (e.g. 250 searches), skips it automatically and checks next.
   */
  public acquireValidKey(): { id: string; rawKey: string; label: string } | null {
    if (this.keys.size === 0) return null;

    const keyList = Array.from(this.keys.values());
    const count = keyList.length;

    for (let i = 0; i < count; i++) {
      const idx = (this.currentIndex + i) % count;
      const key = keyList[idx];

      this.cleanHourTimestamps(key);

      // Check if disabled
      if (key.status === 'DISABLED') continue;

      // Check monthly quota (e.g. 250 searches)
      if (key.usedCount >= key.monthlyLimit) {
        key.status = 'EXHAUSTED';
        continue;
      }

      // Check hourly throughput (e.g. 50/hour)
      if (key.usedThisHour >= key.hourlyLimit) {
        key.status = 'RATE_LIMITED';
        continue;
      }

      // Valid key found! Update round-robin pointer for load distribution
      this.currentIndex = (idx + 1) % count;
      return {
        id: key.id,
        rawKey: key.rawKey,
        label: key.label,
      };
    }

    return null;
  }

  /**
   * Records usage for an API key.
   * If the provider returns 429 or quota exhaustion, immediately marks it EXHAUSTED
   * so subsequent calls immediately skip this key.
   */
  public recordUsage(id: string, success: boolean, statusCode?: number, errorMsg?: string): void {
    const key = this.keys.get(id);
    if (!key) return;

    const now = Date.now();
    key.lastUsedAt = new Date().toISOString();

    if (success) {
      key.usedCount++;
      key.hourTimestamps.push(now);
      this.cleanHourTimestamps(key);
      key.status = key.usedCount >= key.monthlyLimit ? 'EXHAUSTED' : 'ACTIVE';
      key.lastError = undefined;
    } else {
      key.lastError = errorMsg;

      // Check for quota exhaustion or rate limit signals from SerpApi / providers
      const isQuotaError =
        statusCode === 429 ||
        (errorMsg &&
          (errorMsg.toLowerCase().includes('limit') ||
            errorMsg.toLowerCase().includes('quota') ||
            errorMsg.toLowerCase().includes('exhausted') ||
            errorMsg.toLowerCase().includes('credit')));

      if (isQuotaError) {
        key.usedCount = Math.max(key.usedCount, key.monthlyLimit);
        key.status = 'EXHAUSTED';
      } else {
        key.usedCount++;
        key.hourTimestamps.push(now);
        this.cleanHourTimestamps(key);
      }
    }
  }

  public getPoolStatus(): ApiPoolStatus {
    const keysArray = Array.from(this.keys.values());
    let totalMonthlyQuota = 0;
    let totalUsedSearches = 0;
    let activeKeys = 0;
    let exhaustedKeys = 0;

    keysArray.forEach((k) => {
      this.cleanHourTimestamps(k);
      totalMonthlyQuota += k.monthlyLimit;
      totalUsedSearches += k.usedCount;
      if (k.status === 'ACTIVE') activeKeys++;
      if (k.status === 'EXHAUSTED') exhaustedKeys++;
    });

    const totalRemainingCredits = Math.max(0, totalMonthlyQuota - totalUsedSearches);

    // Low credit warning when total remaining is 100 or less
    const lowCreditWarning = totalRemainingCredits > 0 && totalRemainingCredits <= 100;
    // All exhausted notice when 0 credits remaining
    const allExhaustedNotice = totalRemainingCredits === 0 && keysArray.length > 0;

    return {
      keys: keysArray.map((k) => this.sanitizeEntry(k)),
      totalKeys: keysArray.length,
      activeKeys,
      exhaustedKeys,
      totalMonthlyQuota,
      totalUsedSearches,
      totalRemainingCredits,
      lowCreditWarning,
      allExhaustedNotice,
      fallbackActive: allExhaustedNotice || activeKeys === 0,
    };
  }

  private sanitizeEntry(key: InternalApiKey): ApiKeyEntry {
    const { rawKey, hourTimestamps, ...safe } = key;
    return safe;
  }
}

export const apiKeyPool = new ApiKeyPoolManager();
