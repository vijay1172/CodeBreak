export class TimedCache {
  constructor({ ttlMs = 60000, maxEntries = 500 } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.entries = new Map();
  }
  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) { this.entries.delete(key); return undefined; }
    return entry.value;
  }
  set(key, value) {
    if (this.entries.size >= this.maxEntries) this.entries.delete(this.entries.keys().next().value);
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}
