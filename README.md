# Intervia — Privacy-First, Offline-Resilient Technical Interview Platform

<div align="center">
  <b>AI-Powered Technical Interview Copilot, Cryptographic Offline Black Box & Split Feedback Engine</b><br/>
  Built with <b>React 18 + TypeScript + Vite</b> • <b>FastAPI + SQLAlchemy 2.0</b> • <b>Supabase PostgreSQL</b> • <b>NVIDIA Nemotron 3 on Nebius Token Factory</b>
</div>

---

## Overview

**Intervia** addresses the three critical vulnerabilities in modern technical recruiting:
1. **Unregulated Privacy Leaks:** Resumes, contact information, and voice transcripts containing Personally Identifiable Information (PII) are routinely exposed to cloud LLMs.
2. **Fragile Network Disconnects:** A temporary Wi-Fi outage during an online interview disconnects WebRTC video and code sessions, leaving interviewers blind to candidate activity during the drop.
3. **One-Sided, Opaque Feedback:** Candidates rarely receive actionable architectural feedback, while recruiters spend hours manually writing post-interview summaries.

**Intervia** introduces a **Strict Dual-Schema Privacy Vault (DPDP-Compliant)**, a **5–10 Minute Offline Browser Black Box** secured by an **HMAC-SHA256 tamper-evident log chain**, real-time **hardware proctoring** (voice calibration, solitary face detection, clipboard lockdown, and tab-switch caps), and a **3-Tier NVIDIA Nemotron 3 routing engine** that compiles instant split reports for candidates and recruiters.

---

## Core Pillars & Key Features

### 1. The Golden Rule of Identity Isolation (DPDP-Compliant)
- **Zero PII to AI:** Microsoft Presidio + custom regex scrubbers replace sensitive tokens with deterministic pseudonyms (`[NAME_1]`, `[EMAIL_1]`, `[PHONE_1]`, `[COLLEGE_ID_1]`, `[GITHUB_1]`).
- **Physical PostgreSQL Schema Isolation:** The database is partitioned into two physically separate schemas:
  - `identity_vault`: Contains real names, emails, phone numbers, bcrypt password hashes, and AES-256-GCM encrypted token maps.
  - `interview_ops`: Contains strictly operational logs, session IDs, scrubbed transcripts, and performance telemetry—**zero PII**.
- **Controlled Step 7 Identity Join:** Candidate identity is rejoined to the final recruiter report **only after** all AI model reasoning has finished.
- **Right to Erasure:** 1-click DPDP Right-to-Erasure permanently purges S3 video chunks, session telemetry, and vault identity records.

### 2. Hardware Proctoring & Smart Device Onboarding
- **Granular DPDP Consent:** 4 required opt-in checkboxes initialized to unchecked states. Candidates must review and explicitly accept each policy.
- **SmartHire Voice Calibration:**
  - Real-time Web Audio API formant analysis (`AnalyserNode`, 16-band frequency equalizer).
  - Candidates read the verification phrase aloud: `"I am ready to participate in this technical interview and my audio is clear."`
  - Words dynamically illuminate from crisp white to glowing emerald green (`.is-word-green`) as natural speech cadence is detected.
- **2D YCbCr Solitary Face Proctoring:**
  - Enforces a strict 1-person solitary testing environment.
  - **Curtain & Door Fold False-Positive Suppression:** Evaluates cluster aspect ratio, fill factor ($\ge 0.50$), and luminance variance ($\sigma_Y^2 \ge 250$). Background fabrics and curtain folds lacking facial luminance contrast are filtered out.
  - **Debounced Detection:** Secondary faces must persist across at least 4 consecutive frames (2 seconds) before triggering an alert.
  - Real-time centering reticle appears if the candidate leaves the frame (`faceCount === 0`).
- **Hardware Camera Prioritization:**
  - Automatically identifies and filters out disconnected virtual cameras (e.g. Phone Link, OBS).
  - Defaults to the physical Laptop Webcam (`findBestCamera`) and Laptop / Bluetooth Microphone (`findBestMic`).

### 3. Live Proctored Workspace & Sandbox Security
- **Proctored Monaco Editor & Clipboard Lockdown:**
  - Strictly blocks `paste`, `copy`, and `cut` actions at the capture phase, DOM internal `<textarea>` level, and Monaco Command palette level.
  - Clipboard attempts display an instant alert toast and record `CLIPBOARD_RESTRICTED` in the cryptographic HMAC audit chain.
- **Role-Based Device Controls:**
  - **Candidate Controls:** Camera and microphone are locked ON (`MIC LOCKED ON`, `CAM LOCKED ON`). Candidates cannot mute audio or turn off video during proctoring.
  - **Interviewer Controls:** Full ability to mute their microphone or pause their camera.
