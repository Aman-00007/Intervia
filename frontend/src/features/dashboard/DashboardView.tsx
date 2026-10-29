import { useState } from "react";
import { Screen } from "../../core/models/screens";
import { navigate } from "../../core/router";
import { getCandidateAIVisibility, setCandidateAIVisibility } from "../../core/interviewSettings";
import { Button, DataTable, Field, Page, Panel, Status } from "../../shared/components/UI";
import { ManageInterview } from "./ManageInterview";

export function DashboardView({ screen }: { screen: Extract<Screen, "interviewer-dashboard" | "create-interview" | "manage-interview" | "candidate-dashboard"> }) {
  if (screen === "candidate-dashboard") return <Page className="candidate-dashboard-page" eyebrow="YOUR INTERVIEWS / C-7K2" title="Your next conversation."><p className="page-intro">View invitations, finish session setup and return to feedback from earlier interviews.</p><div className="two-col candidate-hero-grid"><Panel className="candidate-session-card"><div className="panel-heading"><small>TODAY / IV-2048</small><small className="status">■ Invitation accepted</small></div><h2>Backend engineering</h2><p>27 Oct 2026 · 14:00–14:45 UTC · 45 minutes</p><p>A human-led technical discussion with collaborative coding in Python 3.11.</p><div className="callout"><span><b>Your invitation is verified.</b><small>Join takes you through consent and device checks first.</small></span><Button onClick={() => navigate("/candidate/consent")}>Join interview →</Button></div></Panel><Panel className="session-setup-card"><h2>Session setup</h2><div className="setup-status-row"><span>Invitation</span><b>Verified</b></div><div className="setup-status-row"><span>Privacy consent</span><b>Review required</b></div><div className="setup-status-row"><span>Resume</span><b>Not yet reviewed</b></div><div className="setup-status-row"><span>Microphone & camera</span><b>Check required</b></div><p className="setup-explanation">No recording is active. Complete these checks before entering the live conversation.</p><button className="text-button" onClick={() => navigate("/candidate/consent")}>Review privacy & devices →</button></Panel></div><DataTable candidate title="Previous interviews" rows={["IV-2039 / C-7K2 | API design discussion | 22 Oct 2026 · 10:00 UTC | Ready", "IV-2021 / C-7K2 | Data modeling discussion | 14 Oct 2026 · 11:00 UTC | Ready", "IV-2007 / C-7K2 | Python services discussion | 07 Oct 2026 · 09:00 UTC | Ready"]} /><div className="two-col candidate-info-grid"><Panel><h2>A clear connection</h2><p>Choose your microphone and camera during session setup. A local 8-minute buffer helps retain work if the connection drops.</p><button className="text-button">Device help ↗</button></Panel><Panel><h2>Feedback that stays useful</h2><p>Your own reports include constructive feedback and code evidence. Interviewer-only notes remain private.</p><button className="text-button" onClick={() => navigate("/candidate/reports")}>All reports / previous reports →</button></Panel></div></Page>;
  if (screen === "create-interview") return <CreateInterview />;
  if (screen === "manage-interview") return <ManageInterview />;
  return (
    <Page
      className="interviewer-dashboard-page"
      eyebrow="INTERVIEWS / TODAY & UPCOMING"
      title="Make room for the thinking."
      subtitle="Coordinate technical conversations. Keep identity separate and evidence in focus."
      headerRight={
        <button
          type="button"
          className="btn-create-interview"
          onClick={() => navigate("/interviewer/create")}
        >
          Create interview →
        </button>
      }
    >
      <div className="two-col">
        <Panel className="featured-session">
          <div className="panel-heading">
            <small>IN PROGRESS / IV-2048</small>
            <small className="status">■ Live now</small>
          </div>
          <h2>Backend engineering</h2>
          <p>C-7K2 · Python 3.11 · 45-minute interview</p>
          <small>27 OCT 2026 / 14:00–14:45 UTC</small>
          <div className="callout">
            Candidate connected · interviewer room open{" "}
            <Button onClick={() => navigate("/interviewer/workspace")}>
              Join now →
            </Button>
          </div>
        </Panel>
        <Panel>
          <h2>Invitation management</h2>
          <div className="summary-list">
            <span>
              Upcoming sessions <b>2 scheduled</b>
            </span>
            <span>
              Invitations delivered <b>2 / 2</b>
            </span>
            <span>
              Awaiting response <b>1 invitation</b>
            </span>
          </div>
          <p>
            IV-2051 is delivered but not yet accepted. Send a reminder without exposing the invitation code.
          </p>
          <button className="text-button" onClick={() => navigate("/interviewer/manage")}>
            Manage invitations →
          </button>
        </Panel>
      </div>
      <DataTable
        title="Upcoming scheduled interviews"
        rows={[
          "IV-2051 / C-9M4 | Backend engineering · 45 min | 28 Oct 2026 · 10:00 UTC | Delivered · awaiting reply",
          "IV-2054 / C-3P8 | Platform engineering · 60 min | 29 Oct 2026 · 15:00 UTC | Accepted",
        ]}
      />
      <DataTable
        title="Previous interviews"
        rows={[
          "IV-2039 / C-7K2 | API design discussion | 22 Oct 2026 · 10:00 UTC | Ready",
          "IV-2026 / C-5N1 | Backend engineering | 19 Oct 2026 · 09:00 UTC | Ready",
          "IV-2018 / C-2R6 | Platform engineering | 15 Oct 2026 · 13:00 UTC | Ready",
        ]}
      />
      <div className="management-footer">
        <small>OPERATIONAL LISTS USE ANONYMOUS CANDIDATE CODES</small>
        <button
          type="button"
          className="view-history-link"
          onClick={() => navigate("/interviewer/reports")}
        >
          View all reports / history →
        </button>
      </div>
    </Page>
  );
}
function CreateInterview() {
  const [aiVisible, setAiVisible] = useState(getCandidateAIVisibility);
  const [activities, setActivities] = useState([
    { id: 1, name: "Introductions", time: "5 min" },
    { id: 2, name: "Technical discussion", time: "10 min" },
    { id: 3, name: "Collaborative coding", time: "25 min" },
    { id: 4, name: "Wrap-up & candidate questions", time: "5 min" },
  ]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const toggleAIVisibility = () => {
    const nextVisible = !aiVisible;
    setAiVisible(nextVisible);
    setCandidateAIVisibility(nextVisible);
  };

  const handleUpdateActivityTime = (id: number, newTime: string) => {
    setActivities((prev) =>
      prev.map((act) => (act.id === id ? { ...act, time: newTime } : act))
    );
  };

  const handleStartEdit = (id: number, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
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

  return (
    <Page
      className="create-interview-page"
      eyebrow="SCHEDULE / NEW INTERVIEW"
      title="Set up a good conversation."
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
        Choose the people, schedule and activities. Review before sending the invitation.
      </p>
      <div className="create-interview-grid">
        <div className="create-main-column">
          <Panel className="create-details">
            <h2>Interview details</h2>
            <Field label="INTERVIEW TITLE / ROLE" placeholder="Backend engineering" />
            <div className="manage-three-col-row">
              <Field label="DATE" placeholder="28 Oct 2026" />
              <Field label="START TIME" placeholder="10:00" />
              <Field label="TIMEZONE" placeholder="UTC" />
            </div>
            <div className="manage-two-col-row">
              <Field label="DURATION" placeholder="45 minutes" />
              <Field label="INTERVIEWER" placeholder="Interviewer I-014" />
            </div>
            <Field
              label="CANDIDATE INVITATION · PROTECTED IDENTITY"
              placeholder="Enter candidate email or invitation identifier"
            />
            <p className="form-note">
              Invitation contact is an identity-only field stored separately in encrypted identity_vault. It is not sent to AI or included in interview_ops telemetry.
            </p>
          </Panel>

          <Panel className="activity-panel">
            <div className="panel-heading">
              <div>
                <h2>Interview activities</h2>
                <p>Edit time allocations and reorder the conversation. The agenda is shared with participants.</p>
              </div>
              <small className="allocation">■ 45 / 45 minutes allocated</small>
            </div>

            <div className="activity-list">
              {activities.map((act) => (
                <div className="activity-row" key={act.id}>
                  <div className="activity-left">
                    <span className="drag-handle">⠿</span>
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
                      aria-label={`${act.name} duration`}
                    >
                      <option value="5 min">5 min</option>
                      <option value="10 min">10 min</option>
                      <option value="15 min">15 min</option>
                      <option value="25 min">25 min</option>
                      <option value="30 min">30 min</option>
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
                        onClick={() => handleStartEdit(act.id, act.name)}
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
                Add activity →
              </button>
              <small className="activity-total">TOTAL 45 MIN · ENDS AT 10:45 UTC</small>
            </div>
          </Panel>

          <Panel className="coding-panel">
            <h2>Coding environment</h2>
            <div className="manage-two-col-row">
              <Field label="LANGUAGE" placeholder="Python 3.11" />
              <Field label="ENVIRONMENT" placeholder="Monaco / collaborative" />
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

        <aside className="create-side-column">
          <Panel>
            <h2>Consent & recording</h2>
            <Field label="RECORDING POLICY" placeholder="Audio, video & session events" />
            <label className="manage-checkbox-row consent-check">
              <input type="checkbox" defaultChecked />
              <div className="checkbox-text-col">
                <b>Require explicit candidate consent</b>
                <small>Recording begins only after consent and live session entry.</small>
              </div>
            </label>
            <p className="form-note">
              Offer an alternative through the organizer if consent cannot be given. Retention follows the organization policy.
            </p>
          </Panel>

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
                : "Only the candidate-safe clarification can be selected and shared in the live room. Private notes and hiring evaluation are never included."}
            </p>
          </Panel>

          <Panel>
            <h2>Offline continuity</h2>
            <Field label="LOCAL BUFFER POLICY" placeholder="8 minutes · IndexedDB" />
            <p className="form-note">
              Within the supported 5–10 minute range. Code and event buffering with 5s media chunks, HMAC-SHA256 chain support tamper-evident continuity.
            </p>
            <p className="form-note">
              Remote execution and AI pause offline. Network disruption alone is not misconduct.
            </p>
          </Panel>
        </aside>
      </div>

      <div className="create-bottom-bar">
        <div className="bottom-bar-left">
          <small className="save-timestamp">UNSAVED / NO INVITATION SENT</small>
          <span className="save-subnote">45 minutes · 28 Oct 2026 · 10:00–10:45 UTC</span>
        </div>
        <div className="bottom-bar-right form-actions">
          <Button secondary>Save draft →</Button>
          <Button secondary>Review invitation →</Button>
          <Button onClick={() => navigate("/interviewer")}>Save & send invitation →</Button>
        </div>
      </div>
    </Page>
  );
}
