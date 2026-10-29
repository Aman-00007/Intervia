const AI_VISIBILITY_KEY = "intervia:ai-visible-to-candidate";

export function getCandidateAIVisibility(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(AI_VISIBILITY_KEY);
  // Default to true so that AI shared screen is available out-of-the-box
  // when navigating to /candidate/workspace, or when explicitly enabled
  if (stored === null) return true;
  return stored === "true";
}

export function setCandidateAIVisibility(visible: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AI_VISIBILITY_KEY, String(visible));
  window.dispatchEvent(new Event("intervia:ai-visibility-change"));
}