- **Anti-Cheat Sandbox (HackerRank Style):**
  - Monitors window focus, tab visibility changes, and fullscreen state.
  - **3-Violation Strict Cap:** Caps violations at exactly 3. At 3 violations, the session flags disqualification and exits cleanly.
  - **Fullscreen Loop Suppression:** 15-second suppression window prevents recursive fullscreen warning traps.
- **Cross-Tab Real-Time HMAC Synchronization:**
  - Uses `BroadcastChannel("intervia_audit_channel")` to broadcast candidate security violations across tabs to the recruiter's live Audit Chain drawer in real time.

### 4. 5–10 Minute Offline "Black Box" & Tamper-Evident HMAC Chain
- **Resilient Offline Coding:** Keystrokes are buffered locally in `Dexie.js` (IndexedDB) via Yjs CRDTs.
- **Local Media Buffering:** Low-bitrate 5-second WebM video chunks are captured via `MediaRecorder` into IndexedDB during outages.
- **Cryptographic Log Chaining:** Every event is signed using HMAC-SHA256 linked to the initial session seed ($h_0 = \text{seed}_0$).
- **Level 1 Verification (<50ms):** On reconnect, the backend verifies the hash chain using `hmac.compare_digest()`, flagging sequence gaps, time drift, or DevTools log tampering.

### 5. Multi-Tier NVIDIA Nemotron 3 on Nebius Token Factory
Intervia routes AI workloads across three specialized NVIDIA Nemotron 3 models:

| Model Tier | Model Identifier | Role in Intervia | Latency Target |
| :--- | :--- | :--- | :--- |
| **Fast Tier** | `nvidia/Nemotron-3-Nano-30B-A3B` | Live Screen & Code Analysis, Shared Copilot, Output Leak Scan | < 1.8 seconds |
| **Balanced Tier** | `nvidia/Nemotron-3-Super-120B-A12B` | Resume Parsing, Tailored Question Rubric Generation, "Good Use of AI" Grader | < 4.0 seconds |
| **Deep Reasoning** | `nvidia/Nemotron-3-Ultra-550B-A55B` | Post-Interview Synthesis, Loopholes & Prosperity Report, Executive Evaluation | Async Background |

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Monaco Editor (`@monaco-editor/react`), Web Audio API, Web Crypto API, `Dexie.js` (IndexedDB), Yjs (`y-monaco`, `y-websocket`, `y-indexeddb`), Lucide Icons, Modern CSS3 |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, SQLAlchemy 2.0 (AsyncIO + `asyncpg`), Pydantic v2, Bcrypt, PyJWT, Microsoft Presidio, PyMuPDF (`fitz`), WeasyPrint, Structlog |
| **Database** | PostgreSQL 16 (Hosted on Supabase with dual-schema architecture: `identity_vault` & `interview_ops`) |
| **AI Infrastructure** | Nebius Token Factory (OpenAI-compatible SDK), NVIDIA Nemotron 3 (`Nano`, `Super`, `Ultra`) |
| **Code Runner** | Judge0 CE / Piston API |

---

## Monorepo Project Structure

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

---

## Local Development Setup

### Prerequisites
- **Python 3.11+**
- **Node.js 20+** and **npm**
- A **Supabase PostgreSQL** instance (with `identity_vault` and `interview_ops` schemas)
- A **Nebius Token Factory API Key**

---

### Step 1: Configure & Start the Backend

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\activate
   ```

3. Install backend dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

4. Configure environment variables in `backend/.env`:
   ```ini
   NEBIUS_API_KEY=your_nebius_api_key_here
   NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1/

   VAULT_DATABASE_URL=postgresql+asyncpg://postgres:password@host:5432/postgres?options=-csearch_path%3Didentity_vault
   OPS_DATABASE_URL=postgresql+asyncpg://postgres:password@host:5432/postgres?options=-csearch_path%3Dinterview_ops

   AES_MASTER_KEY_HEX=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
   JWT_SECRET_KEY=your_super_secret_jwt_key_here
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   ```

5. Start the FastAPI development server:
   ```powershell
   python -m uvicorn intervia.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir src
   ```

- **Interactive API Documentation:** `http://127.0.0.1:8000/docs`
- **System Health Check:** `http://127.0.0.1:8000/health`

---

### Step 2: Configure & Start the Frontend

1. Navigate to the `frontend/` directory in a new terminal:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```powershell
   npm install
   ```

3. Start the Vite development server:
   ```powershell
   npm run dev
   ```

- **Frontend Application:** `http://localhost:5173`

