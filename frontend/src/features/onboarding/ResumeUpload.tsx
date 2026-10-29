import { navigate } from "../../core/router";
import { Button, Page, Panel } from "../../shared/components/UI";

export function ResumeUpload() {
  return (
    <Page
      className="resume-page"
      eyebrow="RESUME ANONYMIZATION / REVIEW BEFORE SHARING"
      title="Your experience, not your identity."
      subtitle="Review the tokenized resume that will be shared with AI. Technical qualifications stay useful."
      beforeTitle={
        <div className="setup-steps setup-steps-wide resume-progress">
          <div className="complete">
            <b>✓</b> <b>Privacy & devices</b>
          </div>
          <div className="active">
            <b>●</b> <b>Resume review</b>
          </div>
          <div>
            <b>○</b> <b>Interview lobby</b>
          </div>
        </div>
      }
    >
      <div className="resume-layout">
        {/* Left Column: Upload & Security Checks */}
        <aside className="resume-sidebar">
          {/* Dropzone Card */}
          <div className="upload-dropzone-card">
            <div className="upload-icon-circle">
              <span className="upload-arrow">↑</span>
            </div>
            <h2>Drop your resume here</h2>
            <p>PDF or DOCX · up to 10 MB</p>
            <button
              type="button"
              className="btn-replace-resume"
              onClick={() => alert("Upload dialog: You can select a new PDF or DOCX file to re-run Presidio anonymization.")}
            >
              Choose replacement file →
            </button>
          </div>

          {/* Encrypted Vault Asset Card */}
          <div className="encrypted-vault-card">
            <div className="vault-card-header">
              <span className="file-doc-icon">📄</span>
              <div className="vault-file-meta">
                <code className="vault-file-name">resume_C-7K2.pdf</code>
                <span className="vault-file-size">248 KB · Encrypted at rest</span>
              </div>
            </div>
            <div className="vault-badge-row">
              <span className="vault-iso-pill">🔒 KMS AES-256</span>
              <span className="vault-dest-tag">STORED IN IDENTITY_VAULT</span>
            </div>
          </div>

          {/* Automated Verification Checks Panel */}
          <div className="resume-checks-panel">
            <small className="checks-heading">AUTOMATED ANONYMIZATION CHECKS</small>
            <div className="check-row-item">
              <span className="check-item-label">Document extracted</span>
              <span className="check-status-pill green">
                <span className="pill-check">✓</span> Complete
              </span>
            </div>
            <div className="check-row-item">
              <span className="check-item-label">Presidio tokenization</span>
              <span className="check-status-pill green">
                <span className="pill-check">✓</span> 5 categories
              </span>
            </div>
            <div className="check-row-item">
              <span className="check-item-label">Preview ready for review</span>
              <span className="check-status-pill green">
                <span className="pill-check">✓</span> Complete
              </span>
            </div>
          </div>

          {/* Privacy Protocol Notice */}
          <div className="resume-privacy-callout">
            <small className="privacy-callout-title">PRESIDIO PRIVACY GUARANTEE</small>
            <p>
              Only the reviewed version goes to AI. Still see an identifying detail? Flag it for redaction. Replacing the file automatically reruns anonymization.
            </p>
          </div>
        </aside>

        {/* Right Column: AI-Visible Preview Dossier */}
        <section className="resume-preview-panel">
          <div className="preview-panel-header">
            <div className="preview-header-left">
              <small className="preview-eyebrow">AI-VISIBLE PREVIEW / READ ONLY</small>
              <span className="preview-security-sub">ZERO IDENTIFYING PII REACHES INTERVIEW_OPS</span>
            </div>
            <span className="preview-status-pill">
              <span className="pulse-indicator" />
              Tokenization complete
            </span>
          </div>

          {/* Candidate Anonymized Persona Title */}
          <div className="preview-candidate-banner">
            <div className="candidate-name-row">
              <h2 className="anonymized-name">[NAME_1]</h2>
              <span className="anonymized-chip">TOKENIZED IDENTITY</span>
            </div>
            <div className="tokens-pills-row">
              <code className="token-pill">[EMAIL_1]</code>
              <span className="token-sep">·</span>
              <code className="token-pill">[PHONE_1]</code>
              <span className="token-sep">·</span>
              <code className="token-pill">[LOCATION_1]</code>
            </div>
          </div>

          <div className="preview-divider" />

          {/* Profile Section */}
          <div className="preview-section">
            <small className="section-label">PROFILE / C-7K2</small>
            <p className="section-copy">
              Backend engineer with 3 years of experience building Python services, REST APIs and asynchronous job pipelines. Focused on reliable data processing and clear, testable code.
            </p>
          </div>

          <div className="preview-divider" />

          {/* Experience Section */}
          <div className="preview-section">
            <small className="section-label">SELECTED EXPERIENCE</small>
            <div className="experience-role-header">
              <h3 className="role-title">Software engineer · [ORG_1]</h3>
              <span className="role-period">2023–2026</span>
            </div>
            <ul className="experience-list">
              <li>Built FastAPI services backed by PostgreSQL and Redis.</li>
              <li>Implemented idempotent workers for event-driven ingestion.</li>
              <li>Added pytest integration coverage and CI checks for API contracts.</li>
            </ul>
          </div>

          <div className="preview-divider" />

          {/* Technical Toolkit */}
          <div className="preview-section">
            <small className="section-label">TECHNICAL TOOLKIT</small>
            <div className="tech-tags-grid">
              <span className="tech-tag">Python 3.11</span>
              <span className="tech-tag">SQL</span>
              <span className="tech-tag">FastAPI</span>
              <span className="tech-tag">PostgreSQL</span>
              <span className="tech-tag">Redis</span>
              <span className="tech-tag">Docker</span>
              <span className="tech-tag">pytest</span>
              <span className="tech-tag">Git</span>
              <span className="tech-tag">Data structures</span>
            </div>
          </div>

          <div className="preview-divider" />

          {/* Education */}
          <div className="preview-section">
            <small className="section-label">EDUCATION</small>
            <div className="education-row">
              <span className="degree-text">BSc Computer Science</span>
              <span className="edu-org">· [ORG_2] · 2023</span>
            </div>
          </div>
        </section>
      </div>

      {/* Full-width Actions Bar at Bottom */}
      <div className="review-actions-bar">
        <div className="review-routing-col">
          <span className="routing-tag">ORIGINAL → ENCRYPTED IDENTITY_VAULT</span>
          <span className="routing-tag active-route">REVIEWED PREVIEW → INTERVIEW_OPS</span>
        </div>
        <div className="review-buttons-col">
          <Button
            secondary
            className="btn-flag-detail"
            onClick={() => alert("Detail flagged for anonymization review.")}
          >
            Flag a detail →
          </Button>
          <Button
            className="btn-confirm-lobby"
            onClick={() => navigate("/candidate/lobby")}
          >
            Confirm & go to lobby →
          </Button>
        </div>
      </div>
    </Page>
  );
}
