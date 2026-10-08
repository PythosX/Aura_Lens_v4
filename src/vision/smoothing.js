export function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

export function smoothPoint(previous, next, amount = 0.18) {
  if (!next) return previous;
  if (!previous) return { ...next };
  return {
    x: lerp(previous.x, next.x, amount),
    y: lerp(previous.y, next.y, amount)
  };
}

export function smoothNumber(previous, next, amount = 0.18) {
  if (previous == null) return next;
  return lerp(previous, next, amount);
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
