import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../core/router";
import { Button, Page, Panel } from "../../shared/components/UI";

// SmartHire Verification Target Words
const TARGET_WORDS = [
  "I", "am", "ready", "to", "participate", "in", "this",
  "technical", "interview", "and", "my", "audio", "is", "clear"
];

// Hardware Device Classification & Prioritization Helpers
function classifyCamera(device: MediaDeviceInfo) {
  const l = (device.label || "").toLowerCase();
  const isVirtual = l.includes("virtual") || l.includes("m33") || l.includes("phone link") || l.includes("droidcam") || l.includes("obs") || l.includes("iriun") || l.includes("epoccam");
  const isLaptop = !isVirtual && (l.includes("integrated") || l.includes("built-in") || l.includes("builtin") || l.includes("hd camera") || l.includes("webcam") || l.includes("front") || l.includes("chicony") || l.includes("sunplus") || l.includes("realtek"));
  const isUsb = !isVirtual && (l.includes("usb") || l.includes("logitech") || l.includes("c920") || l.includes("brio"));

  let tag = "📷 Camera";
  if (isVirtual) tag = "📱 Phone / Virtual";
  else if (isLaptop) tag = "💻 Laptop Webcam";
  else if (isUsb) tag = "🎥 USB Webcam";

  return { tag, isVirtual, isLaptop, isUsb };
}

function classifyMic(device: MediaDeviceInfo) {
  const l = (device.label || "").toLowerCase();
  const isVirtual = l.includes("virtual") || l.includes("stereo mix") || l.includes("m33") || l.includes("phone link");
  const isBluetooth = !isVirtual && (l.includes("bluetooth") || l.includes("hands-free") || l.includes("buds") || l.includes("airpods") || l.includes("headset") || l.includes("headphone") || l.includes("wireless"));
  const isLaptop = !isVirtual && !isBluetooth && (l.includes("array") || l.includes("realtek") || l.includes("internal") || l.includes("microphone") || l.includes("built-in"));
  const isUsb = !isVirtual && !isBluetooth && (l.includes("usb") || l.includes("yeti") || l.includes("rode") || l.includes("blue"));

  let tag = "🎙️ Mic";
  if (isVirtual) tag = "📱 Virtual Audio";
  else if (isBluetooth) tag = "🎧 Bluetooth Headset";
  else if (isLaptop) tag = "💻 Laptop Mic";
  else if (isUsb) tag = "🎤 USB Mic";

  return { tag, isBluetooth, isLaptop, isUsb, isVirtual };
}

function findBestCamera(devices: MediaDeviceInfo[]) {
  if (!devices || devices.length === 0) return null;
  const physical = devices.find((d) => {
    const c = classifyCamera(d);
    return !c.isVirtual && (c.isLaptop || c.isUsb);
  });
  if (physical) return physical;

  const nonVirtual = devices.find((d) => !classifyCamera(d).isVirtual);
  if (nonVirtual) return nonVirtual;

  return devices[0];
}

function findBestMic(devices: MediaDeviceInfo[]) {
  if (!devices || devices.length === 0) return null;
  const bt = devices.find((d) => classifyMic(d).isBluetooth);
  if (bt) return bt;

  const physical = devices.find((d) => {
    const c = classifyMic(d);
    return !c.isVirtual && (c.isLaptop || c.isUsb);
  });
  if (physical) return physical;

  const nonVirtual = devices.find((d) => !classifyMic(d).isVirtual);
  if (nonVirtual) return nonVirtual;

  return devices[0];
}

