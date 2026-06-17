import { W, H, PAL, LAYOUT } from "./constants.js";
import { ctx } from "./helpers.js";
import { state, fx } from "./state.js";
import { Particles } from "./particles.js";

export const Effects = {
  // ─── Event triggers ─────────────────────────────────────────────────────────
  onRoundResult(result) {
    const px = LAYOUT.PL_X  + LAYOUT.BOX_W / 2;
    const cx = LAYOUT.CPU_X + LAYOUT.BOX_W / 2;
    const my = LAYOUT.BOX_Y + LAYOUT.BOX_H * 0.45;

    if (result === "player") {
      Particles.sparks(px, my, PAL.WIN,  22);
      this._setFlash(PAL.WIN,  0.13);
    } else if (result === "cpu") {
      Particles.sparks(cx, my, PAL.LOSE, 18);
      this._setFlash(PAL.LOSE, 0.09);
      fx.shakeFrames = 14;
    } else {
      Particles.sparks(px, LAYOUT.BOX_Y + LAYOUT.BOX_H / 2, PAL.TIE, 10);
      Particles.sparks(cx, LAYOUT.BOX_Y + LAYOUT.BOX_H / 2, PAL.TIE, 10);
      this._setFlash(PAL.TIE, 0.08);
    }
  },

  onGameOver(wins) {
    Particles.clear();
    fx.fireworkTimer = 0;
    if (wins.player > wins.cpu) {
      this._setFlash(PAL.WIN,  0.28);
      this._launchConfetti();
    } else if (wins.cpu > wins.player) {
      this._setFlash(PAL.LOSE, 0.18);
    } else {
      this._setFlash(PAL.TIE,  0.14);
    }
  },

  // ─── Per-frame ──────────────────────────────────────────────────────────────
  update() {
    this._tickGameOver();
    fx.shakeFrames   = Math.max(0, fx.shakeFrames   - 1);
    fx.bounce.player = Math.max(0, fx.bounce.player - 1);
    fx.bounce.cpu    = Math.max(0, fx.bounce.cpu    - 1);
    fx.flash.alpha   = Math.max(0, fx.flash.alpha - 0.028);
  },

  drawFlash() {
    if (fx.flash.alpha <= 0) return;
    ctx.fillStyle = fx.flash.color; ctx.globalAlpha = fx.flash.alpha;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  },

  // ─── Private ────────────────────────────────────────────────────────────────
  _setFlash(color, alpha) {
    fx.flash.color = color;
    fx.flash.alpha = alpha;
  },

  _launchConfetti() {
    if (typeof confetti !== "function") return;
    const end = Date.now() + 4000;
    (function fire() {
      confetti({ particleCount: 4, angle: 60,  spread: 65, origin: { x: 0, y: 0.75 }, colors: ["#3b82f6","#22c55e","#eab308","#f472b6"] });
      confetti({ particleCount: 4, angle: 120, spread: 65, origin: { x: 1, y: 0.75 }, colors: ["#3b82f6","#22c55e","#38bdf8","#a78bfa"] });
      if (Date.now() < end) requestAnimationFrame(fire);
    })();
  },

  _tickGameOver() {
    if (state.phase !== "gameover") return;
    if (state.wins.player > state.wins.cpu) {
      if (--fx.fireworkTimer <= 0) {
        fx.fireworkTimer = 18 + Math.floor(Math.random() * 22);
        Particles.firework();
      }
    } else if (state.wins.cpu > state.wins.player) {
      if (Math.random() < 0.3) Particles.rain();
    }
  },
};
