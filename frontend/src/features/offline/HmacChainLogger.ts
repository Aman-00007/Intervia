export type HmacLogEntry = { sequenceId: number; eventType: string; payloadHash: string; timestamp: string; hmacSignature: string };
export class HmacChainLogger {
  private entries: HmacLogEntry[] = [];
  append(entry: HmacLogEntry) { this.entries.push(entry); }
  entriesForSync() { return [...this.entries]; }
}
