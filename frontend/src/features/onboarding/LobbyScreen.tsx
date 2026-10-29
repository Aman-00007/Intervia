import { useState } from "react";
import { navigate } from "../../core/router";
import { Page, Panel } from "../../shared/components/UI";

export function LobbyScreen() {
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [testingAudio, setTestingAudio] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const handleTestAudio = () => {
    setTestingAudio(true);
    setTestSuccess(false);
    setTimeout(() => {
      setTestingAudio(false);
      setTestSuccess(true);
    }, 1200);
  };

  return (
    <Page
      className="candidate-lobby-page"
      eyebrow="INTERVIEW LOBBY / IV-2048"
      title="A conversation, not a test."
      subtitle="You’re ready to meet your interviewer. Your live workspace opens when you join."
      beforeTitle={
        <div className="setup-steps">
          <div className="complete">
            <b>✓</b>
            <b>Privacy & devices</b>
          </div>
          <div className="complete">
            <b>✓</b>
            <b>Resume review</b>
          </div>
          <div className="active">
            <b>●</b>
            <b>Interview lobby</b>
          </div>
        </div>
      }
    >
      <div className="figma-lobby-layout">
        {/* Left Column: Camera Preview + Media Controls + What to Expect */}
        <div className="lobby-left-column">
          {/* Participant video mirror frame */}
          <div className="lobby-video-frame">
            {videoOff ? (
              <div className="video-placeholder-off">
                <span className="placeholder-icon">📷</span>
                <span className="placeholder-text">Camera preview paused</span>
              </div>
            ) : (
              <img
                src="/assets/candidate-preview.jpeg"
                alt="Candidate video test mirror"
                className="lobby-video-img"
              />
            )}
            <div className="video-identity-overlay">
              <span className="identity-text">C-7K2 · You / preview only</span>
              {micMuted && <span className="mic-muted-pill">MIC MUTED</span>}
            </div>
          </div>

          {/* Media controls bar */}
          <div className="lobby-media-controls-bar">
            <div className="controls-left-group">
              <button
                type="button"
                className={`media-icon-btn ${micMuted ? "muted" : ""}`}
                onClick={() => setMicMuted(!micMuted)}
                title={micMuted ? "Unmute microphone" : "Mute microphone"}
                aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {micMuted ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                className={`media-icon-btn ${videoOff ? "muted" : ""}`}
                onClick={() => setVideoOff(!videoOff)}
                title={videoOff ? "Start camera" : "Pause camera"}
                aria-label={videoOff ? "Start camera" : "Pause camera"}
              >
                {videoOff ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M21 21l-3.34-3.34L16 16.27V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1.27l-3.34-3.34" />
                    <polygon points="23 7 16 12 23 17 23 7" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                className={`media-icon-btn ${showSettings ? "active" : ""}`}
                onClick={() => setShowSettings(!showSettings)}
                title="Device settings & test"
                aria-label="Device settings & test"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>

            <button
              type="button"
              className="lobby-leave-link"
              onClick={() => navigate("/candidate/consent")}
            >
              Leave
            </button>
          </div>

          {/* Device settings quick drawer if opened */}
          {showSettings && (
            <div className="lobby-settings-drawer">
              <div className="settings-drawer-header">
                <span>AUDIO / VIDEO QUICK DIAGNOSTIC</span>
                <button
                  type="button"
                  className="close-drawer-btn"
                  onClick={() => setShowSettings(false)}
                >
                  ✕
                </button>
              </div>
              <div className="audio-meter-strip">
                <div className="meter-label-row">
                  <span>Microphone level</span>
                  <span className="meter-status">{testingAudio ? "CALIBRATING..." : "HEALTHY (32dB)"}</span>
                </div>
                <div className="drawer-meter-bars">
                  <span className="dbar dbar-1"></span>
                  <span className="dbar dbar-2"></span>
                  <span className="dbar dbar-3"></span>
                  <span className="dbar dbar-4"></span>
                  <span className="dbar dbar-5"></span>
                  <span className="dbar dbar-6"></span>
                  <span className="dbar dbar-7"></span>
                  <span className="dbar dbar-8"></span>
                </div>
              </div>
              <div className="drawer-actions-row">
                <button
                  type="button"
                  className="drawer-test-btn"
                  onClick={handleTestAudio}
                  disabled={testingAudio}
                >
                  {testingAudio ? "Testing stream..." : "Verify audio hardware →"}
                </button>
                {testSuccess && <span className="test-verified-badge">✓ Verified</span>}
              </div>
            </div>
          )}

          {/* Under-video caption */}
          <p className="media-preview-caption">
            Microphone and camera are on for preview. Recording has not started.
          </p>

          {/* What to expect panel */}
          <Panel className="what-to-expect-panel">
            <h2 className="expect-title">What to expect</h2>
            <p className="expect-description">
              Introductions, technical discussion, collaborative coding and time for your questions. Your interviewer will introduce the activities in the room.
            </p>
            <div className="timeline-breakdown">
              5 MIN INTRO · 10 MIN DISCUSSION · 25 MIN CODING · 5 MIN WRAP-UP
            </div>
          </Panel>
        </div>

        {/* Right Column: Scheduled Interview + Ready to Join */}
        <div className="lobby-right-column">
          {/* Main Scheduled Interview Card */}
          <Panel className="admission-card">
            <small className="admission-eyebrow">YOUR SCHEDULED INTERVIEW</small>
            <h2 className="admission-title">Backend engineering</h2>
            <div className="admission-time">27 Oct 2026 · 14:00–14:45 UTC</div>

            <div className="admission-meta-list">
              <div className="admission-meta-row">
                <span className="meta-key">Session / candidate</span>
                <span className="meta-val mono">IV-2048 / C-7K2</span>
              </div>
              <div className="admission-meta-row">
                <span className="meta-key">Duration</span>
                <span className="meta-val">45 minutes</span>
              </div>
              <div className="admission-meta-row">
                <span className="meta-key">Language</span>
                <span className="meta-val">Python 3.11</span>
              </div>
            </div>

            <div className="interviewer-status-badge">
              <span className="presence-dot">▪</span>
              <span>Interviewer I-014 is in the room</span>
            </div>

            <p className="admission-instructions">
              The interviewer is waiting for you. Enter when you’re ready.
            </p>

            <button
              type="button"
              className="join-interview-cta-btn"
              onClick={() => navigate("/candidate/workspace")}
            >
              Join interview <span className="arrow-glyph">→</span>
            </button>

            <p className="admission-legal-note">
              Recording begins only after your saved consent and entry into the live session.
            </p>
          </Panel>

          {/* Ready to join checklist panel */}
          <Panel className="ready-to-join-card">
            <h2 className="ready-title">Ready to join</h2>

            <div className="ready-checklist">
              <div className="ready-check-row">
                <span className="check-key">Invitation</span>
                <span className="check-val">
                  <span className="teal-check">✓</span> Verified
                </span>
              </div>
              <div className="ready-check-row">
                <span className="check-key">Privacy consent</span>
                <span className="check-val">
                  <span className="teal-check">✓</span> Saved
                </span>
              </div>
              <div className="ready-check-row">
                <span className="check-key">Microphone & camera</span>
                <span className="check-val">
                  <span className="teal-check">✓</span> Working
                </span>
              </div>
              <div className="ready-check-row">
                <span className="check-key">Resume preview</span>
                <span className="check-val">
                  <span className="teal-check">✓</span> Reviewed
                </span>
              </div>
            </div>

            <button
              type="button"
              className="change-devices-link"
              onClick={() => navigate("/candidate/consent")}
            >
              Change devices or review consent →
            </button>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
