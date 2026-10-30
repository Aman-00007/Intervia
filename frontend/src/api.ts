// src/services/api.ts (or wherever your api.ts is located)

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// --- Types ---
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

// --- Helpers (With JWT Auto-Injection) ---
async function request<T>(path: string, options: RequestInit): Promise<T> {
  const token = localStorage.getItem("intervia_token");
  
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

const get = <T>(path: string) => request<T>(path, { method: "GET" });
const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) });

// --- API Endpoints ---
export const api = {
  // 1. Auth
  login: (payload: any) => post<{ access_token: string; user: any }>("/v1/auth/login", payload),
  registerStudent: (payload: any) => post("/v1/auth/register/candidate", payload),
  registerRecruiter: (payload: any) => post("/v1/auth/register/recruiter", payload),

  // 2. Dashboard & Invitations
  getInterviewerDashboard: () => get<any>("/v1/dashboard/interviewer"),
  createInvitation: (payload: any) => post<any>("/v1/invitations/create", payload),
  verifyInviteCode: (code: string) => post<any>(`/v1/invitations/verify-code?code=${code}`, {}),
  acceptInvitation: (code: string) => post<any>(`/v1/invitations/accept/${code}`, {}),
  updateInvitation: (id: string, payload: any) => put<any>(`/v1/invitations/${id}`, payload),
  resendInvitation: (id: string) => post<any>(`/v1/invitations/${id}/resend`, {}),

  // 3. Stage A: Onboarding
  submitConsent: (payload: ConsentPayload) => post<{ user_id: string; session_id: string; message: string }>("/v1/onboarding/consent", payload),
  prepareInterview: (payload: FormData) => request<any>("/v1/onboarding/prepare", { method: "POST", body: payload }),
  prepareOfflineBuffer: (payload: { session_id: string; cleaned_resume_text: string }) => post<{ server_seed: string; encrypted_hints: string[] }>("/v1/onboarding/offline-prepare", payload),

  // 4. Stage B: Workspace
   // 4. Stage B: Workspace
  runCode: (payload: any) => post<{ passed: boolean; stdout: string; stderr: string; submission_id: string; execution_time_sec: number; memory_kb: number }>("/v1/workspace/run", payload),
  askSharedAi: (payload: any) => post<{ response_text: string; timestamp: string }>("/v1/workspace/ai-chat", payload),
  logSecurityEvent: (payload: any) => post("/v1/workspace/security-event", payload),
  receiveTranscript: (payload: any) => post("/v1/workspace/transcript", payload),
  toggleAiSharing: (payload: { session_id: string; is_shared: boolean }) => post("/v1/workspace/ai-toggle", payload),

  // 5. Stage C & D: Offline & Reconnect
  startOfflineSession: (payload: any) => post("/v1/offline/start", payload),
  markOfflineTimeout: (offlineSessionId: string) => post(`/v1/offline/timeout/${offlineSessionId}`, {}),
  syncOfflineChain: (payload: unknown) => post("/v1/reconnect/sync-chain", payload),
  registerChunk: (payload: unknown) => post("/v1/reconnect/chunk", payload),
  getReconnectAudit: (sessionId: string) => get<any>(`/v1/reconnect/audit/${sessionId}`),

  // 6. Stage E: Reports
  generateReport: (sessionId: string, candidateId: string) => post(`/v1/reports/${sessionId}/generate?candidate_id=${encodeURIComponent(candidateId)}`, {}),
  getStudentReport: (sessionId: string) => get<any>(`/v1/reports/${sessionId}/student`),
  getExecutiveReport: (sessionId: string) => get<any>(`/v1/reports/${sessionId}/executive`),
  downloadPdf: (sessionId: string) => `${API_BASE}/v1/reports/${sessionId}/download-pdf`,
  saveHumanEvaluation: (payload: { session_id: string; evaluation: string; notes: string }) => post("/v1/reports/human-evaluation", payload),
};