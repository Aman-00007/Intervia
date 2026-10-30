// src/features/offline/ChunkUploader.ts
import { api } from "../../api";
import { MediaChunk } from "./MediaRecorderSync";

export async function uploadChunks(chunks: MediaChunk[], sessionId: string) {
  if (chunks.length === 0) return;

  console.log(`[Uploader] Uploading ${chunks.length} offline chunks to server...`);

  for (const chunk of chunks) {
    try {
      // In a real app, you'd first upload the `chunk.blob` to S3 via a presigned URL.
      // For the hackathon, we will just send the metadata to the FastAPI backend.
      await api.registerChunk({
        session_id: sessionId,
        seq: chunk.chunkIndex,
        s3_key: `offline_chunks/${sessionId}/chunk_${chunk.chunkIndex}.webm`,
        sha256_hash: "mock_hash_" + chunk.chunkIndex,
      });
    } catch (err) {
      console.error(`Failed to upload chunk ${chunk.chunkIndex}`, err);
    }
  }
  
  console.log(`[Uploader] Successfully synced ${chunks.length} chunks.`);
}