import { useState, useMemo } from "react";
import { Screen } from "../../core/models/screens";
import { navigate } from "../../core/router";
import { Page, Panel, Button } from "../../shared/components/UI";

/* =========================================================================
   Data Types & Mock Records
   ========================================================================= */
interface CandidateReportItem {
  id: string;
  candidateId: string;
  title: string;
  completedAt: string;
  dateKey: string; // "2026-10", "2026-09"
  status: "Ready" | "Processing" | "Archived";
  tests: string;
  duration: string;
  complexity: string;
}

const PREVIOUS_CANDIDATE_REPORTS: CandidateReportItem[] = [
  {
    id: "IV-2048",
    candidateId: "C-7K2",
    title: "Loopholes & Prosperity (Merge overlapping intervals)",
    completedAt: "27 OCT 2026 · 14:48 UTC",
    dateKey: "2026-10",
    status: "Ready",
    tests: "8 / 8",
    duration: "42:18",
    complexity: "O(n log n)",
  },
  {
    id: "IV-1024",
    candidateId: "C-7K2",
    title: "API design discussion",
    completedAt: "24 OCT 2026 · 18:05 UTC",
    dateKey: "2026-10",
    status: "Ready",
    tests: "8 / 8",
    duration: "38:40",
    complexity: "O(n)",
  },
  {
    id: "IV-0918",
    candidateId: "C-7K2",
    title: "Data modeling discussion",
    completedAt: "14 OCT 2026 · 11:20 UTC",
    dateKey: "2026-10",
    status: "Ready",
    tests: "7 / 8",
    duration: "45:00",
    complexity: "O(n)",
  },
  {
    id: "IV-0841",
    candidateId: "C-7K2",
    title: "System selector discussion",
    completedAt: "29 SEP 2026 · 09:30 UTC",
    dateKey: "2026-09",
    status: "Ready",
    tests: "8 / 8",
    duration: "40:15",
    complexity: "O(log n)",
  },
];

interface InterviewerReportItem {
  id: string;
  candidateId: string;
  interview: string;
  completedAt: string;
  dateKey: string; // "2026-10", "2026-09"
  status: "Ready · evaluated" | "Pending review" | "Archived";
  statusKey: "all" | "pending" | "evaluated" | "archived";
}

const PREVIOUS_INTERVIEWER_REPORTS: InterviewerReportItem[] = [
  {
    id: "IV-2039",
    candidateId: "C-7K2",
    interview: "API design discussion",
    completedAt: "22 Oct 2026 · 10:00 UTC",
    dateKey: "2026-10",
    status: "Ready · evaluated",
    statusKey: "evaluated",
  },
  {
    id: "IV-2026",
    candidateId: "C-5N1",
    interview: "Backend engineering",
    completedAt: "19 Oct 2026 · 09:00 UTC",
    dateKey: "2026-10",
    status: "Ready · evaluated",
    statusKey: "evaluated",
  },
  {
    id: "IV-2018",
    candidateId: "C-2R6",
    interview: "Platform engineering",
    completedAt: "15 Oct 2026 · 13:00 UTC",
    dateKey: "2026-10",
    status: "Ready · evaluated",
    statusKey: "evaluated",
  },
];

/* =========================================================================
   Main View Router
   ========================================================================= */
export function ReportsView({
  screen,
  dark,
}: {
  screen: Extract<
    Screen,
    | "candidate-reports"
    | "candidate-report"
    | "interviewer-reports"
    | "executive-summary"
  >;
  dark: boolean;
}) {
  if (screen === "candidate-report") {
    return <CandidateReportDetail dark={dark} />;
  }

  if (screen === "executive-summary") {
    return <InterviewerExecutiveSummary dark={dark} />;
  }

  if (screen === "interviewer-reports") {
    return <InterviewerReportsCenter dark={dark} />;
  }

  return <CandidateReportsCenter dark={dark} />;
}

/* =========================================================================
   Screen 1: Candidate Reports Center (Figma Node 91:41510 / 91:41445)
   ========================================================================= */
