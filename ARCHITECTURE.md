# Intervia — Complete System Architecture & Technical Specification

This document details the end-to-end architecture of **Intervia**, covering the 5-stage interview lifecycle, database schema isolation, cryptographic protocols, Nebius Token Factory model routing, and frontend-to-backend data contracts.

---

## 1. End-to-End 5-Stage Lifecycle Architecture

```mermaid
flowchart TB
    subgraph Client["Browser Client (React 18 PWA + WebAssembly + IndexedDB)"]
        UI_A["Stage A UI: Un-ticked DPDP Consent + Resume/GitHub Upload + Redaction Preview"]
        UI_B["Stage B UI: Monaco + Yjs Editor | Sandbox Guard | Shared AI Drawer"]
        WASM["Local WASM Workers: MediaPipe FaceDetector (1-2s) + Whisper-tiny STT"]
        BB["Stage C Offline Black Box: y-indexeddb + MediaRecorder 5s WebM + Web Crypto HMAC-SHA256"]
        UI_E["Stage E UI: Anonymous Student Report (Skill Radar) | Interviewer Executive Dashboard"]
    end

    subgraph FastAPI["Trusted Backend Server (FastAPI on Nebius Serverless Endpoints)"]
        Gate["API Gateway + JWT RBAC + Correlation Middleware"]
        PII["Microsoft Presidio PII Shield + Custom Regex + Step 4 Output Leak Scanner"]
        AES["AES-256-GCM Envelope Encryption"]
        HMAC["Level-1 Instant HMAC-SHA256 Chain & Sequence Verifier (<50ms)"]
        YJS["pycrdt-websocket Live Room + 15s AST/Diff Snapshotter"]
    end

    subgraph Storage["Isolated Persistence & Execution Layer"]
        DB_V[("PostgreSQL Schema 1:\nidentity_vault\n(Real PII + Consent + AES Map)")]
        DB_O[("PostgreSQL Schema 2:\ninterview_ops\n(session_id + Sanitized Logs)")]
        REDIS[("Redis 7:\nHMAC Seeds + Live WS Pub/Sub")]
        S3[("Nebius Object Storage (S3):\nEncrypted 5s .webm Chunks + PDFs")]
        J0["Judge0 / Piston:\nSandboxed Code Runner"]
    end

    subgraph Nebius["Nebius Cloud AI & Serverless Jobs"]
        TF_NANO["Nebius Token Factory:\nNemotron 3 Nano (30B)"]
        TF_SUPER["Nebius Token Factory:\nNemotron 3 Super (120B)"]
        TF_ULTRA["Nebius Token Factory:\nNemotron 3 Ultra (550B)"]
        JOB_D["Nebius Serverless Job:\njob_level2_recon.py\n(Server MediaPipe + WebRTC-VAD)"]
        JOB_E["Nebius Serverless Job:\njob_compile_reports.py\n(WeasyPrint PDF + python-docx)"]
        JOB_CRON["Nebius Serverless Job:\njob_dpdp_retention.py\n(30d Media / 90d Code Purge)"]
    end

    UI_A -->|1. Consent & Raw Resume/GitHub| Gate
    Gate --> PII
    PII -->|Real Identity + AES Token Map| AES --> DB_V
    PII -->|Sanitized Text ([NAME_1])| TF_SUPER
    TF_SUPER -->|5 Tailored Questions| DB_O
    TF_NANO -->|2 AES-Encrypted Offline Hints| UI_A
    REDIS -->|Cryptographic seed_0| BB

    UI_B <-->|Live Code CRDT| YJS
    UI_B -->|Run Code| J0
    UI_B -->|Shared AI Prompt| PII --> TF_NANO
    WASM -->|Face Count & Local STT| BB

    BB -->|Stage D Reconnect: HMAC Chain| HMAC
    HMAC -->|Broken Chain / Large Paste Alert (<2s)| REDIS --> UI_B
    BB -->|Resumable 5s .webm Chunks| S3 --> JOB_D
    YJS -->|Pre/Post Gap Code Diff| JOB_D
    JOB_D -->|Correlated Forensics| TF_SUPER --> DB_O

    DB_O -->|Sanitized Transcript + Code + Audit| JOB_E
    JOB_E <-->|Step 3 Deep Eval| TF_ULTRA
    JOB_E -->|Step 4 Leak Scan| PII
    JOB_E -->|Step 5 Anonymous Student Report| UI_E
    DB_V -->|Step 7 Identity Join (session_id -> Real Name)| JOB_E
    JOB_E -->|Step 8 Executive PDF/DOCX| S3 --> UI_E
```

---

## 2. Database Architecture: Physical Identity Separation ("The Golden Rule")

To guarantee that candidate identity can never leak into an LLM prompt or operational log, `core/database.py` initializes **two distinct SQLAlchemy AsyncSession factories** bound to two separate PostgreSQL schemas:

