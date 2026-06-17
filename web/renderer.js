import { W, H, CFG, LAYOUT, PAL, MOVE } from "./constants.js";
import { ctx, bgGradient, hexRgba, roundRect } from "./helpers.js";
import { state, fx } from "./state.js";
import { Particles } from "./particles.js";
import { Effects } from "./effects.js";

// ─── Background ───────────────────────────────────────────────────────────────
function drawBackground() {
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.025)";
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
}

// ─── Round header: label + animated win dots ──────────────────────────────────
function drawHeader() {
  if (state.phase === "menu") return;
  ctx.textAlign = "center";
  ctx.font = "12px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillText(`ROUND ${state.round} OF ${CFG.MAX_ROUNDS}`, LAYOUT.CX, 26);

  const DOT_R = 7, DOT_GAP = 20;
  for (let i = 0; i < CFG.WIN_ROUNDS; i++) {
    _drawWinDot(LAYOUT.CX - 70 - i * DOT_GAP, 22, DOT_R, "player", i);
    _drawWinDot(LAYOUT.CX + 70 + i * DOT_GAP, 22, DOT_R, "cpu",    i);
  }
}

function _drawWinDot(x, y, r, side, i) {
  const filled = i < state.wins[side];
  const isNew  = filled && i === state.wins[side] - 1 && fx.bounce[side] > 0;
  const scale  = isNew ? 1 + 0.65 * (fx.bounce[side] / 28) : 1;
  const color  = side === "player" ? PAL.PLAYER : PAL.CPU;
  ctx.save();
  ctx.translate(x, y); ctx.scale(scale, scale);
  if (isNew) { ctx.shadowColor = PAL.WIN; ctx.shadowBlur = 12; }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = filled ? color : hexRgba(color, 0.18);
  ctx.fill();
  ctx.restore();
}

// ─── VS badge ────────────────────────────────────────────────────────────────
function drawVS() {
  const { CX, BOX_Y, BOX_H } = LAYOUT;
  const cy = BOX_Y + BOX_H / 2;
  ctx.save();
  ctx.beginPath(); ctx.arc(CX, cy, 26, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.07)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "bold 14px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("VS", CX, cy);
  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

// ─── Gesture box ─────────────────────────────────────────────────────────────
// Border style is computed separately so drawBox stays focused on drawing.
function _boxBorderStyle(side, result) {
  const pulse = 0.55 + 0.45 * Math.sin(state.frame * 0.09);
  if (result === "win")  return { color: PAL.WIN,  alpha: pulse,       glow: PAL.WIN, glowBlur: 26 };
  if (result === "lose") return { color: PAL.LOSE, alpha: 0.4,         glow: null,    glowBlur: 0  };
  if (result === "tie")  return { color: PAL.TIE,  alpha: pulse * 0.8, glow: null,    glowBlur: 0  };
  const gestureActive = side === "player" && state.phase === "countdown"
    && state.timers.intro <= 0 && state.gesture !== "none";
  if (gestureActive) return { color: PAL.WIN, alpha: pulse, glow: null, glowBlur: 0 };
  return { color: side === "player" ? PAL.PLAYER : PAL.CPU, alpha: 0.55, glow: null, glowBlur: 0 };
}

// drawBox receives a descriptor object so call sites are self-documenting.
function drawBox({ x, side, color, gesture, hidden, result }) {
  const { BOX_W: w, BOX_H: h, BOX_Y: y } = LAYOUT;
  const border = _boxBorderStyle(side, result);

  ctx.save();
  if (border.glow) { ctx.shadowColor = border.glow; ctx.shadowBlur = border.glowBlur; }

  roundRect(ctx, x, y, w, h, 18);
  ctx.fillStyle = result === "win"  ? hexRgba(PAL.WIN,  0.06)
                : result === "lose" ? hexRgba(PAL.LOSE, 0.04)
                : "rgba(255,255,255,0.03)";
  ctx.fill();

  ctx.strokeStyle = hexRgba(border.color, border.alpha);
  ctx.lineWidth = 2.5;
  roundRect(ctx, x, y, w, h, 18); ctx.stroke();
  ctx.shadowBlur = 0;

  // Side label
  ctx.fillStyle = hexRgba(color, 0.9);
  ctx.font = "bold 13px monospace"; ctx.textAlign = "center";
  ctx.fillText(side.toUpperCase(), x + w / 2, y + 30);

  // Gesture emoji
  const ey = y + h * 0.52;
  ctx.font = "86px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (hidden) {
    ctx.globalAlpha = 0.35 + 0.2 * Math.sin(state.frame * 0.07);
    ctx.fillStyle = "#ffffff"; ctx.fillText("?", x + w / 2, ey); ctx.globalAlpha = 1;
  } else if (gesture && MOVE.SYMBOLS[gesture]) {
    ctx.fillText(MOVE.SYMBOLS[gesture], x + w / 2, ey);
  } else {
    ctx.globalAlpha = 0.15; ctx.fillStyle = "#ffffff";
    ctx.fillText("?", x + w / 2, ey); ctx.globalAlpha = 1;
  }
  ctx.textBaseline = "alphabetic";

  // Gesture name (or SHOW YOUR HAND warning)
  ctx.font = "bold 16px monospace"; ctx.textAlign = "center";
  if (!hidden && gesture && MOVE.LABELS[gesture]) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(MOVE.LABELS[gesture], x + w / 2, y + h - 16);
  } else if (side === "player" && state.phase === "countdown" && state.timers.intro <= 0 && state.gesture === "none") {
    ctx.fillStyle = hexRgba(PAL.LOSE, 0.65);
    ctx.fillText("SHOW YOUR HAND", x + w / 2, y + h - 16);
  }

  ctx.restore();
}

