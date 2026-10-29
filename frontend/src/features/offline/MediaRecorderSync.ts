export type MediaChunk = { chunkIndex: number; blob: Blob; startedAt: string; endedAt: string };
export class MediaRecorderSync {
  private chunks: MediaChunk[] = [];
  add(chunk: MediaChunk) { this.chunks.push(chunk); }
  pending() { return [...this.chunks]; }
}
