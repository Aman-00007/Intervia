# Intervia — Complete System Architecture & Technical Specification

This document details the end-to-end architecture of **Intervia**, covering the 5-stage interview lifecycle, dual PostgreSQL database schema isolation, cryptographic protocols, Nebius Token Factory model routing, hardware media proctoring, and frontend-to-backend data contracts.

---

## 1. End-to-End System Architecture

Intervia is structured around strict physical identity isolation, real-time proctoring integrity, resilient offline buffering, and multi-tier LLM evaluation.

```mermaid
flowchart TB
    subgraph Client["Browser Client (React 18 PWA + TypeScript + Vite)"]
        UI_AUTH["Auth & Invites: Recruiter Sign-Up | Candidate Invitation Code Verification"]
        UI_A["Stage A Onboarding: DPDP Consent | SmartHire Voice Test | 2D CV Solitary Face Proctor | Resume Redaction"]
        UI_B["Stage B Workspace: Monaco Proctored Editor (Clipboard Locked) | WebRTC Rail (PiP) | Anti-Cheat Sandbox"]
        HMAC_C["Cryptographic Engine: Web Crypto HMAC-SHA256 Chain | BroadcastChannel('intervia_audit_channel')"]
        BB["Offline Black Box: Dexie.js (IndexedDB) + MediaRecorder 5s WebM Chunks + Local Code Buffer"]
        UI_E["Stage E Split Reports: Anonymous Candidate Skill Radar | Recruiter Executive Summary & WeasyPrint PDF"]
    end

    subgraph FastAPI["Trusted Backend Server (FastAPI on Uvicorn)"]
        Gate["API Gateway + Role-Based JWT RBAC (INTERVIEWER vs STUDENT)"]
        INV["Invitation Controller: Secure Code Generator (C-XXX) + Status Lifecycle"]
        PII["Microsoft Presidio PII Shield + Custom Regex Masking ([NAME_1], [COLLEGE_ID_1])"]
        AES["AES-256-GCM Envelope Encryption (Master Key in Vault)"]
        HMAC_V["Level-1 Instant HMAC-SHA256 Chain & Sequence Verifier (<50ms)"]
        YJS["Live Code Synchronization + 15s AST & Execution Snapshotter"]
    end

    subgraph Storage["Isolated Persistence Layer (PostgreSQL on Supabase)"]
        subgraph VaultSchema["Schema 1: identity_vault (Strict PII Isolation)"]
            DB_USERS[("identity_vault.users\n(Recruiters & Candidates, Bcrypt Passwords, Roles)")]
            DB_CAND[("identity_vault.candidates\n(Real Name, Email, Phone, College ID, GitHub)")]
            DB_CONSENT[("identity_vault.consent_records\n(DPDP Opt-Ins, Age 18+ Verification)")]
            DB_VAULT[("identity_vault.pii_token_vault\n(AES-256-GCM Encrypted Token Map)")]
            DB_SEEDS[("identity_vault.session_seeds\n(HMAC seed_0 Cryptographic Keys)")]
        end

        subgraph OpsSchema["Schema 2: interview_ops (Zero-PII Operational Data)"]
            DB_INV[("interview_ops.invitations\n(Invite Codes, Role Title, Status)")]
            DB_SESS[("interview_ops.sessions\n(Session ID, Scrubbed Resume, AI Questions)")]
            DB_LOGS[("interview_ops.hmac_chain_logs\n(Tamper-Evident Security & Proctor Logs)")]
            DB_CHUNKS[("interview_ops.media_chunks\n(5s WebM Chunk SHA-256 Hashes)")]
            DB_REPORTS[("interview_ops.reports\n(Split Candidate & Executive JSON Reports)")]
        end
    end

    subgraph Nebius["Nebius AI Token Factory (NVIDIA Nemotron 3 Models)"]
        TF_NANO["Nemotron 3 Nano (30B MoE):\nLive Screen Analysis & Low-Latency Copilot"]
        TF_SUPER["Nemotron 3 Super (120B Hybrid MoE):\nTailored Question Generation & Good Use of AI Grader"]
        TF_ULTRA["Nemotron 3 Ultra (550B Hybrid MoE):\nDeep Technical Reasoning & Loopholes/Prosperity Report"]
    end

    UI_AUTH -->|Register & Login| Gate
    Gate -->|Manage Invites| INV --> DB_INV
    UI_A -->|DPDP Consent & Real Identity| Gate --> DB_CONSENT & DB_CAND
    UI_A -->|Resume PDF / GitHub| PII
    PII -->|Encrypted PII Map| AES --> DB_VAULT
    PII -->|Scrubbed Resume Text| TF_SUPER --> DB_SESS

    UI_B <-->|Live Code & Cursor| YJS
    UI_B -->|Screen Analysis Prompt| TF_NANO
    UI_B -->|Security Violations: Tab Switch / Clipboard| HMAC_C
    HMAC_C -->|Cross-Tab Real-time Broadcast| UI_B
    HMAC_C -->|Offline Drop Buffer| BB

    BB -->|Stage D Reconnect: HMAC Log Chain| HMAC_V --> DB_LOGS
    DB_SESS & DB_LOGS -->|Stage E Evaluation| TF_ULTRA --> DB_REPORTS
    DB_CAND -.->|Step 7 Controlled Identity Join (Post-AI)| UI_E
```