---

### Step 3: Run End-to-End System Tests

Verify the complete integration pipeline (Auth, Invitations, Code Verification, Consent Recording, and NVIDIA Nemotron Screen Analysis):

```powershell
$env:PYTHONIOENCODING="utf-8"
python backend/test_auth_and_system.py
```

Expected output:
```text
Testing Recruiter Registration with email: recruiter_xxx@intervia.io
Register Recruiter Status: 201
Testing Recruiter Login...
Login Recruiter Status: 200
Get Me Status: 200
Testing Create Interview Invitation...
Create Invitation Status: 201
Verify Code Status: 200
Testing Candidate Registration...
Register Candidate Status: 201
Consent Submission Status: 200
Testing NVIDIA Nemotron live screen analysis...
Screen Analysis Status: 200

ALL 8 CORE SYSTEM TESTS PASSED SUCCESSFULLY!
```

---

## Walkthrough: Testing the Complete Platform

1. **Recruiter Sign-Up & Login**:
   - Navigate to `http://localhost:5173/admin/login`.
   - Register a recruiter account with your name, company name, email, and password.
   - Login to access the **Recruiter Dashboard** (`/interviewer`).

2. **Create Candidate Invitation**:
   - In the recruiter dashboard, click **"Create interview"** (`/interviewer/create`).
   - Enter candidate email and role title (e.g. *Senior Backend Engineer*).
   - Click Create; copy the generated invitation code (e.g. `C-PGY`).

3. **Candidate Entry & Device Calibration**:
   - Open `http://localhost:5173/join` in an incognito window.
   - Enter code `C-PGY` or navigate to `/candidate/consent`.
   - Check the 4 DPDP permission boxes.
   - Speak the verification phrase: observe words turn green (`.is-word-green`) as microphone audio is verified.
   - Verify camera centering: face detector confirms 1 person in frame.
   - Click **"Agree & continue to resume"**.

4. **Candidate Workspace & Proctoring**:
   - Complete resume review (`/candidate/resume`) and enter the staging lobby (`/candidate/lobby`).
   - Enter the live workspace (`/candidate/workspace`).
   - Notice candidate camera and microphone are locked ON for proctoring.
   - Try copying or pasting external text: observe clipboard restriction toast.
   - Switch browser tabs: observe the anti-cheat warning modal (capped at 3 violations).
   - In the recruiter tab (`/interviewer/workspace`), observe the candidate's violation appear in the **Cryptographic Audit Chain** in real time via `BroadcastChannel`.

5. **Generate Split Reports**:
   - Access candidate feedback at `/candidate/reports` (Skill Radar and constructive feedback with zero PII).
   - Access recruiter executive review at `/interviewer/reports` (Technical rubric and downloadable WeasyPrint PDF).

---

## Team & Engineering Ownership

| Engineer | GitHub Handle | Core Modules Owned |
| :--- | :--- | :--- |
| **Aman** | [`@Aman-00007`](https://github.com/Aman-00007) | • **Stage B Live Workspace:** Proctored Monaco Editor (clipboard lockdown), HackerRank Anti-Cheat sandbox (3-violation cap), Live WebRTC video rail with PiP, and Cross-Tab HMAC Audit Synchronization via `BroadcastChannel("intervia_audit_channel")`<br>• **Cryptographic Security:** Server seed generator, constant-time `HMAC-SHA256` log chain logger, and Level-1 in-memory verifier (<50ms)<br>• **Stage D Reconnect Engine:** S3 media chunk uploader, IndexedDB Black Box buffer, and Nebius Token Factory live screen observation (**Nemotron 3 Nano**)<br>• **Frontend Engineering:** PWA service workers, full-stack API integration, responsive layouts, and proctoring security |
| **Devangee** | [`@devangee20`](https://github.com/devangee20) | • **Privacy & Identity Vault:** Dual-Schema PostgreSQL (`identity_vault` vs `interview_ops`), `AES-256-GCM` token map encryption, JWT RBAC, and **Microsoft Presidio** PII shield + output leak scanner<br>• **Nebius AI Gateway:** `AsyncOpenAI` Token Factory client & 3-tier model router (`Nano`, `Super`, `Ultra`)<br>• **Stage A Onboarding:** DPDP consent engine, resume parser (`PyMuPDF`), tailored question generator (**Nemotron 3 Super**), and pre-cached hint generator (**Nemotron 3 Nano**)<br>• **Stage E Split Reports:** **Nemotron 3 Ultra** Student *"Loopholes & Prosperity"* report, Executive Summary, Step 7 identity join, and `WeasyPrint` PDF / `python-docx` exporter |
