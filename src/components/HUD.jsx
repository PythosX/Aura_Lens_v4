import { motion } from "framer-motion";

export default function HUD({ stage, faceLocked, hands, portalActive, fps }) {
  const left = hands.left;
  const right = hands.right;

  return (
    <>
      <div className="hud hud-top-left">
        <div className="hud-title">AURALENS // VISION SYSTEM</div>
        <div className="hud-row">
          <span className={`status-dot ${faceLocked ? "on" : ""}`} />
          FACE TRACKING: {faceLocked ? "LOCKED" : "SEARCHING"}
        </div>
        <div className="hud-row">CAMERA: ACTIVE</div>
      </div>

      <div className="hud hud-top-right">
        <div className="hud-row">FPS <b>{fps || "--"}</b></div>
        <div className="hud-row">LEFT HAND <b>{left ? "LOCKED" : "—"}</b></div>
        <div className="hud-row">RIGHT HAND <b>{right ? "LOCKED" : "—"}</b></div>
        <div className="hud-row">PORTAL <b>{portalActive ? "ONLINE" : "STANDBY"}</b></div>
      </div>

      <motion.div
        className="stage-pill"
        key={stage}
        initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      >
        <span className="stage-index">{stage.index}</span>
        <span>{stage.label}</span>
      </motion.div>
    </>
  );
}
