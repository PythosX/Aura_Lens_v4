import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Maximize2, RotateCcw, Download, ShieldCheck } from "lucide-react";
import PortalCanvas from "./PortalCanvas";
import HUD from "./HUD";
import CharacterSidebar from "./CharacterSidebar";
import PythosBrand from "./PythosBrand";
import { characters } from "../data/characters";
import { createVisionModels, detectFace, detectHands } from "../vision/mediapipe";
import { distance, midpoint, smoothNumber, smoothPoint } from "../vision/smoothing";

const STAGES = {
  SEARCH: { index: "01", label: "FACE" },
  LOCK: { index: "02", label: "SYNC" },
  HANDS: { index: "03", label: "HANDS" },
  PORTAL: { index: "04", label: "PORTAL" }
};

export default function CameraExperience({ onReset }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const visionRef = useRef(null);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const fpsRef = useRef({ t: 0, frames: 0 });
  const offscreenRef = useRef(null);
  const faceRef = useRef(null);
  const handsRef = useRef({ left: null, right: null });
  const faceStableRef = useRef(0);
  const capturedRef = useRef(false);
  const portalReadyRef = useRef(false);

  const [stage, setStage] = useState(STAGES.SEARCH);
  const [status, setStatus] = useState("FINDING YOUR SIGNAL");
  const [detail, setDetail] = useState("Sit comfortably and look directly at the camera.");
  const [faceLocked, setFaceLocked] = useState(false);
  const [hands, setHands] = useState({ left: null, right: null });
  const [portalActive, setPortalActive] = useState(false);
  const [fps, setFps] = useState(0);
  const [selected, setSelected] = useState(characters[0].id);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [particles, setParticles] = useState(true);
  const [glow, setGlow] = useState(1);
  const [error, setError] = useState("");
  const [loadingVision, setLoadingVision] = useState(true);

  const character = useMemo(
    () => characters.find((c) => c.id === selected) || characters[0],
    [selected]
  );

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        setLoadingVision(true);
        setStatus("INITIALIZING VISION");
        setDetail("Preparing local face and hand tracking...");
        const models = await createVisionModels();
        if (cancelled) return;
        visionRef.current = models;
        await startCamera();
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("VISION SYSTEM COULD NOT START");
          setStatus("CAMERA ACCESS REQUIRED");
          setDetail("Allow camera access and try again.");
        }
      } finally {
        if (!cancelled) setLoadingVision(false);
      }
    }

    boot();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      visionRef.current?.face?.close?.();
      visionRef.current?.hands?.close?.();
    };
  }, []);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera API unavailable");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 }
      },
      audio: false
    });

    streamRef.current = stream;
    const video = videoRef.current;
    video.srcObject = stream;
    await video.play();

    setStatus("FINDING YOUR SIGNAL");
    setDetail("Looking for a stable face position...");
    loop();
  }

  function loop() {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !visionRef.current) {
      frameRef.current = requestAnimationFrame(loop);
      return;
    }

    const now = performance.now();
    if (now === lastTimeRef.current) {
      frameRef.current = requestAnimationFrame(loop);
      return;
    }
    lastTimeRef.current = now;

    const face = detectFace(visionRef.current.face, video, now);
    faceRef.current = face;

    if (face) {
      processFace(face);
    } else if (!portalReadyRef.current) {
      setFaceLocked(false);
      if (stage !== STAGES.SEARCH) {
        setStage(STAGES.SEARCH);
        setStatus("FACE NOT FOUND");
        setDetail("Move into the camera frame.");
      }
    }

    if (faceLocked || stage.index >= STAGES.HANDS.index) {
      const detected = detectHands(visionRef.current.hands, video, now);
      processHands(detected);
    }

    fpsRef.current.frames++;
    if (now - fpsRef.current.t > 600) {
      const current = Math.round((fpsRef.current.frames * 1000) / Math.max(1, now - fpsRef.current.t));
      setFps(Math.min(60, current));
      fpsRef.current = { t: now, frames: 0 };
    }

    frameRef.current = requestAnimationFrame(loop);
  }

  function processFace(face) {
    const box = getFaceBox(face);
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    const size = Math.max(box.maxX - box.minX, box.maxY - box.minY);

    if (stage === STAGES.SEARCH) {
      if (size > 0.08 && size < 0.9) {
        faceStableRef.current += 1;
      } else {
        faceStableRef.current = Math.max(0, faceStableRef.current - 2);
      }

      if (faceStableRef.current > 18) {
        setFaceLocked(true);
        setStage(STAGES.LOCK);
        setStatus("FACE LOCKED");
        setDetail("Your position has been detected.");
      }
    }

    if (stage === STAGES.LOCK && !capturedRef.current) {
      if (faceStableRef.current > 28) {
        hiddenFaceCapture();
        capturedRef.current = true;
        setStatus("SYNC COMPLETE");
        setDetail("Your character is ready. Raise both hands to open the portal.");
        setStage(STAGES.HANDS);
      } else {
        faceStableRef.current += 1;
      }
    }

    if (faceLocked && !capturedRef.current) {
      // Keep a memory-only reference of the current frame.
      hiddenFaceCapture();
    }

    // Keep a compact face transform in a ref for smooth mask rendering.
    faceTransformRef.current = {
      x: smoothNumber(faceTransformRef.current?.x, cx, 0.18),
      y: smoothNumber(faceTransformRef.current?.y, cy, 0.18),
      scale: smoothNumber(faceTransformRef.current?.scale, size, 0.14),
      roll: estimateRoll(face)
    };
  }

  function processHands(detected) {
    let left = null;
    let right = null;

    for (const landmarks of detected) {
      const wrist = landmarks[0];
      const index = landmarks[8];
      const pinky = landmarks[20];
      const palm = midpoint(wrist, landmarks[9]);
      const point = {
        x: Math.min(1, Math.max(0, palm.x)),
        y: Math.min(1, Math.max(0, palm.y))
      };
      const side = ((index?.x ?? palm.x) + (pinky?.x ?? palm.x)) / 2;
      if (side < 0.5 && !left) left = point;
      else if (!right) right = point;
      else if (!left) left = point;
    }

    const next = {
      left: smoothPoint(handsRef.current.left, left, 0.28),
      right: smoothPoint(handsRef.current.right, right, 0.28)
    };
    handsRef.current = next;
    setHands(next);

    if (stage.index >= STAGES.HANDS.index) {
      if (!left && !right) {
        if (!portalActive) {
          setStatus("OPEN THE PORTAL");
          setDetail("Raise both hands into view.");
        } else {
          setStatus("SIGNAL LOST");
          setDetail("Move back into position.");
        }
        return;
      }

      if (!left || !right) {
        setPortalActive(false);
        setStatus("ONE MORE HAND");
        setDetail("Raise both hands to continue.");
        return;
      }

      const gap = distance(left, right);
      if (gap < 0.18) {
        setPortalActive(false);
        setStatus("OPEN THE FRAME");
        setDetail("Move your hands slightly apart.");
        return;
      }

      if (gap > 0.75) {
        setPortalActive(false);
        setStatus("ALIGN WITH THE FRAME");
        setDetail("Bring your hands a little closer.");
        return;
      }

      setStatus(portalReadyRef.current ? "PORTAL ONLINE" : "PORTAL POSITION LOCKED");
      setDetail("Your movement is synchronized.");
      setStage(STAGES.PORTAL);
      setPortalActive(true);
      portalReadyRef.current = true;
    }
  }

  function hiddenFaceCapture() {
    const video = videoRef.current;
    if (!video) return;

    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement("canvas");
      offscreenRef.current.width = 512;
      offscreenRef.current.height = 512;
    }

    const canvas = offscreenRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;

    // Memory-only local reference. Nothing is converted to a URL or uploaded.
    const side = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - side) / 2;
    const sy = (video.videoHeight - side) / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
  }

  const faceTransformRef = useRef(null);

  function captureFinal() {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Add a lightweight final brand mark.
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillRect(28, canvas.height - 68, 230, 36);
    ctx.fillStyle = "#fff";
    ctx.font = "600 14px Arial";
    ctx.fillText("AURALENS // BUILT BY PYTHOSX", 42, canvas.height - 45);

    const link = document.createElement("a");
    link.download = "auralens-transformation.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function fullscreen() {
    document.documentElement.requestFullscreen?.();
  }

  function reset() {
    onReset?.();
  }

  return (
    <main className="experience">
      <div className="experience-vignette" />

      <header className="experience-header">
        <div className="wordmark">AURALENS</div>
        <div className="header-right">
          <span className="online-dot" /> ONLINE
        </div>
      </header>

      <section className="camera-shell">
        <div className="camera-chrome chrome-a">VISION / 01</div>
        <div className="camera-chrome chrome-b">LOCAL PROCESSING</div>

        <video
          ref={videoRef}
          className="camera-video"
          autoPlay
          playsInline
          muted
        />

        <div className="camera-overlay">
          <div className="scanline" />
          <div className={`face-guide ${faceLocked ? "locked" : ""}`}>
            <span className="guide-corner tl" />
            <span className="guide-corner tr" />
            <span className="guide-corner bl" />
            <span className="guide-corner br" />
          </div>

          {faceLocked && <AnimeMask character={character} face={faceRef.current} />}

          <PortalCanvas
            hands={hands}
            character={character}
            active={portalActive}
            particles={particles}
            glow={glow}
          />

          <HUD
            stage={stage}
            faceLocked={faceLocked}
            hands={hands}
            portalActive={portalActive}
            fps={fps}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              className="instruction"
              initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
            >
              <div className="instruction-kicker">{loadingVision ? "BOOTING" : stage.label}</div>
              <h1>{status}</h1>
              <p>{detail}</p>
            </motion.div>
          </AnimatePresence>

          {error && (
            <div className="camera-error">
              <Camera size={18} />
              <strong>{error}</strong>
              <button onClick={() => window.location.reload()}>TRY AGAIN</button>
            </div>
          )}

          <PythosBrand />
        </div>

        <CharacterSidebar
          selected={selected}
          setSelected={setSelected}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          particles={particles}
          setParticles={setParticles}
          glow={glow}
          setGlow={setGlow}
        />
      </section>

      <footer className="experience-controls">
        <div className="privacy">
          <ShieldCheck size={14} />
          <span>Your camera feed stays on this device.</span>
        </div>

        <div className="control-actions">
          <button onClick={captureFinal} disabled={!portalActive}>
            <Download size={15} /> CAPTURE
          </button>
          <button onClick={reset}>
            <RotateCcw size={15} /> RESET
          </button>
          <button onClick={fullscreen}>
            <Maximize2 size={15} /> FULLSCREEN
          </button>
        </div>
      </footer>
    </main>
  );
}

function getFaceBox(face) {
  const xs = face.map((p) => p.x);
  const ys = face.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
}

function estimateRoll(face) {
  const leftEye = face[33];
  const rightEye = face[263];
  if (!leftEye || !rightEye) return 0;
  return Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
}

function AnimeMask({ character, face }) {
  const transform = getFaceBox(face);
  const cx = ((transform.minX + transform.maxX) / 2) * 100;
  const cy = ((transform.minY + transform.maxY) / 2) * 100;
  const width = Math.max(9, (transform.maxX - transform.minX) * 122);

  return (
    <div
      className="anime-mask"
      style={{
        left: `${100 - cx}%`,
        top: `${cy}%`,
        width: `${width}%`,
        "--accent": character.accent
      }}
    >
      <img src={character.image} alt="" />
    </div>
  );
}
