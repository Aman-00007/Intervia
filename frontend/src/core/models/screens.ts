import { isDesktopApp } from "../desktop";

export type Screen =
  | "landing"
  | "test-gallery"
  | "admin-login" | "candidate-login" | "admin-registration" | "candidate-registration"
  | "join" | "interviewer-dashboard" | "create-interview" | "manage-interview"
  | "candidate-dashboard" | "consent" | "resume" | "lobby" | "interviewer-workspace"
  | "candidate-hidden" | "candidate-shared" | "recovery" | "candidate-reports"
  | "candidate-report" | "interviewer-reports" | "executive-summary";

const routes: Record<string, Screen> = {
  "/": "landing",
  "/landing": "landing",
  "/__test": "test-gallery",
  "/admin/login": "admin-login",
  "/candidate/login": "candidate-login",
  "/admin/register": "admin-registration",
  "/candidate/register": "candidate-registration",
  "/join": "join",
  "/interviewer": "interviewer-dashboard",
  "/interviewer/create": "create-interview",
  "/interviewer/manage": "manage-interview",
  "/candidate": "candidate-dashboard",
  "/candidate/consent": "consent",
  "/candidate/resume": "resume",
  "/candidate/lobby": "lobby",
  "/interviewer/workspace": "interviewer-workspace",
  "/candidate/workspace": "candidate-hidden",
  "/candidate/workspace/shared": "candidate-shared",
  "/candidate/recovery": "recovery",
  "/candidate/reports": "candidate-reports",
  "/candidate/reports/detail": "candidate-report",
  "/interviewer/reports": "interviewer-reports",
  "/interviewer/reports/executive": "executive-summary",
};

export function screenForPath(path: string): Screen {
  const isDesktop = isDesktopApp();

  // In standalone desktop proctor app (like Unhire), root path and landing
  // strictly open the code entry screen (/join). There is no landing page.
  if (isDesktop && (path === "/" || path === "/landing")) {
    return "join";
  }

  // In desktop app, disallow navigating to admin / recruiter interfaces
  if (isDesktop && (path.startsWith("/admin") || path.startsWith("/interviewer"))) {
    return "join";
  }

  // Handle invitation links like /invite/IV-2048 -> routes directly to candidate login
  if (path.startsWith("/invite/")) {
    const inviteCode = path.replace("/invite/", "").trim();
    if (inviteCode && typeof sessionStorage !== "undefined") {
      try {
        sessionStorage.setItem("active_interview_code", inviteCode);
      } catch {
        // ignore
      }
    }
    return "candidate-login";
  }
  if (path === "/invite") {
    return "candidate-login";
  }

  return routes[path] ?? (isDesktop ? "join" : "landing");
}

export function isCandidateScreen(screen: Screen) {
  return screen.startsWith("candidate") || ["join", "consent", "resume", "lobby", "recovery"].includes(screen);
}
