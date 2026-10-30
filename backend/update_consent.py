# Temporary script to update ConsentScreen.tsx
import re

path = 'frontend/src/features/onboarding/ConsentScreen.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add secondPersonStreakRef
old_canvas_decl = 'const faceCanvasRef = useRef<HTMLCanvasElement | null>(null);'
new_canvas_decl = '''const faceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const secondPersonStreakRef = useRef<number>(0);'''

if old_canvas_decl in content and 'secondPersonStreakRef' not in content:
    content = content.replace(old_canvas_decl, new_canvas_decl, 1)
    print("Added secondPersonStreakRef")

# 2. Update Virtual Camera fallback in initMedia
old_cam_block = '''      } else if (videoDevId) {
        setSelectedCam(videoDevId);
        try {
          sessionStorage.setItem("intervia_selected_cam", videoDevId);
        } catch { }
      }'''

new_cam_block = '''      } else if (videoDevId) {
        const chosenDev = vDevs.find((d) => d.deviceId === videoDevId);
        if (chosenDev && classifyCamera(chosenDev).isVirtual && bestCam) {
          setSelectedCam(bestCam.deviceId);
          try {
            sessionStorage.setItem("intervia_selected_cam", bestCam.deviceId);
          } catch { }
          initMedia(audioDevId || (bestMic ? bestMic.deviceId : undefined), bestCam.deviceId);
          return;
        }
        setSelectedCam(videoDevId);
        try {
          sessionStorage.setItem("intervia_selected_cam", videoDevId);
        } catch { }
      }'''

if old_cam_block in content:
    content = content.replace(old_cam_block, new_cam_block, 1)
    print("Updated virtual camera fallback")

# 3. Update Web Speech onresult to not wipe matched words
old_speech_block = '''        TARGET_WORDS.forEach((targetWord, idx) => {
          const normTarget = targetWord.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (wordsSpoken.includes(normTarget)) {
            newMatched.push(idx);
          }
        });

        setMatchedIndices(newMatched);

        // Verification condition: at least 8 key words matched
        if (newMatched.length >= 8) {
          setSpeechDetected(true);
          setSpeechMismatch(false);
        } else if (wordsSpoken.length >= 5 && newMatched.length < 3) {
          setSpeechMismatch(true);
        }'''

new_speech_block = '''        TARGET_WORDS.forEach((targetWord, idx) => {
          const normTarget = targetWord.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (wordsSpoken.includes(normTarget)) {
            newMatched.push(idx);
          }
        });

        if (newMatched.length > 0) {
          setMatchedIndices((prev) => Array.from(new Set([...prev, ...newMatched])));
        }

        // Verification condition: at least 7 key words matched or verified
        setMatchedIndices((current) => {
          if (current.length >= 7 || newMatched.length >= 7) {
            setSpeechDetected(true);
            setSpeechMismatch(false);
          }
          return current;
        });'''

if old_speech_block in content:
    content = content.replace(old_speech_block, new_speech_block, 1)
    print("Updated speech recognition matching")

# 4. Update CV 2D Cluster Analysis & False Positive Curtain Rejection
old_cv_start = '        // Candidate face missing / looking away / camera blocked'
old_cv_end = '        if (secondPersonDetected) {\n          setFaceCount(2);\n        } else {\n          setFaceCount(1);\n        }'

