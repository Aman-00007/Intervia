const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type ConsentPayload = {
  real_full_name: string;
  real_email: string;
  real_phone?: string;
  college_id?: string;
  github_username?: string;
  is_above_18_verified: boolean;
  purposes_accepted: {
    camera_audio: boolean;
    ai_processing: boolean;
    data_retention: boolean;
  };
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  submitConsent: (payload: ConsentPayload) =>
    post<{ user_id: string; session_id: string; message: string }>(
      "/v1/onboarding/consent",
      payload,
    ),
  prepareInterview: (payload: FormData) =>
    fetch(`${API_BASE}/v1/onboarding/prepare`, { method: "POST", body: payload }),
  runCode: (payload: {
    session_id: string;
    language: string;
    source_code: string;
    stdin?: string;
  }) => post("/v1/workspace/run", payload),
  askSharedAi: (payload: {
    session_id: string;
    prompt_text: string;
    current_code_snapshot: string;
    sandbox_error_context?: string;
  }) => post<{ response_text: string; timestamp: string }>("/v1/workspace/ai-chat", payload),
  syncOfflineChain: (payload: unknown) => post("/v1/reconnect/sync-chain", payload),
  registerChunk: (payload: unknown) => post("/v1/reconnect/chunk", payload),
  generateReport: (sessionId: string, candidateId: string) =>
    post(`/v1/reports/${sessionId}/generate?candidate_id=${encodeURIComponent(candidateId)}`, {}),
};
