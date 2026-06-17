import { W, H, PAL } from "./constants.js";

// ─── Canvas context ───────────────────────────────────────────────────────────
export const arena = document.getElementById("arena");
export const ctx   = arena.getContext("2d");

// ─── Colour utility ───────────────────────────────────────────────────────────
// Pre-parse the palette so hexRgba() never calls parseInt at runtime.
const _rgbCache = new Map();
Object.values(PAL).forEach(hex => {
  const n = parseInt(hex.slice(1), 16);
  _rgbCache.set(hex, `${n >> 16},${(n >> 8) & 255},${n & 255}`);
});

export function hexRgba(hex, a) {
  const rgb = _rgbCache.get(hex)
    ?? (() => { const n = parseInt(hex.slice(1), 16); return `${n >> 16},${(n >> 8) & 255},${n & 255}`; })();
  return `rgba(${rgb},${a})`;
}

// ─── Background gradient (constant, created once) ─────────────────────────────
export const bgGradient = ctx.createLinearGradient(0, 0, W, H);
bgGradient.addColorStop(0, "#0d1b2e");
bgGradient.addColorStop(1, "#16243a");

// ─── Drawing helper ───────────────────────────────────────────────────────────
export function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y,     x + w, y + h, r);
  c.arcTo(x + w, y + h, x,     y + h, r);
  c.arcTo(x,     y + h, x,     y,     r);
  c.arcTo(x,     y,     x + w, y,     r);
  c.closePath();
}

// ─── Game-logic helpers ───────────────────────────────────────────────────────
function beats(a, b) {
  return (a === "rock" && b === "scissors")
      || (a === "scissors" && b === "paper")
      || (a === "paper"    && b === "rock");
}

export function roundWinner(player, cpu) {
  if (!player)        return "cpu";
  if (player === cpu) return "tie";
  return beats(player, cpu) ? "player" : "cpu";
}
