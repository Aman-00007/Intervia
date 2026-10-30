import { useState } from "react";
import { navigate } from "../../core/router";
import { getCandidateAIVisibility, setCandidateAIVisibility } from "../../core/interviewSettings";
import { Button, Page, Panel } from "../../shared/components/UI";

interface Activity {
  id: number;
  name: string;
  time: string;
}

export function ManageInterview() {
  const [title, setTitle] = useState("Backend engineering");
  const [date, setDate] = useState("28 Oct 2026");
  const [startTime, setStartTime] = useState("10:00");
  const [timezone, setTimezone] = useState("UTC");
  const [duration, setDuration] = useState("45 minutes");
  const [interviewer, setInterviewer] = useState("Interviewer I-014");
  const [recordingPolicy, setRecordingPolicy] = useState("Audio, video & session events");
  const [consentRequired, setConsentRequired] = useState(true);
  const [bufferPolicy, setBufferPolicy] = useState("5 minutes · IndexedDB");
  const [language, setLanguage] = useState("Python 3.11");
  const [environment, setEnvironment] = useState("Monaco / collaborative");

  const [aiVisible, setAiVisible] = useState(getCandidateAIVisibility);
  const [inviteResent, setInviteResent] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const [activities, setActivities] = useState<Activity[]>([
    { id: 1, name: "Introductions", time: "5 min" },
    { id: 2, name: "Technical discussion", time: "10 min" },
    { id: 3, name: "Collaborative coding", time: "25 min" },
    { id: 4, name: "Wrap-up & candidate questions", time: "5 min" },
  ]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const toggleAIVisibility = () => {
    const next = !aiVisible;
    setAiVisible(next);
    setCandidateAIVisibility(next);
  };

  const handleResendInvite = () => {
    setInviteResent(true);
    setTimeout(() => setInviteResent(false), 3500);
  };

  const handleUpdateActivityTime = (id: number, newTime: string) => {
    setActivities((prev) =>
      prev.map((act) => (act.id === id ? { ...act, time: newTime } : act))
    );
  };

  const handleStartEdit = (act: Activity) => {
    setEditingId(act.id);
    setEditingName(act.name);
  };

  const handleSaveEdit = (id: number) => {
    if (editingName.trim()) {
      setActivities((prev) =>
        prev.map((act) => (act.id === id ? { ...act, name: editingName.trim() } : act))
      );
    }
    setEditingId(null);
  };

  const handleAddActivity = () => {
    const newId = Date.now();
    setActivities((prev) => [
      ...prev,
      { id: newId, name: "System architecture review", time: "10 min" },
    ]);
  };

  const handleSaveChanges = () => {
    setSaveStatus("Changes saved successfully.");
    setTimeout(() => {
      setSaveStatus(null);
      navigate("/interviewer");
    }, 1200);
  };

  return (
    <Page
      className="manage-interview-page"
      eyebrow="IV-2051 / SCHEDULED INTERVIEW"
      title="Everything in its place."
      beforeTitle={
        <button
          type="button"
          className="back-to-interviews-btn"
          onClick={() => navigate("/interviewer")}
        >
          ← Back to interviews
        </button>
      }
    >
      <p className="page-intro">
        Invitation delivered. Update the timed schedule, agenda and session preferences here.
      </p>

      {/* Top Scheduled Status Banner */}
      <div className="manage-status-banner">
        <div className="banner-status-col">
          <div className="banner-scheduled-pill">
            <span className="live-pulse-dot">●</span>
            <span>Scheduled · Invitation delivered</span>
          </div>
        </div>

        <div className="banner-time-col">
          <strong className="banner-datetime">28 Oct 2026 · 10:00–10:45 UTC</strong>
          <small className="banner-subtext">ROOM OPENS 28 OCT AT 09:50 UTC</small>
        </div>

        <div className="banner-action-col">
          <button
            type="button"
            className="banner-action-pill disabled"
            title="The room will automatically open for interviewer entry 10 minutes prior to session start"
          >
            Join not open yet →
          </button>
        </div>
      </div>

      {/* 2-Column Grid matching Figma */}
      <div className="manage-grid">
        {/* Left / Main Column */}
        <div className="manage-main-column">
          {/* Card 1: Interview details */}
          <Panel className="manage-panel">
            <div className="panel-header-title">
              <h2>Interview details</h2>
            </div>

            <label className="manage-field">
              <small>INTERVIEW TITLE / ROLE</small>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Backend engineering"
              />
            </label>

            <div className="manage-three-col-row">
              <label className="manage-field">
                <small>DATE</small>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="28 Oct 2026"
                />
              </label>

              <label className="manage-field">
                <small>START TIME</small>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="10:00"
                />
              </label>

              <label className="manage-field">
                <small>TIMEZONE</small>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="manage-select"
                >
                  <option value="UTC">UTC ▾</option>
                  <option value="EST">EST ▾</option>
                  <option value="PST">PST ▾</option>
                  <option value="GMT">GMT ▾</option>
                  <option value="CET">CET ▾</option>
                  <option value="IST">IST ▾</option>
                </select>
              </label>
            </div>

            <div className="manage-two-col-row">
              <label className="manage-field">
                <small>DURATION</small>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="manage-select"
                >
                  <option value="30 minutes">30 minutes ▾</option>
                  <option value="45 minutes">45 minutes ▾</option>
                  <option value="60 minutes">60 minutes ▾</option>
                  <option value="90 minutes">90 minutes ▾</option>
                </select>
              </label>

              <label className="manage-field">
                <small>INTERVIEWER</small>
                <select
                  value={interviewer}
                  onChange={(e) => setInterviewer(e.target.value)}
                  className="manage-select"
                >
                  <option value="Interviewer I-014">Interviewer I-014 ▾</option>
                  <option value="Interviewer I-008">Interviewer I-008 ▾</option>
                  <option value="Interviewer I-022">Interviewer I-022 ▾</option>
                </select>
              </label>
            </div>

            {/* Candidate Identity Protected Box */}
            <div className="candidate-protected-box">
              <small className="protected-box-label">
                CANDIDATE INVITATION · PROTECTED IDENTITY
              </small>
              <div className="protected-box-val">
                <span className="protected-token">C-8141</span>
                <span className="protected-status">· Invitation delivered</span>
              </div>
            </div>

            <p className="form-note">
              Invitation contact is an identity-only field stored separately in encrypted identity_vault. It is not sent to AI or included in interview_ops telemetry.
            </p>
          </Panel>

          {/* Card 2: Interview activities */}
          <Panel className="manage-panel activity-panel">
            <div className="panel-header-title space-between">
              <div>
                <h2>Interview activities</h2>
                <p className="panel-subtitle-copy">
                  Edit time allocations and reorder the conversation. The agenda is shared with participants.
                </p>
              </div>
              <span className="allocation-pill">▪ 45 / 45 minutes allocated</span>
            </div>

            <div className="activity-list">
              {activities.map((act) => (
                <div className="activity-row" key={act.id}>
                  <div className="activity-left">
                    <span className="drag-handle" title="Drag to reorder">⠿</span>
                    {editingId === act.id ? (
                      <input
                        type="text"
                        className="activity-edit-input"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleSaveEdit(act.id)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(act.id)}
                        autoFocus
                      />
                    ) : (
                      <span className="activity-title">{act.name}</span>
                    )}
                  </div>

                  <div className="activity-right">
                    <select
                      className="activity-time-select"
                      value={act.time}
                      onChange={(e) => handleUpdateActivityTime(act.id, e.target.value)}
                    >
                      <option value="5 min">5 min ▾</option>
                      <option value="10 min">10 min ▾</option>
                      <option value="15 min">15 min ▾</option>
                      <option value="20 min">20 min ▾</option>
                      <option value="25 min">25 min ▾</option>
                      <option value="30 min">30 min ▾</option>
                    </select>

                    {editingId === act.id ? (
                      <button
                        type="button"
                        className="activity-action-btn"
                        onClick={() => handleSaveEdit(act.id)}
                      >
                        Done
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="activity-action-btn"
                        onClick={() => handleStartEdit(act)}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="activity-footer-row">
              <button
                type="button"
                className="add-activity-btn"
                onClick={handleAddActivity}
              >
                Add activity +
              </button>
              <span className="activity-total-label">
                TOTAL 45 MIN / ENDS AT 10:45 UTC
              </span>
            </div>
          </Panel>

          {/* Card 3: Coding environment */}
          <Panel className="manage-panel coding-panel">
            <div className="panel-header-title">
              <h2>Coding environment</h2>
            </div>

            <div className="manage-two-col-row">
              <label className="manage-field">
                <small>LANGUAGE</small>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="manage-select"
                >
                  <option value="Python 3.11">Python 3.11 ▾</option>
                  <option value="TypeScript / Node 20">TypeScript / Node 20 ▾</option>
                  <option value="Go 1.22">Go 1.22 ▾</option>
                  <option value="Rust 1.77">Rust 1.77 ▾</option>
                  <option value="Java 21">Java 21 ▾</option>
                </select>
              </label>

              <label className="manage-field">
                <small>ENVIRONMENT</small>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="manage-select"
                >
                  <option value="Monaco / collaborative">Monaco / collaborative ▾</option>
                  <option value="VS Code Web">VS Code Web ▾</option>
                  <option value="Terminal / Vim">Terminal / Vim ▾</option>
                </select>
              </label>
            </div>

            <div className="coding-meta-row">
              <span className="coding-meta-k">Code execution</span>
              <span className="coding-meta-v">Judge0 / deterministic remote runs</span>
            </div>

            <p className="form-note">
              The interviewer introduces coding discussion during the live conversation. Yjs keeps the shared document synchronized.
            </p>
          </Panel>
        </div>

        {/* Right / Side Column */}
        <aside className="manage-side-column">
          {/* Card 1: Invitation & attendance */}
          <Panel className="manage-panel attendance-panel">
            <div className="panel-header-title space-between">
              <h2>Invitation & attendance</h2>
              <span className="status-badge-scheduled">● Scheduled</span>
            </div>

            <div className="attendance-spec-list">
              <div className="attendance-spec-row">
                <span className="spec-k">Candidate</span>
                <span className="spec-v mono bold">C-8141</span>
              </div>
              <div className="attendance-spec-row">
                <span className="spec-k">Interviewer</span>
                <span className="spec-v mono">I-014 · confirmed</span>
              </div>
              <div className="attendance-spec-row">
                <span className="spec-k">Delivery</span>
                <span className="spec-v mono">Delivered · 27 Oct 12:05</span>
              </div>
              <div className="attendance-spec-row">
                <span className="spec-k">Candidate response</span>
                <span className="spec-v mono">Awaiting acceptance</span>
              </div>
              <div className="attendance-spec-row">
                <span className="spec-k">Security code</span>
                <span className="spec-v mono">•••• •••• · active</span>
              </div>
            </div>

            {inviteResent && (
              <div className="resend-success-banner">
                ✓ Invitation re-sent to candidate's vault contact.
              </div>
            )}

            <button
              type="button"
              className="resend-invite-btn"
              onClick={handleResendInvite}
            >
              Resend invitation →
            </button>

            <p className="form-note">
              The full code is never displayed in operational views.
            </p>
          </Panel>

          {/* Card 2: Consent & recording */}
          <Panel className="manage-panel">
            <div className="panel-header-title">
              <h2>Consent & recording</h2>
            </div>

            <label className="manage-field">
              <small>RECORDING POLICY</small>
              <select
                value={recordingPolicy}
                onChange={(e) => setRecordingPolicy(e.target.value)}
                className="manage-select"
              >
                <option value="Audio, video & session events">Audio, video & session events ▾</option>
                <option value="Audio & session events only">Audio & session events only ▾</option>
                <option value="Session events only (no AV)">Session events only (no AV) ▾</option>
              </select>
            </label>

            <label className="manage-checkbox-row">
              <input
                type="checkbox"
                checked={consentRequired}
                onChange={(e) => setConsentRequired(e.target.checked)}
              />
              <div className="checkbox-text-col">
                <b>Require explicit candidate consent</b>
                <small>Recording begins only after consent and live session entry.</small>
              </div>
            </label>

            <p className="form-note">
              Offer an alternative through the organizer if consent cannot be given. Retention follows the organization policy.
            </p>
          </Panel>

          {/* Card 3: AI visibility */}
          <Panel className={`manage-panel ai-panel ${aiVisible ? "is-visible" : ""}`}>
            <div className="panel-header-title space-between">
              <h2>AI visibility</h2>
              <small className="ai-visibility-badge">
                {aiVisible ? "SHARED / CANDIDATE VISIBLE" : "DEFAULT / PRIVATE"}
              </small>
            </div>

            <button
              type="button"
              className="ai-toggle-switch-btn"
              role="switch"
              aria-checked={aiVisible}
              onClick={toggleAIVisibility}
            >
              <span className="toggle-label">Share AI window with candidate</span>
              <span className={`toggle-pill ${aiVisible ? "active" : ""}`}>
                {aiVisible ? "● ON" : "○ OFF"}
              </span>
            </button>

            <p className="form-note">
              {aiVisible
                ? "The candidate-safe AI clarification is visible in the shared interview room. Private notes and hiring evaluation remain hidden."
                : "Only candidate-safe clarification can be selected and shared in the live room. Private notes and hiring evaluation are never included."}
            </p>
          </Panel>

          {/* Card 4: Offline continuity */}
          <Panel className="manage-panel">
            <div className="panel-header-title">
              <h2>Offline continuity</h2>
            </div>

            <label className="manage-field">
              <small>LOCAL BUFFER POLICY</small>
              <select
                value={bufferPolicy}
                onChange={(e) => setBufferPolicy(e.target.value)}
                className="manage-select"
              >
                <option value="5 minutes · IndexedDB">5 minutes · IndexedDB ▾</option>
                <option value="8 minutes · IndexedDB">8 minutes · IndexedDB ▾</option>
                <option value="10 minutes · IndexedDB">10 minutes · IndexedDB ▾</option>
              </select>
            </label>

            <p className="form-note">
              Within the supported 5–10-minute range. Code and event buffering with 5s media chunks, HMAC-SHA256 chain supports tamper-evident continuity.
            </p>
            <p className="form-note">
              Remote execution and AI pause offline. Network disruption alone is not misconduct.
            </p>
          </Panel>
        </aside>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="manage-bottom-bar">
        <div className="bottom-bar-left">
          <small className="save-timestamp">LAST SAVED / 27 OCT 2026 AT 23:50 UTC</small>
          <span className="save-subnote">Schedule changes notify invited participants.</span>
          {saveStatus && <span className="save-toast-msg">{saveStatus}</span>}
        </div>

        <div className="bottom-bar-right">
          <button
            type="button"
            className="bottom-cancel-btn"
            onClick={() => navigate("/interviewer")}
          >
            Cancel interview ✕
          </button>
          <button
            type="button"
            className="bottom-reschedule-btn"
            onClick={() => alert("Reschedule options: notify candidate of alternate timeslot.")}
          >
            Reschedule →
          </button>
          <Button
            className="bottom-save-btn"
            onClick={handleSaveChanges}
          >
            Save changes →
          </Button>
        </div>
      </div>
    </Page>
  );
}

