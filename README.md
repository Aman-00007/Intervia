# Intervia — Privacy-First, Offline-Resilient Technical Interview Platform

<div align="center">
  <b>AI-Powered Technical Interview Copilot, Cryptographic Offline Black Box & Split Feedback Engine</b><br/>
  Built with <b>React (PWA + WebAssembly)</b> • <b>Python (FastAPI)</b> • <b>NVIDIA Nemotron 3 on Nebius Token Factory</b> • <b>Nebius Serverless</b>
</div>

---

## Overview

**Intervia** solves the three biggest failures of modern remote technical interviews:
1. **Unregulated Privacy Leaks:** Candidate resumes, GitHub links, and voice transcripts containing Personally Identifiable Information (PII) are routinely sent directly to third-party LLMs.
2. **Fragile Network Dropouts:** A 5-minute Wi-Fi drop kills standard WebRTC/coding interviews, forcing reschedules or leaving interviewers blind to what happened during the outage.
3. **Opaque, One-Sided Feedback:** Candidates rarely receive actionable technical feedback, while interviewers spend 30+ minutes writing post-interview notes manually.

**Intervia** introduces a **Strict Dual-Schema Privacy Vault (DPDP-Compliant)**, a **5–10 Minute Offline Browser "Black Box"** protected by a tamper-evident **HMAC-SHA256 hash chain**, and a **3-Tier NVIDIA Nemotron 3 routing engine on Nebius Token Factory** that generates instant, split reports for both the Student and the Interviewer.

---

## Core Architecture Pillars

### 1. The Golden Rule of Identity Isolation (DPDP Compliant)
* **Zero PII to AI:** Before any resume, GitHub commit, Shared AI prompt, or speech transcript reaches an LLM, **Microsoft Presidio** + custom regex scrubbers replace all sensitive tokens with deterministic placeholders (`[NAME_1]`, `[EMAIL_1]`, `[PHONE_1]`, `[COLLEGE_ID_1]`, `[GITHUB_1]`).
* **Physical Schema Separation:** PostgreSQL is divided into two isolated schemas (`identity_vault` and `interview_ops`) enforced by separate SQLAlchemy engines (`VaultSession` vs. `OpsSession`).
* **AES-256-GCM Envelope Encryption:** The `[NAME_1] -> Real Name` lookup map is encrypted with AES-256-GCM inside `identity_vault`. Real candidate names are joined **only at Step 7** when compiling the Interviewer's downloadable Executive Summary.
* **Right to Erasure:** Candidates must actively opt in via granular, un-ticked DPDP consent checkboxes (with 18+ age verification) and can trigger a 1-click **"Delete My Data / Withdraw Consent"** purge at any time.

### 2. 5–10 Minute Offline "Black Box" & Tamper-Evident HMAC Chain
* **Conflict-Free Offline Coding:** Built on **Monaco Editor + Yjs CRDTs (`y-websocket` + `y-indexeddb`)**. When Wi-Fi drops, every keystroke persists locally in IndexedDB and merges seamlessly upon reconnect.
* **Local WASM Vision & STT:** `@mediapipe/tasks-vision` (FaceDetector WASM) counts faces every 1–2 seconds locally in a Web Worker, and `Transformers.js` (`whisper-tiny.en` WASM) transcribes speech on-device—raw camera frames and live audio never go to the cloud AI.
* **IndexedDB Media Black Box:** During an internet drop, `MediaRecorder` records low-bitrate WebM/Opus video and audio in 5-second chunks (~30 MB per 10 mins) into `Dexie.js` (IndexedDB).
* **Cryptographic HMAC-SHA256 Log Chain:** Every 5 seconds, the browser computes:
  $$h_i = \text{HMAC-SHA256}(\text{seed}, h_{i-1} + \text{seq} + \text{timestamp} + \text{event\_payload})$$
  If a candidate opens Chrome DevTools while offline and deletes or edits a log entry or video chunk, the hash chain breaks and triggers an **instant <2s Level-1 Warning** to the interviewer on reconnect.

### 3. 3-Tier Nebius Token Factory Model Routing
Intervia routes all 5 AI functions across **NVIDIA Nemotron 3** models via **Nebius Token Factory's OpenAI-compatible API**, balancing sub-2-second responsiveness with deep post-interview reasoning:

| Model Tier | Nebius Token Factory Model | Assigned Intervia Functions | Why This Tier? |
| :--- | :--- | :--- | :--- |
| **Fast Tier** | **Nemotron 3 Nano (30B MoE)** | • **Stage A:** 2 Pre-cached AES-encrypted offline hints<br>• **Stage B (AI Func 2):** Live "Share AI Screen" Copilot chat<br>• **Stage E (Step 4):** Post-AI output leak verification | Sub-2s latency and minimal credit usage for high-frequency interactive calls. |
| **Balanced Tier** | **Nemotron 3 Super (120B Hybrid MoE)** | • **Stage A (AI Func 1):** Sanitized Resume & GitHub Question Generator<br>• **Stage B:** "Good Use of AI" prompt quality grader<br>• **Stage D (AI Func 3):** Offline Reconnect Time-Lapse Summary | Strong code comprehension and multi-event correlation to synthesize offline code diffs + security flags. |
| **Deep Reasoning Tier** | **Nemotron 3 Ultra (550B Hybrid MoE)** | • **Stage E (AI Func 4):** Student *"Loopholes & Prosperity"* Report<br>• **Stage E (AI Func 5):** Executive Interviewer Summary | Deep architectural reasoning over full code evolution, complexity leaps, transcript nuances, and security telemetry. |

### 4. Nebius Serverless Compute (Endpoints + Jobs)
* **Nebius Serverless Endpoints:** Hosts the stateless FastAPI backend and `pycrdt-websocket` signaling rooms with auto-scaling HTTP/WS endpoints.
* **Nebius Serverless Jobs:** Offloads heavy asynchronous background workloads:
  1. `job_level2_recon.py`: Downloads uploaded `.webm` Black Box chunks from S3, runs independent server-side `MediaPipe` face checks and `WebRTC-VAD` multi-speaker voice checks, diffs pre/post-gap code, and invokes **Nemotron 3 Super** for the Time-Lapse Summary.
  2. `job_compile_reports.py`: Runs **Nemotron 3 Ultra** evaluations, executes the Step 4 Zero-PII Leak Scan, performs the Step 7 Identity Join, and compiles PDF/DOCX files via `WeasyPrint` and `python-docx`.
  3. `job_dpdp_retention.py`: Scheduled cron job that auto-purges raw media chunks after 30 days and code snapshots after 90 days.

---

## Complete Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **AI & Cloud Compute** | Nebius Token Factory (`AsyncOpenAI` SDK + Pydantic Structured Outputs), NVIDIA Nemotron 3 (`Nano`, `Super`, `Ultra`), Nebius Serverless Endpoints, Nebius Serverless Jobs |
| **Backend (`backend/`)** | Python 3.11+, FastAPI, Uvicorn, SQLAlchemy 2.0 (`asyncpg`), Alembic, Microsoft Presidio + spaCy, `cryptography` (`AESGCM`, `HMAC-SHA256`), `pycrdt-websocket`, PyMuPDF (`fitz`), `httpx`, `mediapipe`, `webrtcvad`, `WeasyPrint`, `python-docx`, Structlog |
| **Frontend (`frontend/`)** | React 18, TypeScript, Vite, Tailwind CSS, Workbox PWA (`vite-plugin-pwa`), Monaco Editor (`@monaco-editor/react`), Yjs (`y-monaco`, `y-websocket`, `y-indexeddb`), Web Crypto API (`crypto.subtle`), `Dexie.js` (IndexedDB), `@mediapipe/tasks-vision` (WASM), `Transformers.js` (`whisper-tiny.en` WASM), Recharts, `react-diff-viewer-continued` |
| **Data, Storage & Sandbox** | PostgreSQL 16 (Dual Schema: `identity_vault` & `interview_ops`), Redis 7 (Pub/Sub & Ephemeral Seeds), Nebius Object Storage / MinIO (S3-Compatible via `aioboto3`), Judge0 CE / Piston (Sandboxed Code Execution) |

---

## Monorepo Structure