new_cv_code = '''        // Candidate face missing / looking away / camera blocked
        if (totalSkin < 120 || centerSkin < 35) {
          secondPersonStreakRef.current = 0;
          setFaceCount(0);
          return;
        }

        // Secondary Face Detection: Look for a distinct, genuine 2D human head
        // Discard tall vertical architectural objects like curtains, doors, and walls
        let secondPersonDetected = false;

        const colHist = new Int32Array(width);
        for (let x = 0; x < width; x++) {
          for (let y = minCenterY; y < maxCenterY; y++) {
            if (skinMask[y * width + x]) colHist[x]++;
          }
        }

        const smoothed = new Float32Array(width);
        for (let x = 3; x < width - 3; x++) {
          smoothed[x] =
            (colHist[x - 3] +
              colHist[x - 2] * 2 +
              colHist[x - 1] * 3 +
              colHist[x] * 4 +
              colHist[x + 1] * 3 +
              colHist[x + 2] * 2 +
              colHist[x + 3]) /
            16;
        }

        let primaryPeakX = width / 2;
        let maxPeakVal = 0;
        for (let x = 30; x < width - 30; x++) {
          if (smoothed[x] > maxPeakVal) {
            maxPeakVal = smoothed[x];
            primaryPeakX = x;
          }
        }

        // Check for secondary peak separated by >= 50px
        for (let x = 16; x < width - 16; x++) {
          if (Math.abs(x - primaryPeakX) >= 50 && smoothed[x] >= 35) {
            if (smoothed[x] >= smoothed[x - 1] && smoothed[x] >= smoothed[x + 1]) {
              let yMin = height;
              let yMax = 0;
              let clusterPixels = 0;
              const xStart = Math.max(0, x - 14);
              const xEnd = Math.min(width - 1, x + 14);

              let lumSum = 0;
              let lumSqSum = 0;

              for (let sy = 5; sy < height - 5; sy++) {
                for (let sx = xStart; sx <= xEnd; sx++) {
                  if (skinMask[sy * width + sx]) {
                    clusterPixels++;
                    if (sy < yMin) yMin = sy;
                    if (sy > yMax) yMax = sy;

                    const pIdx = (sy * width + sx) * 4;
                    const yVal = 0.299 * data[pIdx] + 0.587 * data[pIdx + 1] + 0.114 * data[pIdx + 2];
                    lumSum += yVal;
                    lumSqSum += yVal * yVal;
                  }
                }
              }

              const clusterHeight = yMax - yMin;
              const clusterWidth = xEnd - xStart + 1;
              const aspect = clusterHeight / Math.max(1, clusterWidth);
              const fillRatio = clusterPixels / Math.max(1, clusterHeight * clusterWidth);
              const lumVariance = (lumSqSum / Math.max(1, clusterPixels)) - ((lumSum / Math.max(1, clusterPixels)) ** 2);

              // REJECT curtain / drape / background artifacts:
              const isCurtainOrWall = clusterHeight > 75 || yMin < 10 || yMax > 105 || aspect > 1.85 || aspect < 0.8 || fillRatio < 0.45 || lumVariance < 200;

              // ACCEPT as second person ONLY if it has true human head dimensions:
              if (!isCurtainOrWall && clusterPixels >= 550 && clusterHeight >= 24 && clusterHeight <= 55 && aspect >= 0.85 && aspect <= 1.6) {
                const vStart = Math.min(primaryPeakX, x) + 10;
                const vEnd = Math.max(primaryPeakX, x) - 10;
                let valleyMin = 999;
                for (let vx = vStart; vx <= vEnd; vx++) {
                  if (smoothed[vx] < valleyMin) valleyMin = smoothed[vx];
                }
                if (valleyMin < 15) {
                  secondPersonDetected = true;
                  break;
                }
              }
            }
          }
        }

        if (secondPersonDetected) {
          secondPersonStreakRef.current += 1;
          if (secondPersonStreakRef.current >= 4) {
            setFaceCount(2);
          }
        } else {
          secondPersonStreakRef.current = Math.max(0, secondPersonStreakRef.current - 1);
          if (secondPersonStreakRef.current < 4) {
            setFaceCount(1);
          }
        }'''

# Match and replace the CV block
idx_start = content.find(old_cv_start)
idx_end = content.find(old_cv_end)
if idx_start != -1 and idx_end != -1:
    content = content[:idx_start] + new_cv_code + content[idx_end + len(old_cv_end):]
    print("Updated CV 2D Cluster Analysis")
else:
    print(f"Could not locate CV block: idx_start={idx_start}, idx_end={idx_end}")

# 5. Update handleResetSpeechTest to resume audio context
old_reset = '''  const handleResetSpeechTest = () => {
    setMatchedIndices([]);
    setSpokenTranscript("");
    setSpeechDetected(false);
    setSpeechMismatch(false);
    lastVoiceBurstRef.current = performance.now() + 500;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch { }
        }, 300);
      } catch { }
    }
  };'''

new_reset = '''  const handleResetSpeechTest = () => {
    setMatchedIndices([]);
    setSpokenTranscript("");
    setSpeechDetected(false);
    setSpeechMismatch(false);
    lastVoiceBurstRef.current = performance.now() + 500;
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => { });
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch { }
        }, 300);
      } catch { }
    }
  };'''

if old_reset in content:
    content = content.replace(old_reset, new_reset, 1)
    print("Updated handleResetSpeechTest")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("ConsentScreen.tsx update complete.")
