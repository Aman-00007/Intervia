# Intervia Frontend-to-Backend Integration Gaps & API Contract Matrix

This document provides a comprehensive mapping of all **21 frontend screens** in the Intervia application to their required FastAPI backend endpoints. It details exactly what is currently implemented, what is missing, and the exact payloads required to connect the systems seamlessly.

---

## 0. Quick-Start File Inventory: Exact Files to Add & Update in Backend

### 1. New Backend Files to Add (14 files)
| # | File Path | Purpose / Responsibilities |
|---|---|---|
| 1 | `backend/src/intervia/domains/auth/__init__.py` | Package init & domain exports (`router`, `AuthService`, `User`, `Role`) |
| 2 | `backend/src/intervia/domains/auth/models.py` | `User`, `UserSession`, `PasswordResetToken`, `Role` enum |
| 3 | `backend/src/intervia/domains/auth/schemas.py` | Pydantic DTOs for register, login, refresh, profile, tokens |
| 4 | `backend/src/intervia/domains/auth/repository.py` | SQLAlchemy database queries for users, tokens, and sessions |
| 5 | `backend/src/intervia/domains/auth/service.py` | Bcrypt password hashing, JWT generation, session lifecycle |
| 6 | `backend/src/intervia/domains/auth/router.py` | Endpoints: `POST /v1/auth/login`, `POST /v1/auth/register`, `POST /v1/auth/refresh`, `GET /v1/auth/me`, `POST /v1/auth/forgot-password`, `POST /v1/auth/reset-password` |
| 7 | `backend/src/intervia/domains/interviews/__init__.py` | Package init & domain exports (`router`, `invitations_router`, `InterviewService`) |
| 8 | `backend/src/intervia/domains/interviews/models.py` | `Interview`, `InterviewActivity`, `InterviewParticipant`, `InterviewInvitation` |
| 9 | `backend/src/intervia/domains/interviews/schemas.py` | Pydantic DTOs for create interview, update schedule, verify code, list sessions |
| 10 | `backend/src/intervia/domains/interviews/repository.py` | SQLAlchemy database queries for interviews, invitations, attendance |
| 11 | `backend/src/intervia/domains/interviews/service.py` | Business logic for scheduling, `IV-XXXX` code generation, reminders |
| 12 | `backend/src/intervia/domains/interviews/router.py` | Endpoints: `POST /v1/interviews`, `GET /v1/interviews`, `GET /v1/interviews/{id}`, `PATCH /v1/interviews/{id}`, `GET /v1/interviews/candidate/my-sessions` |
| 13 | `backend/src/intervia/domains/interviews/invitations_router.py` | Endpoint: `POST /v1/invitations/verify` (Security code access) |
| 14 | `backend/alembic/versions/xxxx_add_auth_and_interviews.py` | Alembic migration for users, sessions, interviews, invitations tables |