```text
Intervia/
├── .github/
│   ├── CODEOWNERS                      # Enforces zero-conflict ownership boundaries
│   └── workflows/                      # CI (Ruff, MyPy, Pytest) & CD (Nebius Deploy)
├── infra/
│   ├── docker/                         # api.Dockerfile & worker.Dockerfile
│   ├── nebius/                         # serverless-endpoint.yaml & serverless-jobs.yaml
│   └── local/                          # init-dual-schemas.sql
├── backend/                            # FastAPI Modular Monolith (Clean Architecture)
│   ├── alembic/                        # Multi-schema migrations (001_vault, 002_ops)
│   ├── src/intervia/
│   │   ├── main.py                     # Dynamic ASGI router loader
│   │   ├── core/                       # Config, Dual DB Engines, AES-256, HMAC-SHA256, JWT
│   │   ├── infrastructure/             # Nebius Router, Presidio PII Shield, Judge0, Yjs, S3, Redis
│   │   ├── domains/                    # Stage A, Stage B, Stage D, Stage E Bounded Contexts
│   │   └── workers/                    # Nebius Serverless Job CLI entrypoints
│   └── tests/                          # Pytest Integration & CLI E2E Simulator
├── frontend/                           # React 18 + Vite PWA + WASM Client
│   └── src/
│       ├── db/                         # Dexie.js IndexedDB Black Box store
│       ├── crypto/                     # Web Crypto HMAC-SHA256 chaining & hint decryption
│       ├── workers/                    # MediaPipe Face WASM & Whisper STT WASM workers
│       ├── components/                 # Consent, Monaco+Yjs, Shared AI, Sandbox, Offline Banner
│       └── pages/                      # StudentRoom, InterviewerRoom, ReportsView
├── docker-compose.yml                  # Local Postgres 16, Redis 7, MinIO S3, Judge0/Piston
└── Makefile                            # Developer automation commands
```

---

## Local Development Setup

### Prerequisites
* **Python 3.11+**, **Node.js 20+**, **Docker & Docker Compose**
* A **Nebius Token Factory API Key**

### 1. Clone the Repository & Start Infrastructure
```bash
git clone [https://github.com/Aman-00007/Intervia.git](https://github.com/Aman-00007/Intervia.git)
cd Intervia
docker compose up -d
```

### 2. Configure & Run the FastAPI Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -e ".[dev]"
python -m spacy download en_core_web_lg
Copy-Item .env.example .env
# Add your NEBIUS_API_KEY inside backend/.env

# Run Alembic dual-schema migrations
alembic upgrade head

# Start the FastAPI server
uvicorn intervia.main:app --reload --app-dir src --port 8000
```
* **Interactive Swagger API Docs:** `http://localhost:8000/docs`
* **Health Check:** `http://localhost:8000/health`

### 3. Configure & Run the React PWA Frontend
```powershell
cd ../frontend
npm install
npm run dev
```
* **Frontend App:** `http://localhost:5173`

---

## Team & Engineering Ownership

| Engineer | GitHub Handle | Core Domains & Modules Owned |
| :--- | :--- | :--- |
| **Aman** | [`@Aman-00007`](https://github.com/Aman-00007) | • **Stage B Live Workspace:** Yjs CRDT Hub (`pycrdt-websocket`), Judge0 Code Runner, Live Shared AI Copilot (**Nemotron 3 Nano**) & "Good Use of AI" Grader (**Nemotron 3 Super**)<br>• **Cryptographic Security:** Server Seed Generator & Constant-Time `HMAC-SHA256` Log Chain Verifier<br>• **Stage D Reconnect Engine:** Level-1 Instant Alert (<50ms Redis WS push), S3 Chunk Uploader, Server-Side Media Forensics (`MediaPipe` + `WebRTC-VAD`), and **Nebius Serverless Job** (`job_level2_recon.py` with **Nemotron 3 Super**)<br>• **Frontend Track B:** PWA Service Worker, Dexie IndexedDB Black Box, Web Crypto HMAC Chain, Monaco+Yjs Offline Editor, Sandbox Guard, and Reconnect Forensics Dashboard |
| **Devangee** | [`@devangee20`](https://github.com/devangee20) | • **Privacy & Identity Vault:** Dual-Schema PostgreSQL (`VaultSession` vs `OpsSession`), `AES-256-GCM` Token Map Encryption, JWT RBAC, and **Microsoft Presidio** PII Shield + Output Leak Scanner<br>• **Nebius AI Gateway:** `AsyncOpenAI` Token Factory Client & 3-Tier Model Router (`Nano`, `Super`, `Ultra`)<br>• **Stage A Onboarding:** DPDP Consent Engine, Resume/GitHub Parser (`PyMuPDF` + `httpx`), Sanitized Question Generator (**Nemotron 3 Super**), and Pre-Cached Hint Generator (**Nemotron 3 Nano**)<br>• **Stage E Split Reports:** **Nemotron 3 Ultra** Student *"Loopholes & Prosperity"* Report & Executive Summary, Step 7 Identity Join, `WeasyPrint` PDF / `python-docx` Exporter, and DPDP Right-to-Erasure Jobs<br>• **Frontend Track A:** DPDP Consent UI, Redaction Preview Modal, Whisper WASM Local STT Worker, Shared AI Drawer, and Recharts Skill Radar Reports UI |