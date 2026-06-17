import { W, H, PAL } from "./constants.js";
import { ctx } from "./helpers.js";

export const Particles = {
  list: [],
  MAX:  280,

  // ─── Spawn helpers ──────────────────────────────────────────────────────────
  _push(p) { if (this.list.length < this.MAX) this.list.push(p); },

  sparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this._push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        life: 40 + Math.random() * 30, maxLife: 70,
        color, size: 2 + Math.random() * 3, type: "spark", gravity: 0.15,
      });
    }
  },

  rain() {
    if (this.list.length >= 250) return;
    this._push({
      x: Math.random() * W, y: -20,
      vx: (Math.random() - 0.5) * 0.5,
      vy: 4 + Math.random() * 3,
      life: 160, maxLife: 160,
      color: "#60a5fa", size: 1, type: "rain", gravity: 0,
      len: 10 + Math.random() * 8,
    });
  },

  firework() {
    const palette = [PAL.WIN, PAL.PLAYER, PAL.TIE, "#f472b6", "#38bdf8", "#a78bfa", "#fb923c"];
    const x   = 80 + Math.random() * (W - 160);
    const y   = 40 + Math.random() * (H * 0.55);
    const col = palette[Math.floor(Math.random() * palette.length)];
    for (let i = 0; i < 22; i++) {
      const angle = (Math.PI * 2 * i / 22) + (Math.random() - 0.5) * 0.3;
      const speed = 1.5 + Math.random() * 3.5;
      this._push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 35 + Math.random() * 25, maxLife: 60,
        color: col, size: 1.5 + Math.random() * 2.5, type: "spark", gravity: 0.09,
      });
    }
  },

  clear() { this.list = []; },

  // ─── Per-frame ──────────────────────────────────────────────────────────────
  update() {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.x += p.vx; p.y += p.vy; p.vy += p.gravity || 0; p.life--;
      if (p.life <= 0) this.list.splice(i, 1);
    }
  },

  draw() {
    for (const p of this.list) {
      const alpha = Math.max(0, p.life / p.maxLife);
      if (p.type === "rain") {
        ctx.strokeStyle = p.color; ctx.lineWidth = 1; ctx.globalAlpha = alpha * 0.45;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 3, p.y + (p.len || 10));
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color; ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  },
};
