import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Sparkles, Zap } from "lucide-react";
import { characters } from "../data/characters";

export default function CharacterSidebar({
  selected,
  setSelected,
  collapsed,
  setCollapsed,
  particles,
  setParticles,
  glow,
  setGlow
}) {
  const active = characters.find((c) => c.id === selected) || characters[0];

  return (
    <motion.aside
      className={`character-sidebar ${collapsed ? "collapsed" : ""}`}
      layout
    >
      <button
        className="sidebar-toggle"
        onClick={() => setCollapsed(!collapsed)}
        aria-label="Toggle controls"
      >
        <ChevronLeft size={16} className={collapsed ? "rotate-180" : ""} />
      </button>

      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="sidebar-content"
        >
          <div className="side-kicker">AURA / SELECT</div>
          <h3>CHARACTERS</h3>

          <div className="character-list">
            {characters.map((character) => (
              <button
                key={character.id}
                className={`character-card ${selected === character.id ? "selected" : ""}`}
                style={{ "--accent": character.accent }}
                onClick={() => setSelected(character.id)}
              >
                <img src={character.image} alt={character.name} />
                <span className="character-meta">
                  <strong>{character.name}</strong>
                  <small>{character.subtitle}</small>
                </span>
                {selected === character.id && <i />}
              </button>
            ))}
          </div>

          <div className="side-divider" />

          <div className="side-kicker">EFFECTS</div>
          <button
            className={`effect-toggle ${particles ? "active" : ""}`}
            onClick={() => setParticles(!particles)}
          >
            <Sparkles size={15} /> PARTICLES <b>{particles ? "ON" : "OFF"}</b>
          </button>
          <label className="range-row">
            <span><Zap size={14} /> PORTAL GLOW</span>
            <input
              type="range"
              min="0.3"
              max="1.6"
              step="0.05"
              value={glow}
              onChange={(e) => setGlow(Number(e.target.value))}
            />
          </label>

          <div className="side-divider" />
          <div className="active-character">
            <span>ACTIVE</span>
            <strong style={{ color: active.accent }}>{active.name}</strong>
          </div>
        </motion.div>
      )}
    </motion.aside>
  );
}
