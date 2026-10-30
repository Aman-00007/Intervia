// src/features/offline/MediaRecorderSync.ts

export type MediaChunk = { 
  chunkIndex: number; 
  blob: Blob; 
  startedAt: string; 
  endedAt: string 
};

export class MediaRecorderSync {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: MediaChunk[] = [];
  private chunkIndex = 0;
  private isOffline = false;
  private stream: MediaStream | null = null;

  start(stream: MediaStream) {
    if (!stream) return;
    this.stream = stream;
    this.chunks = [];
    this.chunkIndex = 0;

    // Use webm for broad compatibility
    const options = { mimeType: 'video/webm;codecs=vp8,opus' };
    
    try {
      this.mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      // Fallback for Safari
      this.mediaRecorder = new MediaRecorder(stream);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        const chunk: MediaChunk = {
          chunkIndex: this.chunkIndex++,
          blob: event.data,
          startedAt: new Date(Date.now() - 5000).toISOString(),
          endedAt: new Date().toISOString(),
        };
        
        // If we are offline, queue it. 
        if (this.isOffline) {
          console.log(`[Black Box] Buffering 5s chunk #${chunk.chunkIndex} locally (Offline)`);
          this.chunks.push(chunk);
        } else {
          // If online, in a real app we would upload immediately.
          // For this hackathon demo, we will only flush when sync() is called.
          console.log(`[Black Box] Recording 5s chunk #${chunk.chunkIndex} (Online)`);
        }
      }
    };

    // Slice the video every 5 seconds (5000ms)
    this.mediaRecorder.start(5000);
  }

  setOffline(status: boolean) {
    this.isOffline = status;
    if (status) {
      console.log("🔴 Wi-Fi DROPPED. Black Box Active.");
    } else {
      console.log("🟢 Wi-Fi RESTORED. Ready to sync.");
    }
  }

  // Returns the buffered chunks to be uploaded
  getPendingChunks(): MediaChunk[] {
    return [...this.chunks];
  }

  clear() {
    this.chunks = [];
  }

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
  }
}