---

## 2. Physical Database Separation ("The Golden Rule")

Intervia enforces complete zero-PII architectural boundaries. Real identity data can **never** be accessed by machine learning models or stored in operational session logs.

The system initializes two dedicated SQLAlchemy asynchronous session factories (`VaultSession` and `OpsSession`) targeting two physically distinct PostgreSQL schemas within Supabase:

### Schema 1: `identity_vault` (Accessed ONLY via `get_vault_db`)
1. **`identity_vault.users`**:
   - `id (UUID, PK)`: Unique internal user identifier.
   - `email (VARCHAR, Unique)`: Authenticated user email.
   - `hashed_password (VARCHAR)`: Bcrypt hashed password (with 72-byte safe boundary truncation).
   - `full_name (VARCHAR)`: User's legal full name.
   - `role (SQLEnum: identity_vault.userrole)`: Role-based permissions (`INTERVIEWER` vs `STUDENT`).
   - `organization_name (VARCHAR, Nullable)`: Associated company/organization for recruiters.
   - `terms_accepted (BOOLEAN)`: Legal terms acceptance record.
   - `created_at`, `updated_at (TIMESTAMPTZ)`.

2. **`identity_vault.candidates`**:
   - `user_id (UUID, PK, FK -> identity_vault.users.id)`: One-to-one mapping to authenticated user.
   - `real_full_name`, `real_email`, `real_phone`: Raw candidate contact identity.
   - `college_id`, `github_username`: Institutional and code repository identifiers.
   - `created_at (TIMESTAMPTZ)`.

3. **`identity_vault.consent_records`**:
   - `consent_id (UUID, PK)`.
   - `user_id (UUID, FK -> identity_vault.candidates.user_id)`.
   - `session_id (UUID, Indexed)`: Targeted interview session.
   - `is_above_18_verified (BOOLEAN)`: Explicit legal adult declaration.
   - `purposes_accepted (JSONB)`: Granular consent flags (`camera_audio`, `ai_processing`, `data_retention`).
   - `consented_at (TIMESTAMPTZ)`.

4. **`identity_vault.pii_token_vault`**:
   - `session_id (UUID, PK)`.
   - `user_id (UUID, FK)`.
   - `aes_encrypted_map (BYTEA)`: AES-256-GCM ciphertext containing token-to-PII dictionary (`{"[NAME_1]": "...", "[COLLEGE_ID_1]": "..."}`).
   - `nonce (BYTEA)`: 12-byte initialization vector.

5. **`identity_vault.session_seeds`**:
   - `session_id (UUID, PK)`.
   - `seed_0 (VARCHAR)`: 256-bit cryptographically secure seed for HMAC-SHA256 chaining.
   - `created_at (TIMESTAMPTZ)`.

### Schema 2: `interview_ops` (Accessed via `get_ops_db`)
1. **`interview_ops.invitations`**:
   - `id (UUID, PK)`.
   - `code (VARCHAR(8), Unique, Indexed)`: Short, human-readable candidate invitation code (e.g., `C-PGY`).
   - `interviewer_id (UUID, Indexed)`: Identifier of the issuing recruiter.
   - `candidate_email (VARCHAR)`: Recipient invitation target.
   - `role_title (VARCHAR)`: Job position (e.g., "Senior Distributed Systems Engineer").
   - `duration_minutes (INTEGER)`: Scheduled duration (default: 45 min).
   - `scheduled_at (TIMESTAMPTZ)`: Scheduled timestamp.
   - `status (SQLEnum: interview_ops.invitationstatus)`: `PENDING`, `DELIVERED`, `ACCEPTED`, `COMPLETED`, `CANCELLED`.
   - `created_at (TIMESTAMPTZ)`.

