# Intervia Backend Implementation Requirements

This document provides the complete, authoritative specification of all backend changes required to make the Intervia platform 100% production-ready and fully integrated with the React frontend across all 21 screens.

---

## 0. Quick-Start File Inventory: Exact Files to Add & Update

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

## 1. Summary of Current State vs. Target State

### Current State
The backend currently runs on **FastAPI** (`backend/src/intervia/main.py`) with 4 stage domains:
- `stage_a_onboarding`: `POST /v1/onboarding/consent`, `POST /v1/onboarding/prepare`
- `stage_b_workspace`: `POST /v1/workspace/run`, `POST /v1/workspace/ai-chat`, `WebSocket /v1/workspace/ws/yjs/{session_id}`
- `stage_d_reconciliation`: `POST /v1/reconnect/sync-chain`, `POST /v1/reconnect/chunk`
- `stage_e_reporting`: `POST /v1/reports/{session_id}/generate`

### Target State
To power the full frontend without mocks or missing-endpoint errors, the backend requires:
1. **Two New Core Domains**:
   - `intervia.domains.auth`: User accounts, RBAC, JWT access/refresh sessions, password reset.
   - `intervia.domains.interviews`: Scheduled sessions, invitation verification codes, candidate assignments, lobby readiness.
2. **Upgraded Existing Domains**:
   - `stage_a_onboarding`: Resume file upload, Presidio PII preview, candidate approval, device check status.
   - `stage_b_workspace`: Session participants, snapshots, run history, authenticated WebSocket handshake.
   - `stage_d_reconciliation`: Reconnect status query, HMAC event chain integrity verification.
   - `stage_e_reporting`: Candidate report retrieval, interviewer executive summaries, PDF/DOCX binary downloads.
3. **Database Migrations** via Alembic for new tables.
4. **Router Registration** in `backend/src/intervia/main.py`.

---

## 2. Exact New Files to Create

The following files must be added to the repository:

### 2.1 Authentication Domain (`backend/src/intervia/domains/auth/`)

```text
backend/src/intervia/domains/auth/
├── __init__.py
├── models.py
├── schemas.py
├── repository.py
├── service.py
└── router.py
```

#### Detailed File Specifications:

1. **`backend/src/intervia/domains/auth/__init__.py`**
   - Exports `router`, `AuthService`, `User`, `Role`.

2. **`backend/src/intervia/domains/auth/models.py`**
   - `Role(str, Enum)`: `ADMIN = "admin"`, `INTERVIEWER = "interviewer"`, `CANDIDATE = "candidate"`.
   - `User(Base)`:
     - `id`: UUID (Primary Key, default uuid4).
     - `email`: String(255), unique, indexed.
     - `hashed_password`: String(255), not null.
     - `full_name`: String(255), not null.
     - `organization`: String(255), nullable (for admin/interviewers).
     - `role`: Enum(Role), default Role.CANDIDATE.
     - `is_active`: Boolean, default True.
     - `created_at`: DateTime(timezone=True), default utcnow.
     - `updated_at`: DateTime(timezone=True), onupdate utcnow.
   - `UserSession(Base)`:
     - `id`: UUID (Primary Key).
     - `user_id`: ForeignKey("users.id", ondelete="CASCADE").
     - `refresh_token_hash`: String(255), indexed.
     - `user_agent`: String(512), nullable.
     - `ip_address`: String(45), nullable.
     - `expires_at`: DateTime(timezone=True), not null.
     - `created_at`: DateTime(timezone=True), default utcnow.
   - `PasswordResetToken(Base)`:
     - `id`: UUID.
     - `user_id`: ForeignKey("users.id", ondelete="CASCADE").
     - `token_hash`: String(255), unique.
     - `expires_at`: DateTime(timezone=True).
     - `used`: Boolean, default False.

3. **`backend/src/intervia/domains/auth/schemas.py`**
   - `UserRegisterRequestDTO`: `email: EmailStr`, `password: str`, `full_name: str`, `organization: Optional[str] = None`, `role: Optional[str] = "candidate"`.
   - `UserLoginRequestDTO`: `email: EmailStr`, `password: str`.
   - `TokenResponseDTO`: `access_token: str`, `refresh_token: str`, `token_type: str = "bearer"`, `expires_in: int`.
   - `UserResponseDTO`: `id: UUID`, `email: str`, `full_name: str`, `organization: Optional[str]`, `role: str`, `is_active: bool`.
   - `RefreshTokenRequestDTO`: `refresh_token: str`.
   - `ForgotPasswordRequestDTO`: `email: EmailStr`.
   - `ResetPasswordRequestDTO`: `token: str`, `new_password: str`.

