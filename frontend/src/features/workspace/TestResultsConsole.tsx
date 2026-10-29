import { useState } from "react";

export interface TestCaseItem {
  id: number;
  name: string;
  status: "passed" | "failed";
  input: string;
  expected: string;
  actual: string;
  note?: string;
}

const DEFAULT_TESTS: TestCaseItem[] = [
  {
    id: 1,
    name: "empty",
    status: "passed",
    input: "[]",
    expected: "[]",
    actual: "[]",
    note: "Empty list handled gracefully without mutation",
  },
  {
    id: 2,
    name: "single",
    status: "passed",
    input: "[[1, 4]]",
    expected: "[[1, 4]]",
    actual: "[[1, 4]]",
    note: "Single interval preserved as new list",
  },
  {
    id: 3,
    name: "disjoint",
    status: "passed",
    input: "[[1, 2], [5, 8]]",
    expected: "[[1, 2], [5, 8]]",
    actual: "[[1, 2], [5, 8]]",
    note: "Non-overlapping intervals remain distinct",
  },
  {
    id: 4,
    name: "overlap",
    status: "passed",
    input: "[[1, 3], [2, 6]]",
    expected: "[[1, 6]]",
    actual: "[[1, 6]]",
    note: "Overlapping ranges correctly merged",
  },
  {
    id: 5,
    name: "nested",
    status: "passed",
    input: "[[1, 10], [2, 5]]",
    expected: "[[1, 10]]",
    actual: "[[1, 10]]",
    note: "Enclosed interval absorbed into larger range",
  },
  {
    id: 6,
    name: "unsorted/non-mutating",
    status: "passed",
    input: "[[8, 10], [1, 3]]",
    expected: "[[1, 3], [8, 10]]",
    actual: "[[1, 3], [8, 10]]",
    note: "Sorted by start without changing caller input",
  },
  {
    id: 7,
    name: "touching endpoints",
    status: "failed",
    input: "[[1, 3], [3, 5]]",
    expected: "[[1, 5]]",
    actual: "[[1, 3], [3, 5]]",
    note: "Touching endpoints: [1,3] and [3,5] should merge into [1,5]",
  },
  {
    id: 8,
    name: "chained touching",
    status: "failed",
    input: "[[1, 2], [2, 3], [3, 4]]",
    expected: "[[1, 4]]",
    actual: "[[1, 2], [2, 3], [3, 4]]",
    note: "Chained boundary equality missed: expected [1,4]",
  },
];

interface TestResultsConsoleProps {
  isRecovery?: boolean;
  runMeta?: string;
  scoreText?: string;
  subtitle?: string;
  footerNote?: string;
}

export function TestResultsConsole({
  isRecovery = false,
  runMeta = "JUDGE0 / RUN #2 / 23:32",
  scoreText = "6 / 8",
  subtitle,
  footerNote,
}: TestResultsConsoleProps) {
  // Default selected test is the first failed test (Test 7)
  const [selectedTestId, setSelectedTestId] = useState<number>(7);

  const selectedTest = DEFAULT_TESTS.find((t) => t.id === selectedTestId) || DEFAULT_TESTS[6];

  const defaultSubtitle = isRecovery
    ? "Last verified result · not the latest edit"
    : "Tests passed · 2 endpoint cases need attention";

  const defaultFooter = isRecovery
    ? "Run #2 queued locally. Remote execution waits for reconciliation."
    : "SAVED 23:48 / ALL CHANGES SYNCED · JUDGE0 RUNTIME ACTIVE";

  return (
    <div className="test-console-card">
      {/* Console Header */}
      <div className="console-header-row">
        <h2 className="console-title">Test results / Console</h2>
        <span className="console-run-meta">{runMeta}</span>
      </div>

      {/* Score and Summary Line */}
      <div className="console-score-row">
        <div className="score-group">
          <span className="console-score-num">{scoreText}</span>
          <div className="console-status-pill">
            <span className="console-pulse-dot" />
            <span>{subtitle || defaultSubtitle}</span>
          </div>
        </div>

        <div className="console-stats-badges">
          <span className="stat-chip passed">6 PASSED</span>
          <span className="stat-chip failed">2 FAILING</span>
        </div>
      </div>

      {/* Test Case Chips (8 tests) */}
      <div className="test-cases-strip">
        {DEFAULT_TESTS.map((test) => {
          const isSelected = test.id === selectedTestId;
          const isPass = test.status === "passed";
          return (
            <button
              type="button"
              key={test.id}
              className={`test-chip ${test.status} ${isSelected ? "selected" : ""}`}
              onClick={() => setSelectedTestId(test.id)}
              title={`Click to inspect ${test.name} test details`}
            >
              <span className="chip-icon">{isPass ? "✓" : "✕"}</span>
              <span className="chip-name">
                {test.id}. {test.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Terminal / Test Diff Inspector */}
      <div className={`test-inspector-box ${selectedTest.status}`}>
        <div className="inspector-top-bar">
          <span className="inspector-case-tag">
            {selectedTest.status === "failed" ? "✕ FAIL" : "✓ PASS"} · TEST #{selectedTest.id}:{" "}
            {selectedTest.name.toUpperCase()}
          </span>
          <span className="inspector-diff-label">
            {selectedTest.status === "failed" ? "ASSERTION ERROR" : "OUTPUT VERIFIED"}
          </span>
        </div>

        <div className="inspector-diff-content">
          <div className="diff-field">
            <span className="diff-k">Input:</span>
            <code className="diff-v">{selectedTest.input}</code>
          </div>
          <div className="diff-field">
            <span className="diff-k">Expected:</span>
            <code className="diff-v expected">{selectedTest.expected}</code>
          </div>
          <div className="diff-field">
            <span className="diff-k">{selectedTest.status === "failed" ? "Got:" : "Actual:"}</span>
            <code className={`diff-v ${selectedTest.status === "failed" ? "got-failed" : "got-passed"}`}>
              {selectedTest.actual}
            </code>
          </div>
        </div>

        {selectedTest.note && (
          <div className="inspector-note">
            <span className="note-arrow">↳</span> {selectedTest.note}
          </div>
        )}
      </div>

      {/* Console Footer */}
      <div className="console-footer-note">
        <span className="footer-note-text">{footerNote || defaultFooter}</span>
      </div>
    </div>
  );
}

