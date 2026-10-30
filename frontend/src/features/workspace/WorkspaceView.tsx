import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { Screen } from "../../core/models/screens";
import { navigate } from "../../core/router";
import { Button, Page, Panel } from "../../shared/components/UI";
import { WebSocketProvider } from "../../core/WebSocketProvider";
import {
  getCandidateAIVisibility,
  setCandidateAIVisibility,
} from "../../core/interviewSettings";
import { MonacoEditor } from "./MonacoEditor";
import { TestResultsConsole } from "./TestResultsConsole";
import { useAntiCheatSandbox } from "./hooks/useAntiCheatSandbox";
import { HmacLogEntry, securityAuditLogger } from "../offline/HmacChainLogger";
// --- NEW IMPORTS FOR BLACK BOX ---
import { MediaRecorderSync } from "../offline/MediaRecorderSync";
import { uploadChunks } from "../offline/ChunkUploader";

export function WorkspaceView({
  screen,
}: {
  screen: Extract<
    Screen,
    | "interviewer-workspace"
    | "candidate-hidden"
    | "candidate-shared"
    | "recovery"
  >;
}) {
  if (screen === "recovery") {
    return <RecoveryWorkspaceContent />;
  }

  const [candidateVisible, setCandidateVisible] = useState(
    getCandidateAIVisibility,
  );

  useEffect(() => {
    const syncCandidateVisibility = () => {
      setCandidateVisible(getCandidateAIVisibility());
    };

    window.addEventListener("storage", syncCandidateVisibility);
    window.addEventListener("intervia:ai-visibility-change", syncCandidateVisibility);
    return () => {
      window.removeEventListener("storage", syncCandidateVisibility);
      window.removeEventListener("intervia:ai-visibility-change", syncCandidateVisibility);
    };
  }, []);

  const isInterviewer = screen === "interviewer-workspace";
  const isCandidateShared = screen === "candidate-shared" || (!isInterviewer && candidateVisible);

  // GET REAL SESSION ID FROM LOCAL STORAGE
  const sessionId = localStorage.getItem("intervia_session_id") || "00000000-0000-4000-8000-000000000000";

  return (
    <WebSocketProvider sessionId={sessionId}>
      <WorkspaceContent
        interviewer={isInterviewer}
        shared={isCandidateShared}
        sessionId={sessionId}
      />
    </WebSocketProvider>
  );
}