4. **`backend/src/intervia/domains/auth/repository.py`**
   - `AuthRepository`:
     - `get_by_email(email: str) -> Optional[User]`
     - `get_by_id(user_id: UUID) -> Optional[User]`
     - `create_user(user_data: dict) -> User`
     - `create_session(user_id: UUID, token_hash: str, expires_at: datetime) -> UserSession`
     - `get_session(refresh_token_hash: str) -> Optional[UserSession]`
     - `delete_session(session_id: UUID) -> None`
     - `delete_all_user_sessions(user_id: UUID) -> None`
     - `save_reset_token(user_id: UUID, token_hash: str, expires_at: datetime) -> PasswordResetToken`
     - `get_reset_token(token_hash: str) -> Optional[PasswordResetToken]`

5. **`backend/src/intervia/domains/auth/service.py`**
   - `AuthService`:
     - Password hashing via `bcrypt` / `passlib` with salt.
     - Token generation using `jwt_rbac.create_access_token` and `create_refresh_token`.
     - `register(dto: UserRegisterRequestDTO) -> (UserResponseDTO, TokenResponseDTO)`
     - `login(dto: UserLoginRequestDTO) -> (UserResponseDTO, TokenResponseDTO)`
     - `refresh(refresh_token: str) -> TokenResponseDTO`
     - `logout(refresh_token: str) -> None`
     - `request_password_reset(email: str) -> None`
     - `reset_password(token: str, new_password: str) -> None`

6. **`backend/src/intervia/domains/auth/router.py`**
   - `router = APIRouter(prefix="", tags=["Authentication"])`
   - Endpoints:
     - `POST /register` -> `201 Created`
     - `POST /login` -> `200 OK`
     - `POST /refresh` -> `200 OK`
     - `POST /logout` -> `200 OK`
     - `GET /me` -> `200 OK` (requires `get_current_user` dependency)
     - `POST /forgot-password` -> `200 OK`
     - `POST /reset-password` -> `200 OK`

---

### 2.2 Interviews and Invitations Domain (`backend/src/intervia/domains/interviews/`)

```text
backend/src/intervia/domains/interviews/
├── __init__.py
├── models.py
├── schemas.py
├── repository.py
├── service.py
└── router.py
```

#### Detailed File Specifications:

1. **`backend/src/intervia/domains/interviews/__init__.py`**
   - Exports `router`, `InterviewService`, `Interview`.

2. **`backend/src/intervia/domains/interviews/models.py`**
   - `InterviewStatus(str, Enum)`: `SCHEDULED = "scheduled"`, `READY = "ready"`, `IN_PROGRESS = "in_progress"`, `COMPLETED = "completed"`, `CANCELLED = "cancelled"`.
   - `Interview(Base)`:
     - `id`: UUID (Primary Key).
     - `code`: String(32), unique, indexed (e.g. `"IV-2048"`, `"IV-2051"`).
     - `title`: String(255), not null (e.g. `"Backend Systems Engineering"`).
     - `brief`: Text, nullable.
     - `language`: String(64), default `"python"` (e.g. `"python"`, `"typescript"`).
     - `duration_minutes`: Integer, default 45.
     - `status`: Enum(InterviewStatus), default InterviewStatus.SCHEDULED.
     - `creator_id`: ForeignKey("users.id").
     - `candidate_email`: String(255), not null.
     - `candidate_name`: String(255), nullable.
     - `candidate_user_id`: ForeignKey("users.id"), nullable.
     - `scheduled_at`: DateTime(timezone=True), not null.
     - `started_at`: DateTime(timezone=True), nullable.
     - `ended_at`: DateTime(timezone=True), nullable.
     - `timeline_json`: JSON, nullable (stores the 4-activity timeline blocks).
     - `created_at`: DateTime(timezone=True), default utcnow.
     - `updated_at`: DateTime(timezone=True), onupdate utcnow.
   - `Invitation(Base)`:
     - `id`: UUID (Primary Key).
     - `interview_id`: ForeignKey("interviews.id", ondelete="CASCADE").
     - `security_code`: String(64), unique, indexed.
     - `candidate_email`: String(255), not null.
     - `status`: String(32), default `"pending"` (`"pending"`, `"verified"`, `"accepted"`, `"expired"`).
     - `expires_at`: DateTime(timezone=True), not null.
     - `verified_at`: DateTime(timezone=True), nullable.