2. **`interview_ops.sessions`**:
   - `session_id (UUID, PK)`.
   - `status (VARCHAR)`: `ACTIVE`, `RECONNECTING`, `EVALUATING`, `COMPLETED`.
   - `sanitized_resume_text (TEXT)`: Presidio-scrubbed resume text.
   - `generated_questions_json (JSONB)`: Nemotron 3 Super tailored question rubric.
   - `started_at`, `ended_at (TIMESTAMPTZ)`.

3. **`interview_ops.hmac_chain_logs`**:
   - `log_id (UUID, PK)`.
   - `session_id (UUID, FK)`.
   - `seq_no (INTEGER)`: Monotonically increasing sequence number.
   - `event_type (VARCHAR)`: `TAB_SWITCH`, `FULLSCREEN_EXIT`, `CLIPBOARD_RESTRICTED`, `FACE_COUNT_ALERT`, `MEDIA_CHUNK_HASH`.
   - `payload_json (JSONB)`: Cryptographically verified event metadata.
   - `hmac_hash (VARCHAR)`: Client-computed HMAC-SHA256 signature.
   - `is_verified (BOOLEAN)`: Server validation status.

4. **`interview_ops.media_chunks`**:
   - `chunk_id (UUID, PK)`.
   - `session_id (UUID, FK)`.
   - `seq_no (INTEGER)`.
   - `sha256_hash (VARCHAR(64))`.
   - `s3_object_key (VARCHAR)`.
   - `expires_at (TIMESTAMPTZ)`: Automated 30-day retention purge target.

5. **`interview_ops.reports`**:
   - `report_id (UUID, PK)`.
   - `session_id (UUID, FK)`.
   - `student_report_json (JSONB)`: Loopholes & Prosperity feedback + Skill Radar metrics (Zero PII).
   - `executive_summary_json (JSONB)`: Recruiter technical and behavioral evaluation.
   - `created_at (TIMESTAMPTZ)`.

---

## 3. End-to-End Five-Stage Engineering Lifecycle

### Stage 0: Authentication & Secure Invitations
- **Recruiter Registration & Login**: Recruiters sign up with full name, organization name, work email, and password. Fast JWT-based RBAC generates access tokens signed with `HS256`.
- **Invitation Generation**: Recruiters create interview invitations with role titles and dates. The backend generates a cryptographically random, collision-resistant code (`C-XXX`).
- **Code Verification**: Candidates verify their code via `POST /v1/invitations/verify-code?code=C-XXX`, retrieving interview metadata without exposing recruiter credentials.

### Stage A: DPDP Consent, Real WebRTC & Device Calibration
- **Granular Consent Checkboxes**: 4 explicit checkboxes (`camera_audio`, `ai_processing`, `data_retention`, `local_buffer`) initialized to unchecked states. Candidates must manually review and consent.
- **SmartHire Voice Calibration**:
  - Leverages Web Audio API `AudioContext` and `AnalyserNode` with automatic resume on interaction.
  - Formant tracking across vocal frequencies (~300 Hz – 4500 Hz).
  - Web Speech Recognition evaluates candidate vocal cadence against the verification phrase:
    `"I am ready to participate in this technical interview and my audio is clear."`
  - Spoken tokens dynamically animate from crisp white to glowing emerald green (`.is-word-green`) in real time.
- **Computer Vision 2D YCbCr Solitary Face Proctor**:
  - Analyzes video frames on a 160×120 canvas to enforce a strict 1-face solitary environment.
  - **Curtain/Background False-Positive Suppression**: Calculates 2D cluster aspect ratios, fill ratios ($\ge 0.50$), and luminance variance ($\sigma_Y^2 \ge 250$). Background fabrics and curtain folds (which lack facial luminance contrast) are rejected.
  - **Debounced Threat Detection**: Secondary faces must persist across at least 4 consecutive intervals (2 seconds) before triggering a `Multiple People Detected (2 Faces)` alert.
  - Alerts when the candidate leaves the frame or looks away (`faceCount === 0`) with an automatic centering reticle.
- **Hardware Device Prioritization**:
  - Automatically identifies and filters out virtual cameras (e.g. Windows Phone Link, OBS, virtual cams) that produce blank streams.
  - Defaults to physical built-in Laptop Webcams and USB Cameras (`findBestCamera`) and Laptop / Bluetooth Microphones (`findBestMic`).
