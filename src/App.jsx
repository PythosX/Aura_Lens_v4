import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Camera, ScanFace, ShieldCheck } from "lucide-react";
import CameraExperience from "./components/CameraExperience";

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {!started ? (
          <Intro onStart={() => setStarted(true)} />
        ) : (
          <motion.div
            key="experience"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9 }}
          >
            <CameraExperience onReset={() => setStarted(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Intro({ onStart }) {
  return (
    <motion.main
      className="intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(12px)" }}
    >
      <div className="intro-noise" />
      <div className="intro-orbit orbit-one" />
      <div className="intro-orbit orbit-two" />

      <header className="intro-header">
        <span className="wordmark">AURALENS</span>
        <span className="creator">BUILT BY PYTHOSX</span>
      </header>

      <div className="intro-content">
        <motion.div
          className="eyebrow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="pulse-dot" />
          VISION SYSTEM / READY
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.45, duration: 0.9 }}
        >
          SEE THE
          <br />
          <em>CHARACTER.</em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          Turn your movement into an anime world.
          <span>Your face becomes the anchor. Your hands open the portal.</span>
        </motion.p>

        <motion.button
          className="activate-button"
          onClick={onStart}
          whileHover={{ scale: 1.025 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <span>ACTIVATE AURALENS</span>
          <ArrowRight size={18} />
        </motion.button>

        <motion.div
          className="intro-features"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <div><ScanFace size={15} /> FACE SYNC</div>
          <div><Camera size={15} /> LIVE TRACKING</div>
          <div><ShieldCheck size={15} /> LOCAL PROCESSING</div>
        </motion.div>
      </div>

      <div className="intro-bottom">
        <span>01 / FACE</span>
        <span>02 / HANDS</span>
        <span>03 / PORTAL</span>
        <span className="intro-line" />
        <span>SEE THE CHARACTER. BECOME THE CHARACTER.</span>
      </div>
    </motion.main>
  );
}