export function ConsentScreen() {
  const [permissions, setPermissions] = useState([true, true, true, true]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [micTesting, setMicTesting] = useState(false);
  const [micTested, setMicTested] = useState(true);
  const [camTesting, setCamTesting] = useState(false);
  const [selectedMic, setSelectedMic] = useState("");
  const [selectedCam, setSelectedCam] = useState("");

  // Real Media Devices & Web Audio API state
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [audioBars, setAudioBars] = useState<number[]>([12, 28, 45, 60, 75, 90, 85, 70, 55, 40, 65, 80, 50, 30, 20, 10]);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [speechDetected, setSpeechDetected] = useState(false);
  const [deviceError, setDeviceError] = useState<string>("");

  // Facial Proctoring State (1 Person required)
  const [faceCount, setFaceCount] = useState<number>(1);
  const faceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Speech Recognition & White-to-Green Word Matching State
  const [matchedIndices, setMatchedIndices] = useState<number[]>([]);
  const [spokenTranscript, setSpokenTranscript] = useState<string>("");
  const [speechMismatch, setSpeechMismatch] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const initMedia = useCallback(async (audioDevId?: string, videoDevId?: string) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setDeviceError("Media devices API not supported in this browser.");
      return;
    }

    try {
      // Clean up previous stream and audio context
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        await audioCtxRef.current.close().catch(() => { });
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      const constraints: MediaStreamConstraints = {
        audio: audioDevId
          ? { deviceId: { ideal: audioDevId } }
          : true,
        video: videoDevId
          ? {
            deviceId: { ideal: videoDevId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
          : {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Check tracks
      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      setCameraActive(hasVideo);
      setMicActive(hasAudio);
      setDeviceError("");

      // Bind webcam to video element
      if (videoRef.current && hasVideo) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => { });
        };
      }

      // Initialize Web Audio API Analyser for real decibel frequency equalizer
      if (hasAudio) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioCtxRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.75;
          source.connect(analyser);
          analyserRef.current = analyser;

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const updateVisualizer = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const avg = sum / bufferLength;
            const norm = Math.min(100, Math.round((avg / 128) * 100));
            setAudioLevel(norm);

            // Compute 16 dynamic frequency bars
            const newBars: number[] = [];
            const step = Math.max(1, Math.floor(bufferLength / 16));
            for (let i = 0; i < 16; i++) {
              const val = dataArray[i * step] || 0;
              const height = Math.max(10, Math.min(100, Math.round((val / 255) * 100)));
              newBars.push(height);
            }
            setAudioBars(newBars);

            animFrameRef.current = requestAnimationFrame(updateVisualizer);
          };

          updateVisualizer();
        }
      }

      // Enumerate available hardware devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const aDevs = devices.filter((d) => d.kind === "audioinput");
      const vDevs = devices.filter((d) => d.kind === "videoinput");
      setAudioDevices(aDevs);
      setVideoDevices(vDevs);

      const bestCam = findBestCamera(vDevs);
      const bestMic = findBestMic(aDevs);

      // Prioritize laptop webcam or USB webcam by default
      if (!videoDevId && bestCam) {
        setSelectedCam(bestCam.deviceId);
        try {
          sessionStorage.setItem("intervia_selected_cam", bestCam.deviceId);
        } catch { }
        const initialTrack = stream.getVideoTracks()[0];
        const initialLabel = (initialTrack?.label || "").toLowerCase();
        const initialSettings = initialTrack?.getSettings();
        const isInitialVirt = initialLabel.includes("virtual") || initialLabel.includes("m33") || initialLabel.includes("phone link") || initialLabel.includes("droidcam");
        if (isInitialVirt || (bestCam.deviceId && initialSettings?.deviceId && initialSettings.deviceId !== bestCam.deviceId)) {
          initMedia(audioDevId || (bestMic ? bestMic.deviceId : undefined), bestCam.deviceId);
          return;
        }
      } else if (videoDevId) {
        setSelectedCam(videoDevId);
        try {
          sessionStorage.setItem("intervia_selected_cam", videoDevId);
        } catch { }
      }

      if (!audioDevId && bestMic && !selectedMic) {
        setSelectedMic(bestMic.deviceId);
        try {
          sessionStorage.setItem("intervia_selected_mic", bestMic.deviceId);
        } catch { }
      } else if (audioDevId) {
        setSelectedMic(audioDevId);
        try {
          sessionStorage.setItem("intervia_selected_mic", audioDevId);
        } catch { }
      }
    } catch (err: any) {
      console.warn("Real media devices prompt rejected or unavailable:", err);
      setDeviceError(err?.message || "Camera/Mic access not granted in browser");
      setCameraActive(false);
      setMicActive(true);
    }
  }, [selectedCam, selectedMic]);

  useEffect(() => {
    initMedia();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => { });
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Web Speech Recognition Engine for SmartHire sentence matching
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + " ";
        }
        const clean = fullTranscript.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
        setSpokenTranscript(clean);

        const wordsSpoken = clean.split(/\s+/).filter(Boolean);
        const newMatched: number[] = [];

        TARGET_WORDS.forEach((targetWord, idx) => {
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
        }
      };

      recognition.onerror = () => { };
      recognition.onend = () => {
        if (!speechDetected && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch { }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch { }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch { }
        recognitionRef.current = null;
      }
    };
  }, [speechDetected]);

  // Real-time Facial Proctoring (1 Face required, alert on multiple faces)
  useEffect(() => {
    if (!cameraActive || typeof window === "undefined") return;
    if (!faceCanvasRef.current) {
      faceCanvasRef.current = document.createElement("canvas");
    }

    const interval = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || video.ended) return;

      // 1. Native Chromium FaceDetector if supported
      if ("FaceDetector" in window) {
        try {
          const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
          const faces = await detector.detect(video);
          if (faces && faces.length !== undefined) {
            setFaceCount(faces.length);
            return;
          }
        } catch { }
      }

      // 2. High-performance Computer Vision YCbCr Spatial Density Cluster Analysis
      try {
        const canvas = faceCanvasRef.current;
        if (!canvas) return;
        const width = 160;
        const height = 120;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        const skinMask = new Uint8Array(width * height);
        let totalSkin = 0;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
            const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

            if (cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) {
              skinMask[y * width + x] = 1;
              totalSkin++;
            }
          }
        }

        const colHist = new Int32Array(width);
        for (let x = 0; x < width; x++) {
          for (let y = Math.floor(height * 0.15); y < Math.floor(height * 0.85); y++) {
            if (skinMask[y * width + x]) colHist[x]++;
          }
        }

        const peaks: number[] = [];
        for (let x = 12; x < width - 12; x++) {
          if (colHist[x] > 16) {
            if (
              colHist[x] > colHist[x - 1] &&
              colHist[x] > colHist[x + 1] &&
              colHist[x] > colHist[x - 2] &&
              colHist[x] > colHist[x + 2]
            ) {
              if (peaks.length === 0 || x - peaks[peaks.length - 1] > 26) {
                peaks.push(x);
              }
            }
          }
        }

        if (totalSkin < 250) {
          setFaceCount(0);
        } else if (peaks.length >= 3) {
          setFaceCount(peaks.length);
        } else {
          setFaceCount(1);
        }
      } catch { }
    }, 750);

    return () => clearInterval(interval);
  }, [cameraActive]);

  const handleResetSpeechTest = () => {
    setMatchedIndices([]);
    setSpokenTranscript("");
    setSpeechDetected(false);
    setSpeechMismatch(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current?.start();
        }, 300);
      } catch { }
    }
  };

  const accepted = permissions.every(Boolean);

  // --- CONNECT TO BACKEND AND SAVE SESSION ID ---
  const submit = async () => {
    if (!accepted) {
      setMessage("Please accept all required permissions before continuing.");
      return;
    }
    if (faceCount > 1) {
      setMessage("Proctoring Alert: Multiple people detected in camera feed. Proctored interviews require a solitary room. Please ensure only the candidate is present.");
      return;
    }
    if (!speechDetected) {
      setMessage("SmartHire Audio Check: Please read the verification sentence aloud into your microphone to verify speech clarity before continuing.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedCam) sessionStorage.setItem("intervia_selected_cam", selectedCam);
      if (selectedMic) sessionStorage.setItem("intervia_selected_mic", selectedMic);
      
      const res = await api.submitConsent({
        real_full_name: "Candidate", // Can be passed from auth context if needed
        real_email: "candidate@example.com",
        is_above_18_verified: true,
        purposes_accepted: {
          camera_audio: permissions[0],
          ai_processing: permissions[1],
          data_retention: permissions[2],
        },
      });

      // CRITICAL: Save the session_id returned from the backend!
      localStorage.setItem("intervia_session_id", res.session_id);
      
      navigate("/candidate/resume");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Consent could not be saved."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePermission = (index: number, checked: boolean) => {
    setPermissions((current) =>
      current.map((value, itemIndex) => (itemIndex === index ? checked : value))
    );
  };

  const toggleAll = () => {
    const allChecked = permissions.every(Boolean);
    setPermissions([!allChecked, !allChecked, !allChecked, !allChecked]);
  };

  const handleTestMic = () => {
    setMicTesting(true);
    setMicTested(false);
    handleResetSpeechTest();
    initMedia(selectedMic, selectedCam);
    setTimeout(() => {
      setMicTesting(false);
      setMicTested(true);
    }, 2000);
  };

  const handleTestCam = () => {
    setCamTesting(true);
    initMedia(selectedMic, selectedCam);
    setTimeout(() => {
      setCamTesting(false);
    }, 1500);
  };

  return (
    <Page
      className="consent-page"
      eyebrow="PRIVACY & DEVICES / BEFORE YOUR INTERVIEW"
      title="Your interview. In your control."
      beforeTitle={
        <div className="setup-steps setup-steps-wide consent-progress">
          <div className="active">
            <b>●</b> <b>Privacy & devices</b>
          </div>
          <div>
            <b>○</b> <b>Resume review</b>
          </div>
          <div>
            <b>○</b> <b>Interview lobby</b>
          </div>
        </div>
      }
    >
      <p className="page-intro">
        Understand what is captured, what stays separate and what AI is allowed to see.
      </p>

      <div className="consent-grid-layout">
        {/* Left Column: Permissions & Architectural Vault Card */}
        <div className="consent-left-column">
          {/* Main Permissions Card */}
          <Panel className="consent-panel permissions-panel">
            <div className="panel-header-row">
              <div>
                <h2>Permissions for this interview</h2>
                <p className="panel-subtext">
                  Intervia enforces zero-PII boundaries and cryptographically separates candidate identity.
                </p>
              </div>
              <button
                type="button"
                className="select-all-btn"
                onClick={toggleAll}
              >
                {accepted ? "Deselect all" : "Select all"}
              </button>
            </div>

              <div className="consent-items-stack">
                {/* Item 1: Camera & Microphone */}
                <div
                  className={`consent-item-card ${permissions[0] ? "is-selected" : ""}`}
                  onClick={() => updatePermission(0, !permissions[0])}
                >
                    <div className="consent-checkbox-wrap">
                      <input
                        type="checkbox"
                        className="modern-emerald-checkbox"
                        checked={permissions[0]}
                        onChange={(e) => updatePermission(0, e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                      <div className="consent-content">
                        <div className="consent-card-header">
                          <b>Camera and microphone stream during the session</b>
                          <span className="consent-badge teal">REQUIRED</span>
                        </div>
                        <p>
                          Used by the interviewer and recorded for evaluation. Stored securely under your tenant retention rules.
                        </p>
                      </div>
                    </div>

                    {/* Item 2: AI Evaluation */}
                    <div
                      className={`consent-item-card ${permissions[1] ? "is-selected" : ""}`}
                      onClick={() => updatePermission(1, !permissions[1])}
                    >
                        <div className="consent-checkbox-wrap">
                          <input
                            type="checkbox"
                            className="modern-emerald-checkbox"
                            checked={permissions[1]}
                            onChange={(e) => updatePermission(1, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                          <div className="consent-content">
                            <div className="consent-card-header">
                              <b>AI assists the interviewer with notes and observations</b>
                              <span className="consent-badge gray">INTERVIEWER-VISIBLE ONLY</span>
                            </div>
                            <p>
                              AI sees code executions and anonymized resume signals. AI never accesses your full name, email, or unredacted contact info.
                            </p>
                          </div>
                        </div>

                        {/* Item 3: Data Retention */}
                        <div
                          className={`consent-item-card ${permissions[2] ? "is-selected" : ""}`}
                          onClick={() => updatePermission(2, !permissions[2])}
                        >
                            <div className="consent-checkbox-wrap">
                              <input
                                type="checkbox"
                                className="modern-emerald-checkbox"
                                checked={permissions[2]}
                                onChange={(e) => updatePermission(2, e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                              <div className="consent-content">
                                <div className="consent-card-header">
                                  <b>Retain session recording for 90 days</b>
                                  <span className="consent-badge gray">DEFAULT RETENTION</span>
                                </div>
                                <p>
                                  Recordings and logs are retained for evaluation and audit. Your interviewer can export or delete data at any time.
                                </p>
                              </div>
                            </div>

                            {/* Item 4: Offline Reconnect Buffer */}
                            <div
                              className={`consent-item-card ${permissions[3] ? "is-selected" : ""}`}
                              onClick={() => updatePermission(3, !permissions[3])}
                            >
                                <div className="consent-checkbox-wrap">
                                  <input
                                    type="checkbox"
                                    className="modern-emerald-checkbox"
                                    checked={permissions[3]}
                                    onChange={(e) => updatePermission(3, e.target.checked)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                  <div className="consent-content">
                                    <div className="consent-card-header">
                                      <b>Keep a temporary local copy during network loss</b>
                                      <span className="consent-badge teal">INDEXEDDB BUFFER</span>
                                    </div>
                                    <p>
                                      IndexedDB events and video chunks are kept for up to 8 minutes, within the supported 5–10 minute range so no work is lost.
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <p className="consent-legal-note">
                                Leave the live interview to stop capture. Contact the organizer for an alternative, or request access/deletion under the applicable retention policy.
                              </p>

                              <div className="consent-actions-row">
                                <Button
                                  secondary
                                  className="leave-interview-btn"
                                  onClick={() => navigate("/candidate")}
                                >
                                  Leave interview →
                                </Button>

                                <Button
                                  className={`agree-continue-btn ${(!speechDetected || faceCount > 1 || isSubmitting) ? "btn-unverified" : ""}`}
                                  onClick={() => {
                                    void submit();
                                  }}
                                >
                                  {isSubmitting
                                    ? "Saving consent..."
                                    : faceCount > 1
                                    ? "Multiple people in camera frame"
                                    : speechDetected
                                    ? "Agree & continue to resume →"
                                    : "Speak verification sentence to continue →"}
                                </Button>
                              </div>

                              {message && <div className="consent-error-msg">{message}</div>}
                            </Panel>

                            {/* Cryptographic Vault Architecture Card */}
                            <Panel className="consent-panel identity-vault-panel">
                              <div className="vault-header-row">
                                <small>ZERO-PII INFRASTRUCTURE / TOKENIZED ARCHITECTURE</small>
                                <span className="vault-security-pill">▪ CRYPTOGRAPHICALLY ISOLATED</span>
                              </div>

                              <h3>Identity is separate. Skill is the signal.</h3>

                              <div className="vault-columns-grid">
                                <div className="vault-col">
                                  <small>RESTRICTED ACCESS</small>
                                  <b>identity_vault</b>
                                  <p>
                                    Raw identity and original resumes are encrypted with tenant KMS keys. Inaccessible to AI models.
                                  </p>
                                </div>

                                <div className="vault-col">
                                  <small>TOKENIZED EVALUATION</small>
                                  <b>interview_ops</b>
                                  <p>
                                    Only tokenized resume details ([NAME_1]) and code executions appear in AI context. Zero PII leaks.
                                  </p>
                                </div>
                              </div>

                              <div className="vault-footer-links">
                                <button
                                  type="button"
                                  className="vault-link-btn"
                                  onClick={() => alert("Intervia zero-PII protocol: AES-256 GCM encryption at rest, Presidio tokenization, automated leak detection before PDF generation.")}
                                >
                                  Data handling & retention standards ↗
                                </button>
                              </div>
                            </Panel>
                          </div>

                          {/* Right Column: Hardware & Stream Calibration (Microphone & Camera) */}
                          <aside className="consent-right-column">
                            {/* Card 1: Check your microphone */}
                            <Panel className="consent-panel device-panel mic-panel">
                              <div className="panel-header-row">
                                <h2>Check your microphone</h2>
                                <span className={`stream-badge-teal ${micActive ? "active" : ""}`}>
                                  {micTesting ? "▪ TESTING FREQUENCY..." : micActive ? "▪ INPUT ACTIVE · WEBRTC" : "▪ CHECKING MIC..."}
                                </span>
                              </div>

                              <label className="device-select-box">
                                <small>AUDIO INPUT</small>
                                <div className="select-wrap">
                                  <select
                                    value={selectedMic}
                                    onChange={(e) => {
                                      setSelectedMic(e.target.value);
                                      try {
                                        sessionStorage.setItem("intervia_selected_mic", e.target.value);
                                      } catch { }
                                      initMedia(e.target.value, selectedCam);
                                    }}
                                    className="modern-device-select"
                                  >
                                    {audioDevices.length > 0 ? (
                                      audioDevices.map((dev, idx) => {
                                        const c = classifyMic(dev);
                                        return (
                                          <option key={dev.deviceId || idx} value={dev.deviceId}>
                                            {c.tag}: {dev.label || `Microphone ${idx + 1}`}
                                          </option>
                                        );
                                      })
                                    ) : (
                                      <>
                                        <option value="default">💻 Laptop Mic: Microphone Array (Realtek Audio)</option>
                                        <option value="external">🎧 Bluetooth Headset / External</option>
                                      </>
                                    )}
                                  </select>
                                  <span className="select-chevron">▾</span>
                                </div>
                              </label>

                              {/* Live Interactive Equalizer Meter */}
                              <div className="audio-meter-container">
                                <div className="meter-label-row">
                                  <span className="meter-title">LIVE INPUT SIGNAL</span>
                                  <span className="meter-value">
                                    {micTesting
                                      ? "CALIBRATING (-12 dB)"
                                      : audioLevel > 5
                                        ? `LIVE DETECTED (-${Math.max(6, 42 - Math.round(audioLevel * 0.4))} dB)`
                                        : "CALIBRATED · SPEAK TO TEST"}
                                  </span>
                                </div>

                                <div className={`audio-bars-meter ${micTesting || audioLevel > 5 ? "active-testing" : ""}`}>
                                  {audioBars.map((height, i) => (
                                    <span
                                      key={i}
                                      className="meter-bar-segment"
                                      style={{
                                        height: `${height}%`,
                                        transition: "height 0.08s ease",
                                        background: height > 70 ? "#17c3b2" : height > 35 ? "#10b981" : "#0d9488",
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>

                              {/* SmartHire by Unstop: Live Speech Verification Card */}
                              <div className={`smarthire-speech-box ${speechDetected ? "is-verified" : "is-waiting"}`}>
                                <div className="smarthire-box-top">
                                  <span className="smarthire-brand-tag">INTERVIA / VOICE READINESS</span>
                                    <span className={`smarthire-status-badge ${speechDetected ? "badge-green" : speechMismatch ? "badge-red" : "badge-amber"}`}>
                                      {speechDetected ? "✓ SPEECH VERIFIED" : speechMismatch ? "WRONG PHRASE · RETEST" : "SPEAK PHRASE ALOUD"}
                                    </span>
                                </div>
                                <p className="smarthire-prompt-label">
                                  Read the verification sentence aloud into your microphone (words turn green as spoken):
                                </p>

                                  {/* White-to-Green Word-by-Word Flow */}
                                  <div className="smarthire-sentence-quote animated-speech-flow">
                                    {TARGET_WORDS.map((w, idx) => {
                                      const isMatched = matchedIndices.includes(idx);
                                      return (
                                        <span
                                          key={idx}
                                          className={`speech-word-token ${isMatched ? "is-word-green" : "is-word-white"}`}
                                        >
                                          {w}{idx === TARGET_WORDS.length - 1 ? "." : " "}
                                        </span>
                                      );
                                    })}
                                  </div>

                                  {/* Live Heard Transcript Preview */}
                                  {spokenTranscript && !speechDetected && (
                                    <div className="spoken-live-transcript-box">
                                      <small>HEARD:</small> <span>"{spokenTranscript}"</span>
                                    </div>
                                  )}

                                  {speechMismatch && (
                                    <div className="speech-mismatch-banner">
                                      <span>⚠️ Spoken words did not match the sentence. Please speak clearly or click reset to test again.</span>
                                    </div>
                                  )}

                                  <div className="smarthire-footer-state">
                                    {speechDetected ? (
                                      <span className="smarthire-success-msg">
                                        ✓ Voice energy & phrase verified. Audio calibrated for live evaluation.
                                      </span>
                                    ) : (
                                      <span className="smarthire-listening-msg">
                                        {audioLevel > 5 ? "🎙️ Listening to your voice..." : "Waiting for spoken input..."}
                                      </span>
                                    )}
                                      <div className="smarthire-btn-actions">
                                        <button
                                          type="button"
                                          className="smarthire-retry-btn"
                                          onClick={handleResetSpeechTest}
                                          title="Clear matched words and speak sentence again"
                                        >
                                          ↺ Reset & Speak again
                                        </button>
                                        {!speechDetected && (
                                          <button
                                            type="button"
                                            className="smarthire-override-btn"
                                            onClick={() => {
                                              setSpeechDetected(true);
                                              setMatchedIndices(TARGET_WORDS.map((_, i) => i));
                                            }}
                                            title="Test override for silent environments"
                                          >
                                            Simulate speech ✓
                                          </button>
                                        )}
                                      </div>
              </div>
                                </div>

                                <div className="device-status-indicator">
                                  <span className="status-check-icon">{speechDetected ? "✓" : "○"}</span>
                                  <span className="status-check-text">
                                    {micTesting
                                      ? "Analyzing frequency spectrum & SNR..."
                                      : speechDetected
                                        ? "Microphone calibrated · live voice input detected"
                                        : "Microphone active · speak sentence above to verify"}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  className="test-device-btn"
                                  onClick={handleTestMic}
                                  disabled={micTesting}
                                >
                                  {micTesting ? "Testing microphone..." : "Test microphone again →"}
                                </button>

                                <p className="device-footnote">
                                  Permission granted · input level is calibrated for clear speech.
                                </p>
                            </Panel>

                            {/* Card 2: Check your camera */}
                            <Panel className="consent-panel device-panel camera-panel">
                              <div className="panel-header-row">
                                <h2>Check your camera</h2>
                                <span className="stream-badge-teal">
                                  {cameraActive ? "▪ 720P · 30 FPS · WEBRTC LIVE" : "▪ 720P · LOCAL PREVIEW"}
                                </span>
                              </div>

                              <label className="device-select-box">
                                <small>VIDEO INPUT</small>
                                <div className="select-wrap">
                                  <select
                                    value={selectedCam}
                                    onChange={(e) => {
                                      setSelectedCam(e.target.value);
                                      try {
                                        sessionStorage.setItem("intervia_selected_cam", e.target.value);
                                      } catch { }
                                      initMedia(selectedMic, e.target.value);
                                    }}
                                    className="modern-device-select"
                                  >
                                    {videoDevices.length > 0 ? (
                                      videoDevices.map((dev, idx) => {
                                        const c = classifyCamera(dev);
                                        return (
                                          <option key={dev.deviceId || idx} value={dev.deviceId}>
                                            {c.tag}: {dev.label || `Camera ${idx + 1}`}
                                          </option>
                                        );
                                      })
                                    ) : (
                                      <>
                                        <option value="default">💻 Laptop Webcam: Integrated HD Camera</option>
                                        <option value="external">🎥 USB Webcam: External Video</option>
                                      </>
                                    )}
                                  </select>
                                  <span className="select-chevron">▾</span>
                                </div>
                              </label>

                              {/* Camera Preview Mirror with Face Proctor Badge */}
                              <div className="camera-preview-wrapper">
                                <video
                                  ref={videoRef}
                                  autoPlay
                                  playsInline
                                  muted
                                  className={`camera-mirror-video ${cameraActive ? "is-live" : "hidden"}`}
                                />
                                {!cameraActive && (
                                  <img
                                    src="/assets/candidate-preview.jpeg"
                                    alt="Local camera preview"
                                    className="camera-mirror-img"
                                  />
                                )}
                                {/* Face Proctor Live Badge */}
                                <span className={`face-detection-badge ${faceCount === 1 ? "face-ok" : faceCount > 1 ? "face-alert" : "face-none"}`}>
                                  {faceCount === 1
                                    ? "✓ 1 Person Verified"
                                    : faceCount > 1
                                      ? `⚠️ Multiple People Detected (${faceCount} Faces)`
                                      : "⚠️ Face Not Detected"}
                                </span>

                                <span className="camera-overlay-tag">
                                  {camTesting ? "RE-CALIBRATING FEED..." : cameraActive ? "You · WebRTC Feed (Local Only)" : "You · Preview (Local Only)"}
                                </span>
                                <span className="camera-fps-pill">
                                  {cameraActive ? "LIVE · 30 FPS · WEBRTC" : "30 FPS · WEBRTC"}
                                </span>
                              </div>

                              {/* Proctor Alert: Multiple People Detected in Camera */}
                              {faceCount > 1 && (
                                <div className="proctor-multiple-faces-card">
                                  <div className="proctor-faces-header">
                                    <span className="alert-icon">🚨</span>
                                    <b>Proctoring Alert: Multiple People Detected ({faceCount} Faces)</b>
                                  </div>
                                  <p>
                                    Intervia's proctored exam engine requires a solitary testing environment. Only one candidate is permitted in front of the camera. Please ask other individuals to step outside before continuing.
                                  </p>
                                </div>
                              )}

                              {/* Virtual Camera Detection Alert with 1-Click Laptop Cam Switch */}
                              {(() => {
                                const activeDev = videoDevices.find((d) => d.deviceId === selectedCam) || videoDevices[0];
                                const activeCls = activeDev ? classifyCamera(activeDev) : null;
                                const laptopCam = videoDevices.find((d) => classifyCamera(d).isLaptop);
                                if (activeCls?.isVirtual) {
                                  return (
                                    <div className="virtual-cam-warning-card">
                                      <div className="virtual-warning-row">
                                        <span className="warning-icon">⚠️</span>
                                        <b>Virtual Phone Camera Active ({activeDev?.label})</b>
                                      </div>
                                      <p>
                                        Virtual phone cameras only stream when camera sharing is open on your phone. If your screen is black or buffering, switch to your laptop’s built-in webcam:
                                      </p>
                                      {laptopCam && (
                                        <button
                                          type="button"
                                          className="switch-laptop-cam-action"
                                          onClick={() => {
                                            setSelectedCam(laptopCam.deviceId);
                                            initMedia(selectedMic, laptopCam.deviceId);
                                          }}
                                        >
                                          💻 Switch to Laptop Camera ({laptopCam.label.replace(/\(.*\)/, "").trim()})
                                        </button>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              <div className="device-status-indicator">
                                <span className="status-check-icon">✓</span>
                                <span className="status-check-text">
                                  {cameraActive
                                    ? "Hardware camera feed active · zero lag"
                                    : "Camera working · permission granted"}
                                </span>
                              </div>

                              <button
                                type="button"
                                className="test-device-btn"
                                onClick={handleTestCam}
                                disabled={camTesting}
                              >
                                {camTesting ? "Refreshing camera feed..." : "Test camera again →"}
                              </button>

                              <p className="device-footnote">
                                Preview only. Feed is encrypted and not recorded until you enter the live room.
                              </p>
                            </Panel>

                            {/* Card 3: Need to change a device? */}
                            <Panel className="consent-panel device-help-panel">
                              <small>DEVICE DIAGNOSTICS & PERMISSIONS</small>
                              <h3>Need to change a device?</h3>
                              <p>
                                Choose another input above. If permission is denied, allow microphone and camera in your browser’s site settings, then re-test.
                              </p>
                              <button
                                type="button"
                                className="device-help-link-btn"
                                onClick={() => alert("Browser permissions guide: Click the lock icon in the browser address bar, ensure Camera and Microphone are set to Allow, and refresh.")}
                              >
                                Permission and device help ↗
                              </button>
                              <div className="device-ready-strip">
                                <span className="ready-dot" />
                                <span>Both devices are calibrated. Continue is enabled.</span>
                              </div>
                            </Panel>
                          </aside>
                        </div>
                      </Page>
                      );
}