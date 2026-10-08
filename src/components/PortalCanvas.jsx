import { useEffect, useRef } from "react";
import { distance, midpoint } from "../vision/smoothing";

export default function PortalCanvas({
  hands,
  character,
  active,
  particles = true,
  glow = 1,
  videoWidth = 1280,
  videoHeight = 720
}) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ particles: [] });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      ctx.clearRect(0, 0, W, H);

      if (!active || !hands.left || !hands.right) {
        raf = requestAnimationFrame(render);
        return;
      }

      const map = (p) => ({ x: p.x * W, y: p.y * H });
      const left = map(hands.left);
      const right = map(hands.right);
      const center = midpoint(left, right);
      const handGap = Math.max(80, distance(left, right));
      const portalW = Math.min(W * 0.82, handGap * 1.8);
      const portalH = portalW * 0.68;
      const angle = Math.atan2(right.y - left.y, right.x - left.x);

      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(angle);

      const x = -portalW / 2;
      const y = -portalH / 2;
      const radius = Math.min(30, portalW * 0.06);

      // Atmospheric glow.
      ctx.shadowBlur = 28 * glow;
      ctx.shadowColor = character.accent;
      ctx.strokeStyle = `${character.accent}55`;
      ctx.lineWidth = 8;
      roundRect(ctx, x, y, portalW, portalH, radius);
      ctx.stroke();

      // Interior character.
      ctx.shadowBlur = 0;
      const image = getImage(character.image);
      if (image?.complete) {
        ctx.save();
        roundRect(ctx, x + 5, y + 5, portalW - 10, portalH - 10, Math.max(20, radius - 4));
        ctx.clip();
        const imgRatio = image.width / image.height || 1;
        const boxRatio = portalW / portalH;
        let dw = portalW, dh = portalH;
        if (imgRatio > boxRatio) {
          dh = portalH;
          dw = dh * imgRatio;
        } else {
          dw = portalW;
          dh = dw / imgRatio;
        }
        const t = performance.now() / 1000;
        const zoom = 1.02 + Math.sin(t * 0.6) * 0.012;
        dw *= zoom;
        dh *= zoom;
        ctx.globalAlpha = 0.98;
        ctx.drawImage(image, -dw / 2, -dh / 2, dw, dh);
        const grad = ctx.createLinearGradient(0, -portalH / 2, 0, portalH / 2);
        grad.addColorStop(0, "rgba(0,0,0,.14)");
        grad.addColorStop(0.5, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,.28)");
        ctx.fillStyle = grad;
        ctx.fillRect(-portalW / 2, -portalH / 2, portalW, portalH);
        ctx.restore();
      }

      // Energy grid / scan lines.
      ctx.save();
      roundRect(ctx, x, y, portalW, portalH, radius);
      ctx.clip();
      ctx.globalAlpha = 0.11;
      ctx.strokeStyle = character.accent;
      ctx.lineWidth = 1;
      for (let yy = y; yy < y + portalH; yy += 12) {
        ctx.beginPath();
        ctx.moveTo(x, yy);
        ctx.lineTo(x + portalW, yy);
        ctx.stroke();
      }
      const sweep = ((performance.now() / 2500) % 1) * portalW;
      const sweepGrad = ctx.createLinearGradient(x + sweep - 100, 0, x + sweep + 100, 0);
      sweepGrad.addColorStop(0, "transparent");
      sweepGrad.addColorStop(0.5, `${character.accent}88`);
      sweepGrad.addColorStop(1, "transparent");
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(x, y, portalW, portalH);
      ctx.restore();

      // Portal border.
      ctx.shadowBlur = 18 * glow;
      ctx.shadowColor = character.accent;
      ctx.strokeStyle = character.accent;
      ctx.lineWidth = 2.2;
      roundRect(ctx, x, y, portalW, portalH, radius);
      ctx.stroke();

      // Inner border.
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,.72)";
      ctx.lineWidth = 0.8;
      roundRect(ctx, x + 8, y + 8, portalW - 16, portalH - 16, Math.max(14, radius - 8));
      ctx.stroke();

      // Corners.
      drawCorner(ctx, x, y, 1, 1, character.accent);
      drawCorner(ctx, x + portalW, y, -1, 1, character.accent);
      drawCorner(ctx, x, y + portalH, 1, -1, character.accent);
      drawCorner(ctx, x + portalW, y + portalH, -1, -1, character.accent);

      ctx.restore();

      // Hand-to-portal energy lines.
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = character.accent;
      ctx.lineWidth = 1.2;
      [left, right].forEach((hand) => {
        ctx.beginPath();
        ctx.moveTo(hand.x, hand.y);
        const edge = hand === left
          ? { x: center.x - portalW * 0.5 * Math.cos(angle), y: center.y - portalW * 0.5 * Math.sin(angle) }
          : { x: center.x + portalW * 0.5 * Math.cos(angle), y: center.y + portalW * 0.5 * Math.sin(angle) };
        ctx.lineTo(edge.x, edge.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(hand.x, hand.y, 5 + Math.sin(performance.now() / 140) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();

      if (particles) drawParticles(ctx, center, portalW, portalH, character.accent, stateRef.current);

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [active, hands, character, particles, glow]);

  return <canvas ref={canvasRef} className="portal-canvas" aria-hidden="true" />;
}

const imageCache = new Map();
function getImage(src) {
  if (!imageCache.has(src)) {
    const img = new Image();
    img.src = src;
    imageCache.set(src, img);
  }
  return imageCache.get(src);
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawCorner(ctx, x, y, sx, sy, color) {
  const len = 24;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(x + sx * len, y);
  ctx.lineTo(x, y);
  ctx.lineTo(x, y + sy * len);
  ctx.stroke();
  ctx.restore();
}

function drawParticles(ctx, center, w, h, color, state) {
  const now = performance.now();
  if (!state.particles.length) {
    for (let i = 0; i < 35; i++) {
      state.particles.push({
        a: Math.random() * Math.PI * 2,
        r: Math.random(),
        s: 0.0004 + Math.random() * 0.0012,
        size: 0.6 + Math.random() * 1.7
      });
    }
  }
  ctx.save();
  ctx.fillStyle = color;
  for (const p of state.particles) {
    p.a += p.s * 16;
    const x = center.x + Math.cos(p.a) * (w * (0.45 + p.r * 0.12));
    const y = center.y + Math.sin(p.a * 1.15) * (h * (0.45 + p.r * 0.18));
    const alpha = 0.18 + 0.55 * ((Math.sin(now / 500 + p.r * 7) + 1) / 2);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
