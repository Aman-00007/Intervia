/**
 * Desktop Proctored Environment Detection (Unhire-style client)
 * Identifies whether the application is running inside the standalone
 * Intervia Desktop Application (Electron, Tauri, or WebView2) or web browser.
 */

export function isDesktopApp(): boolean {
  if (typeof window === "undefined") return false;

  const win = window as any;

  // 1. Desktop runner flags (Electron, Tauri, or custom proctor bridge)
  if (
    win.isInterviaDesktop === true ||
    win.__INTERVIA_DESKTOP__ === true ||
    win.isDesktopApp === true ||
    Boolean(win.electron) ||
    Boolean(win.__TAURI__)
  ) {
    return true;
  }

  // 2. Query parameters for testing / simulated launch: ?app=desktop or ?mode=desktop
  try {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("app") === "desktop" ||
      params.get("mode") === "desktop" ||
      params.get("desktop") === "true"
    ) {
      return true;
    }
  } catch {
    // Ignore query parsing errors
  }

  // 3. User agent check for standalone client
  if (
    typeof navigator !== "undefined" &&
    (navigator.userAgent.includes("InterviaDesktop") ||
      navigator.userAgent.includes("Electron"))
  ) {
    return true;
  }

  // 4. LocalStorage setting (allows persistent browser simulation of Desktop Mode)
  try {
    if (localStorage.getItem("intervia_desktop_mode") === "true") {
      return true;
    }
  } catch {
    // Ignore storage errors
  }

  return false;
}

/**
 * Toggle desktop simulation mode for testing in browser
 */
export function setDesktopSimulationMode(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem("intervia_desktop_mode", "true");
    } else {
      localStorage.removeItem("intervia_desktop_mode");
    }
  } catch {
    // Ignore
  }
}