function WorkspaceContent({
  interviewer,
  shared,
  sessionId,
}: {
  interviewer: boolean;
  shared: boolean;
  sessionId: string;
}) {
  const [code, setCode] = useState(`def merge_intervals(intervals):
    ordered = sorted(intervals, key=lambda pair: pair[0])
    merged = [ordered[0][:]]

    for start, end in ordered[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])

    return merged`);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [sharingEnabled, setSharingEnabled] = useState(getCandidateAIVisibility());
  const [candidateShowAI, setCandidateShowAI] = useState(true);
  const candidateWorkspace = !interviewer;

  const [approvedClarification, setApprovedClarification] = useState(
    "Closed intervals [1,3] and [3,5] share an endpoint and belong in one interval."
  );
  const [nemotronOutput, setNemotronOutput] = useState(
    "Run #2: 6/8 verified. Endpoint equality is not covered by the current comparison. Ask the candidate to explain the boundary contract."
  );
  const [nemotronLoading, setNemotronLoading] = useState(false);
  const [nemotronPrompt, setNemotronPrompt] = useState("");
  const [stagedToast, setStagedToast] = useState("");
  const [privateNote, setPrivateNote] = useState("");

  // --- NEW: BLACK BOX STATE ---
  const [isWifiOffline, setIsWifiOffline] = useState(false);
  const recorderRef = useRef<MediaRecorderSync | null>(null);

  // --- CONNECT YJS & WEBRTC WEBSOCKETS ---
  useEffect(() => {
    // 1. Yjs Collaborative Editor Sync
    const yjsWs = new WebSocket(`ws://localhost:8000/v1/workspace/ws/yjs/${sessionId}`);
    yjsWs.onopen = () => console.log("Yjs WS Connected");
    yjsWs.onmessage = (event) => {
      console.log("Yjs Update received");
    };

    // 2. WebRTC Signaling
    const webrtcWs = new WebSocket(`ws://localhost:8000/v1/workspace/ws/webrtc/${sessionId}`);
    webrtcWs.onmessage = (event) => {
      console.log("WebRTC Signal received");
    };

    return () => {
      yjsWs.close();
      webrtcWs.close();
    };
  }, [sessionId]);

  // Tab Switch Security & Proctor Sandbox (HackerRank-style)
  const {
    tabSwitchCount,
    maxAllowedSwitches,
    isDisqualified,
    showWarningModal,
    modalReason,
    lastAwayDuration,
    dismissWarning,
    resetViolations,
    enterFullscreen,
  } = useAntiCheatSandbox({
    enabled: candidateWorkspace,
    maxAllowedSwitches: 3,
    onViolation: (entry) => {
      api.logSecurityEvent({
        session_id: sessionId,
        event_type: entry.eventType,
        timestamp: entry.timestamp,
        details: JSON.parse(entry.payload),
      }).catch(console.error);
    }
  });

  // Local Webcam Stream for Workspace WebRTC Rail
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const [localCamActive, setLocalCamActive] = useState(false);

  const toggleMicrophone = () => {
    setMicrophoneEnabled((prev) => {
      const next = !prev;
      if (activeStreamRef.current) {
        activeStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = next;
        });
      }
      return next;
    });
  };

  const toggleCamera = () => {
    setCameraEnabled((prev) => {
      const next = !prev;
      if (activeStreamRef.current) {
        activeStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = next;
        });
      }
      setLocalCamActive(next);
      return next;
    });
  };

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    async function startWorkspaceCam() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vDevs = devices.filter((d) => d.kind === "videoinput");
        const aDevs = devices.filter((d) => d.kind === "audioinput");
        const savedCamId = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("intervia_selected_cam") : null;
        const savedMicId = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("intervia_selected_mic") : null;
        const savedCam = savedCamId ? vDevs.find((d) => d.deviceId === savedCamId) : null;
        const savedMic = savedMicId ? aDevs.find((d) => d.deviceId === savedMicId) : null;
        const physicalCam =
          savedCam ||
          vDevs.find((d) => {
            const l = (d.label || "").toLowerCase();
            const isVirt =
              l.includes("virtual") ||
              l.includes("m33") ||
              l.includes("phone link") ||
              l.includes("droidcam") ||
              l.includes("obs");
            return (
              !isVirt &&
              (l.includes("integrated") ||
                l.includes("built-in") ||
                l.includes("builtin") ||
                l.includes("webcam") ||
                l.includes("hd camera") ||
                l.includes("camera"))
            );
          }) ||
          vDevs.find((d) => {
            const l = (d.label || "").toLowerCase();
            return !l.includes("virtual") && !l.includes("m33") && !l.includes("obs");
          }) ||
          vDevs[0];

        const constraints: MediaStreamConstraints = {
          video: physicalCam
            ? { deviceId: { ideal: physicalCam.deviceId }, width: { ideal: 640 }, height: { ideal: 360 } }
            : { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: "user" },
          audio: savedMic ? { deviceId: { ideal: savedMic.deviceId } } : true,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = stream;
        activeStreamRef.current = stream;
        stream.getAudioTracks().forEach((track) => {
          track.enabled = microphoneEnabled;
        });
        stream.getVideoTracks().forEach((track) => {
          track.enabled = cameraEnabled;
        });
        setLocalCamActive(cameraEnabled && stream.getVideoTracks().length > 0);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.onloadedmetadata = () => {
            localVideoRef.current?.play().catch(() => {});
          };
        }

        // --- NEW: START THE BLACK BOX RECORDER ---
        recorderRef.current = new MediaRecorderSync();
        recorderRef.current.start(stream);

      } catch (err) {
        console.warn("Workspace camera fallback to still photo:", err);
        setLocalCamActive(false);
      }
    }
    startWorkspaceCam();
    return () => {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recorderRef.current) {
        recorderRef.current.stop();
      }
    };
  }, []);

  // --- NEW: HANDLE SIMULATED WI-FI DROP / RECONNECT ---
  const handleToggleWifi = async () => {
    const nextOfflineState = !isWifiOffline;
    setIsWifiOffline(nextOfflineState);

    if (recorderRef.current) {
      recorderRef.current.setOffline(nextOfflineState);
    }

    // If we just came back online, sync the buffered chunks!
    if (!nextOfflineState && recorderRef.current) {
      const pendingChunks = recorderRef.current.getPendingChunks();
      if (pendingChunks.length > 0) {
        setStagedToast(`🔄 Reconnected. Syncing ${pendingChunks.length} media chunks...`);
        await uploadChunks(pendingChunks, sessionId);
        recorderRef.current.clear();
        setTimeout(() => setStagedToast("✅ Offline Media Synced to Backend!"), 3000);
      }
    }
  };

  // Interviewer Real-Time Integrity Alerts & Cryptographic Chain State
  const [securityAlerts, setSecurityAlerts] = useState<HmacLogEntry[]>(() => {
    return securityAuditLogger.getEntries().reverse();
  });
  const [showSecurityDrawer, setShowSecurityDrawer] = useState(false);
  const [activeAlertToast, setActiveAlertToast] = useState<HmacLogEntry | null>(null);

  useEffect(() => {
    if (!interviewer) return;
    const handleViolation = (e: Event) => {
      const customEvt = e as CustomEvent<HmacLogEntry>;
      if (customEvt.detail) {
        setSecurityAlerts((prev) => [customEvt.detail, ...prev]);
        setActiveAlertToast(customEvt.detail);
        setTimeout(() => setActiveAlertToast(null), 6000);
      }
    };
    window.addEventListener("intervia:security_violation", handleViolation);
    return () => window.removeEventListener("intervia:security_violation", handleViolation);
  }, [interviewer]);

  const handleSimulateViolation = () => {
    const nextCount = Math.min(3, (tabSwitchCount || 0) + 1);
    securityAuditLogger.append("TAB_SWITCH", {
      durationSeconds: 3.4,
      violationAttempt: nextCount,
      maxAllowed: 3,
      simulated: true,
    });
  };

  const [isRunningCode, setIsRunningCode] = useState(false);

  const handleRunCode = async () => {
    setIsRunningCode(true);
    try {
      const res = await api.runCode({
        session_id: sessionId,
        language: "python",
        source_code: code,
        stdin: ""
      });
      alert(`Tests Passed: ${res.passed}\nOutput: ${res.stdout || "Success"}`);
    } catch (err) {
      alert("Code execution failed. Check backend.");
    } finally {
      setIsRunningCode(false);
    }
  };

    
  const handleRunNemotron = async (query: string) => {
    setNemotronLoading(true);
    try {
      const res = await api.askSharedAi({
        session_id: sessionId,
        prompt_text: query,
        current_code_snapshot: code,
        sandbox_error_context: "Run #2 failed on touching endpoints.",
      });
      if (res && res.response_text) {
        setNemotronOutput(res.response_text);
      }
    } catch {
      setNemotronOutput("AI assistant is temporarily unavailable. Check backend.");
    } finally {
      setNemotronLoading(false);
    }
  };
    

  const handleStageClarification = (hintText: string) => {
    let cleanHint = hintText;
    if (hintText.includes("Approved Candidate Hint")) {
      cleanHint = hintText.split("\n").slice(1).join(" ").trim();
    }
    setApprovedClarification(cleanHint);
    setStagedToast("✓ Staged for candidate sharing");
    setTimeout(() => setStagedToast(""), 3500);
  };

  useEffect(() => {
    const handleVis = () => {
      setSharingEnabled(getCandidateAIVisibility());
    };
    window.addEventListener("storage", handleVis);
    window.addEventListener("intervia:ai-visibility-change", handleVis);
    return () => {
      window.removeEventListener("storage", handleVis);
      window.removeEventListener("intervia:ai-visibility-change", handleVis);
    };
  }, []);

  const updateSharing = async () => {
    const nextSharingEnabled = !sharingEnabled;
    setSharingEnabled(nextSharingEnabled);
    if (interviewer) {
      setCandidateAIVisibility(nextSharingEnabled);
      await api.toggleAiSharing({ session_id: sessionId, is_shared: nextSharingEnabled });
    }
  };

  const showCandidateAIRail = candidateWorkspace && (shared || sharingEnabled) && candidateShowAI;

  // --- MODIFIED: DYNAMIC SYNC BADGE ---
  const syncBadge = (
    <div 
      className="workspace-sync-pill" 
      style={{ 
        background: isWifiOffline ? "rgba(239, 68, 68, 0.1)" : "rgba(23, 195, 178, 0.1)", 
        borderColor: isWifiOffline ? "#ef4444" : "#17c3b2" 
      }}
    >
      <span className="sync-dot" style={{ color: isWifiOffline ? "#ef4444" : "#17c3b2" }}>■</span>
      <span>{isWifiOffline ? "OFFLINE BUFFER ACTIVE" : "Yjs / WebSocket · synchronized"}</span>
    </div>
  );

  const headerActions = (
    <div className="workspace-header-actions">
      <span className="session-timer">23:48 / 45:00</span>
      
      {/* --- NEW: HACKATHON DEMO BUTTON --- */}
      <button
        type="button"
        onClick={handleToggleWifi}
        style={{
          background: isWifiOffline ? "#ef4444" : "#1c1c1c",
          color: isWifiOffline ? "#fff" : "#ccc",
          border: "1px solid " + (isWifiOffline ? "#ef4444" : "#333"),
          padding: "6px 12px",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: 600,
          marginRight: "8px"
        }}
      >
        {isWifiOffline ? "🔴 Simulate Wi-Fi Return" : "⚡ Simulate Wi-Fi Drop"}
      </button>

      {interviewer ? (
        <>
          <button
            type="button"
            className={`proctor-chain-badge ${securityAlerts.length > 0 ? "has-alerts" : ""}`}
            onClick={() => setShowSecurityDrawer(!showSecurityDrawer)}
            title="View Tamper-Evident HMAC Integrity Chain"
          >
            <span className="proctor-shield-icon">🛡️</span>
            <span>Audit Chain ({securityAlerts.length})</span>
          </button>
          <button
            type="button"
            className="simulate-violation-btn"
            onClick={handleSimulateViolation}
            title="Simulate candidate tab switch to test anti-cheat detection"
          >
            ⚡ Test Tab Switch
          </button>
          <Button onClick={handleRunCode} disabled={isRunningCode} className="workspace-btn btn-run">
            {isRunningCode ? "Running..." : "Run tests →"}
          </Button>
          <Button secondary className="workspace-btn btn-end" onClick={() => navigate("/interviewer")}>End interview →</Button>
        </>
      ) : (
        <>
          {(shared || sharingEnabled) && (
            <button
              type="button"
              className={`candidate-ai-toggle-btn ${candidateShowAI ? "active" : ""}`}
              onClick={() => setCandidateShowAI(!candidateShowAI)}
              title="Toggle shared AI window"
            >
              <span className="ai-dot-indicator">●</span> {candidateShowAI ? "Shared AI: ON" : "Shared AI: OFF"}
            </button>
          )}
          <Button onClick={handleRunCode} disabled={isRunningCode} className="candidate-run-btn workspace-btn">
            {isRunningCode ? "Running..." : "Run tests →"}
          </Button>
          <Button secondary className="candidate-submit-btn workspace-btn">Submit code →</Button>
        </>
      )}
    </div>
  );

  return (
    <Page
      className="workspace-page"
      eyebrow="IV-2048 / C-7K2 · BACKEND ENGINEERING"
      title="The interview room"
      subtitle={syncBadge}
      headerRight={headerActions}
    >
      <div className={`workspace-grid ${showCandidateAIRail ? "candidate-shared-grid" : ""}`}>
        {/* Column 1: Shared code and discussion */}
        <section className="editor-section">
          <Panel className="problem-panel">
            <small>
              INTERVIEWER-ASSIGNED / COLLABORATIVE CODING DISCUSSION
            </small>
            <h2>Merge overlapping intervals</h2>
            <p>
              Merge closed intervals, including touching endpoints. Return a new
              list sorted by start without mutating the input.
            </p>
            <div className="examples">
              <code>[[1,3],[2,6],[8,10]] → [[1,6],[8,10]]</code>
              <code>[[1,3],[3,5]] → [[1,5]]</code>
            </div>
          </Panel>
          <Panel className="editor-panel">
            <div className="editor-meta">
              <span className="editor-file-badge">⌘ solution.py</span>
              <div className="editor-lang-group">
                <select aria-label="Programming language" className="editor-lang-select">
                  <option>Python 3.11</option>
                  <option>TypeScript</option>
                  <option>Java 21</option>
                </select>
                <span className="editor-charset">· UTF-8</span>
              </div>
            </div>
            <MonacoEditor
              value={code}
              onChange={setCode}
              preventClipboard={candidateWorkspace}
              onClipboardBlocked={(action) => {
                securityAuditLogger.append("CLIPBOARD_RESTRICTED", {
                  action,
                  user: candidateWorkspace ? "C-7K2" : "I-014",
                });
                api.logSecurityEvent({
                  session_id: sessionId,
                  event_type: "CLIPBOARD_RESTRICTED",
                  timestamp: new Date().toISOString(),
                  details: { action }
                }).catch(console.error);
              }}
            />
            <div className="editor-footer">
              MONACO / YJS · BOTH PARTICIPANTS SYNCHRONIZED{" "}
              <span>Ln 10 · Col 19</span>
            </div>
          </Panel>
          <TestResultsConsole />
        </section>

        {/* Column 2: WebRTC / Conversation Rail */}
        <aside className={`workspace-rail conversation-rail ${candidateWorkspace ? "candidate-rail" : ""}`}>
          <div className="rail-heading-row">
            <small>INTERVIEW ROOM / WEBRTC</small>
            <span className="live-pill">▪ Connected</span>
          </div>
          <Panel className="participant-panel">
            <div className="video-stack">
              <img
                src="/assets/participant-preview.jpeg"
                alt={candidateWorkspace ? "Interviewer video" : "Candidate video"}
                className="main-video-feed"
              />
              <span className="video-tag">{candidateWorkspace ? "Interviewer I-014" : "C-7K2 · Candidate"}</span>
            </div>
            <div className="self-video-row">
              <div className="self-video">
                {cameraEnabled && localCamActive ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="self-video-stream is-live"
                  />
                ) : !cameraEnabled ? (
                  <div className="self-video-paused">
                    <span className="paused-cam-icon">📷</span>
                    <span>Cam Paused</span>
                  </div>
                ) : (
                  <img
                    src="/assets/candidate-preview.jpeg"
                    alt="Self video fallback"
                    className="self-video-fallback-img"
                  />
                )}
                <span className="self-video-badge">You · {candidateWorkspace ? "C-7K2" : "I-014"}</span>
              </div>
              <div className="self-video-info">
                <small>{`MIC ${microphoneEnabled ? "ON" : "OFF"} / CAM ${cameraEnabled ? "ON" : "OFF"} · WEBRTC`}</small>
                <p>{!cameraEnabled ? "Camera paused by user" : !microphoneEnabled ? "Microphone muted" : "Live webcam feed active · encrypted stream"}</p>
              </div>
            </div>

            {/* Media Controls for Participants */}
            <div className="participant-controls">
              <button
                type="button"
                className={microphoneEnabled ? "device-control active" : "device-control muted"}
                onClick={toggleMicrophone}
                aria-pressed={microphoneEnabled}
                aria-label="Toggle microphone"
                title={microphoneEnabled ? "Mute microphone" : "Unmute microphone"}
              >
                <MicIcon />
              </button>
              <button
                type="button"
                className={cameraEnabled ? "device-control active" : "device-control muted"}
                onClick={toggleCamera}
                aria-pressed={cameraEnabled}
                aria-label="Toggle camera"
                title={cameraEnabled ? "Pause camera" : "Start camera"}
              >
                <CameraIcon />
              </button>
              <button type="button" className="device-control" aria-label="Open video settings">
                <SettingsIcon />
              </button>
              <button
                type="button"
                className="end-session"
                onClick={() => navigate(candidateWorkspace ? "/candidate" : "/interviewer")}
              >
                {candidateWorkspace ? "Leave" : "End session"}
              </button>
            </div>
          </Panel>

          {/* Conversation agenda card for Candidate */}
          {candidateWorkspace && (
            <Panel className="agenda-panel">
              <h3>Conversation agenda</h3>
              <div className="agenda-item active">
                <span className="agenda-title">Coding discussion</span>
                <span className="agenda-badge in-progress">In progress</span>
              </div>
              <div className="agenda-item">
                <span className="agenda-title">Wrap-up</span>
                <span className="agenda-badge up-next">Up next</span>
              </div>
              <p className="agenda-note">
                Explain your approach and discuss the result with your interviewer.
              </p>
            </Panel>
          )}

          {/* Interviewer-specific panels */}
          {interviewer && (
            <>
              <Panel className="ai-panel nemotron-ai-panel">
                <div className="nemotron-header">
                  <div className="nemotron-title-col">
                    <h2>Private AI assistance</h2>
                    <div className="nemotron-chip">
                      <span className="nvidia-tag">NVIDIA</span>
                      <span className="nemotron-tag">Nemotron 3</span>
                      <span className="nemotron-active-pulse" />
                    </div>
                  </div>
                  <div className="status-pill private-pill">
                    <span className="pill-dot">🔒</span> Only you can see this
                  </div>
                </div>

                <div className="nemotron-card">
                  <div className="nemotron-card-top">
                    <small>NEMOTRON LIVE CODE AUDIT</small>
                    <span className="nemotron-context-tag">Run #2 Telemetry</span>
                  </div>
                  <div className="nemotron-card-content">
                    {nemotronLoading ? (
                      <div className="nemotron-analyzing-indicator">
                        <span className="nemotron-spin-dot" />
                        <span>NVIDIA Nemotron 3 is analyzing code & execution trace...</span>
                      </div>
                    ) : (
                      <div className="nemotron-text-stream">
                        {nemotronOutput.split("\n").map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  {!nemotronLoading && (
                    <div className="nemotron-actions-row">
                      <button
                        type="button"
                        className="btn-stage-clarification"
                        onClick={() => handleStageClarification(nemotronOutput)}
                        title="Stage this advice into Candidate-safe sharing"
                      >
                        Stage as candidate hint ↗
                      </button>
                      {stagedToast && <span className="staged-toast-badge">{stagedToast}</span>}
                    </div>
                  )}
                </div>

                {/* Quick Prompts Bar */}
                <div className="nemotron-quick-section">
                  <small>QUICK NEMOTRON QUERIES</small>
                  <div className="nemotron-quick-chips">
                    <button
                      type="button"
                      className="nemotron-chip-btn"
                      onClick={() => handleRunNemotron("Explain boundary test failure on Run #2 and line 10 condition")}
                      disabled={nemotronLoading}
                    >
                      ✦ Boundary bug
                    </button>
                    <button
                      type="button"
                      className="nemotron-chip-btn"
                      onClick={() => handleRunNemotron("Evaluate time and space complexity of merge_intervals")}
                      disabled={nemotronLoading}
                    >
                      ✦ Complexity
                    </button>
                    <button
                      type="button"
                      className="nemotron-chip-btn"
                      onClick={() => handleRunNemotron("Generate 3 targeted Socratic questions to probe candidate")}
                      disabled={nemotronLoading}
                    >
                      ✦ Socratic Qs
                    </button>
                    <button
                      type="button"
                      className="nemotron-chip-btn"
                      onClick={() => handleRunNemotron("Draft concise pedagogical hint for candidate without revealing code")}
                      disabled={nemotronLoading}
                    >
                      ✦ Candidate hint
                    </button>
                  </div>
                </div>

                {/* Interactive Custom Query Box */}
                <form
                  className="nemotron-prompt-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (nemotronPrompt.trim()) {
                      handleRunNemotron(nemotronPrompt.trim());
                      setNemotronPrompt("");
                    }
                  }}
                >
                  <input
                    type="text"
                    className="nemotron-prompt-input"
                    placeholder="Ask Nemotron about code, hints, or questions..."
                    value={nemotronPrompt}
                    onChange={(e) => setNemotronPrompt(e.target.value)}
                    disabled={nemotronLoading}
                  />
                  <button
                    type="submit"
                    className="nemotron-run-btn"
                    disabled={nemotronLoading || !nemotronPrompt.trim()}
                  >
                    Run →
                  </button>
                </form>

                <div className="nemotron-note-section">
                  <small>PRIVATE EVALUATION / NEVER SHARED</small>
                  <textarea
                    className="ai-note"
                    value={privateNote}
                    onChange={(e) => setPrivateNote(e.target.value)}
                    placeholder="Add a private evidence-led note..."
                  />
                </div>
              </Panel>

              <Panel className="sharing-panel">
                <h2>Candidate-safe sharing</h2>
                <div className="ai-sharing-control-row">
                  <span className="sharing-label">Share AI window with candidate</span>
                  <button
                    type="button"
                    className={`ai-switch-toggle ${sharingEnabled ? "is-on" : "is-off"}`}
                    role="switch"
                    aria-checked={sharingEnabled}
                    onClick={updateSharing}
                    aria-label="Toggle AI visibility for candidate"
                  >
                    <span className="ai-switch-thumb" />
                  </button>
                </div>
                <small>
                  {sharingEnabled
                    ? "ON / CANDIDATE CAN SEE SHARED NOTES"
                    : "OFF / CANDIDATE ANONYMOUS"}
                </small>
                <p className="preview-note">
                  Share only selected clarification below. Private evaluation and
                  notes are excluded.
                </p>
                <div className="selected-clarification">
                  <small>SELECTED / APPROVED CLARIFICATION</small>
                  <p>{approvedClarification}</p>
                </div>
              </Panel>
            </>
          )}
        </aside>

        {/* Column 3: Approved Shared Assistance (Shared AI Window) when candidate has shared AI active */}
        {showCandidateAIRail && (
          <aside className="workspace-rail shared-ai-rail">
            <Panel className="approved-ai-panel">
              <div className="panel-title-row">
                <h2>Shared AI window</h2>
                <span className="shared-badge">▪ Shared by interviewer</span>
              </div>
              
              <div className="clarification-block">
                <small>23:40 / APPROVED CLARIFICATION</small>
                <p className="clarification-text">
                  {approvedClarification}
                </p>
              </div>

              <div className="technical-feedback-box">
                <small>TECHNICAL FEEDBACK</small>
                <p>
                  Run #2 verifies 6 of 8 tests. Review equality at the boundary; the latest edit has not been evaluated.
                </p>
              </div>

              <p className="ai-disclaimer">
                The interviewer controls visibility. This approved clarification is visible to both participants. AI does not change your code or decide the interview outcome.
              </p>
            </Panel>

            <Panel className="human-led-panel">
              <small>HUMAN-LED CONVERSATION</small>
              <p>
                This window contains only the clarification approved by your interviewer.
              </p>
            </Panel>
          </aside>
        )}
      </div>

      {/* 1. Candidate Terminal Disqualification Modal (when 3 violations reached) */}
      {candidateWorkspace && isDisqualified && (
        <div className="anti-cheat-modal-backdrop terminal-backdrop">
          <div className="anti-cheat-modal terminal-disqualification-modal">
            <div className="terminal-icon-badge">
              <span>🚨</span>
            </div>
            <small className="terminal-eyebrow">SESSION LOCKED · PROCTOR DISQUALIFICATION</small>
            <h2 className="terminal-title">Interview Terminated (3 / 3 Violations)</h2>
            <p className="terminal-desc">
              You have exhausted the maximum limit of 3 tab switch / focus warnings. In accordance with strict competitive proctoring standards, your live interview session has been permanently locked.
            </p>

            <div className="terminal-audit-box">
              <div className="terminal-audit-row">
                <span>AUDIT RESULT:</span>
                <b className="red-tag">TERMINATED / DISQUALIFIED</b>
              </div>
              <div className="terminal-audit-row">
                <span>VIOLATIONS LOGGED:</span>
                <b>3 / 3 Warnings Exhausted</b>
              </div>
              <div className="terminal-audit-row">
                <span>HMAC CHAIN PROOF:</span>
                <span className="mono-audit-id">SEALED IN IDENTITY_VAULT</span>
              </div>
            </div>

            <p className="terminal-subtext">
              Your code snapshot, execution trace, and background away durations have been compiled and submitted to your interviewer for review.
            </p>

            <div className="terminal-actions-row">
              <button
                type="button"
                className="terminal-exit-btn"
                onClick={() => {
                  sessionStorage.removeItem("active_interview_code");
                  sessionStorage.removeItem("intervia_tab_switches");
                  navigate("/candidate");
                }}
              >
                Exit Proctored Interview →
              </button>
              <button
                type="button"
                className="terminal-reset-test-btn"
                onClick={resetViolations}
                title="Reset counter for testing and development"
              >
                ↺ Reset violations (test mode)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Candidate Warning Modal for warnings 1 and 2 (when NOT disqualified) */}
      {candidateWorkspace && !isDisqualified && showWarningModal && (
        <div className="anti-cheat-modal-backdrop">
          <div className="anti-cheat-modal">
            <button
              type="button"
              className="anti-cheat-close-x"
              onClick={dismissWarning}
              aria-label="Close modal"
              title="Close warning modal"
            >
              ✕
            </button>
            <div className="anti-cheat-icon-badge">
              <span>⚠️</span>
            </div>
            <small className="anti-cheat-eyebrow">PROCTORED EXAM SECURITY · INTEGRITY ALERT</small>
            <h2 className="anti-cheat-title">
              {modalReason === "tab_switch"
                ? "Tab Switch Violation Detected"
                : modalReason === "fullscreen_exit"
                ? "Fullscreen Mode Exited"
                : "External Paste Blocked"}
            </h2>
            <p className="anti-cheat-desc">
              {modalReason === "tab_switch"
                ? `You navigated away from the proctored interview workspace for ${lastAwayDuration} seconds. Switching tabs during evaluation is strictly monitored.`
                : modalReason === "fullscreen_exit"
                ? "Intervia requires full-screen mode to ensure a focused, unassisted technical interview."
                : "Large external copy-paste blocks are intercepted and flagged in your integrity log."}
            </p>

            <div className="anti-cheat-attempts-box">
              <div className="attempts-header">
                <span>VIOLATION ATTEMPTS</span>
                <b>
                  {tabSwitchCount} / {maxAllowedSwitches}
                </b>
              </div>
              <div className="attempts-pips">
                {[1, 2, 3].map((num) => (
                  <div
                    key={num}
                    className={`attempt-pip ${num <= tabSwitchCount ? "violated" : ""}`}
                  />
                ))}
              </div>
              <small className="attempts-warning">
                Warning {tabSwitchCount} of 3. You have {maxAllowedSwitches - tabSwitchCount} warning(s) remaining before automatic session termination.
              </small>
            </div>

            <div className="anti-cheat-audit-notice">
              <span className="chain-shield">🔒</span>
              <span>
                This event has been recorded in your session’s tamper-evident HMAC-SHA256 audit chain and broadcast in real time to your interviewer.
              </span>
            </div>

            <div className="anti-cheat-btn-group">
              <button
                type="button"
                className="anti-cheat-return-btn"
                onClick={() => {
                  dismissWarning();
                  enterFullscreen();
                }}
              >
                Re-enter Fullscreen & Return →
              </button>
              <button
                type="button"
                className="anti-cheat-secondary-btn"
                onClick={dismissWarning}
              >
                Dismiss & Return to Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Interviewer Live Security Alert Toast */}
      {interviewer && activeAlertToast && (
        <div className="interviewer-proctor-alert-toast" onClick={() => setShowSecurityDrawer(true)}>
          <div className="alert-toast-icon">⚠️</div>
          <div className="alert-toast-body">
            <b>Candidate Proctor Alert: {activeAlertToast.eventType}</b>
            <span>
              {activeAlertToast.payload} · Sequence #{activeAlertToast.sequenceId}
            </span>
          </div>
          <button type="button" className="alert-view-btn">
            View Audit Chain →
          </button>
        </div>
      )}

      {/* 3. Interviewer HMAC-SHA256 Cryptographic Audit Chain Drawer */}
      {interviewer && showSecurityDrawer && (
        <div className="proctor-drawer-backdrop" onClick={() => setShowSecurityDrawer(false)}>
          <aside className="proctor-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="proctor-drawer-header">
              <div>
                <small>PROCTORING & TAMPER-EVIDENT INTEGRITY</small>
                <h2>Cryptographic Audit Chain</h2>
              </div>
              <button
                type="button"
                className="close-drawer-btn"
                onClick={() => setShowSecurityDrawer(false)}
              >
                ✕
              </button>
            </div>

            {(() => {
              const entries = securityAuditLogger.getEntries();
              const verification = securityAuditLogger.verifyChain();
              return (
                <div className="proctor-drawer-content">
                  <div className={`chain-status-banner ${verification.valid ? "status-valid" : "status-compromised"}`}>
                    <span className="chain-icon">{verification.valid ? "🛡️" : "⚠️"}</span>
                    <div>
                      <b>{verification.valid ? "HMAC-SHA256 Chain 100% Valid" : "Tampering Detected"}</b>
                      <span>
                        {verification.valid
                          ? `${verification.totalEntries || entries.length} entries cryptographically verified against server seed.`
                          : verification.reason}
                      </span>
                    </div>
                  </div>

                  <div className="chain-actions-bar">
                    <span className="chain-count-label">Recorded Events ({entries.length})</span>
                    <button
                      type="button"
                      className="chain-simulate-btn"
                      onClick={handleSimulateViolation}
                    >
                      + Simulate Tab Switch
                    </button>
                  </div>

                  {entries.length === 0 ? (
                    <div className="empty-chain-state">
                      <p>No integrity violations recorded yet for this session.</p>
                      <small>Candidate is currently focused inside the proctored window.</small>
                    </div>
                  ) : (
                    <div className="chain-entries-list">
                      {[...entries].reverse().map((entry) => (
                        <div key={entry.sequenceId} className="chain-entry-card">
                          <div className="chain-entry-header">
                            <span className="entry-seq">#{entry.sequenceId}</span>
                            <span className="entry-type-pill">{entry.eventType}</span>
                            <span className="entry-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div className="chain-entry-payload">
                            <code>{entry.payload}</code>
                          </div>
                          <div className="chain-entry-hashes">
                            <small>
                              HASH: <span className="mono-hash">{entry.currentHash.substring(0, 16)}...</span>
                            </small>
                            <small>
                              PREV: <span className="mono-hash">{entry.previousHash.substring(0, 16)}...</span>
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </aside>
        </div>
      )}

      {/* --- NEW: BLACK BOX SYNC TOAST --- */}
      {stagedToast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#17c3b2", color: "#000", padding: "12px 20px", borderRadius: 8, fontWeight: 700, zIndex: 9999 }}>
          {stagedToast}
        </div>
      )}

    </Page>
  );
}

function RecoveryWorkspaceContent() {
  const [code, setCode] = useState(`def merge_intervals(intervals):
    """Merge closed intervals without changing the input."""
    if not intervals:
        return []

    ordered = sorted(intervals, key=lambda pair: pair[0])
    merged = [ordered[0][:]]

    for start, end in ordered[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])

    return merged

# Check touching endpoints and non-mutating behavior
print(merge_intervals([[1, 3], [3, 5]]))`);

  const recoverySubtitle = (
    <div className="recovery-status-pill">
      <span className="recovery-dot" /> Reconciliation in progress
    </div>
  );

  const recoveryHeaderActions = (
    <div className="workspace-header-actions">
      <span className="session-timer">26:10 / 45:00</span>
      <Button secondary className="recovery-action-btn">
        Run queued · 1 →
      </Button>
      <Button secondary className="recovery-action-btn">
        Submit after sync →
      </Button>
    </div>
  );

  return (
    <Page
      className="workspace-page recovery-page"
      eyebrow="IV-2048 / C-7K2 · BACKEND ENGINEERING"
      title="The interview room"
      subtitle={recoverySubtitle}
      headerRight={recoveryHeaderActions}
    >
      {/* Connection restored alert */}
      <div className="connection-restored-alert">
        <div className="recovery-message">
          <h2>Connection restored. Your progress stayed with you.</h2>
          <p>Offline 24:00–26:10 · code synced · media uploading. Keep this tab open.</p>
        </div>
        <div className="media-upload-progress">
          <div className="progress-label">
            <span>18 / 26 CHUNKS · 69%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: "69%" }} />
          </div>
        </div>
      </div>

      {/* Main 2-column grid: Code/Console + Reconnecting Rail (Video + Saved Clarification) */}
      <div className="workspace-grid recovery-grid">
        {/* Column 1: Editor & Console */}
        <section className="editor-section">
          <Panel className="problem-panel">
            <small>INTERVIEWER-ASSIGNED / COLLABORATIVE CODING DISCUSSION</small>
            <h2>Merge overlapping intervals</h2>
            <p>
              Merge closed intervals, including touching endpoints. Return a new
              list sorted by start without mutating the input.
            </p>
            <div className="examples">
              <code>[[1,3],[2,6],[8,10]] → [[1,6],[8,10]]</code>
              <code>[[1,3],[3,5]] → [[1,5]]</code>
            </div>
          </Panel>

          <Panel className="editor-panel">
            <div className="editor-meta">
              <span className="editor-file-badge">⌘ solution.py</span>
              <div className="editor-lang-group">
                <select aria-label="Programming language" className="editor-lang-select">
                  <option>Python 3.11</option>
                  <option>TypeScript</option>
                  <option>Java 21</option>
                </select>
                <span className="editor-charset">· UTF-8</span>
              </div>
            </div>
            <MonacoEditor
              value={code}
              onChange={setCode}
              preventClipboard={true}
              onClipboardBlocked={(action) => {
                securityAuditLogger.append("CLIPBOARD_RESTRICTED", {
                  action,
                  user: "C-7K2",
                });
              }}
            />
            <div className="editor-footer">
              SERVER CODE ACKNOWLEDGED · LOCAL COPY RETAINED{" "}
              <span>Ln 18 · Col 39</span>
            </div>
          </Panel>

          <TestResultsConsole isRecovery />
        </section>

        {/* Column 2: Reconnecting Video + Reconnection Event Chain */}
        <aside className="workspace-rail recovery-rail">
          <div className="rail-heading-row">
            <small>INTERVIEW ROOM / WEBRTC</small>
            <span className="reconnecting-pill">▪ Reconnecting</span>
          </div>

          <Panel className="participant-panel recovery-participant-panel">
            <div className="video-stack">
              <img
                src="/assets/participant-preview.jpeg"
                alt="Interviewer video reconnecting"
                className="main-video-feed"
              />
              <span className="video-tag">Interviewer I-014 · Reconnecting / Last frame</span>
            </div>
            <div className="self-video-row">
              <div className="self-video">
                <span className="self-video-badge">You · C-7K2</span>
              </div>
              <div className="self-video-info">
                <small>MIC ON / CAM ON</small>
                <p>Local capture active. Remote media reconnecting.</p>
              </div>
            </div>
            <div className="candidate-media-footer">
              <div className="proctor-stream-status">
                <span className="proctor-dot warning" />
                <span>LOCAL BUFFER ACTIVE · RECONNECTING</span>
              </div>
              <button
                type="button"
                className="leave-session-btn"
                onClick={() => navigate("/candidate")}
              >
                Leave
              </button>
            </div>
          </Panel>

          {/* Approved clarification panel retained during offline buffer */}
          <Panel className="approved-ai-panel recovery-ai-panel">
            <div className="panel-title-row">
              <h2>Shared AI window</h2>
              <span className="shared-badge">▪ Shared by interviewer</span>
            </div>
            
            <div className="clarification-block">
              <small>23:40 / APPROVED CLARIFICATION</small>
              <p className="clarification-text">
                Closed intervals [1,3] and [3,5] share an endpoint and belong in
                one interval.
              </p>
            </div>

            <div className="technical-feedback-box">
              <small>TECHNICAL FEEDBACK</small>
              <p>
                Run #2 verifies 6 of 8 tests. Review equality at the boundary; the latest edit has not been evaluated.
              </p>
            </div>

            <p className="ai-disclaimer">
              Saved clarification remains available. New remote AI requests are paused until reconciliation completes.
            </p>
          </Panel>
        </aside>
      </div>

      {/* Bottom Offline Event Chain & Audit Grid */}
      <div className="recovery-audit-grid">
        <Panel className="audit-card">
          <small>OFFLINE HISTORY / BUFFERED ACTIONS</small>
          <h3>Your local history, in order.</h3>
          <ul className="offline-event-list">
            <li><span>24:00</span> Local buffering started</li>
            <li><span>25:40–26:10</span> Code, events and media retained</li>
            <li><span>26:10</span> Connection returned; run #3 awaiting sync</li>
          </ul>
          <p className="audit-card-footer">
            2m 10s buffered locally. 5m 50s remained in this session's 8-minute buffer. Supported buffering range: 5–10 minutes.
          </p>
          <small className="audit-legal-note">
            No remote AI or Judge0 execution occurred while disconnected. New requests wait until reconciliation completes.
          </small>
        </Panel>

        <Panel className="audit-card">
          <small>HMAC-SHA256 / TAMPER-EVIDENT EVENT CHAIN</small>
          <h3>Your work is catching up.</h3>
          <div className="chain-stats-list">
            <div className="chain-stat-row">
              <span>Code edits</span>
              <b>46 / 46 synced</b>
            </div>
            <div className="chain-stat-row">
              <span>Tab events</span>
              <b>2 / 2 synced</b>
            </div>
            <div className="chain-stat-row">
              <span>5-second media chunks</span>
              <b>18 / 26 uploaded</b>
            </div>
            <div className="chain-stat-row">
              <span>Event chain</span>
              <b>46 / 46 verified</b>
            </div>
          </div>
          <p className="audit-card-footer">
            Local copies are retained during upload. Chain verification supports continuity checks; it cannot prove all activity was captured. Network disruption alone is not misconduct.
          </p>
        </Panel>
      </div>

      <div className="recovery-footer-status">
        <span>LOCAL SAVE 26:10 / CODE ACKNOWLEDGED / KEEP THIS TAB OPEN</span>
      </div>
    </Page>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 7l-7 5 7 5V7z"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}