// ─── Info area — Strategy pattern ─────────────────────────────────────────────
// One focused function per phase; INFO_PHASE dispatches to the right one.
// Each receives the vertical centre of the info strip.

function _drawInfoMenu(cy) {
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "15px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("show ✊  ✋  ✌️  to the camera", LAYOUT.CX, cy);
  ctx.textBaseline = "alphabetic";
}

function _drawInfoRoundIntro(cy) {
  const n     = state.timers.intro / CFG.INTRO_FRAMES; // 1.0 → 0.0 as intro plays
  const alpha = n > 0.75 ? (1 - n) * 4 : n < 0.25 ? n * 4 : 1; // fade-in → hold → fade-out
  const scale = 1 + n * 0.45;                                     // zoom in from 1.45×
  ctx.save();
  ctx.globalAlpha = alpha; ctx.shadowColor = "#ffffff"; ctx.shadowBlur = 20 * alpha;
  ctx.translate(LAYOUT.CX, cy - 8); ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 52px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`ROUND ${state.round}`, 0, 0);
  if (n < 0.65) {
    ctx.font = "bold 15px monospace"; ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("GET READY", 0, 48);
  }
  ctx.textBaseline = "alphabetic"; ctx.restore();
}

function _drawInfoCountdown(cy) {
  const secs  = Math.max(1, Math.ceil(state.timers.cd / 60));
  const pulse = 1 + 0.04 * Math.sin(state.frame * 0.07);
  ctx.save();
  ctx.translate(LAYOUT.CX, cy - 8); ctx.scale(pulse, pulse);
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 86px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(secs), 0, 0);
  ctx.textBaseline = "alphabetic"; ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.font = "12px monospace"; ctx.textAlign = "center";
  ctx.fillText("HOLD YOUR MOVE", LAYOUT.CX, cy + 52);
}

function _drawInfoShoot(cy) {
  const t = 1 - state.timers.shoot / CFG.SHOOT_FRAMES;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - t * 1.4);
  ctx.translate(LAYOUT.CX, cy - 8); ctx.scale(1 + t * 0.5, 1 + t * 0.5);
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 72px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("SHOOT!", 0, 0);
  ctx.textBaseline = "alphabetic"; ctx.restore();
}

function _drawInfoReveal(cy) {
  const [text, color] =
    state.result === "player" ? ["YOU WIN!", PAL.WIN] :
    state.result === "cpu"    ? ["CPU WINS", PAL.CPU] :
                                ["TIE!",     PAL.TIE];

  const pulse = 1 + 0.04 * Math.sin(state.frame * 0.12);
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = 18;
  ctx.translate(LAYOUT.CX, cy - 12); ctx.scale(pulse, pulse);
  ctx.fillStyle = color; ctx.font = "bold 66px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
  ctx.textBaseline = "alphabetic"; ctx.restore();

  const { player, cpu } = state.choice;
  if (state.result !== "tie" && player && cpu) {
    const sub = state.result === "player"
      ? `${MOVE.LABELS[player]} beats ${MOVE.LABELS[cpu]}`
      : `${MOVE.LABELS[cpu]} beats ${MOVE.LABELS[player]}`;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "13px monospace"; ctx.textAlign = "center";
    ctx.fillText(sub, LAYOUT.CX, cy + 50);
  }
}

// Strategy map: phase name → draw function
const INFO_PHASE = {
  menu:      (cy) => _drawInfoMenu(cy),
  countdown: (cy) => state.timers.intro > 0 ? _drawInfoRoundIntro(cy) : _drawInfoCountdown(cy),
  shoot:     (cy) => _drawInfoShoot(cy),
  reveal:    (cy) => _drawInfoReveal(cy),
  gameover:  ()   => {},
};

function drawInfo() {
  const fn = INFO_PHASE[state.phase];
  if (fn) fn(LAYOUT.INFO_CY);
}

// ─── Arena layout ─────────────────────────────────────────────────────────────
// Decides what each box shows then delegates — keeps render() flat.
function drawArena() {
  const { phase, choice, result, gesture } = state;
  const isReveal = phase === "reveal" || phase === "shoot";
  const isOver   = phase === "gameover";
  const showCPU  = isReveal || isOver;

  const pGesture = (isReveal || isOver) ? choice.player
                 : (phase === "countdown" ? gesture : null);
  const cGesture = showCPU ? choice.cpu : null;

  let pResult = null, cResult = null;
  if (phase === "reveal") {
    if (result === "tie")         { pResult = "tie";  cResult = "tie";  }
    else if (result === "player") { pResult = "win";  cResult = "lose"; }
    else                          { pResult = "lose"; cResult = "win";  }
  }

  drawBox({ x: LAYOUT.PL_X,  side: "player", color: PAL.PLAYER, gesture: pGesture, hidden: false,    result: pResult });
  drawBox({ x: LAYOUT.CPU_X, side: "cpu",    color: PAL.CPU,    gesture: cGesture, hidden: !showCPU, result: cResult });
  drawVS();
  drawInfo();
}

// ─── Main render ──────────────────────────────────────────────────────────────
// Screen-shake applies only to the game world; particles and flash are screen-space.
export function render() {
  const shaking = fx.shakeFrames > 0;
  if (shaking) {
    ctx.save();
    ctx.translate(
      (Math.random() - 0.5) * 10 * (fx.shakeFrames / 14),
      (Math.random() - 0.5) *  5 * (fx.shakeFrames / 14)
    );
  }

  drawBackground();
  drawHeader();
  drawArena();

  if (shaking) ctx.restore();

  Particles.draw();
  Effects.drawFlash();
}