### Schema 1: `identity_vault` (Accessed ONLY via `VaultSession`)
* **Strict Access Rule:** Only imported inside `domains/stage_a_onboarding/repository.py` (to store consent and PII mappings) and Step 7 of `domains/stage_e_reporting/repository.py` (to attach the candidate's real name onto the final Interviewer PDF/DOCX after all AI calls are finished).
* **Tables:**
  1. `identity_vault.users`: `user_id (PK, UUID)`, `real_name`, `email`, `phone`, `college_roll_no`, `github_username`, `is_over_18`, `created_at`.
  2. `identity_vault.consent_records`: `consent_id (PK)`, `user_id (FK)`, `session_id (UUID, Indexed)`, `consent_version`, `camera_mic_opt_in (bool)`, `offline_blackbox_opt_in (bool)`, `ai_processing_opt_in (bool)`, `code_execution_opt_in (bool)`, `consented_at`, `withdrawn_at`.
  3. `identity_vault.pii_token_vault`: `session_id (PK, UUID)`, `user_id (FK)`, `aes_encrypted_map (BYTEA)` (stores AES-256-GCM ciphertext of `{"[NAME_1]": "...", "[COLLEGE_ID_1]": "..."}`), `nonce (BYTEA)`.

### Schema 2: `interview_ops` (Accessed via `OpsSession`)
* **Strict Access Rule:** Contains **zero real names, emails, or phone numbers**. Everything is keyed exclusively by `session_id`.
* **Tables:**
  1. `interview_ops.sessions`: `session_id (PK, UUID)`, `status`, `sanitized_resume_text`, `sanitized_github_summary`, `generated_questions_json`, `encrypted_hints_json`, `started_at`, `ended_at`.
  2. `interview_ops.code_submissions`: `submission_id (PK)`, `session_id (FK)`, `language`, `source_code`, `passed_tests`, `total_tests`, `runtime_ms`, `memory_kb`, `created_at`.
  3. `interview_ops.shared_ai_chats`: `chat_id (PK)`, `session_id (FK)`, `sanitized_prompt`, `ai_response`, `good_use_of_ai_score`, `evaluation_rationale`, `created_at`.
  4. `interview_ops.hmac_chain_logs`: `log_id (PK)`, `session_id (FK)`, `seq_no (INT)`, `client_timestamp`, `event_type` (`FACE_COUNT`, `TAB_SWITCH`, `FULLSCREEN_EXIT`, `PASTE_BLOCKED`, `PASTE_ALLOWED`, `MEDIA_CHUNK_HASH`), `payload_json`, `hmac_hash`, `is_verified (BOOL)`.
  5. `interview_ops.media_chunks`: `chunk_id (PK)`, `session_id (FK)`, `seq_no (INT)`, `s3_object_key`, `sha256_hash`, `start_offset_sec`, `end_offset_sec`, `server_face_verdict`, `server_voice_verdict`, `expires_at` (`NOW() + 30 days`).
  6. `interview_ops.reconnect_audits`: `audit_id (PK)`, `session_id (FK)`, `disconnect_start`, `reconnect_at`, `level1_passed (BOOL)`, `level1_flags_json`, `code_diff_patch`, `lines_added_offline`, `timelapse_summary_md`, `risk_level` (`LOW`, `MEDIUM`, `HIGH`), `flagged_clip_urls_json`.
  7. `interview_ops.reports`: `report_id (PK)`, `session_id (FK)`, `student_report_json` (Loopholes & Prosperity + Skill Radar metrics), `executive_summary_json`, `leak_scan_passed (BOOL)`, `pdf_s3_key`, `docx_s3_key`, `created_at`.

---

## 3. Cryptographic & Security Protocols

### A. Tamper-Evident HMAC-SHA256 Log Chain (`core/security/hmac_chain.py` & `crypto/hmacChain.ts`)
1. **Initialization (Stage A):** FastAPI generates a 256-bit cryptographically random `seed_0` using `secrets.token_hex(32)`, stores it in Redis (`hmac:seed:{session_id}`), and sends it to the browser over HTTPS.
2. **Client Chaining (Stages B & C):** Every 5 seconds (and immediately on any security event or 5s `MediaRecorder` chunk flush), the browser computes:
   $$h_0 = \text{seed}_0$$
   $$h_i = \text{HMAC-SHA256}\left(\text{seed}_0,\; h_{i-1} \;\|\; \text{str}(\text{seq}_i) \;\|\; \text{str}(\text{timestamp}_i) \;\|\; \text{canonical\_json}(\text{event}_i)\right)$$
3. **Media Chunk Binding:** When `MediaRecorder` writes a 5-second `.webm` blob to IndexedDB during an offline drop, the browser hashes the binary blob with `SHA-256` and embeds `chunk_sha256` inside the `event_i` payload of the HMAC chain.
4. **Server Verification (Stage D Level-1 & Level-2):**
   * **Level 1 (<50ms in-memory check):** On reconnect, `hmac_chain.py` recomputes $h_1 \dots h_n$ using `hmac.compare_digest()`. It immediately flags:
     * `HASH_MISMATCH`: A log entry was edited or deleted in DevTools.
     * `SEQUENCE_GAP`: Sequence numbers jumped (e.g., `seq: 4` $\rightarrow$ `seq: 6`).
     * `TIME_DRIFT_ANOMALY`: Elapsed wall-clock disconnect duration does not match the number of 5-second heartbeats.
     * `LARGE_OFFLINE_PASTE`: Paste events or sudden code deltas exceeding threshold.
   * **Level 2 (Binary Media Integrity):** When each `.webm` chunk uploads to `PATCH /v1/reconnect/upload-chunk`, the server computes `hashlib.sha256(chunk_bytes)` and asserts that it matches the verified `chunk_sha256` inside the HMAC chain. Swapping or truncating a video clip is mathematically impossible without detection.

---

## 4. Stage E Seven-Step Report Generation Pipeline

To guarantee complete privacy while delivering rich insights to both users, `domains/stage_e_reporting/service.py` executes a strict 8-step sequence:

1. **Step 1 (Local Voice-to-Text):** Browser `Whisper-tiny.en` WASM worker finalizes speaker-labeled transcript segments (`"Student: ..."` and `"Interviewer: ..."`).
2. **Step 2 (PII Shield):** Transcript and code comments pass through `presidio_engine.py`, replacing any spoken names, emails, or roll numbers with `[NAME_1]`, `[COLLEGE_ID_1]`.
3. **Step 3 (Nebius Nemotron 3 Ultra Evaluation):** Sanitized transcript, Yjs code history, Judge0 test results, Shared AI chat logs, and Stage D `ReconnectAudit` are sent to **Nemotron 3 Ultra** using structured Pydantic schemas.
4. **Step 4 (Output Leak Scanner Gate):** `leak_scanner.py` scans the entire raw JSON returned by Nemotron 3 Ultra against the decrypted token values from `pii_token_vault` and regex patterns. If any real PII appears, it is forcibly stripped before database persistence.
5. **Step 5 (Split into 2 Reports):** Output is partitioned into `StudentReport` (Loopholes & Prosperity + Skill Radar scores) and `ExecutiveReport` (Rubric breakdown + Code/AI analysis + Integrity timeline).
6. **Step 6 (Instant Student Delivery):** `StudentReport` is immediately accessible to the candidate with **zero identity attached**.
7. **Step 7 (Controlled Identity Join):** Exclusively for the `ExecutiveReport`, `repository.py` queries `identity_vault` via `session_id -> user_id` to retrieve `real_name` and `email`.
8. **Step 8 (Document Compilation):** `doc_exporter.py` renders the joined Executive Summary into downloadable **PDF (`WeasyPrint`)** and **DOCX (`python-docx`)** files stored in Nebius Object Storage (S3).

---

## 5. REST & WebSocket API Contract Summary

| Stage | Method & Endpoint | Owner | Description |
| :--- | :--- | :--- | :--- |
| **Stage A** | `POST /v1/onboarding/consent` | Devangee | Records granular DPDP opt-in checkboxes & 18+ confirmation in `identity_vault`. |
| **Stage A** | `POST /v1/onboarding/prepare` | Devangee | Parses PDF resume + GitHub, scrubs PII, stores AES-256 map, calls **Super** (questions) & **Nano** (2 encrypted hints), issues `seed_0`, and returns Redaction Preview. |
| **Stage B** | `WS /v1/workspace/ws/yjs/{session_id}` | Aman | Live Yjs CRDT code synchronization & 15-second server snapshotter. |
| **Stage B** | `POST /v1/workspace/run` | Aman | Executes candidate code in Judge0/Piston against hidden test cases. |
| **Stage B** | `POST /v1/workspace/shared-ai` | Aman | Scrubs prompt via Presidio, streams **Nemotron 3 Nano** response to both screens, and triggers async **Super** "Good Use of AI" evaluation. |
| **Stage D** | `POST /v1/reconnect/sync-chain` | Aman | **Level 1 (<2s):** Validates offline `hmac_logs` chain & pushes instant Redis WebSocket alert to Interviewer if tampered or anomalous. |
| **Stage D** | `PATCH /v1/reconnect/upload-chunk` | Aman | **Level 2:** Verifies `.webm` chunk SHA-256 against HMAC chain, uploads to S3, and triggers `job_level2_recon.py` (**Nemotron 3 Super** Time-Lapse). |
| **Stage E** | `POST /v1/reports/generate/{session_id}` | Devangee | Scrubs transcript, triggers **Nemotron 3 Ultra** report job, runs Step 4 Leak Scan, and executes Step 7 Identity Join. |
| **Stage E** | `GET /v1/reports/{session_id}/student` | Devangee | Returns anonymous *Loopholes & Prosperity* report + Skill Radar JSON. |
| **Stage E** | `GET /v1/reports/{session_id}/executive` | Devangee | Returns full Interviewer Executive Summary + presigned PDF & DOCX download URLs. |
| **Stage E** | `DELETE /v1/reports/dpdp/erase/{user_id}` | Devangee | 1-click DPDP Right-to-Erasure: purges S3 video chunks, session logs, and `identity_vault` records. |