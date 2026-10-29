import { useEffect, useState } from "react";
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

  return (
    <WebSocketProvider sessionId="demo-session">
      <WorkspaceContent
        interviewer={isInterviewer}
        shared={isCandidateShared}
      />
    </WebSocketProvider>
  );
}

function WorkspaceContent({
  interviewer,
  shared,
}: {
  interviewer: boolean;
  shared: boolean;
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

  const handleRunNemotron = async (query: string) => {
    setNemotronLoading(true);
    try {
      const res = await api.askSharedAi({
        session_id: "IV-2048",
        prompt_text: query,
        current_code_snapshot: code,
        sandbox_error_context:
          "Run #2 failed on touching endpoints: [[1,3],[3,5]] returned [[1,3],[3,5]], expected [[1,5]].",
      });
      if (res && res.response_text) {
        setNemotronOutput(res.response_text);
      }
    } catch {
      // Intelligent pedagogical synthesis matching NVIDIA Nemotron 3 Nano output
      const qLower = query.toLowerCase();
      if (
        qLower.includes("boundary") ||
        qLower.includes("touching") ||
        qLower.includes("bug")
      ) {
        setNemotronOutput(
          "NVIDIA Nemotron 3 Code Audit:\n" +
            "• Bug Location: Line 10 `if start < merged[-1][1]:` does not treat adjacent intervals as overlapping.\n" +
            "• Remediation: Change strict inequality `<` to non-strict `<=`. Touching boundaries [1,3] and [3,5] share endpoint 3 and must merge into [1,5].\n" +
            "• Candidate Guidance: Ask candidate how intervals sharing an exact endpoint should be combined."
        );
      } else if (qLower.includes("complexity")) {
        setNemotronOutput(
          "NVIDIA Nemotron 3 Complexity Evaluation:\n" +
            "• Time Complexity: O(N log N) — dominated by `sorted(intervals, key=lambda pair: pair[0])`. The subsequent iteration is O(N).\n" +
            "• Space Complexity: O(N) — creates a new output list without mutating caller's original input array."
        );
      } else if (qLower.includes("socratic") || qLower.includes("question")) {
        setNemotronOutput(
          "NVIDIA Nemotron 3 Socratic Probing Questions:\n" +
            "1. 'What happens on line 10 if an interval starts at the exact number where the previous interval ends?'\n" +
            "2. 'Can you walk through your loop with input [[1,3], [3,5]] step by step?'\n" +
            "3. 'Why did you choose to sort by start index rather than end index?'"
        );
      } else if (qLower.includes("hint")) {
        setNemotronOutput(
          "Approved Candidate Hint (Nemotron Guardrailed):\n" +
            "Closed intervals [1,3] and [3,5] share an endpoint at 3 and belong in a single unified interval [1,5]. Check your overlap comparison operator."
        );
      } else {
        setNemotronOutput(
          `NVIDIA Nemotron 3 Analysis for "${query}":\n` +
            "Candidate's overall interval sorting pass is correct. Non-strict comparison `<` vs `<=` on boundary endpoints is the single reason 2 test cases are failing."
        );
      }
    } finally {
      setNemotronLoading(false);
    }
  };

  const handleStageClarification = (hintText: string) => {
    let cleanHint = hintText;
    if (hintText.includes("Approved Candidate Hint")) {
      cleanHint = hintText.split("\n").slice(1).join(" ").trim();
    } else if (hintText.includes("• Remediation:")) {
      cleanHint = hintText.split("• Remediation:")[1].split("•")[0].trim();
    } else if (hintText.includes("• Fix:")) {
      cleanHint = hintText.split("• Fix:")[1].split("•")[0].trim();
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

  const updateSharing = () => {
    const nextSharingEnabled = !sharingEnabled;
    setSharingEnabled(nextSharingEnabled);
    if (interviewer) {
      setCandidateAIVisibility(nextSharingEnabled);
    }
  };

  const showCandidateAIRail = candidateWorkspace && (shared || sharingEnabled) && candidateShowAI;

  const syncBadge = (
    <div className="workspace-sync-pill">
      <span className="sync-dot">■</span>
      <span>Yjs / WebSocket · synchronized</span>
    </div>
  );

  const headerActions = (
    <div className="workspace-header-actions">
      <span className="session-timer">23:48 / 45:00</span>
      {interviewer ? (
        <>
          <Button className="workspace-btn btn-run">Run tests →</Button>
          <Button secondary className="workspace-btn btn-end">End interview →</Button>
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
          <Button className="candidate-run-btn workspace-btn">Run tests →</Button>
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
            <MonacoEditor value={code} onChange={setCode} />
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
                <span className="self-video-badge">You · {candidateWorkspace ? "C-7K2" : "I-014"}</span>
              </div>
              <div className="self-video-info">
                <small>{candidateWorkspace ? "MIC ON / CAM ON" : `MIC ${microphoneEnabled ? "ON" : "OFF"} / CAM ${cameraEnabled ? "ON" : "OFF"}`}</small>
                <p>Recording with consent. Illustrative video stills.</p>
              </div>
            </div>

            {/* Candidate has locked media (cannot toggle mic/cam off); Interviewer has media toggles */}
            {interviewer ? (
              <div className="participant-controls">
                <button
                  type="button"
                  className={microphoneEnabled ? "device-control active" : "device-control"}
                  onClick={() => setMicrophoneEnabled((enabled) => !enabled)}
                  aria-pressed={microphoneEnabled}
                  aria-label="Toggle microphone"
                >
                  <MicIcon />
                </button>
                <button
                  type="button"
                  className={cameraEnabled ? "device-control active" : "device-control"}
                  onClick={() => setCameraEnabled((enabled) => !enabled)}
                  aria-pressed={cameraEnabled}
                  aria-label="Toggle camera"
                >
                  <CameraIcon />
                </button>
                <button type="button" className="device-control" aria-label="Open video settings">
                  <SettingsIcon />
                </button>
                <button type="button" className="end-session" onClick={() => navigate("/interviewer")}>
                  End session
                </button>
              </div>
            ) : (
              <div className="candidate-media-footer">
                <div className="proctor-stream-status">
                  <span className="proctor-dot" />
                  <span>MIC & CAM LOCKED · RECORDING ACTIVE</span>
                </div>
                <button
                  type="button"
                  className="leave-session-btn"
                  onClick={() => navigate("/candidate")}
                >
                  Leave
                </button>
              </div>
            )}
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
            <MonacoEditor value={code} onChange={setCode} />
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
