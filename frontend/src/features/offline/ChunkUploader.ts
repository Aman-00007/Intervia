import { api } from "../../core/api";
export async function uploadChunk(payload: unknown) { return api.registerChunk(payload); }