### 2. Existing Backend Files to Update (7 files)
| # | File Path | Changes Required |
|---|---|---|
| 1 | `backend/src/intervia/main.py` | Register `/v1/auth`, `/v1/interviews`, `/v1/invitations` routers; configure CORS for `http://localhost:5173` and `http://127.0.0.1:5173` |
| 2 | `backend/src/intervia/core/config.py` | Add `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `CORS_ORIGINS` |
| 3 | `backend/src/intervia/core/security/jwt_rbac.py` | Add `get_current_user` and `require_role(["admin", "interviewer"])` dependency guards |
| 4 | `backend/src/intervia/domains/stage_a_onboarding/router.py` | Add `POST /v1/onboarding/resume` (multipart upload), `GET /v1/onboarding/resume/{id}` (Presidio PII redacted preview), `POST /v1/onboarding/resume/{id}/approve`, `POST /v1/onboarding/device-check`, `GET /v1/onboarding/session/{id}/status` |
| 5 | `backend/src/intervia/domains/stage_b_workspace/router.py` | Add `GET /v1/workspace/sessions/{id}/participants`, `POST/GET /v1/workspace/sessions/{id}/snapshots`, authenticate WebSocket handshake query token |
| 6 | `backend/src/intervia/domains/stage_d_reconciliation/router.py` | Add `GET /v1/reconnect/{id}/status`, `GET /v1/reconnect/{id}/integrity` HMAC verification check |
| 7 | `backend/src/intervia/domains/stage_e_reporting/router.py` | Add `GET /v1/reports/candidate`, `GET /v1/reports/candidate/{id}`, `GET /v1/reports/interviewer`, `GET /v1/reports/{id}/executive-summary`, `PATCH /v1/reports/{id}/evaluation`, `GET /v1/reports/{id}/download` (PDF/DOCX) |

---

## 1. Complete 21-Screen API Integration Matrix

| # | Screen Name | Frontend Route / View | Backend Endpoint | HTTP Method | Status | Notes / Missing Fields |
|---|-------------|------------------------|------------------|-------------|--------|------------------------|
| **1** | **Landing Page** | `/` or `/landing` | None (Static) | - | **Complete** | Client-side landing page with desktop app download trigger. |
| **2** | **Candidate Sign In** | `/candidate/login` | `/v1/auth/login` | `POST` | **Missing** | Needs `email`, `password`, returns JWT access + refresh tokens. |
| **3** | **Recruiter Sign In** | `/admin/login` | `/v1/auth/login` | `POST` | **Missing** | Needs `email`, `password`, verifies `role: "admin"` or `"interviewer"`. |
| **4** | **Candidate Register** | `/candidate/register` | `/v1/auth/register` | `POST` | **Missing** | Needs `full_name`, `email`, `password`, `role: "candidate"`. |
| **5** | **Recruiter Register** | `/admin/register` | `/v1/auth/register` | `POST` | **Missing** | Needs `full_name`, `organization`, `email`, `password`, `role: "admin"`. |
| **6** | **Invitation Code Join** | `/join` | `/v1/invitations/verify` | `POST` | **Missing** | Validates security code (e.g. `IV-2048`), binds active session. |
| **7** | **Consent & Device Check** | `/candidate/consent` | `/v1/onboarding/consent`<br>`/v1/onboarding/device-check` | `POST`<br>`POST` | **Partial** | `consent` endpoint exists; `device-check` persistence needed. |
| **8** | **Resume Upload** | `/candidate/resume` | `/v1/onboarding/resume` | `POST` (Multipart) | **Missing** | Needs PDF/DOCX file upload to S3/media store. |
| **9** | **Resume Anonymization Review** | `/candidate/resume` (Preview) | `/v1/onboarding/resume/{id}`<br>`/v1/onboarding/resume/{id}/approve` | `GET`<br>`POST` | **Missing** | Presidio redactor preview and candidate approval trigger. |
| **10** | **Candidate Lobby** | `/candidate/lobby` | `/v1/onboarding/session/{id}/status` | `GET` | **Missing** | Returns 3-step setup progress, camera readiness, waiting state. |
| **11** | **Candidate Dashboard** | `/candidate` | `/v1/interviews/candidate/my-sessions` | `GET` | **Missing** | Returns active upcoming sessions and past report cards. |
| **12** | **Interviewer Dashboard** | `/interviewer` | `/v1/interviews` | `GET` | **Missing** | Returns scheduled sessions, candidate emails, attendance status. |
| **13** | **Create Interview** | `/interviewer/create` | `/v1/interviews` | `POST` | **Missing** | Creates interview, generates code `IV-XXXX` and invitation email. |
| **14** | **Manage Interview** | `/interviewer/manage` | `/v1/interviews/{id}`<br>`/v1/interviews/{id}` | `GET`<br>`PATCH` | **Missing** | Fetches and updates interview metadata and 4-activity timeline. |
| **15** | **Candidate Live Workspace** | `/candidate/workspace` | `/v1/workspace/run`<br>`/v1/workspace/ai-chat`<br>`/v1/workspace/ws/yjs/{id}` | `POST`<br>`POST`<br>`WS` | **Complete** | Code execution (Judge0), shared AI copilot, and Yjs CRDT hub. |
| **16** | **Candidate Hidden Workspace** | `/candidate/hidden` | `/v1/workspace/run` | `POST` | **Complete** | Isolated candidate sandbox execution without shared live state. |
| **17** | **Interviewer Live Workspace** | `/interviewer/workspace` | `/v1/workspace/run`<br>`/v1/workspace/ai-chat`<br>`/v1/workspace/ws/yjs/{id}` | `POST`<br>`POST`<br>`WS` | **Complete** | Observer code editor, AI copilot, and telemetry monitoring. |
| **18** | **Offline Recovery & Reconnect** | `/candidate/recovery` | `/v1/reconnect/sync-chain`<br>`/v1/reconnect/chunk`<br>`/v1/reconnect/{id}/status` | `POST`<br>`POST`<br>`GET` | **Partial** | `sync-chain` and `chunk` exist; status/summary endpoint needed. |
| **19** | **Candidate Reports Center** | `/candidate/reports` | `/v1/reports/candidate` | `GET` | **Missing** | List of all finished reports for the logged-in candidate. |
| **20** | **Candidate Report Detail** | `/candidate/report` | `/v1/reports/candidate/{id}`<br>`/v1/reports/{id}/download?format=pdf` | `GET`<br>`GET` | **Missing** | Student feedback report with 6-metric rubric, code diff, PDF. |
| **21** | **Interviewer Executive Summary** | `/interviewer/summary` | `/v1/reports/{id}/executive-summary`<br>`/v1/reports/{id}/evaluation` | `GET`<br>`PATCH` | **Missing** | Senior recruiter summary, AI detection stats, evaluator input. |

---

## 2. Detailed API Contracts for Missing Endpoints

### 2.1 Authentication (`/v1/auth`)

#### `POST /v1/auth/login`
- **Request**:
  ```json
  {
    "email": "candidate@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "def50200...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "id": "c1f7b0a8-2048-4e12-b9e3-85e7a98214fa",
      "email": "candidate@example.com",
      "full_name": "Alex Mercer",
      "role": "candidate",
      "organization": null
    }
  }
  ```

#### `POST /v1/auth/register`
- **Request**:
  ```json
  {
    "full_name": "Hiring Manager",
    "organization": "Acme Systems",
    "email": "recruiter@acme.com",
    "password": "StrongPassword2026!",
    "role": "admin"
  }
  ```
- **Response (`201 Created`)**: Same format as `POST /v1/auth/login`.

#### `GET /v1/auth/me`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response (`200 OK`)**: User details and active permissions.

---

### 2.2 Invitation Verification (`/v1/invitations`)

#### `POST /v1/invitations/verify`
- **Request**:
  ```json
  {
    "security_code": "IV-2048"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "valid": true,
    "interview_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "code": "IV-2048",
    "title": "Backend Systems Engineering",
    "language": "python",
    "duration_minutes": 45,
    "scheduled_at": "2026-10-29T10:00:00Z",
    "status": "ready"
  }
  ```

---

### 2.3 Interviews Management (`/v1/interviews`)

#### `POST /v1/interviews`
- **Request**:
  ```json
  {
    "title": "Backend Systems Engineering",
    "duration_minutes": 45,
    "language": "python",
    "candidate_email": "candidate@example.com",
    "scheduled_at": "2026-10-29T10:00:00Z",
    "brief": "Evaluate async programming, distributed locking, and edge-case testing.",
    "timeline": [
      { "id": 1, "title": "Warmup & problem introduction", "duration_minutes": 5 },
      { "id": 2, "title": "Core algorithmic implementation", "duration_minutes": 25 },
      { "id": 3, "title": "Edge-case optimization & performance", "duration_minutes": 10 },
      { "id": 4, "title": "Debrief & candidate questions", "duration_minutes": 5 }
    ]
  }
  ```
- **Response (`201 Created`)**: Full `InterviewResponseDTO` with generated `code: "IV-2051"`.

#### `PATCH /v1/interviews/{interview_id}`
- **Request**: Any subset of interview fields (e.g. updated timeline, candidate email, duration).
- **Response (`200 OK`)**: Updated `InterviewResponseDTO`.

---

### 2.4 Onboarding & Lobby (`/v1/onboarding`)

#### `POST /v1/onboarding/resume`
- **Request**: `multipart/form-data` with `file: binary` (PDF or DOCX) and `session_id: string`.
- **Response (`200 OK`)**:
  ```json
  {
    "resume_id": "r-78192",
    "filename": "Alex_Mercer_Resume.pdf",
    "status": "redacted_preview_ready",
    "extracted_skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "AsyncIO"],
    "redacted_text_preview": "Candidate has 4+ years experience building [REDACTED_COMPANY] distributed systems..."
  }
  ```

#### `GET /v1/onboarding/session/{session_id}/status`
- **Response (`200 OK`)**:
  ```json
  {
    "session_id": "IV-2048",
    "interview_title": "Backend Systems Engineering",
    "consent_granted": true,
    "resume_parsed": true,
    "devices_verified": true,
    "interviewer_waiting": true,
    "can_enter_room": true
  }
  ```

---

### 2.5 Reports & Exports (`/v1/reports`)

#### `GET /v1/reports/candidate`
- **Response (`200 OK`)**: Array of candidate reports with session codes, overall scores (e.g. `88/100`), test pass rates (`6/8`), and completion dates.

#### `GET /v1/reports/{session_id}/download?format=pdf`
- **Response (`200 OK`)**: Binary PDF document (`Content-Type: application/pdf`, `Content-Disposition: attachment; filename="Intervia_Report_IV-2048.pdf"`).

---

## 3. Frontend Connection Plan (`frontend/src/api.ts`)

Once the backend endpoints are created, update `frontend/src/api.ts` to include these typed helper functions:

```typescript
export const api = {
  // Existing
  submitConsent: (payload: ConsentPayload) => post("/v1/onboarding/consent", payload),
  prepareInterview: (payload: FormData) => fetch(`${API_BASE}/v1/onboarding/prepare`, { method: "POST", body: payload }),
  runCode: (payload: CodeRunPayload) => post("/v1/workspace/run", payload),
  askSharedAi: (payload: AiChatPayload) => post("/v1/workspace/ai-chat", payload),
  syncOfflineChain: (payload: unknown) => post("/v1/reconnect/sync-chain", payload),
  registerChunk: (payload: unknown) => post("/v1/reconnect/chunk", payload),
  generateReport: (sessionId: string, candidateId: string) => post(`/v1/reports/${sessionId}/generate?candidate_id=${encodeURIComponent(candidateId)}`, {}),

  // New Connections
  auth: {
    login: (credentials: LoginCredentials) => post<AuthResponse>("/v1/auth/login", credentials),
    register: (details: RegisterDetails) => post<AuthResponse>("/v1/auth/register", details),
    me: () => get<UserProfile>("/v1/auth/me"),
    logout: () => post("/v1/auth/logout", {}),
  },
  interviews: {
    list: () => get<InterviewSummary[]>("/v1/interviews"),
    get: (id: string) => get<InterviewDetail>(`/v1/interviews/${id}`),
    create: (data: CreateInterviewDTO) => post<InterviewDetail>("/v1/interviews", data),
    update: (id: string, data: Partial<CreateInterviewDTO>) => patch<InterviewDetail>(`/v1/interviews/${id}`, data),
    verifyCode: (code: string) => post<InvitationVerifyResult>("/v1/invitations/verify", { security_code: code }),
  },
  onboarding: {
    uploadResume: (sessionId: string, file: File) => {
      const formData = new FormData();
      formData.append("session_id", sessionId);
      formData.append("file", file);
      return fetch(`${API_BASE}/v1/onboarding/resume`, { method: "POST", body: formData }).then(r => r.json());
    },
    approveResume: (sessionId: string) => post(`/v1/onboarding/resume/${sessionId}/approve`, {}),
    getSessionStatus: (sessionId: string) => get<SessionStatus>(`/v1/onboarding/session/${sessionId}/status`),
  },
  reports: {
    listCandidateReports: () => get<CandidateReportCard[]>("/v1/reports/candidate"),
    getCandidateReport: (sessionId: string) => get<DetailedReport>(`/v1/reports/candidate/${sessionId}`),
    getExecutiveSummary: (sessionId: string) => get<ExecutiveSummary>(`/v1/reports/${sessionId}/executive-summary`),
    downloadPdf: (sessionId: string) => `${API_BASE}/v1/reports/${sessionId}/download?format=pdf`,
  }
};
```

---

## 4. End-to-End Operational Checklist

To run the complete full-stack platform:
1. **Database**: Start PostgreSQL with `docker compose up -d postgres redis`.
2. **Migrations**: Apply Alembic migrations with `alembic upgrade head`.
3. **Backend Service**: Launch FastAPI server with `uvicorn intervia.main:app --host 127.0.0.1 --port 8000 --reload`.
4. **Frontend Service**: Launch Vite with `npm --prefix frontend run dev`.
5. **Verify**: Open `http://localhost:5173/` in your browser. All pages, flows, code execution, AI copilot, and reporting will operate synchronously with zero mock warnings.
