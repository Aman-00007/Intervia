import { useEffect, useRef, useState } from "react";
import { navigate } from "../../core/router";
import { Page, Panel } from "../../shared/components/UI";

export function LobbyScreen() {
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [testingAudio, setTestingAudio] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize live webcam & microphone stream in Lobby
  useEffect(() => {
    let isCancelled = false;

    async function initLobbyMedia() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
      try {
        const savedCamId = sessionStorage.getItem("intervia_selected_cam");
        const savedMicId = sessionStorage.getItem("intervia_selected_mic");

        const devices = await navigator.mediaDevices.enumerateDevices();
        const vDevs = devices.filter((d) => d.kind === "videoinput");
        const aDevs = devices.filter((d) => d.kind === "audioinput");

        const targetCam = (savedCamId && vDevs.find((d) => d.deviceId === savedCamId)) || vDevs[0];
        const targetMic = (savedMicId && aDevs.find((d) => d.deviceId === savedMicId)) || aDevs[0];

        const constraints: MediaStreamConstraints = {
          video: targetCam
            ? { deviceId: { ideal: targetCam.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: targetMic ? { deviceId: { ideal: targetMic.deviceId } } : true,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Apply initial toggle states
        stream.getAudioTracks().forEach((t) => {
          t.enabled = !micMuted;
        });
        stream.getVideoTracks().forEach((t) => {
          t.enabled = !videoOff;
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
          };
        }

        // Live Audio Equalizer for Settings drawer
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass && stream.getAudioTracks().length > 0) {
          const audioCtx = new AudioCtxClass();
          audioCtxRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 32;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioBar = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(updateAudioBar);
          };
          updateAudioBar();
        }
      } catch (err) {
        console.warn("Lobby webcam preview fallback:", err);
      }
    }

    initLobbyMedia();

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const toggleMic = () => {
    setMicMuted((prev) => {
      const next = !prev;
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = !next;
        });
      }
      return next;
    });
  };

  const toggleVideo = () => {
    setVideoOff((prev) => {
      const next = !prev;
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = !next;
        });
      }
      return next;
    });
  };

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
            <video
              ref={(node) => {
                videoRef.current = node;
                if (node && streamRef.current && node.srcObject !== streamRef.current) {
                  node.srcObject = streamRef.current;
                  node.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              className="lobby-video-stream is-live"
            />
            <div className="video-identity-overlay">
              <span className="identity-text">C-7K2 · You / live hardware stream</span>
              <span className="mic-muted-pill camera-live-pill">● WEBRTC 720P</span>
            </div>
          </div>

          {/* Media status bar: Locked for candidate proctoring */}
          <div className="lobby-media-controls-bar">
            <div className="controls-left-group">
              <div className="candidate-locked-badge-group">
                <span className="candidate-proctor-pill">
                  <span className="proctor-status-dot active" />
                  MIC LOCKED ON
                </span>
                <span className="candidate-proctor-pill">
                  <span className="proctor-status-dot active" />
                  CAM LOCKED ON
                </span>
              </div>

              <button
                type="button"
                className={`media-icon-btn ${showSettings ? "active" : ""}`}
                onClick={() => setShowSettings(!showSettings)}
                title="Device diagnostic & microphone test"
                aria-label="Device diagnostic & microphone test"
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
                  <span className="meter-status">
                    {testingAudio
                      ? "CALIBRATING..."
                      : audioLevel > 5
                      ? `LIVE INPUT (${audioLevel}%)`
                      : "CALIBRATED (SPEAK TO TEST)"}
                  </span>
                </div>
                <div className="drawer-meter-bars">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((barIdx) => {
                    const threshold = barIdx * 12;
                    const isActive = audioLevel >= threshold || testingAudio;
                    return (
                      <span
                        key={barIdx}
                        className={`dbar dbar-${barIdx} ${isActive ? "dbar-active" : ""}`}
                        style={{
                          height: isActive ? `${Math.min(100, audioLevel + 10)}%` : "20%",
                          transition: "height 0.1s ease",
                        }}
                      />
                    );
                  })}
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
                {(testSuccess || audioLevel > 15) && (
                  <span className="test-verified-badge">✓ Signal Verified</span>
                )}
              </div>
            </div>
          )}

          {/* Under-video caption */}
          <p className="media-preview-caption">
            Microphone and camera are active for preview. Recording has not started.
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
                  <span className="teal-check">✓</span> {videoOff ? "Camera paused" : "Working"}
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