3. **`backend/src/intervia/domains/interviews/schemas.py`**
   - `InterviewCreateRequestDTO`:
     - `title: str`
     - `duration_minutes: int = 45`
     - `language: str = "python"`
     - `candidate_email: EmailStr`
     - `scheduled_at: datetime`
     - `brief: Optional[str] = None`
     - `timeline: Optional[List[dict]] = None`
   - `InterviewUpdateRequestDTO`:
     - `title: Optional[str]`
     - `duration_minutes: Optional[int]`
     - `language: Optional[str]`
     - `brief: Optional[str]`
     - `scheduled_at: Optional[datetime]`
     - `candidate_email: Optional[EmailStr]`
     - `timeline: Optional[List[dict]]`
   - `InterviewResponseDTO`:
     - `id: UUID`, `code: str`, `title: str`, `brief: Optional[str]`, `language: str`, `duration_minutes: int`, `status: str`, `candidate_email: str`, `candidate_name: Optional[str]`, `scheduled_at: datetime`, `created_at: datetime`, `timeline: Optional[List[dict]]`.
   - `InvitationVerifyRequestDTO`:
     - `security_code: str`
   - `InvitationVerifyResponseDTO`:
     - `valid: bool`, `interview_id: UUID`, `code: str`, `title: str`, `duration_minutes: int`, `language: str`, `candidate_email: str`, `status: str`.

4. **`backend/src/intervia/domains/interviews/repository.py`**
   - `InterviewRepository`:
     - `create(data: dict) -> Interview`
     - `get_by_id(interview_id: UUID) -> Optional[Interview]`
     - `get_by_code(code: str) -> Optional[Interview]`
     - `list_interviews(creator_id: Optional[UUID], status: Optional[str]) -> List[Interview]`
     - `list_candidate_interviews(email: str) -> List[Interview]`
     - `update(interview_id: UUID, data: dict) -> Interview`
     - `delete(interview_id: UUID) -> bool`
     - `verify_invitation_code(code: str) -> Optional[Interview]`

5. **`backend/src/intervia/domains/interviews/service.py`**
   - `InterviewService`:
     - Code generation logic (`IV-{random_4_digits}`).
     - Creates matching `Invitation` record upon interview creation.
     - Manages state transitions (`SCHEDULED` -> `READY` -> `IN_PROGRESS` -> `COMPLETED`).
     - Formats timeline default activities:
       1. Warmup & problem introduction (5 min)
       2. Core algorithmic implementation (25 min)
       3. Edge-case optimization & performance (10 min)
       4. Debrief & candidate questions (5 min)

6. **`backend/src/intervia/domains/interviews/router.py`**
   - `router = APIRouter(prefix="", tags=["Interviews"])`
   - Endpoints:
     - `POST /` -> Create interview (Interviewer/Admin)
     - `GET /` -> List upcoming and past interviews (Interviewer/Admin)
     - `GET /candidate/my-sessions` -> List candidate sessions (Candidate)
     - `GET /{interview_id}` -> Get interview detail
     - `PATCH /{interview_id}` -> Update scheduled interview details
     - `DELETE /{interview_id}` -> Cancel scheduled interview
     - `POST /invitations/verify` -> Verify invitation security code (Public/Candidate)

---

### 2.3 PDF Document Exporter (`backend/src/intervia/domains/stage_e_reporting/pdf_exporter.py`)

A pure-python PDF generator using ReportLab or HTML-to-PDF (`weasyprint` / `xhtml2pdf`):
- `generate_candidate_report_pdf(report_data: dict) -> bytes`: Generates the student feedback report with score summary, 6-parameter rubric, zero-PII disclaimer, and actionable learning goals.
- `generate_executive_summary_pdf(report_data: dict) -> bytes`: Generates the hiring-team executive summary with candidate token (`[NAME_1] / C-7K2`), code efficiency graph, AI assistance audit, and evaluator sign-off block.

---

### 2.4 Database Migration Files (`backend/alembic/versions/`)

1. **`backend/alembic/versions/20261029_0001_auth_users_and_sessions.py`**
   - Tables: `users`, `user_sessions`, `password_reset_tokens`.
2. **`backend/alembic/versions/20261029_0002_interviews_and_invitations.py`**
   - Tables: `interviews`, `invitations`, `interview_participants`.

---

## 3. Exact Existing Backend Files to Update

### 3.1 `backend/src/intervia/main.py`
Add the new domain routers to `DOMAIN_ROUTERS`:
```python
DOMAIN_ROUTERS = [
    ("intervia.domains.auth.router", "/v1/auth", ["Authentication"]),
    ("intervia.domains.interviews.router", "/v1/interviews", ["Interviews"]),
    ("intervia.domains.stage_a_onboarding.router", "/v1/onboarding", ["Stage A: Onboarding"]),
    ("intervia.domains.stage_b_workspace.router", "/v1/workspace", ["Stage B: Live Workspace"]),
    ("intervia.domains.stage_d_reconciliation.router", "/v1/reconnect", ["Stage D: Reconciliation"]),
    ("intervia.domains.stage_e_reporting.router", "/v1/reports", ["Stage E: Reporting"]),
]
```

