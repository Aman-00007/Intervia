export interface HmacLogEntry {
  sequenceId: number;
  eventType: string;
  payload: string;
  timestamp: string;
  previousHash: string;
  currentHash: string;
}

export interface VerificationResult {
  valid: boolean;
  brokenAt?: number;
  reason?: string;
  totalEntries?: number;
}

// Lightweight synchronous SHA-256 hasher for immediate zero-latency logging
function sha256Sync(str: string): string {
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    }
  }

  const bitLength = utf8.length * 8;
  utf8.push(0x80);
  while ((utf8.length % 64) !== 56) utf8.push(0);
  for (let i = 7; i >= 0; i--) {
    utf8.push((bitLength >>> (i * 8)) & 0xff);
  }

  const words: number[] = [];
  for (let i = 0; i < utf8.length; i += 4) {
    words.push((utf8[i] << 24) | (utf8[i + 1] << 16) | (utf8[i + 2] << 8) | utf8[i + 3]);
  }

  for (let i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16);
    for (let j = 16; j < 64; j++) {
      const s0 = ((w[j - 15] >>> 7) | (w[j - 15] << 25)) ^ ((w[j - 15] >>> 18) | (w[j - 15] << 14)) ^ (w[j - 15] >>> 3);
      const s1 = ((w[j - 2] >>> 17) | (w[j - 2] << 15)) ^ ((w[j - 2] >>> 19) | (w[j - 2] << 13)) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let j = 0; j < 64; j++) {
      const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[j] + w[j]) | 0;
      const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const toHex = (n: number) => ("00000000" + (n >>> 0).toString(16)).slice(-8);
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7);
}

export class HmacChainLogger {
  private seedKey: string;
  private entries: HmacLogEntry[] = [];
  private broadcastChannel: BroadcastChannel | null = null;

  constructor(seedKey = "INTERVIA_SERVER_SEED_IV-2048") {
    this.seedKey = seedKey;
    this.restoreFromStorage();

    if (typeof window !== "undefined") {
      try {
        if ("BroadcastChannel" in window) {
          this.broadcastChannel = new BroadcastChannel("intervia_hmac_bus");
          this.broadcastChannel.onmessage = (event) => {
            if (event.data && event.data.type === "SECURITY_ENTRY" && event.data.entry) {
              const entry = event.data.entry as HmacLogEntry;
              if (!this.entries.some((e) => e.sequenceId === entry.sequenceId && e.currentHash === entry.currentHash)) {
                this.entries.push(entry);
                this.saveToStorage();
              }
              window.dispatchEvent(new CustomEvent("intervia:security_violation", { detail: entry }));
            }
          };
        }
      } catch {
        // Fallback to storage event
      }

      window.addEventListener("storage", (e) => {
        if (e.key === "intervia_security_chain" && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed) && parsed.length > this.entries.length) {
              const newEntry = parsed[parsed.length - 1];
              this.entries = parsed;
              window.dispatchEvent(new CustomEvent("intervia:security_violation", { detail: newEntry }));
            }
          } catch {}
        }
      });
    }
  }

  private restoreFromStorage() {
    try {
      const stored = (typeof localStorage !== "undefined" && localStorage.getItem("intervia_security_chain")) ||
                     (typeof sessionStorage !== "undefined" && sessionStorage.getItem("intervia_security_chain"));
      if (stored) {
        this.entries = JSON.parse(stored);
      }
    } catch {
      // Storage unavailable or invalid JSON
    }
  }

  private saveToStorage() {
    try {
      const json = JSON.stringify(this.entries);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("intervia_security_chain", json);
      }
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("intervia_security_chain", json);
      }
    } catch {
      // Storage full or private mode
    }
  }

  /**
   * Appends an event to the tamper-evident HMAC chain synchronously.
   */
  append(eventType: string, payload: any = {}): HmacLogEntry {
    const sequenceId = this.entries.length + 1;
    const timestamp = new Date().toISOString();
    const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);

    const previousHash = this.entries.length === 0
      ? sha256Sync(this.seedKey)
      : this.entries[this.entries.length - 1].currentHash;

    const signatureData = `${previousHash}:${sequenceId}:${timestamp}:${eventType}:${payloadStr}`;
    const currentHash = sha256Sync(`${this.seedKey}:${signatureData}`);

    const entry: HmacLogEntry = {
      sequenceId,
      eventType,
      payload: payloadStr,
      timestamp,
      previousHash,
      currentHash,
    };

    this.entries.push(entry);
    this.saveToStorage();

    // Broadcast event across windows and locally for live interviewer workspace listener
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: "SECURITY_ENTRY", entry });
      } catch {}
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("intervia:security_violation", { detail: entry }));
    }

    return entry;
  }

  getEntries(): HmacLogEntry[] {
    return [...this.entries];
  }

  entriesForSync(): HmacLogEntry[] {
    return [...this.entries];
  }

  getLatestHash(): string {
    return this.entries.length === 0
      ? sha256Sync(this.seedKey)
      : this.entries[this.entries.length - 1].currentHash;
  }

  clear() {
    this.entries = [];
    sessionStorage.removeItem("intervia_security_chain");
  }

  /**
   * Cryptographically verifies the entire log chain integrity.
   * Detects modified payloads, deleted entries, re-ordered entries, or altered timestamps.
   */
  verifyChain(): VerificationResult {
    return HmacChainLogger.verifyChainEntries(this.entries, this.seedKey);
  }

  static verifyChainEntries(entries: HmacLogEntry[], seedKey = "INTERVIA_SERVER_SEED_IV-2048"): VerificationResult {
    if (!entries || entries.length === 0) {
      return { valid: true, totalEntries: 0 };
    }

    let expectedPrevHash = sha256Sync(seedKey);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedSeq = i + 1;

      // 1. Sequence consecutive order check
      if (entry.sequenceId !== expectedSeq) {
        return {
          valid: false,
          brokenAt: i,
          reason: `Sequence violation: expected #${expectedSeq}, encountered #${entry.sequenceId}`,
          totalEntries: entries.length,
        };
      }

      // 2. Previous hash chain linkage check
      if (entry.previousHash !== expectedPrevHash) {
        return {
          valid: false,
          brokenAt: i,
          reason: `Broken chain link at entry #${entry.sequenceId}: previousHash mismatch`,
          totalEntries: entries.length,
        };
      }

      // 3. Re-calculate cryptographic signature check
      const signatureData = `${entry.previousHash}:${entry.sequenceId}:${entry.timestamp}:${entry.eventType}:${entry.payload}`;
      const recalculatedHash = sha256Sync(`${seedKey}:${signatureData}`);

      if (entry.currentHash !== recalculatedHash) {
        return {
          valid: false,
          brokenAt: i,
          reason: `Tampered log entry #${entry.sequenceId}: signature does not match payload`,
          totalEntries: entries.length,
        };
      }

      expectedPrevHash = entry.currentHash;
    }

    return { valid: true, totalEntries: entries.length };
  }
}

// Global singleton instance for session-wide recording
export const securityAuditLogger = new HmacChainLogger();
