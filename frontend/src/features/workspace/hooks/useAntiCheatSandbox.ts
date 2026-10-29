import { useCallback, useEffect, useRef, useState } from "react";
import { HmacLogEntry, securityAuditLogger } from "../../offline/HmacChainLogger";

export interface AntiCheatOptions {
  enabled?: boolean;
  maxAllowedSwitches?: number;
  onViolation?: (entry: HmacLogEntry) => void;
}

export function useAntiCheatSandbox({
  enabled = true,
  maxAllowedSwitches = 3,
  onViolation,
}: AntiCheatOptions = {}) {
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(() => {
    try {
      const stored = sessionStorage.getItem("intervia_tab_switches");
      const val = stored ? parseInt(stored, 10) : 0;
      return Math.min(val, maxAllowedSwitches);
    } catch {
      return 0;
    }
  });

  const [showWarningModal, setShowWarningModal] = useState(false);
  const [modalReason, setModalReason] = useState<"tab_switch" | "fullscreen_exit" | "large_paste">("tab_switch");
  const [lastAwayDuration, setLastAwayDuration] = useState<string>("0.5");
  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== "undefined" ? Boolean(document.fullscreenElement) : false
  );

  const isDisqualified = tabSwitchCount >= maxAllowedSwitches;

  const blurTimestampRef = useRef<number | null>(null);
  const lastViolationTimeRef = useRef<number>(0);
  const suppressUntilRef = useRef<number>(0);

  // Request Fullscreen cleanly with fallback
  const enterFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return;
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        suppressUntilRef.current = Date.now() + 2000;
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn("Fullscreen request not permitted or cancelled by user:", err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return;
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        suppressUntilRef.current = Date.now() + 2000;
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // ignore
    }
  }, []);

  const recordViolation = useCallback(
    (type: string, payload: Record<string, any>) => {
      const entry = securityAuditLogger.append(type, payload);
      onViolation?.(entry);
      return entry;
    },
    [onViolation]
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // 1. Visibility Change Detection (HackerRank Tab Switch)
    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.visibilityState === "hidden") {
        blurTimestampRef.current = now;
      } else if (document.visibilityState === "visible") {
        if (now < suppressUntilRef.current) return;
        if (now - lastViolationTimeRef.current < 2000) return; // Prevent double trigger
        lastViolationTimeRef.current = now;

        const awayMs = blurTimestampRef.current ? now - blurTimestampRef.current : 500;
        const durationSec = Math.max(0.5, awayMs / 1000).toFixed(1);
        setLastAwayDuration(durationSec);

        setTabSwitchCount((prev) => {
          const nextCount = Math.min(maxAllowedSwitches, prev + 1);
          try {
            sessionStorage.setItem("intervia_tab_switches", nextCount.toString());
          } catch {
            // ignore
          }

          recordViolation("TAB_SWITCH", {
            durationSeconds: parseFloat(durationSec),
            violationAttempt: nextCount,
            maxAllowed: maxAllowedSwitches,
            terminated: nextCount >= maxAllowedSwitches,
          });

          return nextCount;
        });

        setModalReason("tab_switch");
        setShowWarningModal(true);
        blurTimestampRef.current = null;
      }
    };

    // 2. Window Blur (e.g. alt-tabbing or clicking outside)
    const handleWindowBlur = () => {
      if (!blurTimestampRef.current) {
        blurTimestampRef.current = Date.now();
      }
    };

    // 3. Fullscreen Exit Detection (only alert if user was in fullscreen)
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
      const now = Date.now();
      if (!isFull && now >= suppressUntilRef.current) {
        if (now - lastViolationTimeRef.current >= 2000) {
          lastViolationTimeRef.current = now;
          setTabSwitchCount((prev) => {
            const nextCount = Math.min(maxAllowedSwitches, prev + 1);
            try {
              sessionStorage.setItem("intervia_tab_switches", nextCount.toString());
            } catch {
              // ignore
            }
            recordViolation("FULLSCREEN_EXIT", {
              timestamp: new Date().toISOString(),
              violationAttempt: nextCount,
              maxAllowed: maxAllowedSwitches,
              terminated: nextCount >= maxAllowedSwitches,
            });
            return nextCount;
          });
          setModalReason("fullscreen_exit");
          setShowWarningModal(true);
        }
      }
    };

    // 4. Strict Clipboard Interception (Block all Copy / Paste / Cut in proctored candidate sandbox)
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const pasteText = e.clipboardData?.getData("text") || "";
      recordViolation("PASTE_ATTEMPT_BLOCKED", {
        characterCount: pasteText.length,
        timestamp: new Date().toISOString(),
      });
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      recordViolation("COPY_ATTEMPT_BLOCKED", {
        timestamp: new Date().toISOString(),
      });
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      recordViolation("CUT_ATTEMPT_BLOCKED", {
        timestamp: new Date().toISOString(),
      });
    };

    // 5. External Drag-Drop Block
    const handleDrop = (e: DragEvent) => {
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        recordViolation("EXTERNAL_FILE_DROP", {
          fileCount: e.dataTransfer.files.length,
        });
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("paste", handlePaste, true);
    window.addEventListener("copy", handleCopy, true);
    window.addEventListener("cut", handleCut, true);
    window.addEventListener("drop", handleDrop);
    window.addEventListener("dragover", handleDragOver);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("paste", handlePaste, true);
      window.removeEventListener("copy", handleCopy, true);
      window.removeEventListener("cut", handleCut, true);
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("dragover", handleDragOver);
    };
  }, [enabled, maxAllowedSwitches, recordViolation]);

  const dismissWarning = useCallback(() => {
    suppressUntilRef.current = Date.now() + 2500;
    setShowWarningModal(false);
  }, []);

  const resetViolations = useCallback(() => {
    setTabSwitchCount(0);
    setShowWarningModal(false);
    sessionStorage.removeItem("intervia_tab_switches");
  }, []);

  return {
    tabSwitchCount,
    maxAllowedSwitches,
    isDisqualified,
    showWarningModal,
    modalReason,
    lastAwayDuration,
    dismissWarning,
    resetViolations,
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    securityLogger: securityAuditLogger,
  };
}