- **PII Scrubbing & Token Vault**:
  - Candidates upload their resume (PDF). `PyMuPDF` extracts text, and `Microsoft Presidio` scrubs all PII.
  - The lookup dictionary is encrypted with `AES-256-GCM` and stored in `identity_vault.pii_token_vault`.
  - The sanitized resume is sent to **NVIDIA Nemotron 3 Super**, generating 5 customized technical questions.

### Stage B: Live Proctored Workspace & Sandbox Security
- **Role-Based Device Controls**:
  - **Candidate Controls**: Camera and microphone are strictly locked ON (`MIC LOCKED ON`, `CAM LOCKED ON`). Candidates cannot mute audio or disable video during proctoring.
  - **Interviewer Controls**: Full flexibility to mute their microphone or turn off their camera (displaying a clean "Cam Paused" state).
- **Monaco Proctored Editor & Clipboard Lockdown**:
  - Blocks `copy`, `paste`, and `cut` actions at the capture phase, DOM internal `<textarea class="inputarea">` level, and Monaco Command palette level.
  - Attempts trigger an instant warning banner: `🚫 Pasting external code is disabled in this proctored interview`.
  - Logs `CLIPBOARD_RESTRICTED` directly into the HMAC audit log.
- **Anti-Cheat Sandbox (HackerRank Style)**:
  - Tracks window blurs, tab switching (`visibilitychange`), and fullscreen exits.
  - **3-Violation Strict Cap**: Increments up to exactly 3 violations. Upon the 3rd violation, `isDisqualified = true` triggers, stopping further counts and opening a session termination modal.
  - **Clean Fullscreen Exit**: Utilizes a 15-second suppression window (`suppressUntilRef`) to prevent infinite recursion traps when exiting fullscreen.
- **Cross-Tab Real-Time HMAC Synchronization**:
  - Uses `BroadcastChannel("intervia_audit_channel")` to synchronize candidate security events across browser tabs.
  - The recruiter's live Audit Chain drawer updates in real time whenever the candidate switches tabs or attempts a clipboard paste.
- **Shared AI Screen Copilot**:
  - Interviewer and candidate can trigger AI code review and algorithm observation powered by **NVIDIA Nemotron 3 Nano**.

### Stage C: Offline Black Box Buffer
- If the candidate's network disconnects, the browser enters offline black-box mode:
  - Keystrokes are retained in `Dexie.js` (IndexedDB) via Yjs CRDTs.
  - `MediaRecorder` buffers low-bitrate WebM video and Opus audio in 5-second chunks.
  - Every event is appended to the HMAC-SHA256 cryptographic chain using the initial `seed_0`.

### Stage D: Reconciliation Engine
- Upon network restoration, the browser transmits the offline HMAC log chain to `POST /v1/reconnect/sync-chain`.
- **Level 1 Verification (<50ms)**: Backend recomputes the HMAC chain using `hmac.compare_digest()`. If entries were deleted or modified in DevTools, a tamper alert is raised.
- **Level 2 Media Integrity**: Uploaded `.webm` chunks are verified against the chunk SHA-256 hashes recorded in the HMAC chain.

### Stage E: Split Reporting & Controlled Identity Join
- **Candidate Report**: An anonymous, growth-oriented *"Loopholes & Prosperity"* report containing a Skill Radar chart, algorithmic complexity breakdown, and zero PII.
- **Controlled Identity Join (Step 7)**: Exclusively for the recruiter's Executive Report, the backend queries `identity_vault` using `session_id -> user_id` to attach the candidate's real name and contact details.
- **Document Export**: High-fidelity PDF generation via `WeasyPrint` and DOCX generation via `python-docx`.

---

## 4. Cryptographic & Security Protocols

### A. HMAC-SHA256 Tamper-Evident Hash Chain
Every security log entry is linked to its predecessor using HMAC-SHA256:

$$h_0 = \text{seed}_0$$

$$h_i = \text{HMAC-SHA256}\left(\text{seed}_0,\; h_{i-1} \parallel \text{seq}_i \parallel \text{timestamp}_i \parallel \text{canonical\_json}(\text{payload}_i)\right)$$

Any modification to sequence order, event contents, or timestamps invalidates all downstream hashes, providing mathematical proof of log integrity.

### B. AES-256-GCM Envelope Encryption
- Master Key: 256-bit key stored securely in backend configuration (`AES_MASTER_KEY_HEX`).
- Nonce: Unique 12-byte cryptographically random IV generated per session.
- Authentication Tag: 16-byte GCM authentication tag preventing ciphertext tampering.

---

## 5. Multi-Tier NVIDIA Nemotron Model Routing

