import { useState } from "react";
import { api } from "../../core/api";
import { navigate } from "../../core/router";
import { Button, Page, Panel } from "../../shared/components/UI";

export function ConsentScreen() {
  const [permissions, setPermissions] = useState([true, true, true, true]);
  const [message, setMessage] = useState("");
  const [micTesting, setMicTesting] = useState(false);
  const [micTested, setMicTested] = useState(true);
  const [camTesting, setCamTesting] = useState(false);
  const [selectedMic, setSelectedMic] = useState("Built-in microphone (Realtek High Definition Audio)");
  const [selectedCam, setSelectedCam] = useState("Integrated HD Camera (1280x720)");

  const accepted = permissions.every(Boolean);

  const submit = async () => {
    if (!accepted) {
      setMessage("Please accept all required permissions before continuing.");
      return;
    }
    try {
      await api.submitConsent({
        real_full_name: "Candidate",
        real_email: "candidate@example.com",
        is_above_18_verified: true,
        purposes_accepted: {
          camera_audio: true,
          ai_processing: true,
          data_retention: true,
        },
      });
      navigate("/candidate/resume");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Consent could not be saved."
      );
    }
  };

  const updatePermission = (index: number, checked: boolean) => {
    setPermissions((current) =>
      current.map((value, itemIndex) => (itemIndex === index ? checked : value))
    );
  };

  const toggleAll = () => {
    const allChecked = permissions.every(Boolean);
    setPermissions([!allChecked, !allChecked, !allChecked, !allChecked]);
  };

  const handleTestMic = () => {
    setMicTesting(true);
    setMicTested(false);
    setTimeout(() => {
      setMicTesting(false);
      setMicTested(true);
    }, 1500);
  };

  const handleTestCam = () => {
    setCamTesting(true);
    setTimeout(() => {
      setCamTesting(false);
    }, 1200);
  };

  return (
    <Page
      className="consent-page"
      eyebrow="PRIVACY & DEVICES / BEFORE YOUR INTERVIEW"
      title="Your interview. In your control."
      beforeTitle={
        <div className="setup-steps setup-steps-wide consent-progress">
          <div className="active">
            <b>●</b> <b>Privacy & devices</b>
          </div>
          <div>
            <b>○</b> <b>Resume review</b>
          </div>
          <div>
            <b>○</b> <b>Interview lobby</b>
          </div>
        </div>
      }
    >
      <p className="page-intro">
        Understand what is captured, what stays separate and what AI is allowed to see.
      </p>

      <div className="consent-grid-layout">
        {/* Left Column: Permissions & Architectural Vault Card */}
        <div className="consent-left-column">
          {/* Main Permissions Card */}
          <Panel className="consent-panel permissions-panel">
            <div className="panel-header-row">
              <div>
                <h2>Permissions for this interview</h2>
                <p className="panel-subtext">
                  Intervia enforces zero-PII boundaries and cryptographically separates candidate identity.
                </p>
              </div>
              <button
                type="button"
                className="select-all-btn"
                onClick={toggleAll}
              >
                {accepted ? "Deselect all" : "Select all"}
              </button>
            </div>

            <div className="permissions-status-bar">
              <span className={`status-pill ${accepted ? "ready" : "pending"}`}>
                <span className="dot" />
                {accepted ? "All 4 permissions granted · ready" : `${permissions.filter(Boolean).length} of 4 permissions selected`}
              </span>
            </div>

            <div className="consent-cards-list">
              {/* Permission 1 */}
              <div
                className={`consent-card-item ${permissions[0] ? "checked" : ""}`}
                onClick={() => updatePermission(0, !permissions[0])}
              >
                <div className="custom-checkbox">
                  <input
                    type="checkbox"
                    checked={permissions[0]}
                    onChange={(e) => updatePermission(0, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="checkmark">{permissions[0] ? "✓" : ""}</span>
                </div>
                <div className="consent-card-content">
                  <div className="consent-card-header">
                    <b>Anonymize my resume before AI processing</b>
                    <span className="consent-badge teal">PRESIDIO MASKING</span>
                  </div>
                  <p>
                    Microsoft Presidio replaces detected personal details with tokens such as [NAME_1] and [ORG_1]. You can review and redact before sharing.
                  </p>
                </div>
              </div>

              {/* Permission 2 */}
              <div
                className={`consent-card-item ${permissions[1] ? "checked" : ""}`}
                onClick={() => updatePermission(1, !permissions[1])}
              >
                <div className="custom-checkbox">
                  <input
                    type="checkbox"
                    checked={permissions[1]}
                    onChange={(e) => updatePermission(1, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="checkmark">{permissions[1] ? "✓" : ""}</span>
                </div>
                <div className="consent-card-content">
                  <div className="consent-card-header">
                    <b>I consent to interview audio and video recording</b>
                    <span className="consent-badge teal">WEBRTC · 720P</span>
                  </div>
                  <p>
                    Media supports authorized interview review. Recording begins only after consent and entry into the live session.
                  </p>
                </div>
              </div>

              {/* Permission 3 */}
              <div
                className={`consent-card-item ${permissions[2] ? "checked" : ""}`}
                onClick={() => updatePermission(2, !permissions[2])}
              >
                <div className="custom-checkbox">
                  <input
                    type="checkbox"
                    checked={permissions[2]}
                    onChange={(e) => updatePermission(2, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="checkmark">{permissions[2] ? "✓" : ""}</span>
                </div>
                <div className="consent-card-content">
                  <div className="consent-card-header">
                    <b>I consent to recording code activity and tab switches</b>
                    <span className="consent-badge teal">TAMPER-EVIDENT HMAC</span>
                  </div>
                  <p>
                    Edits, execution requests and tab events provide continuity and context without spying on personal windows.
                  </p>
                </div>
              </div>

              {/* Permission 4 */}
              <div
                className={`consent-card-item ${permissions[3] ? "checked" : ""}`}
                onClick={() => updatePermission(3, !permissions[3])}
              >
                <div className="custom-checkbox">
                  <input
                    type="checkbox"
                    checked={permissions[3]}
                    onChange={(e) => updatePermission(3, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="checkmark">{permissions[3] ? "✓" : ""}</span>
                </div>
                <div className="consent-card-content">
                  <div className="consent-card-header">
                    <b>Keep a temporary local copy during network loss</b>
                    <span className="consent-badge teal">INDEXEDDB BUFFER</span>
                  </div>
                  <p>
                    IndexedDB events and video chunks are kept for up to 8 minutes, within the supported 5–10 minute range so no work is lost.
                  </p>
                </div>
              </div>
            </div>

            <p className="consent-legal-note">
              Leave the live interview to stop capture. Contact the organizer for an alternative, or request access/deletion under the applicable retention policy.
            </p>

            <div className="consent-actions-row">
              <Button
                secondary
                className="leave-interview-btn"
                onClick={() => navigate("/candidate")}
              >
                Leave interview →
              </Button>

              <Button
                className="agree-continue-btn"
                onClick={() => {
                  void submit();
                }}
              >
                Agree & continue to resume →
              </Button>
            </div>

            {message && <div className="consent-error-msg">{message}</div>}
          </Panel>

          {/* Cryptographic Vault Architecture Card */}
          <Panel className="consent-panel identity-vault-panel">
            <div className="vault-header-row">
              <small>ZERO-PII INFRASTRUCTURE / TOKENIZED ARCHITECTURE</small>
              <span className="vault-security-pill">▪ CRYPTOGRAPHICALLY ISOLATED</span>
            </div>

            <h3>Identity is separate. Skill is the signal.</h3>

            <div className="vault-columns-grid">
              <div className="vault-col">
                <small>RESTRICTED ACCESS</small>
                <b>identity_vault</b>
                <p>
                  Raw identity and original resumes are encrypted with tenant KMS keys. Inaccessible to AI models.
                </p>
              </div>

              <div className="vault-col">
                <small>TOKENIZED EVALUATION</small>
                <b>interview_ops</b>
                <p>
                  Only tokenized resume details ([NAME_1]) and code executions appear in AI context. Zero PII leaks.
                </p>
              </div>
            </div>

            <div className="vault-footer-links">
              <button
                type="button"
                className="vault-link-btn"
                onClick={() => alert("Intervia zero-PII protocol: AES-256 GCM encryption at rest, Presidio tokenization, automated leak detection before PDF generation.")}
              >
                Data handling & retention standards ↗
              </button>
            </div>
          </Panel>
        </div>

        {/* Right Column: Hardware & Stream Calibration (Microphone & Camera) */}
        <aside className="consent-right-column">
          {/* Card 1: Check your microphone */}
          <Panel className="consent-panel device-panel mic-panel">
            <div className="panel-header-row">
              <h2>Check your microphone</h2>
              <span className="stream-badge-teal">
                {micTesting ? "▪ TESTING..." : "▪ INPUT ACTIVE"}
              </span>
            </div>

            <label className="device-select-box">
              <small>AUDIO INPUT</small>
              <div className="select-wrap">
                <select
                  value={selectedMic}
                  onChange={(e) => setSelectedMic(e.target.value)}
                  className="modern-device-select"
                >
                  <option value="Built-in microphone (Realtek High Definition Audio)">
                    Built-in microphone (Realtek Audio)
                  </option>
                  <option value="External USB Microphone (Yeti Stereo)">
                    External USB Microphone (Yeti Stereo)
                  </option>
                  <option value="System Default Audio Device">
                    System Default Audio Device
                  </option>
                </select>
                <span className="select-chevron">▾</span>
              </div>
            </label>

            {/* Live Interactive Equalizer Meter */}
            <div className="audio-meter-container">
              <div className="meter-label-row">
                <span className="meter-title">LIVE INPUT SIGNAL</span>
                <span className="meter-value">
                  {micTesting ? "DETECTING LEVELS (-12 dB)" : "HEALTHY (-18 dB)"}
                </span>
              </div>

              <div className={`audio-bars-meter ${micTesting ? "active-testing" : ""}`}>
                {[12, 28, 45, 60, 75, 90, 85, 70, 55, 40, 65, 80, 50, 30, 20, 10].map((h, i) => (
                  <span
                    key={i}
                    className="meter-bar-segment"
                    style={{
                      height: micTesting ? `${Math.min(100, h * 1.3)}%` : `${h}%`,
                      animationDelay: `${(i % 5) * 0.12}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="device-status-indicator">
              <span className="status-check-icon">✓</span>
              <span className="status-check-text">
                {micTesting
                  ? "Analyzing frequency spectrum..."
                  : "Test passed · voice detected and clear"}
              </span>
            </div>

            <button
              type="button"
              className="test-device-btn"
              onClick={handleTestMic}
              disabled={micTesting}
            >
              {micTesting ? "Testing microphone..." : "Test microphone again →"}
            </button>

            <p className="device-footnote">
              Permission granted · input level is calibrated for clear speech.
            </p>
          </Panel>

          {/* Card 2: Check your camera */}
          <Panel className="consent-panel device-panel camera-panel">
            <div className="panel-header-row">
              <h2>Check your camera</h2>
              <span className="stream-badge-teal">▪ 720P · 30 FPS</span>
            </div>

            <label className="device-select-box">
              <small>VIDEO INPUT</small>
              <div className="select-wrap">
                <select
                  value={selectedCam}
                  onChange={(e) => setSelectedCam(e.target.value)}
                  className="modern-device-select"
                >
                  <option value="Integrated HD Camera (1280x720)">
                    Integrated HD Camera (Built-in)
                  </option>
                  <option value="External USB Webcam (Logitech C920)">
                    External USB Webcam (Logitech C920)
                  </option>
                  <option value="System Default Video Capture">
                    System Default Video Capture
                  </option>
                </select>
                <span className="select-chevron">▾</span>
              </div>
            </label>

            {/* Camera Preview Mirror */}
            <div className="camera-preview-wrapper">
              <img
                src="/assets/candidate-preview.jpeg"
                alt="Local camera preview"
                className="camera-mirror-img"
              />
              <span className="camera-overlay-tag">
                {camTesting ? "RE-CALIBRATING FEED..." : "You · Preview (Local Only)"}
              </span>
              <span className="camera-fps-pill">30 FPS · WEBRTC</span>
            </div>

            <div className="device-status-indicator">
              <span className="status-check-icon">✓</span>
              <span className="status-check-text">
                Camera working · permission granted
              </span>
            </div>

            <button
              type="button"
              className="test-device-btn"
              onClick={handleTestCam}
              disabled={camTesting}
            >
              {camTesting ? "Refreshing camera feed..." : "Test camera again →"}
            </button>

            <p className="device-footnote">
              Preview only. Feed is encrypted and not recorded until you enter the live room.
            </p>
          </Panel>

          {/* Card 3: Need to change a device? */}
          <Panel className="consent-panel device-help-panel">
            <small>DEVICE DIAGNOSTICS & PERMISSIONS</small>
            <h3>Need to change a device?</h3>
            <p>
              Choose another input above. If permission is denied, allow microphone and camera in your browser’s site settings, then re-test.
            </p>
            <button
              type="button"
              className="device-help-link-btn"
              onClick={() => alert("Browser permissions guide: Click the lock icon in the browser address bar, ensure Camera and Microphone are set to Allow, and refresh.")}
            >
              Permission and device help ↗
            </button>
            <div className="device-ready-strip">
              <span className="ready-dot" />
              <span>Both devices are calibrated. Continue is enabled.</span>
            </div>
          </Panel>
        </aside>
      </div>
    </Page>
  );
}
