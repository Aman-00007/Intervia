import { useState } from "react";
import { Screen } from "../../core/models/screens";
import { navigate } from "../../core/router";
import { isDesktopApp } from "../../core/desktop";
import { Button, Field, Page, Panel, Status } from "../../shared/components/UI";
import { api } from "../../api"; // <-- ADDED THIS IMPORT
import { ConsentScreen } from "./ConsentScreen";
import { ResumeUpload } from "./ResumeUpload";
import { LobbyScreen } from "./LobbyScreen";

export function OnboardingView({
  screen,
}: {
  screen: Extract<Screen, "join" | "consent" | "resume" | "lobby">;
}) {
  if (screen === "join") return <Join />;
  if (screen === "consent") return <ConsentScreen />;
  if (screen === "resume") return <ResumeUpload />;
  return <LobbyScreen />;
}

function Join() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const isDesktop = isDesktopApp();

  // --- MODIFIED: Connected to Backend Verification ---
  const handleVerify = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Please paste the security code from your interview invitation.");
      return;
    }
    setError("");
    setIsVerifying(true);
    
    try {
      // Call backend to verify the code exists in the database
      const res = await api.verifyInviteCode(trimmed);
      
      if (res && res.valid) {
        sessionStorage.setItem("active_interview_code", trimmed);
        navigate("/candidate/consent");
      } else {
        setError(res?.message || "Invalid or expired interview code.");
      }
    } catch (err) {
      // HACKATHON FALLBACK: If backend fails, still let the demo code through
      if (trimmed === "IV-2048") {
        sessionStorage.setItem("active_interview_code", trimmed);
        navigate("/candidate/consent");
      } else {
        setError("Could not verify code. Please check your connection.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleQuickDemo = () => {
    setCode("IV-2048");
    setError("");
  };

  return (
    <Page
      className={`join-page ${isDesktop ? "desktop-join-page" : ""}`}
      eyebrow={
        isDesktop
          ? "PROCTORED DESKTOP CLIENT / INVITATION VERIFICATION"
          : "INVITATION ACCESS / NO ACCOUNT REQUIRED WHEN PERMITTED"
      }
      title={
        <>
          Your invitation.
          <br />
          Your next opportunity.
        </>
      }
    >
      <p className="page-intro">
        Paste the unique security code from your interview invitation.
      </p>

      {isDesktop && (
        <div className="desktop-proctor-banner">
          <span className="proctor-shield-icon">🛡️</span>
          <div className="proctor-banner-text">
            <b>Intervia Secure Desktop Environment Active</b>
            <span>
              Process isolation, second-screen lockout, and tamper-evident event
              logging are active for this session.
            </span>
          </div>
        </div>
      )}

      <Panel className="invitation-panel">
        <small className="panel-eyebrow">INTERVIA / INVITATION VERIFICATION</small>

        <div className="join-code-field-card">
          <span className="join-code-label">INTERVIEW SECURITY CODE</span>
          <input
            type="text"
            className="join-code-input"
            placeholder="Paste your invitation code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleVerify();
              }
            }}
            autoFocus
          />
        </div>

        <div className="invitation-action-row">
          <p className="join-help-copy">
            Use the code exactly as provided. If it’s invalid or expired, check
            the invitation or request a new code from your recruiter.
          </p>
          {!code && (
            <button
              type="button"
              className="demo-code-btn"
              onClick={handleQuickDemo}
            >
              Use demo code IV-2048
            </button>
          )}
        </div>

        <button
          type="button"
          className="join-verify-btn"
          onClick={handleVerify}
          disabled={isVerifying}
        >
          {isVerifying ? "Verifying invitation code..." : "Verify code & continue →"}
        </button>

        {error && <div className="error">{error}</div>}

        <div className="join-panel-divider" />

        <div className="code-help-section">
          <h3 className="code-help-title">Where do I find my code?</h3>
          <p className="code-help-text">
            Look in your recruiter’s interview email or invitation message. This
            code is not your account password.
          </p>
          <div className="code-help-links-row">
            {!isDesktop ? (
              <>
                <a
                  className="code-help-link"
                  onClick={() =>
                    alert(
                      "Please check your email invitation for recruiter contact details.",
                    )
                  }
                >
                  Contact your recruiter ↗
                </a>
                <a
                  className="code-help-link"
                  onClick={() =>
                    alert("Technical support is available 24/7 at support@intervia.io")
                  }
                >
                  Contact support ↗
                </a>
                <a
                  className="code-help-link"
                  onClick={() => navigate("/candidate/login")}
                >
                  Candidate login →
                </a>
              </>
            ) : (
              <span className="desktop-code-note">
                Desktop app is locked to this interview session. Once verified, you
                will proceed directly to privacy consent & device checks.
              </span>
            )}
          </div>
        </div>
      </Panel>

      <small className="setup-label">
        VERIFICATION DOES NOT START RECORDING
      </small>
      <div className="setup-steps">
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
      <p className="setup-copy">
        Successful verification takes you to privacy consent and
        microphone/camera checks, then resume review and the interview lobby.
        <br />
        Recording starts only after consent and live session entry.
      </p>
    </Page>
  );
}