Intervia routes AI workloads across specialized **NVIDIA Nemotron 3** models hosted on **Nebius Token Factory**:

| Tier | Model Architecture | Assigned Functions | Latency Target |
| :--- | :--- | :--- | :--- |
| **Fast Tier** | `nvidia/Nemotron-3-Nano-30B-A3B` | Live Screen & Code Analysis, Shared Copilot, Output Leak Scan | < 1.8 seconds |
| **Balanced Tier** | `nvidia/Nemotron-3-Super-120B-A12B` | Resume Parsing, Tailored Question Rubric Generation, "Good Use of AI" Grader | < 4.0 seconds |
| **Deep Reasoning** | `nvidia/Nemotron-3-Ultra-550B-A55B` | Post-Interview Synthesis, Loopholes & Prosperity Report, Executive Evaluation | Async Background |

---

## 6. Complete API Endpoint Specification

### Authentication (`/v1/auth`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/auth/register/recruiter` | Public | Register recruiter (`full_name`, `company_name`, `email`, `password`). Returns `201`. |
| `POST` | `/v1/auth/register/candidate` | Public | Register candidate (`full_name`, `email`, `password`). Returns `201`. |
| `POST` | `/v1/auth/login` | Public | Login with email and password. Returns JWT access token. |
| `GET` | `/v1/auth/me` | Bearer | Retrieve authenticated user profile and assigned role (`INTERVIEWER` / `STUDENT`). |

### Invitations (`/v1/invitations`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/invitations/create` | Interviewer | Generate candidate invitation with unique code (`C-XXX`). |
| `POST` | `/v1/invitations/verify-code` | Public | Verify invitation code and fetch interview details. |
| `GET` | `/v1/invitations/my-invitations` | Interviewer | List all invitations created by the authenticated recruiter. |

### Stage A: Onboarding (`/v1/onboarding`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/onboarding/consent` | Candidate | Store DPDP consent records and candidate identity in `identity_vault`. |
| `POST` | `/v1/onboarding/prepare` | Candidate | Upload resume PDF, execute Presidio redaction, encrypt PII map, generate questions. |

### Stage B: Workspace (`/v1/workspace`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/workspace/screen-analysis` | Candidate / Interviewer | Execute NVIDIA Nemotron live code observation. |
| `POST` | `/v1/workspace/run` | Candidate | Execute code against test suite in sandboxed runner. |

### Stage D: Reconciliation (`/v1/reconnect`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/reconnect/sync-chain` | Candidate | Verify offline HMAC-SHA256 log chain (<50ms check). |
| `PATCH` | `/v1/reconnect/upload-chunk` | Candidate | Verify and upload 5-second WebM media chunk. |

### Stage E: Reporting (`/v1/reports`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/reports/generate/{session_id}` | Interviewer | Generate dual split reports via Nemotron 3 Ultra. |
| `GET` | `/v1/reports/{session_id}/student` | Candidate | Fetch anonymous Loopholes & Prosperity report + Skill Radar. |
| `GET` | `/v1/reports/{session_id}/executive` | Interviewer | Fetch Executive Report with real candidate identity. |
| `GET` | `/v1/reports/{session_id}/pdf` | Interviewer | Download compiled WeasyPrint PDF report. |
| `DELETE` | `/v1/reports/dpdp/erase/{user_id}` | Candidate | Execute DPDP Right-to-Erasure: permanently purge all media, logs, and identity. |

---

## 7. Security & Threat Mitigation Summary

| Threat Vector | Mitigation Mechanism |
| :--- | :--- |
| **External Code Pasting** | Monaco DOM capturing listener blocks clipboard events (`paste`, `copy`, `cut`) and reports `CLIPBOARD_RESTRICTED` to the HMAC audit chain. |
| **Tab-Switching / Multi-Monitor Cheating** | Fullscreen enforcement + Page Visibility API with strict 3-violation limit and real-time cross-tab broadcast to the interviewer. |
| **Secondary Person in Room** | 2D YCbCr computer vision cluster analysis with texture/luminance variance filters to reject background curtains and flag multiple faces. |
| **Candidate Face Absent** | Continuous face presence detection triggers an on-screen warning reticle and halts progress if the candidate leaves the frame. |
| **Offline DevTools Tampering** | Cryptographic HMAC-SHA256 log chaining with Level 1 instant hash comparison and sequence gap detection. |
| **LLM PII Ingestion** | Microsoft Presidio scrubbing + AES-256-GCM envelope encryption ensures raw names, emails, and phone numbers never reach LLM prompts. |

---

