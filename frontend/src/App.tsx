import { useEffect, useState } from "react";
import { AppShell } from "./shared/layout/AppShell";
import { Screen, screenForPath } from "./core/models/screens";
import { navigate } from "./core/router";
import { isDesktopApp } from "./core/desktop";
import { AuthView } from "./features/auth/AuthView";
import { DashboardView } from "./features/dashboard/DashboardView";
import { OnboardingView } from "./features/onboarding/OnboardingView";
import { WorkspaceView } from "./features/workspace/WorkspaceView";
import { ReportsView } from "./features/reports/ReportsView";
import { TestGallery } from "./features/test/TestGallery";
import { LandingView } from "./features/landing/LandingView";

export function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const isDesktop = isDesktopApp();
  const screen = screenForPath(path);

  // Handle Navigation Events
  useEffect(() => {
    // If in Desktop app and trying to view landing or root, automatically go to /join
    if (isDesktop && (window.location.pathname === "/" || window.location.pathname === "/landing")) {
      window.history.replaceState({}, "", "/join");
      setPath("/join");
    }

    const handleNavigation = () => {
      setPath(window.location.pathname);
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, [isDesktop]);

  // --- Route Guard ---
  useEffect(() => {
    const token = localStorage.getItem("intervia_token");
    
    // Define which screens are completely public (no login required)
    const publicScreens: Screen[] = [
      "landing", 
      "test-gallery", 
      "admin-login", 
      "candidate-login", 
      "admin-registration", 
      "candidate-registration", 
      "join" // Allow entry via invite code
    ];

    // If user is NOT logged in and tries to access a protected screen
    if (!token && !publicScreens.includes(screen)) {
      // Check if it's an interviewer path or candidate path
      if (path.startsWith("/interviewer")) {
        navigate("/admin/login");
      } else {
        navigate("/candidate/login");
      }
    }
  }, [screen, path]);

  if (screen === "landing" && !isDesktop) {
    return <LandingView theme={theme} onThemeChange={setTheme} />;
  }

  // --- FIXED: Added 'as Screen[]' to resolve TypeScript error ---
  const isAuth = (["admin-login", "candidate-login", "admin-registration", "candidate-registration"] as Screen[]).includes(screen);
  
  const content = screen === "test-gallery" ? <TestGallery /> : isAuth ? <AuthView screen={screen} /> : <ScreenView screen={screen} theme={theme} />;

  return (
    <AppShell screen={screen} theme={theme} onThemeChange={setTheme}>
      {content}
    </AppShell>
  );
}

function ScreenView({ screen, theme }: { screen: Screen; theme: "light" | "dark" }) {
  if (["join", "consent", "resume", "lobby"].includes(screen)) return <OnboardingView screen={screen as "join" | "consent" | "resume" | "lobby"} />;
  if (["interviewer-dashboard", "create-interview", "manage-interview", "candidate-dashboard"].includes(screen)) {
    return <DashboardView screen={screen as "interviewer-dashboard" | "create-interview" | "manage-interview" | "candidate-dashboard"} />;
  }
  if (["interviewer-workspace", "candidate-hidden", "candidate-shared", "recovery"].includes(screen)) {
    return <WorkspaceView screen={screen as "interviewer-workspace" | "candidate-hidden" | "candidate-shared" | "recovery"} />;
  }
  if (["candidate-reports", "candidate-report", "interviewer-reports", "executive-summary"].includes(screen)) {
    return <ReportsView screen={screen as "candidate-reports" | "candidate-report" | "interviewer-reports" | "executive-summary"} dark={theme === "dark"} />;
  }
  return <LandingView theme={theme} onThemeChange={() => {}} />;
}