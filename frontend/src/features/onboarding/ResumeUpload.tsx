import { useState, ChangeEvent } from "react";
import { navigate } from "../../core/router";
import { Button, Page } from "../../shared/components/UI";
import { api } from "../../api";

export function ResumeUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fileName, setFileName] = useState("resume_C-7K2.pdf");
  const [tokenizedPreview, setTokenizedPreview] = useState<string | null>(null);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSuccess(false);

    const sessionId = localStorage.getItem("intervia_session_id");
    if (!sessionId) {
      alert("Session ID missing. Please go back to the consent screen.");
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("file", file);
    // Optional: You can add a GitHub username input field later if needed
    // formData.append("github_username", "candidate-github"); 

    try {
      // 1. Send to backend for Presidio tokenization & AI question generation
      const res = await api.prepareInterview(formData);
      
      // 2. Pre-load the offline buffer with the scrubbed text
      await api.prepareOfflineBuffer({ 
        session_id: sessionId, 
        cleaned_resume_text: res.scrubbed_text 
      });

      setFileName(file.name);
      setTokenizedPreview(res.scrubbed_text);
      setUploadSuccess(true);
    } catch (err: any) {
      alert(`Upload failed: ${err.message || "Please try again."}`);
    } finally {
      setIsUploading(false);
    }
  };

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
            
            {/* Hidden File Input */}
            <input
              type="file"
              accept=".pdf,.docx"
              id="resume-file-input"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
            
            {/* Trigger Label styled as a button */}
            <label htmlFor="resume-file-input" className="btn-replace-resume" style={{ cursor: "pointer" }}>
              {isUploading ? "Uploading & Tokenizing..." : "Choose replacement file →"}
            </label>
          </div>

          {/* Encrypted Vault Asset Card */}
          <div className="encrypted-vault-card">
            <div className="vault-card-header">
              <span className="file-doc-icon">📄</span>
              <div className="vault-file-meta">
                <code className="vault-file-name">{fileName}</code>
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
                <span className="pill-check">{isUploading ? "..." : "✓"}</span> {isUploading ? "Processing" : "Complete"}
              </span>
            </div>
            <div className="check-row-item">
              <span className="check-item-label">Presidio tokenization</span>
              <span className="check-status-pill green">
                <span className="pill-check">{isUploading ? "..." : "✓"}</span> {isUploading ? "Processing" : "5 categories"}
              </span>
            </div>
            <div className="check-row-item">
              <span className="check-item-label">Preview ready for review</span>
              <span className="check-status-pill green">
                <span className="pill-check">{uploadSuccess ? "✓" : "○"}</span> {uploadSuccess ? "Complete" : "Pending"}
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
              {isUploading ? "Tokenizing..." : uploadSuccess ? "Tokenization complete" : "Awaiting upload"}
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

          {/* Dynamic Preview Section (Replaces the hardcoded placeholder text) */}
          <div className="preview-section">
            <small className="section-label">PROFILE / {fileName.replace('.pdf', '')}</small>
            {tokenizedPreview ? (
              <pre style={{ 
                whiteSpace: "pre-wrap", 
                fontFamily: "inherit", 
                fontSize: "13px", 
                lineHeight: "1.6", 
                color: "#cccccc",
                margin: 0
              }}>
                {tokenizedPreview}
              </pre>
            ) : (
              <p className="section-copy" style={{ opacity: 0.5 }}>
                Awaiting document upload. Once you upload your PDF, the AI-safe tokenized preview will appear here.
              </p>
            )}
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
            onClick={() => {
              if (!uploadSuccess) {
                alert("Please upload your resume first so the AI can generate your interview questions.");
                return;
              }
              navigate("/candidate/lobby");
            }}
          >
            Confirm & go to lobby →
          </Button>
        </div>
      </div>
    </Page>
  );
}