function CandidateReportsCenter({ dark }: { dark: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const filteredReports = useMemo(() => {
    return PREVIOUS_CANDIDATE_REPORTS.filter((report) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        report.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDate =
        selectedDate === "all" ||
        (selectedDate === "2026-10" && report.dateKey === "2026-10") ||
        (selectedDate === "2026-09" && report.dateKey === "2026-09");

      const matchesStatus =
        selectedStatus === "all" ||
        report.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [searchQuery, selectedDate, selectedStatus]);

  const handleDownloadPDF = (reportId: string) => {
    alert(`Downloading verified candidate feedback report for session ${reportId}...`);
  };

  return (
    <Page
      className="reports-center-page"
      eyebrow="MY REPORTS / CURRENT & PREVIOUS"
      title="Keep the useful parts."
    >
      <p className="page-intro">
        Your interview feedback, code evidence and previous reports, together in one place.
      </p>

      {/* Top 2 Cards: Latest Featured Report & Aside Information */}
      <div className="reports-top-grid">
        <Panel className="featured-report-card">
          <div className="card-top-meta">
            <span className="session-tag">LATEST / IV-2048 / C-7K2</span>
            <span className="report-ready-badge">▪ Report ready</span>
          </div>

          <h2 className="report-main-title">Loopholes & Prosperity</h2>
          <p className="report-sub-title">Backend engineering · Merge overlapping intervals</p>
          <p className="report-time-meta">27 OCT 2026 · completed 14:48 UTC · Python 3.11</p>

          <div className="metrics-summary-strip">
            <div className="metric-box">
              <span className="metric-val">8 / 8</span>
              <span className="metric-lbl">FINAL TESTS</span>
            </div>
            <div className="metric-box">
              <span className="metric-val">42:18</span>
              <span className="metric-lbl">DURATION</span>
            </div>
            <div className="metric-box">
              <span className="metric-val">O(n log n)</span>
              <span className="metric-lbl">TIME COMPLEXITY</span>
            </div>
          </div>

          <div className="report-actions-row">
            <Button
              className="view-report-primary-btn"
              onClick={() => navigate("/candidate/reports/detail")}
            >
              View report →
            </Button>
            <Button
              secondary
              className="download-pdf-btn"
              onClick={() => handleDownloadPDF("IV-2048")}
            >
              Download PDF ↓
            </Button>
          </div>
        </Panel>

        <Panel className="report-aside-card">
          <h2 className="aside-title">Your report, your feedback</h2>

          <div className="aside-status-list">
            <div className="aside-status-row">
              <span className="status-label">Generation</span>
              <span className="status-value">Complete · 14:48 UTC</span>
            </div>
            <div className="aside-status-row">
              <span className="status-label">Privacy check</span>
              <span className="status-value">Zero-PII scan passed</span>
            </div>
            <div className="aside-status-row">
              <span className="status-label">PDF</span>
              <span className="status-value">Ready to download</span>
            </div>
          </div>

          <p className="aside-notice">
            Only your own reports appear here. Feedback is constructive and anonymized; private interviewer scoring and notes are not included.
          </p>

          <a
            href="#feedback-policy"
            className="feedback-method-link"
            onClick={(e) => {
              e.preventDefault();
              alert("Intervia feedback is derived directly from test runs, algorithmic complexity scans, and boundary heuristics approved during review.");
            }}
          >
            How feedback is created ↗
          </a>
        </Panel>
      </div>

      {/* Filter Row with interactive dropdowns & search */}
      <div className="reports-filter-bar">
        {/* Filter 1: Search */}
        <div className="filter-field search-field">
          <label htmlFor="candidate-search-input">SEARCH REPORTS</label>
          <div className="input-wrap">
            <input
              id="candidate-search-input"
              type="text"
              placeholder="Search by session or interview title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter 2: Date Range Dropdown with Down Arrow */}
        <div className="filter-field select-field">
          <label htmlFor="candidate-date-select">DATE RANGE</label>
          <div className="select-wrap">
            <select
              id="candidate-date-select"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            >
              <option value="all">All time</option>
              <option value="2026-10">October 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="past-3-months">Past 3 months</option>
            </select>
            <ChevronDownIcon />
          </div>
        </div>

        {/* Filter 3: Status Dropdown with Down Arrow */}
        <div className="filter-field select-field">
          <label htmlFor="candidate-status-select">REPORT STATUS</label>
          <div className="select-wrap">
            <select
              id="candidate-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="archived">Archived</option>
            </select>
            <ChevronDownIcon />
          </div>
        </div>
      </div>

      {/* Previous Reports / History Table */}
      <Panel className="reports-history-panel">
        <div className="history-header-row">
          <h3>Previous reports / history</h3>
          <span className="count-badge">
            {filteredReports.length} {filteredReports.length === 1 ? "REPORT" : "REPORTS"}
          </span>
        </div>

        <div className="history-table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>SESSION / CANDIDATE</th>
                <th>INTERVIEW</th>
                <th>COMPLETED</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id}>
                  <td className="session-col">
                    <span className="mono-session">{report.id} / {report.candidateId}</span>
                  </td>
                  <td className="title-col">{report.title}</td>
                  <td className="completed-col">{report.completedAt}</td>
                  <td className="status-col">
                    <span className="table-status-pill">{report.status}</span>
                  </td>
                  <td className="actions-col">
                    <button
                      type="button"
                      className="table-action-link"
                      onClick={() => navigate("/candidate/reports/detail")}
                    >
                      View report →
                    </button>
                    <button
                      type="button"
                      className="table-action-link pdf"
                      onClick={() => handleDownloadPDF(report.id)}
                    >
                      PDF ↓
                    </button>
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    No reports match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* History navigation footer */}
      <div className="history-nav-footer">
        <small>SHOWING ALL {filteredReports.length} OWN REPORTS / NEWEST FIRST</small>
        <button
          type="button"
          className="back-interviews-link"
          onClick={() => navigate("/candidate")}
        >
          Back to my interviews →
        </button>
      </div>
    </Page>
  );
}

/* =========================================================================
   Screen 2: Candidate Report Detail (Figma Node 91:41650 / 91:41575)
   ========================================================================= */
function CandidateReportDetail({ dark }: { dark: boolean }) {
  const handleDownload = () => {
    alert("Downloading report PDF for IV-2048 (Loopholes & Prosperity)...");
  };

  return (
    <Page
      className="report-detail-page"
      eyebrow="C-7K2 / IV-2048 / 27 OCT 2026"
      title="Loopholes & Prosperity"
      subtitle="A useful reflection on your approach—not a verdict on your potential."
      beforeTitle={
        <div className="report-header-nav detail-top-nav">
          <button
            type="button"
            className="nav-back-btn"
            onClick={() => navigate("/candidate/reports")}
          >
            ← Back to all reports / Previous reports
          </button>
          <button
            type="button"
            className="nav-prev-btn"
            onClick={() => alert("Loading previous report IV-1024...")}
          >
            Previous: IV-1024 · API design →
          </button>
        </div>
      }
      headerRight={
        <Button className="download-pdf-primary-btn" onClick={handleDownload}>
          Download PDF ↓
        </Button>
      }
    >

      {/* Summary / Overview Strip Card */}
      <Panel className="detail-overview-panel">
        <div className="overview-left">
          <small className="overview-eyebrow">BACKEND / 27 OCT 2026 / PYTHON 3.11</small>
          <h2 className="overview-problem-title">Merge overlapping intervals</h2>
          <p className="overview-note">42:18 / Python 3.11 · Input preserved</p>
        </div>

        <div className="overview-metrics-strip">
          <div className="overview-metric">
            <span className="metric-large-num">8 / 8</span>
            <span className="metric-sub-lbl">FINAL TESTS PASSED</span>
          </div>
          <div className="overview-metric">
            <span className="metric-large-num">42:18</span>
            <span className="metric-sub-lbl">TOTAL DURATION</span>
          </div>
          <div className="overview-metric">
            <span className="metric-large-num">O(n log n)</span>
            <span className="metric-sub-lbl">TIME COMPLEXITY</span>
          </div>
        </div>
      </Panel>

      {/* 4 Feedback Cards (2x2 Grid) from Figma */}
      <div className="detail-feedback-grid">
        {/* Card 1: Strength / Readability */}
        <Panel className="feedback-card">
          <small className="card-eyebrow">STRENGTH / READABILITY</small>
          <h3>A sound structure, clearly expressed.</h3>
          <p className="card-body-text">
            You chose a sorting pass followed by a single scan. Keeping the first interval and appending new pairs keeps the caller’s input unchanged. Your first solution handles the full task contract.
          </p>
          <div className="evidence-badge">
            EVIDENCE / 24:10 · LN 1–14 · RUN #2: 6/8 → RUN #3: 8/8
          </div>
        </Panel>

        {/* Card 2: Growth / Edge cases */}
        <Panel className="feedback-card">
          <small className="card-eyebrow">GROWTH / EDGE CASES</small>
          <h3>Make boundaries your first test.</h3>
          <p className="card-body-text">
            The first implementation missed touching intervals: touching intervals separate. You detected it after feedback: [1,3] and [3,5] should merge. Check equality at the boundary early before the implementation feels finished.
          </p>
          <div className="evidence-badge">
            EVIDENCE / 25:30 · LN 10 · RUN #2: 6/8 → RUN #3: 8/8
          </div>
        </Panel>

        {/* Card 3: Technical Excerpt with Code Diff */}
        <Panel className="feedback-card technical-excerpt-card">
          <small className="card-eyebrow">TECHNICAL EXCERPT</small>
          <h3>The change that mattered</h3>
          <div className="code-diff-box">
            <span className="file-header"># solution.py</span>
            <div className="diff-line removed">
              <span>- if start &lt; merged[-1][1]:</span>
            </div>
            <div className="diff-line added">
              <span>+ if start &lt;= merged[-1][1]:</span>
            </div>
            <div className="diff-test-check">
              <span>[[1, 3], [3, 5]] → [[1, 5]] ✓</span>
            </div>
          </div>
          <p className="card-body-text">
            Sorting dominates at O(n log n). The comparison and merge scan runs in linear time. This satisfies the submitted approach, not a performance benchmark.
          </p>
          <p className="card-footnote">
            First run passed empty, single, disjoint, overlap, nested, unsorted/non-mutating and failed touching.
          </p>
        </Panel>

        {/* Card 4: Habit / Next Interview */}
        <Panel className="feedback-card habit-card">
          <small className="card-eyebrow">HABIT / NEXT INTERVIEW</small>
          <h3>Turn the gap into a habit.</h3>
          
          <div className="habits-list">
            <div className="habit-item">
              <strong>Write a boundary checklist</strong>
              <p>Before coding: empty, single, nested, touching and unsorted intervals.</p>
            </div>
            <div className="habit-item">
              <strong>Explain your tradeoff</strong>
              <p>State each heuristic; explain why sorting beats linear time heuristics.</p>
            </div>
            <div className="habit-item">
              <strong>Connect feedback to your next discussion</strong>
              <p>Talk through equality and input preservation before settling on an implementation.</p>
            </div>
          </div>

          <p className="card-footnote">
            A candidate feedback report is a reflection aid, not a hiring decision. It helps clarify your conversation for the next round.
          </p>
        </Panel>
      </div>

      {/* Sleek Bottom Shortcut Strip matching Figma Node 91:41716 */}
      <div className="own-report-shortcuts-strip">
        <span className="shortcuts-eyebrow">OTHER OWN SESSIONS</span>
        <div className="shortcuts-links-row">
          <button
            type="button"
            className="shortcut-link-btn"
            onClick={() => alert("Loading IV-2039 session report...")}
          >
            IV-2039 / 22 Oct →
          </button>
          <button
            type="button"
            className="shortcut-link-btn"
            onClick={() => alert("Loading IV-2021 session report...")}
          >
            IV-2021 / 14 Oct →
          </button>
          <button
            type="button"
            className="shortcut-link-btn"
            onClick={() => navigate("/candidate/reports")}
          >
            All previous reports →
          </button>
        </div>
      </div>
    </Page>
  );
}

/* =========================================================================
   Screen 3: Interviewer Reports Center (Figma Node 91:41783 / 91:41725)
   ========================================================================= */
function InterviewerReportsCenter({ dark }: { dark: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const filteredReports = useMemo(() => {
    return PREVIOUS_INTERVIEWER_REPORTS.filter((report) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        report.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.candidateId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.interview.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDate =
        selectedDate === "all" ||
        (selectedDate === "2026-10" && report.dateKey === "2026-10") ||
        (selectedDate === "2026-09" && report.dateKey === "2026-09");

      const matchesStatus =
        selectedStatus === "all" ||
        report.statusKey === selectedStatus;

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [searchQuery, selectedDate, selectedStatus]);

  const handleDownloadPDF = (reportId: string) => {
    alert(`Downloading private hiring team review PDF for session ${reportId}...`);
  };

  return (
    <Page
      className="reports-center-page interviewer-reports-page"
      eyebrow="INTERVIEW REPORTS / CURRENT & PREVIOUS"
      title="Evidence, in one place."
    >
      <p className="page-intro">
        Review completed interviews and open private executive summaries. Final evaluation remains yours.
      </p>

      {/* Top 2 Cards: Current Private Report & Aside Information */}
      <div className="reports-top-grid">
        <Panel className="featured-report-card interviewer-featured-card">
          <div className="card-top-meta">
            <span className="session-tag">CURRENT / IV-2048 / C-7K2</span>
            <span className="report-ready-badge interviewer-badge">
              ▪ Executive summary ready
            </span>
          </div>

          <h2 className="report-main-title">Backend engineering</h2>
          <p className="report-sub-title">Merge overlapping intervals · Python 3.11</p>
          <p className="report-time-meta">27 Oct 2026 · completed 14:42 UTC · 42:18 duration</p>

          <div className="interviewer-meta-lines">
            <div className="meta-line-row">
              <span className="meta-line-lbl">Final execution</span>
              <span className="meta-line-val">Run #4 · 8 / 8 passed</span>
            </div>
            <div className="meta-line-row">
              <span className="meta-line-lbl">Human evaluation</span>
              <span className="meta-line-val pending">Pending your review</span>
            </div>
          </div>

          <div className="report-actions-row">
            <Button
              className="interviewer-primary-btn"
              onClick={() => navigate("/interviewer/reports/executive")}
            >
              Open executive summary →
            </Button>
            <Button
              secondary
              className="download-pdf-btn interviewer-secondary-btn"
              onClick={() => handleDownloadPDF("IV-2048")}
            >
              Download private PDF →
            </Button>
          </div>
        </Panel>

        <Panel className="report-aside-card interviewer-aside-card">
          <h2 className="aside-title">Private by role</h2>
          <div className="aside-badge-row">
            <span className="aside-role-badge">▪ Authorized interviewers only</span>
          </div>

          <div className="aside-status-list">
            <div className="aside-status-row">
              <span className="status-label">Generated</span>
              <span className="status-value">27 Oct · 14:48 UTC</span>
            </div>
            <div className="aside-status-row">
              <span className="status-label">Output scan</span>
              <span className="status-value teal">Zero-PII scan passed</span>
            </div>
          </div>

          <p className="aside-notice">
            Executive summaries include draft rubrics and private hiring notes. Candidate reports are separate, constructive views with no private scoring.
          </p>

          <p className="aside-disclaimer">
            AI observations require validation. They do not make the hiring decision.
          </p>
        </Panel>
      </div>

      {/* Filter Row with interactive dropdowns & search */}
      <div className="reports-filter-bar">
        {/* Filter 1: Search */}
        <div className="filter-field search-field">
          <label htmlFor="interviewer-search-input">SEARCH REPORTS</label>
          <div className="input-wrap">
            <input
              id="interviewer-search-input"
              type="text"
              placeholder="Session or anonymous candidate ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter 2: Date Range Dropdown with Down Arrow */}
        <div className="filter-field select-field">
          <label htmlFor="interviewer-date-select">DATE RANGE</label>
          <div className="select-wrap">
            <select
              id="interviewer-date-select"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            >
              <option value="all">All time</option>
              <option value="2026-10">October 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="past-3-months">Past 3 months</option>
            </select>
            <ChevronDownIcon />
          </div>
        </div>

        {/* Filter 3: Status Dropdown with Down Arrow */}
        <div className="filter-field select-field">
          <label htmlFor="interviewer-status-select">EVALUATION STATUS</label>
          <div className="select-wrap">
            <select
              id="interviewer-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All evaluations</option>
              <option value="pending">Pending review</option>
              <option value="evaluated">Evaluated</option>
              <option value="archived">Archived</option>
            </select>
            <ChevronDownIcon />
          </div>
        </div>
      </div>

      {/* Previous Reports / History Table */}
      <Panel className="reports-history-panel interviewer-history-panel">
        <div className="history-header-row">
          <h3>Previous interview reports</h3>
          <span className="count-badge">
            {filteredReports.length} {filteredReports.length === 1 ? "RECORD" : "RECORDS"}
          </span>
        </div>

        <div className="history-table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>SESSION / CANDIDATE</th>
                <th>INTERVIEW</th>
                <th>COMPLETED</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id}>
                  <td className="session-col">
                    <span className="mono-session">{report.id} / {report.candidateId}</span>
                  </td>
                  <td className="title-col">{report.interview}</td>
                  <td className="completed-col">{report.completedAt}</td>
                  <td className="status-col">
                    <span className="table-status-pill interviewer-status-pill">{report.status}</span>
                  </td>
                  <td className="actions-col">
                    <button
                      type="button"
                      className="table-action-link interviewer-teal-link"
                      onClick={() => navigate("/interviewer/reports/executive")}
                    >
                      Executive summary →
                    </button>
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    No reports match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* History navigation footer */}
      <div className="history-nav-footer">
        <small>4 REPORTS / NEWEST FIRST / ANONYMOUS SESSION EVIDENCE</small>
        <button
          type="button"
          className="back-interviews-link interviewer-purple-link"
          onClick={() => navigate("/interviewer")}
        >
          Back to interviews →
        </button>
      </div>

      {/* Sub-footer matching Figma Privacy and Support */}
      <div className="reports-privacy-subfooter">
        <div className="privacy-left">
          <span className="subfooter-tag">AI-ASSISTED / REVIEWABLE EVIDENCE</span>
          <p>Feedback supports human review; it does not decide the outcome.</p>
        </div>
        <div className="privacy-right">
          <span className="teal-status-text">Zero-PII scan passed · PDF ready</span>
        </div>
      </div>
    </Page>
  );
}

/* =========================================================================
   Screen 4: Interviewer Executive Summary (Figma Node 91:41924 / 91:41841)
   ========================================================================= */
function InterviewerExecutiveSummary({ dark }: { dark: boolean }) {
  const [evaluation, setEvaluation] = useState("");
  const [notes, setNotes] = useState("");
  const [savedEvaluation, setSavedEvaluation] = useState<string | null>(null);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  const handleSaveEvaluation = () => {
    if (!evaluation) {
      alert("Please select an evaluation verdict before saving.");
      return;
    }
    setSavedEvaluation(evaluation);
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 5000);
  };

  const handleExportPDF = () => {
    alert("Exporting private review PDF for session IV-2048 (Candidate C-7K2)...");
  };

  return (
    <Page
      className="executive-summary-page"
      eyebrow="IV-2048 / PRIVATE INTERVIEWER SUMMARY"
      title="Evidence over impressions."
      subtitle="C-7K2 · Backend engineering · 27 Oct 2026 · Anonymous, AI-assisted session review"
      beforeTitle={
        <div className="report-header-nav executive-top-nav">
          <button
            type="button"
            className="nav-back-btn interviewer-purple-link"
            onClick={() => navigate("/interviewer/reports")}
          >
            ← Back to reports / history
          </button>
          <button
            type="button"
            className="nav-prev-btn interviewer-purple-link"
            onClick={() => alert("Loading IV-2039 executive summary...")}
          >
            Previous interview: IV-2039 →
          </button>
        </div>
      }
      headerRight={
        <Button className="export-private-pdf-btn" onClick={handleExportPDF}>
          Export private review PDF →
        </Button>
      }
    >

      {/* Full-width Executive Readout Banner */}
      <Panel className="executive-readout-banner">
        <div className="task-readout-col">
          <h2 className="readout-task-title">Merge overlapping intervals</h2>
          <p className="readout-task-desc">
            Correct final solution. Endpoint handling improved after test feedback.
          </p>
        </div>

        <div className="executive-metrics-group">
          <div className="exec-metric-item">
            <span className="exec-metric-val">8 / 8</span>
            <span className="exec-metric-lbl">FINAL TESTS</span>
          </div>
          <div className="exec-metric-item">
            <span className="exec-metric-val">42:18</span>
            <span className="exec-metric-lbl">DURATION</span>
          </div>
          <div className="exec-metric-item">
            <span className={`exec-metric-val ${savedEvaluation ? "decision-saved" : ""}`}>
              {savedEvaluation ? savedEvaluation : "Pending"}
            </span>
            <span className="exec-metric-lbl">YOUR DECISION</span>
          </div>
        </div>
      </Panel>

      {/* 2-Column Evaluation and Continuity Section */}
      <div className="executive-content-grid">
        {/* Left Column: Technical Evidence (width ~840px) */}
        <div className="executive-left-col">
          {/* Rubric Table Panel */}
          <Panel className="rubric-panel">
            <div className="rubric-heading-row">
              <h3>Technical rubric · AI draft</h3>
              <span className="count-badge">4 RECORDS</span>
            </div>

            <div className="rubric-table-wrap">
              <table className="rubric-table">
                <thead>
                  <tr>
                    <th>DIMENSION</th>
                    <th>OBSERVABLE EVIDENCE</th>
                    <th>DRAFT LEVEL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="dimension-col">Correctness</td>
                    <td className="evidence-col">Final run #4 passes all 8 task tests.</td>
                    <td className="level-col">
                      <span className="status-pill demonstrated">Demonstrated</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="dimension-col">Algorithm & complexity</td>
                    <td className="evidence-col">Sort + scan; O(n log n) time and O(n) space.</td>
                    <td className="level-col">
                      <span className="status-pill demonstrated">Demonstrated</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="dimension-col">Boundary coverage</td>
                    <td className="evidence-col">Touching cases failed in run #2; fixed at line 10.</td>
                    <td className="level-col">
                      <span className="status-pill developing">Developing</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="dimension-col">Input contract</td>
                    <td className="evidence-col">Copies interval values; non-mutation test passes.</td>
                    <td className="level-col">
                      <span className="status-pill demonstrated">Demonstrated</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="rubric-footer-tag">
              AI DRAFT / VALIDATE BEFORE DECIDING
            </div>
          </Panel>

          {/* 2-Card Row: Endpoint Revision & AI-Assisted Interpretation */}
          <div className="verified-inferred-row">
            {/* Card 1: Verified Code & Execution */}
            <Panel className="evidence-card verified-card">
              <small className="card-eyebrow">VERIFIED / CODE & EXECUTION</small>
              <h3>The endpoint revision</h3>

              <div className="code-diff-box verified-excerpt-box">
                <span className="file-header">SOLUTION.PY / LINE 10</span>
                <div className="code-single-line">
                  <code>if start &lt;= merged[-1][1]:</code>
                </div>
                <div className="run-pass-note">
                  <span>Run #2 6/8 → run #4 8/8</span>
                </div>
              </div>

              <p className="card-body-text">
                Eight cases: empty, single, disjoint, overlap, nested, unsorted/non-mutating, touching and chained touching.
              </p>
            </Panel>

            {/* Card 2: Inferred AI-Assisted Interpretation */}
            <Panel className="evidence-card inferred-card">
              <small className="card-eyebrow">INFERRED / REVIEW IN CONTEXT</small>
              <h3>AI-assisted interpretation</h3>

              <p className="card-body-text interpretation-body">
                The revision suggests the candidate can incorporate test feedback. Boundary-case planning may need more deliberate attention.
              </p>

              <p className="interpretation-disclaimer">
                Not a verified trait or independent score. Review the code discussion before drawing a conclusion.
              </p>

              <div className="model-observation-tag">
                NEMOTRON 3 / AI OBSERVATION
              </div>
            </Panel>
          </div>

          {/* Card 3: Privacy-Checked Export */}
          <Panel className="privacy-checked-card">
            <div className="privacy-checked-header">
              <h3>Privacy-checked export</h3>
              <span className="zero-pii-badge">▪ Zero-PII output scan passed</span>
            </div>
            <p className="card-body-text">
              No personal data detected in this export. AI output is leak-scanned before PDF generation. Private interviewer PDF and candidate PDF remain separate.
            </p>
            <div className="privacy-card-tag">
              RESTRICTED REVIEW / C-7K2 / WEASYPRINT PDF
            </div>
          </Panel>
        </div>

        {/* Right Column: Continuity & Human Review (~400px) */}
        <div className="executive-right-col">
          {/* Card 1: 2m 10s Recovered Audit Panel */}
          <Panel className="reconciliation-audit-card">
            <small className="card-eyebrow">VERIFIED RECONCILIATION EVENTS</small>
            <h3 className="recovered-title">2m 10s, recovered.</h3>

            <p className="card-body-text">
              Network interruption at 24:00–26:10. Local capture continued; reconciliation completed before submission.
            </p>

            <div className="reconciliation-stats-list">
              <div className="reconciliation-stat-row">
                <span className="stat-label">Code edits</span>
                <span className="stat-val">46 / 46 reconciled</span>
              </div>
              <div className="reconciliation-stat-row">
                <span className="stat-label">Tab events</span>
                <span className="stat-val">2 / 2 reconciled</span>
              </div>
              <div className="reconciliation-stat-row">
                <span className="stat-label">5s media chunks</span>
                <span className="stat-val">26 / 26 received</span>
              </div>
              <div className="reconciliation-stat-row">
                <span className="stat-label">HMAC-SHA256 chain</span>
                <span className="stat-val">48 / 48 verified</span>
              </div>
            </div>

            <p className="reconciliation-footnote">
              Chain verification supports tamper evidence for recorded events; it cannot prove all activity was captured. Network loss or a tab switch alone is not misconduct.
            </p>
          </Panel>

          {/* Card 2: Interactive Decision Card */}
          <Panel className="human-evaluation-decision-card">
            <div className="card-top-meta">
              <span className="interviewer-badge">▪ Private interviewer review</span>
            </div>

            <h3 className="judgment-title">The final judgment is yours.</h3>
            <p className="judgment-desc">
              Validate the draft rubric, add context and record your final evaluation. AI does not make the hiring decision.
            </p>

            <div className="decision-form-group">
              <label htmlFor="final-evaluation-select">FINAL EVALUATION</label>
              <div className="select-wrap">
                <select
                  id="final-evaluation-select"
                  value={evaluation}
                  onChange={(e) => setEvaluation(e.target.value)}
                >
                  <option value="">Select an evaluation...</option>
                  <option value="Strong Hire">Strong Hire</option>
                  <option value="Hire">Hire</option>
                  <option value="Leaning Hire">Leaning Hire</option>
                  <option value="Leaning No Hire">Leaning No Hire</option>
                  <option value="No Hire">No Hire</option>
                </select>
                <ChevronDownIcon />
              </div>
            </div>

            <div className="decision-notes-group">
              <label htmlFor="interviewer-notes-area">PRIVATE EVALUATION NOTES</label>
              <textarea
                id="interviewer-notes-area"
                rows={4}
                placeholder="Add your evidence-led evaluation…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button
              className="save-evaluation-btn"
              onClick={handleSaveEvaluation}
            >
              Save final evaluation →
            </Button>

            {showSavedFeedback && (
              <div className="evaluation-saved-alert">
                ✓ Evaluation recorded as <strong>{savedEvaluation}</strong> · Notes stored in hiring ledger
              </div>
            )}

            <p className="judgment-footnote">
              These notes are private and do not appear in the candidate report.
            </p>
          </Panel>
        </div>
      </div>

      {/* Sub-footer matching Figma Privacy and Support */}
      <div className="reports-privacy-subfooter">
        <div className="privacy-left">
          <span className="subfooter-tag">AI-ASSISTED / REVIEWABLE EVIDENCE</span>
          <p>Feedback supports human review; it does not decide the outcome.</p>
        </div>
        <div className="privacy-right">
          <span className="teal-status-text">Zero-PII scan passed · PDF ready</span>
        </div>
      </div>
    </Page>
  );
}

/* =========================================================================
   Chevron Down Icon
   ========================================================================= */
function ChevronDownIcon() {
  return (
    <svg
      className="chevron-down-icon"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