### 3.2 `backend/src/intervia/core/config.py`
Add settings attributes:
- `JWT_SECRET_KEY: str = "secret-key-for-intervia-jwt-sessions"`
- `JWT_ALGORITHM: str = "HS256"`
- `ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24` (24 hours)
- `REFRESH_TOKEN_EXPIRE_DAYS: int = 30`
- `CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]`

### 3.3 `backend/src/intervia/core/security/jwt_rbac.py`
Update dependencies:
- Add `get_current_user(token: str = Depends(oauth2_scheme)) -> User`: Decodes JWT, validates subject UUID, verifies user in DB.
- Add `require_role(allowed_roles: List[str])`: Dependency factory checking `current_user.role in allowed_roles`.

### 3.4 `backend/src/intervia/domains/stage_a_onboarding/`
Update `schemas.py`, `service.py`, and `router.py`:
- `POST /v1/onboarding/resume`: Accept multipart PDF/DOCX file upload, store securely in S3/media store, pass through Presidio redactor.
- `GET /v1/onboarding/resume/{session_id}`: Return redacted resume text, extracted skills, and detected PII entities.
- `POST /v1/onboarding/resume/{session_id}/approve`: Record candidate explicit consent and approval of the redacted version.
- `POST /v1/onboarding/device-check`: Persist microphone and camera calibration status (`mic_passed: bool`, `camera_passed: bool`, `latency_ms: int`).
- `GET /v1/onboarding/session/{session_id}/status`: Return the lobby session state (`consent_granted`, `resume_parsed`, `devices_verified`, `interviewer_waiting`, `is_ready_to_enter`).

### 3.5 `backend/src/intervia/domains/stage_b_workspace/`
Update `schemas.py`, `service.py`, and `router.py`:
- `GET /v1/workspace/sessions/{session_id}/participants`: Return connected users (`interviewer_present: bool`, `candidate_present: bool`, `ping_ms: int`).
- `POST /v1/workspace/sessions/{session_id}/snapshots`: Save timestamped code snapshots to PostgreSQL for audit replay.
- `GET /v1/workspace/sessions/{session_id}/snapshots`: Retrieve historical snapshots for time-travel slider.
- `WebSocket /v1/workspace/ws/yjs/{session_id}`: Extract query parameter `?token=...`, authenticate via `jwt_rbac`, and ensure the connecting user is an authorized participant in `session_id`.

### 3.6 `backend/src/intervia/domains/stage_d_reconciliation/`
Update `router.py` and `service.py`:
- `GET /v1/reconnect/{session_id}/status`: Return buffer time remaining, buffered action count, and current sync phase (`SYNCING` | `RECONCILED` | `INTEGRITY_VERIFIED`).
- `GET /v1/reconnect/{session_id}/integrity`: Return HMAC-SHA256 event chain validation report (`chain_valid: bool`, `verified_blocks: int`, `tampering_detected: bool`).

### 3.7 `backend/src/intervia/domains/stage_e_reporting/`
Update `router.py` and `service.py`:
- `GET /v1/reports/candidate`: Return array of candidate reports for the logged-in candidate.
- `GET /v1/reports/candidate/{session_id}`: Return detailed student report with rubric scores, code diffs, and radar metrics.
- `GET /v1/reports/interviewer`: Return array of candidate reports for hiring teams.
- `GET /v1/reports/{session_id}/executive-summary`: Return executive summary with evaluator score, AI detection indicators, and hiring recommendation.
- `GET /v1/reports/{session_id}/download`: Return `StreamingResponse` with `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document` containing the styled report.

### 3.8 `backend/alembic/env.py`
Import the metadata from all domain models:
```python
from intervia.core.database import Base
from intervia.domains.auth.models import User, UserSession, PasswordResetToken
from intervia.domains.interviews.models import Interview, Invitation
from intervia.domains.stage_a_onboarding.models import CandidatePII, CandidateProfile
from intervia.domains.stage_e_reporting.models import SessionReport

target_metadata = Base.metadata
```

---

## 4. Verification and Execution Steps

When implementing the backend files:
1. Run `alembic upgrade head` to apply all migrations.
2. Start the FastAPI development server:
   ```bash
   uvicorn intervia.main:app --host 127.0.0.1 --port 8000 --reload
   ```
3. Verify Swagger documentation at `http://127.0.0.1:8000/docs` to ensure all routes in Authentication, Interviews, Onboarding, Workspace, Reconciliation, and Reporting appear correctly.
4. Run backend tests:
   ```bash
   pytest backend/tests
   ```