## 8. Repository & Filesystem Structure

```text
Intervia/
├── ARCHITECTURE.md                     # End-to-end technical specification, schema bounds & threat models
├── README.md                           # Project documentation, quickstart & architecture guide
├── LICENSE                             # Open-source license specification
├── CODEOWNERS                          # Domain and directory engineering ownership boundaries
├── test_security_hmac.js               # Node.js standalone HMAC-SHA256 chain integrity verification script
├── scripts/
│   └── test_security_hmac.js           # Automated cryptographic audit test script
├── backend/                            # FastAPI Backend (Clean Architecture / Bounded Contexts)
│   ├── alembic/                        # Multi-schema migrations (identity_vault & interview_ops)
│   │   ├── env.py                      # Multi-database migration runner
│   │   └── versions/                   # Migration revision scripts (001_vault, 002_ops)
│   ├── src/intervia/
│   │   ├── main.py                     # ASGI application entrypoint & dynamic router loader
│   │   ├── core/
│   │   │   ├── config.py               # Pydantic v2 BaseSettings configuration (.env loader)
│   │   │   ├── database.py             # Dual AsyncSession engines (VaultSession vs OpsSession)
│   │   │   ├── middleware.py           # Correlation ID & security headers middleware
│   │   │   ├── logging.py              # Structured JSON logging with Structlog
│   │   │   ├── exceptions.py           # Custom exception definitions & HTTP handlers
│   │   │   └── security/
│   │   │       ├── jwt_rbac.py         # JWT generation, validation & role authorization (INTERVIEWER / STUDENT)
│   │   │       ├── aes_gcm.py          # AES-256-GCM envelope encryption & decryption
│   │   │       └── hmac_chain.py       # Constant-time HMAC-SHA256 audit log verifier (<50ms)
│   │   ├── domains/
│   │   │   ├── auth/                   # Recruiter/Candidate authentication bounded context
│   │   │   │   ├── models.py           # identity_vault.users (Bcrypt password, UserRole)
│   │   │   │   ├── schemas.py          # RegisterRecruiterRequest, RegisterCandidateRequest, TokenResponse
│   │   │   │   ├── repository.py       # User persistence & credential lookup
│   │   │   │   ├── service.py          # Native bcrypt hash & verify (72-byte safe)
│   │   │   │   └── router.py           # POST /v1/auth/register/*, POST /v1/auth/login, GET /v1/auth/me
│   │   │   ├── invitations/            # Candidate invitation lifecycle context
│   │   │   │   ├── models.py           # interview_ops.invitations (Invite code C-XXX, status enum)
│   │   │   │   ├── schemas.py          # CreateInvitationRequest, InvitationResponse, VerifyCodeResponse
│   │   │   │   ├── repository.py       # Invitation CRUD queries
│   │   │   │   ├── service.py          # Collision-resistant C-XXX code generator
│   │   │   │   └── router.py           # POST /v1/invitations/create, POST /v1/invitations/verify-code
│   │   │   ├── dashboard/              # Recruiter management & analytics
│   │   │   │   ├── schemas.py          # DashboardStatsResponse, InterviewListItem
│   │   │   │   ├── service.py          # Metric aggregation & active session counting
│   │   │   │   └── router.py           # GET /v1/dashboard/stats, GET /v1/dashboard/interviews
│   │   │   ├── stage_a_onboarding/     # DPDP consent & resume processing context
│   │   │   │   ├── models.py           # identity_vault.candidates, consent_records, pii_token_vault
│   │   │   │   ├── schemas.py          # OnboardingRequest, OnboardingResponse
│   │   │   │   ├── parser_service.py   # PyMuPDF PDF parser & GitHub commit extractor
│   │   │   │   ├── repository.py       # Identity & DPDP legal consent persistence
│   │   │   │   ├── service.py          # PII scrubbing orchestration & Nemotron question pipeline
│   │   │   │   └── router.py           # POST /v1/onboarding/consent, POST /v1/onboarding/prepare
│   │   │   ├── stage_b_workspace/      # Live collaborative IDE & proctoring context
│   │   │   │   ├── models.py           # interview_ops.code_submissions, shared_ai_chats
│   │   │   │   ├── schemas.py          # RunCodeRequest, ScreenAnalysisRequest, ScreenAnalysisResponse
│   │   │   │   ├── repository.py       # Code execution & chat log persistence
│   │   │   │   ├── service.py          # Judge0 submission dispatcher & Nemotron screen observer
│   │   │   │   └── router.py           # POST /v1/workspace/run, POST /v1/workspace/screen-analysis
│   │   │   ├── stage_c_offline/        # Black box chunk metadata & offline persistence
│   │   │   │   ├── models.py           # interview_ops.media_chunks
│   │   │   │   ├── schemas.py          # OfflineChunkMetaRequest, ChunkAckResponse
│   │   │   │   ├── repository.py       # Chunk record insertion & sequence validation
│   │   │   │   └── router.py           # POST /v1/offline/register-chunk
│   │   │   ├── stage_d_reconciliation/ # Level-1 & Level-2 reconnection audit context
│   │   │   │   ├── models.py           # interview_ops.reconnect_audits, hmac_chain_logs
│   │   │   │   ├── schemas.py          # SyncChainRequest, ReconnectAuditResponse
│   │   │   │   ├── risk_scoring.py     # Forensic rule-based and behavioral risk evaluator
│   │   │   │   ├── repository.py       # Audit log & delta insertion
│   │   │   │   ├── service.py          # Level-1 HMAC chain recomputation & S3 chunk verifier
│   │   │   │   └── router.py           # POST /v1/reconnect/sync-chain, PATCH /v1/reconnect/upload-chunk
│   │   │   └── stage_e_reporting/      # Split report generation & identity join context
│   │   │       ├── models.py           # interview_ops.reports
│   │   │       ├── schemas.py          # StudentReportResponse, ExecutiveSummaryResponse
│   │   │       ├── doc_exporter.py     # WeasyPrint PDF & python-docx document compiler
│   │   │       ├── repository.py       # Report persistence & Step 7 controlled identity join
│   │   │       ├── service.py          # Nemotron 3 Ultra evaluation pipeline & leak scanner
│   │   │       └── router.py           # POST /v1/reports/generate/*, GET /v1/reports/*, DELETE /v1/reports/dpdp/erase/*
│   │   ├── infrastructure/             # External service adapters & clients
│   │   │   ├── nebius/                 # Nebius Token Factory AI integration
│   │   │   │   ├── client.py           # AsyncOpenAI client targeting Token Factory endpoints
│   │   │   │   ├── model_router.py     # 3-tier routing: Nano (30B), Super (120B), Ultra (550B)
│   │   │   │   ├── job_trigger.py      # Nebius Serverless Job invocation client
│   │   │   │   └── prompts/            # Structured system prompts & Pydantic output schemas
│   │   │   ├── privacy/                # Zero-PII sanitization & leak detection
│   │   │   │   ├── presidio_engine.py  # Microsoft Presidio Analyzer & Anonymizer engine
│   │   │   │   └── leak_scanner.py     # Post-LLM regex & token map leak scanner
│   │   │   ├── sandbox_exec/           # Code execution & live sync infrastructure
│   │   │   │   ├── judge0_client.py    # Sandboxed execution client (Judge0 / Piston)
│   │   │   │   └── yjs_crdt_hub.py     # pycrdt-websocket collaborative room manager
│   │   │   ├── storage/                # Media persistence
│   │   │   │   └── s3_media_store.py   # S3 / MinIO asynchronous chunk uploader (aioboto3)
│   │   │   ├── media_forensics/        # Server-side offline media verification
│   │   │   │   ├── face_verifier.py    # Server-side MediaPipe face presence validator
│   │   │   │   └── voice_verifier.py   # WebRTC-VAD multi-speaker audio validator
│   │   │   └── redis_pubsub.py         # Redis client for ephemeral seeds & live WS alerts
│   │   └── workers/                    # Background job CLI entrypoints
│   │       ├── job_compile_reports.py  # Asynchronous Nemotron Ultra report compilation
│   │       ├── job_level2_recon.py     # Asynchronous media chunk verification & time-lapse
│   │       └── job_dpdp_retention.py   # Automated 30-day media and 90-day code purge cron
│   ├── tests/                          # Automated backend test suite
│   │   ├── conftest.py                 # Async test client & database fixtures
│   │   ├── integration/                # Bounded context integration test cases
│   │   └── e2e_cli_simulator.py       # Candidate & recruiter interview session simulator
│   ├── test_auth_and_system.py         # End-to-end 8-point system test suite
│   ├── requirements.txt                # Production Python dependencies
│   ├── pyproject.toml                  # Project packaging & tooling configuration
│   ├── alembic.ini                     # Alembic migration configuration
│   └── .env.example                    # Template environment variables
├── frontend/                           # React 18 + TypeScript + Vite Single Page Application
│   ├── src/
│   │   ├── main.tsx                    # React DOM entrypoint & root provider mounting
│   │   ├── App.tsx                     # Top-level screen router & AppShell layout coordinator
│   │   ├── styles.css                  # Global design system & theme stylesheet (14,000+ lines)
│   │   ├── core/                       # Core routing, networking & state utilities
│   │   │   ├── api.ts                  # Centralized typed HTTP client with auth token headers
│   │   │   ├── router.ts               # Custom window pushState router with popstate dispatch
│   │   │   ├── desktop.ts              # Desktop environment detection & guard
│   │   │   ├── interviewSettings.ts    # Session and device configuration persistence
│   │   │   ├── WebSocketProvider.tsx   # Live workspace real-time WebSocket provider
│   │   │   └── models/
│   │   │       └── screens.ts          # Screen type definitions & path-to-screen route table
│   │   ├── features/                   # Feature-based modular UI architecture
│   │   │   ├── auth/
│   │   │   │   └── AuthView.tsx        # Unified Recruiter & Candidate login / registration views
│   │   │   ├── dashboard/
│   │   │   │   ├── DashboardView.tsx   # Recruiter Dashboard, metrics overview & candidate list
│   │   │   │   └── ManageInterview.tsx # Interview configuration & invitation management
│   │   │   ├── onboarding/
│   │   │   │   ├── ConsentScreen.tsx   # DPDP 4-point consent, SmartHire voice test, 2D CV face proctor
│   │   │   │   ├── ResumeUpload.tsx    # Resume PDF file uploader & PII redaction preview
│   │   │   │   ├── LobbyScreen.tsx     # Staging lobby, mirrored hardware webcam, locked candidate controls
│   │   │   │   ├── QuestionViewer.tsx  # Dynamic interview questions preview
│   │   │   │   └── OnboardingView.tsx  # Stage A screen coordinator
│   │   │   ├── workspace/
│   │   │   │   ├── WorkspaceView.tsx   # 3-column live workspace, WebRTC rail with PiP, face proctor
│   │   │   │   ├── MonacoEditor.tsx    # Proctored code editor with DOM capture clipboard lockdown
│   │   │   │   ├── TestResultsConsole.tsx # Interactive test case execution results console
│   │   │   │   ├── SharedAIPanel.tsx   # Candidate & Interviewer transparent AI Copilot drawer
│   │   │   │   ├── WebRTCGrid.tsx      # Video stream participant layout grid
│   │   │   │   ├── WorkspaceLayout.tsx # Flexible layout wrappers & resizable panels
│   │   │   │   └── hooks/
│   │   │   │       ├── useAntiCheatSandbox.ts # Fullscreen enforcement, tab-switch tracker (3-violation cap)
│   │   │   │       └── useYjsSync.ts   # Live Monaco CRDT code synchronization hook
│   │   │   ├── offline/
│   │   │   │   ├── HmacChainLogger.ts  # Web Crypto HMAC-SHA256 log chain & BroadcastChannel sync
│   │   │   │   ├── MediaRecorderSync.ts# 5-second WebM chunk recorder & IndexedDB flusher
│   │   │   │   ├── ChunkUploader.ts    # Reconnection resumable media chunk upload worker
│   │   │   │   └── ReconnectAlert.tsx  # Offline notification banner & reconnection status pill
│   │   │   ├── reports/
│   │   │   │   ├── ReportsView.tsx     # Split report views: Candidate vs Recruiter executive
│   │   │   │   ├── StudentReport.tsx   # Anonymous candidate "Loopholes & Prosperity" report & Skill Radar
│   │   │   │   └── InterviewerSummary.tsx # Technical rubric breakdown, audit timeline & PDF export
│   │   │   ├── landing/
│   │   │   │   └── LandingView.tsx     # Product landing page, feature showcase & dark/light theme
│   │   │   ├── autonomous/
│   │   │   │   └── VoiceChatbotUI.tsx  # Autonomous voice conversation agent interface
│   │   │   └── test/
│   │   │       └── TestGallery.tsx     # Component testing & UI verification gallery
│   │   └── shared/                     # Reusable design primitives
│   │       ├── layout/
│   │       │   └── AppShell.tsx        # Top navigation bar, breadcrumb header, theme toggle
│   │       └── components/
│   │           └── UI.tsx              # Page, Panel, Button, Modal, DataTable, Pill UI primitives
│   ├── package.json                    # Node dependencies & Vite scripts
│   ├── tsconfig.json                   # TypeScript configuration
│   └── vite.config.ts                  # Vite build tool configuration
```
