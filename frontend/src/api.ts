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

function getAuthHeader(): Record<string, string> {
  try {
    const token = localStorage.getItem("intervia_access_token") || sessionStorage.getItem("intervia_access_token");
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {}
  return {};
}

async function post<T>(path: string, body: unknown, customHeaders: Record<string, string> = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...customHeaders,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

async function get<T>(path: string, customHeaders: Record<string, string> = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      ...getAuthHeader(),
      ...customHeaders,
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  // Authentication
  auth: {
    login: (payload: { email: string; password: string }) =>
      post<{ access_token: string; token_type: string; user: { id: string; email: string; role: string; full_name?: string } }>(
        "/v1/auth/login",
        payload
      ),
    registerCandidate: (payload: { email: string; password: string; full_name: string; phone?: string; terms_accepted?: boolean }) =>
      post<{ id: string; email: string; role: string; full_name: string }>(
        "/v1/auth/register/candidate",
        { terms_accepted: true, ...payload }
      ),
    registerRecruiter: (payload: { email: string; password: string; full_name: string; company_name?: string; organization_name?: string; terms_accepted?: boolean }) =>
      post<{ id: string; email: string; role: string; full_name: string }>(
        "/v1/auth/register/recruiter",
        {
          terms_accepted: true,
          organization_name: payload.organization_name || payload.company_name || "Engineering Team",
          ...payload,
        }
      ),
    getMe: () =>
      get<{ id: string; email: string; role: string; full_name?: string }>("/v1/auth/me"),
  },

  // Onboarding & Consent
  submitConsent: (payload: ConsentPayload) =>
    post<{ user_id: string; session_id: string; message: string }>(
      "/v1/onboarding/consent",
      payload,
    ),
  prepareInterview: (payload: FormData) =>
    fetch(`${API_BASE}/v1/onboarding/prepare`, {
      method: "POST",
      headers: { ...getAuthHeader() },
      body: payload
    }),

  // Invitations
  invitations: {
    create: (payload: { role_title: string; candidate_email: string; scheduled_at?: string }) =>
      post<{ id: string; code: string; role_title: string; scheduled_at: string }>(
        "/v1/invitations/create",
        payload
      ),
    getMyInvitations: () =>
      get<Array<{ id: string; code: string; role_title: string; status: string; scheduled_at: string }>>(
        "/v1/invitations/my-invitations"
      ),
    verifyCode: (code: string) =>
      post<{ valid: boolean; role_title?: string; scheduled_at?: string; message?: string }>(
        `/v1/invitations/verify-code?code=${encodeURIComponent(code)}`,
        {}
      ),
    accept: (code: string) =>
      post<{ id: string; code: string; role_title: string; status: string }>(
        `/v1/invitations/accept/${encodeURIComponent(code)}`,
        {}
      ),
  },

  // Dashboards
  dashboard: {
    getInterviewer: () =>
      get<{
        metrics: { total_interviews: number; pass_rate: number; avg_score: number; pending_reviews: number };
        upcoming_interviews: Array<any>;
        previous_interviews: Array<any>;
      }>("/v1/dashboard/interviewer"),
    getCandidate: () =>
      get<{
        next_interview: any;
        past_interviews: Array<any>;
      }>("/v1/dashboard/candidate"),
  },

  // Live Workspace
  runCode: (payload: {
    session_id: string;
    language: string;
    source_code: string;
    stdin?: string;
  }) => post<{ submission_id: string; passed: boolean; execution_time_sec: number; memory_kb: number; stdout: string; stderr: string; compile_output: string }>(
    "/v1/workspace/run",
    payload
  ),

  askSharedAi: (payload: {
    session_id: string;
    prompt_text: string;
    current_code_snapshot: string;
    sandbox_error_context?: string;
  }) => post<{ chat_id: string; response_text: string; timestamp: string }>("/v1/workspace/ai-chat", payload),

  analyzeScreenFrame: (payload: {
    session_id: string;
    prompt?: string;
    screen_frame_base64?: string;
    current_code?: string;
  }) => post<{ session_id: string; observation: string; status: string }>("/v1/workspace/screen-analysis", payload),

  toggleAiSharing: (sessionId: string, isShared: boolean) =>
    post<{ status: string; is_shared: boolean }>("/v1/workspace/ai-toggle", { session_id: sessionId, is_shared: isShared }),

  endInterview: (sessionId: string, candidateId: string) =>
    post<{ status: string; message: string }>(
      `/v1/workspace/end-interview?session_id=${encodeURIComponent(sessionId)}&candidate_id=${encodeURIComponent(candidateId)}`,
      {}
    ),

  logSecurityEvent: (payload: { session_id: string; event_type: string; details?: Record<string, any> }) =>
    post("/v1/workspace/security-event", { ...payload, timestamp: new Date().toISOString() }),

  syncOfflineChain: (payload: unknown) => post("/v1/reconnect/sync-chain", payload),
  registerChunk: (payload: unknown) => post("/v1/reconnect/chunk", payload),

  // Reports
  reports: {
    getStudentReport: (sessionId: string) =>
      get<{
        session_id: string;
        strengths: string[];
        weaknesses: string[];
        skill_radar: Array<{ skill: string; score: number }>;
        growth_roadmap: Array<{ phase: string; action: string }>;
      }>(`/v1/reports/${encodeURIComponent(sessionId)}/student`),

    getExecutiveReport: (sessionId: string) =>
      get<{
        session_id: string;
        hiring_recommendation: string;
        composite_score: string;
        risk_flags: string[];
        transcript_summary: string;
      }>(`/v1/reports/${encodeURIComponent(sessionId)}/executive`),

    getPdfDownloadUrl: (sessionId: string) =>
      `${API_BASE}/v1/reports/${encodeURIComponent(sessionId)}/download-pdf`,
  },

  generateReport: (sessionId: string, candidateId: string) =>
    post(`/v1/reports/${sessionId}/generate?candidate_id=${encodeURIComponent(candidateId)}`, {}),
};
