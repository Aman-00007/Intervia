import { ReactNode } from "react";
import { Screen, isCandidateScreen } from "../../core/models/screens";
import { navigate } from "../../core/router";
import { isDesktopApp } from "../../core/desktop";

export function AppShell({
  children,
  screen,
  theme,
  onThemeChange,
}: {
  children: ReactNode;
  screen: Screen;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
}) {
  const isDesktop = isDesktopApp();
  const candidate = isCandidateScreen(screen);
  const entry = screen === "join";
  const auth = screen.includes("login") || screen.includes("registration");
  const contextual = !auth && !entry;

  const contextText =
    screen === "interviewer-reports"
      ? "REPORTS / RESTRICTED HIRING TEAM ACCESS"
      : screen === "executive-summary"
        ? "IV-2048 / C-7K2 · BACKEND ENGINEERING"
        : screen === "manage-interview"
          ? "IV-2051 / C-9M4 · BACKEND ENGINEERING"
          : screen.startsWith("interviewer")
            ? screen.includes("workspace")
              ? "IV-2048 / C-7K2 / BACKEND ENGINEERING"
              : "INTERVIEW MANAGEMENT / TEAM WORKSPACE"
            : screen.startsWith("candidate")
              ? screen.includes("reports")
                ? "C-7K2 / MY REPORTS"
                : screen.includes("workspace") || screen === "lobby"
                  ? "IV-2048 / C-7K2 / BACKEND ENGINEERING"
                  : "C-7K2 / MY INTERVIEWS"
              : "IV-2048 / C-7K2 / BACKEND ENGINEERING";

  const contextDate =
    screen === "manage-interview"
      ? "27 OCT 2026 / SCHEDULED INTERVIEW"
      : screen === "recovery"
        ? "27 OCT 2026 / RECONNECTION SNAPSHOT"
        : screen === "executive-summary"
          ? "27 OCT 2026 / COMPLETED INTERVIEW"
          : screen.includes("workspace")
            ? screen.startsWith("interviewer")
              ? "27 OCT 2026 / LIVE · AI PRIVATE"
              : "27 OCT 2026 / LIVE INTERVIEW"
            : screen.includes("reports")
              ? "27 OCT 2026 / 15:00 UTC · AFTER INTERVIEW"
              : "27 OCT 2026 / 13:50 UTC · BEFORE SESSION";

  const roleLabel = candidate ? "CANDIDATE" : "ADMIN / INTERVIEWER";
  const interviewerNavActive =
    screen === "interviewer-dashboard" ||
    screen === "create-interview" ||
    screen === "manage-interview" ||
    screen === "interviewer-workspace";

  const candidateNavActive = (
    item: "interviews" | "setup" | "workspace" | "reports",
  ) =>
    item === "interviews"
      ? screen === "candidate-dashboard"
      : item === "setup"
        ? ["consent", "resume", "lobby"].includes(screen)
        : item === "workspace"
          ? ["candidate-hidden", "candidate-shared", "recovery"].includes(
              screen,
            )
          : ["candidate-reports", "candidate-report"].includes(screen);

  return (
    <div
      className={`app ${theme} ${candidate ? "candidate-shell" : "interviewer-shell"} ${screen === "interviewer-dashboard" ? "interviewer-dashboard-shell" : ""} ${isDesktop ? "desktop-app-shell" : ""}`}
    >
      {/* Topbar styled cleanly matching the landing page navbar */}
      <header
        className={`topbar ${entry ? "entry-topbar" : ""} ${auth ? "auth-topbar" : ""}`}
      >
        <div className="topbar-inner">
          <button
            type="button"
            className="brand"
            onClick={() => {
              if (isDesktop) return; // In proctored desktop client, brand click doesn't exit session
              navigate(candidate ? "/candidate" : "/interviewer");
            }}
          >
            <img src="/assets/block-mark.svg" alt="" className="brand-logo" />
            <span className="brand-name">Intervia</span>
          </button>

          {entry ? (
            isDesktop ? (
              <div className="desktop-proctor-indicator">
                <span className="proctor-dot"></span>
                <span className="proctor-text">SECURE DESKTOP CLIENT · PROCTORED</span>
                {typeof window !== "undefined" && localStorage.getItem("intervia_desktop_mode") === "true" && (
                  <button
                    type="button"
                    className="exit-desktop-sim-btn"
                    onClick={() => {
                      localStorage.removeItem("intervia_desktop_mode");
                      navigate("/");
                    }}
                    title="Exit simulated desktop mode and return to web landing page"
                  >
                    Exit Sim Mode ✕
                  </button>
                )}
              </div>
            ) : (
              <nav className="entry-nav">
                <a onClick={() => navigate("/")} className="back-link">
                  ← BACK TO INTERVIA
                </a>
                <a
                  onClick={() => navigate("/admin/login")}
                  className="nav-action-link admin-link"
                >
                  ADMIN ACCESS ↗
                </a>
              </nav>
            )
          ) : auth ? (
            <nav className="entry-nav">
              <a onClick={() => navigate("/")} className="back-link">
                ← BACK TO INTERVIA
              </a>
              <a
                onClick={() =>
                  navigate(!candidate ? "/candidate/login" : "/admin/login")
                }
                className={`nav-action-link ${!candidate ? "candidate-link" : "admin-link"}`}
              >
                {!candidate ? "CANDIDATE ACCESS ↗" : "ADMIN ACCESS ↗"}
              </a>
            </nav>
          ) : (
            <nav className="app-nav-links">
              {candidate ? (
                <>
                  {!isDesktop && (
                    <a
                      className={candidateNavActive("interviews") ? "active nav-link-green" : ""}
                      onClick={() => navigate("/candidate")}
                    >
                      MY INTERVIEWS
                    </a>
                  )}
                  <a
                    className={candidateNavActive("setup") ? "active nav-link-green" : ""}
                    onClick={() => navigate("/candidate/consent")}
                  >
                    SESSION SETUP
                  </a>
                  <a
                    className={candidateNavActive("workspace") ? "active nav-link-green" : ""}
                    onClick={() => navigate("/candidate/workspace")}
                  >
                    WORKSPACE
                  </a>
                  {!isDesktop && (
                    <a
                      className={candidateNavActive("reports") ? "active nav-link-green" : ""}
                      onClick={() => navigate("/candidate/reports")}
                    >
                      REPORTS
                    </a>
                  )}
                </>
              ) : (
                <>
                  <a
                    className={interviewerNavActive ? "active nav-link-purple" : ""}
                    onClick={() => navigate("/interviewer")}
                  >
                    INTERVIEWS
                  </a>
                  <a
                    className={
                      screen.includes("reports") || screen === "executive-summary"
                        ? "active nav-link-purple"
                        : ""
                    }
                    onClick={() => navigate("/interviewer/reports")}
                  >
                    REPORTS
                  </a>
                </>
              )}
            </nav>
          )}

          <div className="topbar-right-actions">
            {!entry && !auth && (
              <span
                className={`role-pill ${candidate ? "candidate-pill" : "admin-pill"}`}
              >
                {roleLabel}
              </span>
            )}

            <button
              type="button"
              className="theme-toggle-btn"
              onClick={() => onThemeChange(theme === "light" ? "dark" : "light")}
              aria-label="Toggle theme"
            >
              {theme === "light" ? "☼" : "☾"}
            </button>
          </div>
        </div>
      </header>

      {contextual && (
        <div className="context-bar">
          <div className="context-bar-inner">
            <span className="context-title">{contextText}</span>
            <span className="context-date">{contextDate}</span>
          </div>
        </div>
      )}

      <main className="main-content-area">{children}</main>

      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-links-left">
            <span className="footer-vault-brand">IDENTITY_VAULT ≠ INTERVIEW_OPS</span>
            <div className="footer-compliance-links">
              <a
                href="#privacy"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Privacy Center: Intervia enforces zero-PII evaluation with Presidio automated redaction.");
                }}
              >
                Privacy center ↗
              </a>
              <a
                href="#retention"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Data Handling & Retention: Session logs and media chunks follow strict organizational retention periods.");
                }}
              >
                Data handling & retention ↗
              </a>
              <a
                href="#support"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Support: Technical support is available for interview participants.");
                }}
              >
                Get support ↗
              </a>
            </div>
          </div>

          <span className="footer-tagline">Privacy-first technical interviews</span>
        </div>
      </footer>
    </div>
  );
}
