// ─── DOM ─────────────────────────────────────────────────────────────────────
const arena = document.getElementById("arena");
const ctx   = arena.getContext("2d");
const W = arena.width, H = arena.height;

const cam  = document.getElementById("cam");
const grab = document.getElementById("grab");
const gctx = grab.getContext("2d");
const pip  = document.getElementById("pip");
const pctx = pip.getContext("2d");

const elStatus   = document.getElementById("status");
const elGesture  = document.getElementById("gesture-display");
const elScoreP   = document.getElementById("scoreP");
const elScoreC   = document.getElementById("scoreC");
const elRoundNum = document.getElementById("roundNum");
const elMenu     = document.getElementById("menu");

// ─── Layout ──────────────────────────────────────────────────────────────────
const BOX_W = 370, BOX_H = 370, BOX_Y = 52;
const PL_X  = 20;
const CPU_X = W - BOX_W - 20;
const CX    = W / 2;

// ─── Game config ─────────────────────────────────────────────────────────────
const WIN_ROUNDS    = 3;
const MAX_ROUNDS    = 5;
const INTRO_FRAMES  = 60;     // 1 s round-intro animation
const CD_FRAMES     = 3 * 60; // 3 s countdown
const SHOOT_FRAMES  = 40;     // 0.67 s SHOOT! flash
const REVEAL_FRAMES = 2 * 60; // 2 s result display

// ─── Palette ─────────────────────────────────────────────────────────────────
const P_COLOR  = "#3b82f6";
const C_COLOR  = "#f97316";
const WIN_COL  = "#22c55e";
const LOSE_COL = "#ef4444";
const TIE_COL  = "#eab308";

// ─── Gesture data ─────────────────────────────────────────────────────────────
const GESTURES = ["rock", "paper", "scissors"];
const SYMBOLS  = { rock: "✊", paper: "✋", scissors: "✌️" };
const LABELS   = { rock: "ROCK", paper: "PAPER", scissors: "SCISSORS" };

function gestureLabel(g) {
  return (SYMBOLS[g] || "") + "  " + (LABELS[g] || "");
}

// ─── Pre-computed ─────────────────────────────────────────────────────────────
const _hexRgbCache = new Map();
[P_COLOR, C_COLOR, WIN_COL, LOSE_COL, TIE_COL].forEach(h => {
  const n = parseInt(h.slice(1), 16);
  _hexRgbCache.set(h, `${n >> 16},${(n >> 8) & 255},${n & 255}`);
});

function hexRgba(hex, a) {
  let rgb = _hexRgbCache.get(hex);
  if (!rgb) {
    const n = parseInt(hex.slice(1), 16);
    rgb = `${n >> 16},${(n >> 8) & 255},${n & 255}`;
  }
  return `rgba(${rgb},${a})`;
}

const _bgGradient = ctx.createLinearGradient(0, 0, W, H);
_bgGradient.addColorStop(0, "#0d1b2e");
_bgGradient.addColorStop(1, "#16243a");

// ─── State ───────────────────────────────────────────────────────────────────
let phase = "menu";
let roundNum = 0;
let wins = { player: 0, cpu: 0 };
let cdTimer = 0, shootTimer = 0, revealTimer = 0;
let roundIntroTimer = 0;
let currentGesture = "none";
let playerChoice = null, cpuChoice = null, roundResult = null;
let frameT = 0;
let camReady = false, wsReady = false;
let kbGesture = null;
let resultEl = null;

// Effect state
let particles   = [];
let flashAlpha  = 0, flashColor = "#ffffff";
let shakeFrames = 0;
let fireworkTimer = 0;
let pBounce = 0, cBounce = 0;

// ─── Game logic ───────────────────────────────────────────────────────────────
function cpuPick() { return GESTURES[Math.floor(Math.random() * 3)]; }

function beats(a, b) {
  return (a === "rock"     && b === "scissors") ||
         (a === "scissors" && b === "paper")    ||
         (a === "paper"    && b === "rock");
}

function winner(p, c) {
  if (!p) return "cpu";
  if (p === c) return "tie";
  return beats(p, c) ? "player" : "cpu";
}

function startGame() {
  roundNum = 0;
  wins = { player: 0, cpu: 0 };
  pBounce = 0; cBounce = 0;
  particles = []; flashAlpha = 0; shakeFrames = 0;
  elMenu.classList.add("hidden");
  if (resultEl) resultEl.classList.add("hidden");
  updateHUD();
  startRound();
}

function startRound() {
  roundNum++;
  playerChoice = null; cpuChoice = null; roundResult = null; kbGesture = null;
  roundIntroTimer = INTRO_FRAMES;
  cdTimer = CD_FRAMES;
  phase   = "countdown";
  elRoundNum.textContent = roundNum;
  elRoundNum.classList.remove("pop");
  void elRoundNum.offsetWidth;
  elRoundNum.classList.add("pop");
}

function lockRound() {
  const g    = kbGesture || currentGesture;
  playerChoice = GESTURES.includes(g) ? g : null;
  cpuChoice    = cpuPick();
  roundResult  = winner(playerChoice, cpuChoice);
  if (roundResult === "player") { wins.player++; pBounce = 28; bumpScore(elScoreP); }
  else if (roundResult === "cpu") { wins.cpu++; cBounce = 28; bumpScore(elScoreC); }
  updateHUD();
  spawnRoundEffects(roundResult);
  shootTimer  = SHOOT_FRAMES;
  revealTimer = REVEAL_FRAMES;
  phase = "shoot";
}

function endRound() {
  if (wins.player >= WIN_ROUNDS || wins.cpu >= WIN_ROUNDS || roundNum >= MAX_ROUNDS) {
    phase = "gameover";
    showGameOver();
  } else {
    startRound();
  }
}

function updateHUD() {
  elScoreP.textContent = wins.player;
  elScoreC.textContent = wins.cpu;
}

function bumpScore(el) {
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
}

// ─── Particle system ─────────────────────────────────────────────────────────
function spawnSparks(x, y, color, count) {
  const cap = Math.min(count, 280 - particles.length);
  for (let i = 0; i < cap; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2.5,
      life: 40 + Math.random() * 30, maxLife: 70,
      color, size: 2 + Math.random() * 3, type: "spark", gravity: 0.15,
    });
  }
}

function spawnRainDrop() {
  if (particles.length >= 250) return;
  particles.push({
    x: Math.random() * W, y: -20,
    vx: (Math.random() - 0.5) * 0.5, vy: 4 + Math.random() * 3,
    life: 160, maxLife: 160,
    color: "#60a5fa", size: 1, type: "rain", gravity: 0,
    len: 10 + Math.random() * 8,
  });
}

function spawnFireworkBurst() {
  if (particles.length >= 280) return;
  const pal = [WIN_COL, P_COLOR, TIE_COL, "#f472b6", "#38bdf8", "#a78bfa", "#fb923c"];
  const x   = 80 + Math.random() * (W - 160);
  const y   = 40 + Math.random() * (H * 0.55);
  const col = pal[Math.floor(Math.random() * pal.length)];
  const n   = Math.min(22, 280 - particles.length);
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / 22) + (Math.random() - 0.5) * 0.3;
    const speed = 1.5 + Math.random() * 3.5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 35 + Math.random() * 25, maxLife: 60,
      color: col, size: 1.5 + Math.random() * 2.5, type: "spark", gravity: 0.09,
    });
  }
}

// ─── Effect triggers ──────────────────────────────────────────────────────────
function spawnRoundEffects(result) {
  if (result === "player") {
    spawnSparks(PL_X + BOX_W / 2, BOX_Y + BOX_H * 0.45, WIN_COL, 22);
    flashAlpha = 0.13; flashColor = WIN_COL;
  } else if (result === "cpu") {
    spawnSparks(CPU_X + BOX_W / 2, BOX_Y + BOX_H * 0.45, LOSE_COL, 18);
    flashAlpha = 0.09; flashColor = LOSE_COL;
    shakeFrames = 14;
  } else {
    spawnSparks(PL_X  + BOX_W / 2, BOX_Y + BOX_H / 2, TIE_COL, 10);
    spawnSparks(CPU_X + BOX_W / 2, BOX_Y + BOX_H / 2, TIE_COL, 10);
    flashAlpha = 0.08; flashColor = TIE_COL;
  }
}

function triggerGameOverEffects() {
  particles = []; fireworkTimer = 0;
  if (wins.player > wins.cpu) {
    flashAlpha = 0.28; flashColor = WIN_COL;
    // canvas-confetti stream from both sides for 4 s
    if (typeof confetti === "function") {
      const end = Date.now() + 4000;
      (function fire() {
        confetti({ particleCount: 4, angle: 60,  spread: 65, origin: { x: 0, y: 0.75 }, colors: ["#3b82f6","#22c55e","#eab308","#f472b6"] });
        confetti({ particleCount: 4, angle: 120, spread: 65, origin: { x: 1, y: 0.75 }, colors: ["#3b82f6","#22c55e","#38bdf8","#a78bfa"] });
        if (Date.now() < end) requestAnimationFrame(fire);
      })();
    }
  } else if (wins.cpu > wins.player) {
    flashAlpha = 0.18; flashColor = LOSE_COL;
  } else {
    flashAlpha = 0.14; flashColor = TIE_COL;
  }
}

function updateGameOverEffects() {
  if (phase !== "gameover") return;
  if (wins.player > wins.cpu) {
    if (--fireworkTimer <= 0) {
      fireworkTimer = 18 + Math.floor(Math.random() * 22);
      spawnFireworkBurst();
    }
  } else if (wins.cpu > wins.player) {
    if (Math.random() < 0.3) spawnRainDrop();
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += p.gravity || 0; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function update() {
  frameT++;
  if (phase === "countdown") {
    if (roundIntroTimer > 0) roundIntroTimer--;
    else if (--cdTimer <= 0) lockRound();
  } else if (phase === "shoot") {
    if (--shootTimer <= 0) phase = "reveal";
  } else if (phase === "reveal") {
    if (--revealTimer <= 0) endRound();
  }
  updateParticles();
  updateGameOverEffects();
  if (shakeFrames > 0) shakeFrames--;
  if (pBounce > 0) pBounce--;
  if (cBounce > 0) cBounce--;
  flashAlpha = Math.max(0, flashAlpha - 0.028);
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────
function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y,     x + w, y + h, r);
  c.arcTo(x + w, y + h, x,     y + h, r);
  c.arcTo(x,     y + h, x,     y,     r);
  c.arcTo(x,     y,     x + w, y,     r);
  c.closePath();
}

// ─── Background ──────────────────────────────────────────────────────────────
function drawBg() {
  ctx.fillStyle = _bgGradient;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.025)";
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for (let x = 0; x < W; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
}

// ─── Header: round label + animated win dots ──────────────────────────────────
function drawHeader() {
  if (phase === "menu") return;
  ctx.textAlign = "center";
  ctx.font = "12px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillText("ROUND " + roundNum + " OF " + MAX_ROUNDS, CX, 26);

  const dotR = 7, dotGap = 20;
  for (let i = 0; i < WIN_ROUNDS; i++) {
    const pFill = i < wins.player;
    const cFill = i < wins.cpu;
    const pNew  = pFill && i === wins.player - 1 && pBounce > 0;
    const cNew  = cFill && i === wins.cpu   - 1 && cBounce > 0;
    const pS    = pNew ? 1 + 0.65 * (pBounce / 28) : 1;
    const cS    = cNew ? 1 + 0.65 * (cBounce / 28) : 1;

    ctx.save();
    ctx.translate(CX - 70 - i * dotGap, 22);
    ctx.scale(pS, pS);
    if (pNew) { ctx.shadowColor = WIN_COL; ctx.shadowBlur = 12; }
    ctx.beginPath(); ctx.arc(0, 0, dotR, 0, Math.PI * 2);
    ctx.fillStyle = pFill ? P_COLOR : hexRgba(P_COLOR, 0.18);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(CX + 70 + i * dotGap, 22);
    ctx.scale(cS, cS);
    if (cNew) { ctx.shadowColor = C_COLOR; ctx.shadowBlur = 12; }
    ctx.beginPath(); ctx.arc(0, 0, dotR, 0, Math.PI * 2);
    ctx.fillStyle = cFill ? C_COLOR : hexRgba(C_COLOR, 0.18);
    ctx.fill();
    ctx.restore();
  }
}

// ─── VS circle ────────────────────────────────────────────────────────────────
function drawVS() {
  const cy = BOX_Y + BOX_H / 2;
  ctx.save();
  ctx.beginPath(); ctx.arc(CX, cy, 26, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.07)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("VS", CX, cy);
  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

// ─── Gesture box ─────────────────────────────────────────────────────────────
function drawBox(bx, label, baseColor, gesture, hidden, result) {
  const x = bx, y = BOX_Y, w = BOX_W, h = BOX_H;
  const pulse = 0.55 + 0.45 * Math.sin(frameT * 0.09);

  let borderColor = baseColor, borderAlpha = 0.55, glowColor = null, glowBlur = 0;

  if (result === "win") {
    borderColor = WIN_COL; borderAlpha = pulse; glowColor = WIN_COL; glowBlur = 26;
  } else if (result === "lose") {
    borderColor = LOSE_COL; borderAlpha = 0.4;
  } else if (result === "tie") {
    borderColor = TIE_COL; borderAlpha = pulse * 0.8;
  } else if (label === "PLAYER" && phase === "countdown" && roundIntroTimer <= 0) {
    if (currentGesture !== "none") { borderColor = WIN_COL; borderAlpha = pulse; }
  }

  ctx.save();
  if (glowColor) { ctx.shadowColor = glowColor; ctx.shadowBlur = glowBlur; }
  rr(ctx, x, y, w, h, 18);
  ctx.fillStyle = result === "win"  ? hexRgba(WIN_COL,  0.06)
                : result === "lose" ? hexRgba(LOSE_COL, 0.04)
                : "rgba(255,255,255,0.03)";
  ctx.fill();
  ctx.strokeStyle = hexRgba(borderColor, borderAlpha);
  ctx.lineWidth = 2.5;
  rr(ctx, x, y, w, h, 18); ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = hexRgba(baseColor, 0.9);
  ctx.font = "bold 13px monospace"; ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + 30);

  const ey = y + h * 0.52;
  ctx.font = "86px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (hidden) {
    ctx.globalAlpha = 0.35 + 0.2 * Math.sin(frameT * 0.07);
    ctx.fillStyle = "#ffffff"; ctx.fillText("?", x + w / 2, ey); ctx.globalAlpha = 1;
  } else if (gesture && SYMBOLS[gesture]) {
    ctx.fillText(SYMBOLS[gesture], x + w / 2, ey);
  } else {
    ctx.globalAlpha = 0.15; ctx.fillStyle = "#ffffff";
    ctx.fillText("?", x + w / 2, ey); ctx.globalAlpha = 1;
  }
  ctx.textBaseline = "alphabetic";

  ctx.font = "bold 16px monospace"; ctx.textAlign = "center";
  if (!hidden && gesture && LABELS[gesture]) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(LABELS[gesture], x + w / 2, y + h - 16);
  } else if (phase === "countdown" && roundIntroTimer <= 0 && label === "PLAYER" && currentGesture === "none") {
    ctx.fillStyle = hexRgba(LOSE_COL, 0.65);
    ctx.fillText("SHOW YOUR HAND", x + w / 2, y + h - 16);
  }
  ctx.restore();
}

// ─── Info area ───────────────────────────────────────────────────────────────
function drawInfo() {
  const iy = BOX_Y + BOX_H + 16;
  const cy = iy + (H - iy - 8) / 2;

  // Round intro: "ROUND X" zooms in, holds, fades out
  if (phase === "countdown" && roundIntroTimer > 0) {
    const n = roundIntroTimer / INTRO_FRAMES;               // 1.0 → 0.0
    const alpha = n > 0.75 ? (1 - n) * 4 : n < 0.25 ? n * 4 : 1;
    const scale = 1 + n * 0.45;                             // 1.45× → 1.0×
    ctx.save();
    ctx.globalAlpha  = alpha;
    ctx.shadowColor  = "#ffffff";
    ctx.shadowBlur   = 20 * alpha;
    ctx.translate(CX, cy - 8); ctx.scale(scale, scale);
    ctx.fillStyle    = "#ffffff";
    ctx.font         = "bold 52px monospace";
    ctx.textAlign    = "center"; ctx.textBaseline = "middle";
    ctx.fillText("ROUND " + roundNum, 0, 0);
    if (n < 0.65) {
      ctx.font = "bold 15px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillText("GET READY", 0, 48);
    }
    ctx.textBaseline = "alphabetic";
    ctx.restore();
    return;
  }

  if (phase === "countdown") {
    const secs = Math.max(1, Math.ceil(cdTimer / 60));
    const sc   = 1 + 0.04 * Math.sin(frameT * 0.07);
    ctx.save();
    ctx.translate(CX, cy - 8); ctx.scale(sc, sc);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 86px monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(secs), 0, 0); ctx.textBaseline = "alphabetic";
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.font = "12px monospace"; ctx.textAlign = "center";
    ctx.fillText("HOLD YOUR MOVE", CX, cy + 52);

  } else if (phase === "shoot") {
    const t = 1 - shootTimer / SHOOT_FRAMES;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t * 1.4);
    ctx.translate(CX, cy - 8); ctx.scale(1 + t * 0.5, 1 + t * 0.5);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 72px monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("SHOOT!", 0, 0); ctx.textBaseline = "alphabetic";
    ctx.restore();

  } else if (phase === "reveal") {
    let text, color;
    if (roundResult === "tie")         { text = "TIE!";     color = TIE_COL; }
    else if (roundResult === "player") { text = "YOU WIN!"; color = WIN_COL; }
    else                               { text = "CPU WINS"; color = C_COLOR; }

    const pu = 1 + 0.04 * Math.sin(frameT * 0.12);
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 18;
    ctx.translate(CX, cy - 12); ctx.scale(pu, pu);
    ctx.fillStyle = color; ctx.font = "bold 66px monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 0); ctx.textBaseline = "alphabetic";
    ctx.restore();

    if (roundResult !== "tie" && playerChoice && cpuChoice) {
      const sub = roundResult === "player"
        ? LABELS[playerChoice] + " beats " + LABELS[cpuChoice]
        : LABELS[cpuChoice]   + " beats " + LABELS[playerChoice];
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "13px monospace"; ctx.textAlign = "center";
      ctx.fillText(sub, CX, cy + 50);
    }

  } else if (phase === "menu") {
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = "15px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("show ✊  ✋  ✌️  to the camera", CX, cy);
    ctx.textBaseline = "alphabetic";
  }
}

// ─── Flash overlay ────────────────────────────────────────────────────────────
function drawFlash() {
  if (flashAlpha <= 0) return;
  ctx.fillStyle = flashColor; ctx.globalAlpha = flashAlpha;
  ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
}

// ─── Particles ────────────────────────────────────────────────────────────────
function drawParticles() {
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    if (p.type === "rain") {
      ctx.strokeStyle = p.color; ctx.lineWidth = 1; ctx.globalAlpha = a * 0.45;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 3, p.y + (p.len || 10)); ctx.stroke();
    } else {
      ctx.fillStyle = p.color; ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  const shaking = shakeFrames > 0;
  if (shaking) {
    const dx = (Math.random() - 0.5) * 10 * (shakeFrames / 14);
    const dy = (Math.random() - 0.5) *  5 * (shakeFrames / 14);
    ctx.save(); ctx.translate(dx, dy);
  }

  drawBg();
  drawHeader();

  const isReveal = phase === "reveal" || phase === "shoot";
  const isOver   = phase === "gameover";
  const showCPU  = isReveal || isOver;

  const pGesture = (isReveal || isOver) ? playerChoice
                 : (phase === "countdown" ? currentGesture : null);
  const cGesture = showCPU ? cpuChoice : null;

  let pResult = null, cResult = null;
  if (phase === "reveal") {
    if (roundResult === "tie")         { pResult = "tie";  cResult = "tie"; }
    else if (roundResult === "player") { pResult = "win";  cResult = "lose"; }
    else                               { pResult = "lose"; cResult = "win"; }
  }

  drawBox(PL_X,  "PLAYER", P_COLOR, pGesture, false,    pResult);
  drawBox(CPU_X, "CPU",    C_COLOR, cGesture, !showCPU, cResult);
  drawVS();
  drawInfo();

  if (shaking) ctx.restore();

  drawParticles();
  drawFlash();
}

// ─── Camera panel ─────────────────────────────────────────────────────────────
function drawPip() {
  pctx.save();
  pctx.translate(pip.width, 0); pctx.scale(-1, 1);
  if (camReady) {
    pctx.drawImage(cam, 0, 0, pip.width, pip.height);
    pctx.restore();
    const hasG = currentGesture !== "none";
    pctx.fillStyle = hasG ? "rgba(34,197,94,0.88)" : "rgba(239,68,68,0.75)";
    pctx.fillRect(0, pip.height - 30, pip.width, 30);
    pctx.fillStyle = "#ffffff"; pctx.font = "bold 12px monospace";
    pctx.textAlign = "center"; pctx.textBaseline = "middle";
    pctx.fillText(hasG ? gestureLabel(currentGesture) : "NO GESTURE", pip.width / 2, pip.height - 15);
    pctx.textBaseline = "alphabetic";
  } else {
    pctx.restore();
    pctx.fillStyle = "#0f172a"; pctx.fillRect(0, 0, pip.width, pip.height);
    pctx.fillStyle = "#475569"; pctx.font = "12px monospace";
    pctx.textAlign = "center"; pctx.textBaseline = "middle";
    pctx.fillText("camera off — keyboard play", pip.width / 2, pip.height / 2);
    pctx.textBaseline = "alphabetic";
  }
}

function updateStatus() {
  if (!wsReady)  { elStatus.textContent = "connecting to tracker…"; return; }
  if (!camReady) { elStatus.textContent = "enable camera for gesture input"; return; }
  elStatus.textContent = currentGesture !== "none" ? "gesture detected ✓" : "show your hand";
}

function updateGesturePill() {
  const hasG = currentGesture !== "none";
  elGesture.textContent = hasG ? gestureLabel(currentGesture) : "no gesture";
  elGesture.classList.toggle("detected", hasG);
}

// ─── WebSocket ────────────────────────────────────────────────────────────────
let ws = null, awaiting = false, lastSend = 0;

function connectWS() {
  try {
    ws = new WebSocket("ws://" + location.hostname + ":8765");
    ws.binaryType = "arraybuffer";
    ws.onopen    = () => { wsReady = true; };
    ws.onmessage = (e) => {
      awaiting = false;
      try { const m = JSON.parse(e.data); if (m.gesture) currentGesture = m.gesture; } catch (_) {}
    };
    ws.onclose = () => { wsReady = false; awaiting = false; setTimeout(connectWS, 1500); };
    ws.onerror = () => {};
  } catch (_) { setTimeout(connectWS, 1500); }
}

async function initCam() {
  try {
    if (cam.srcObject) cam.srcObject.getTracks().forEach(t => t.stop());
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
    cam.srcObject = stream; await cam.play(); camReady = true;
  } catch (_) { camReady = false; }
}

function maybeSend(ts) {
  if (!ws || ws.readyState !== 1 || awaiting || !camReady) return;
  if (ts - lastSend < 50) return;
  lastSend = ts; awaiting = true;
  gctx.drawImage(cam, 0, 0, grab.width, grab.height);
  grab.toBlob((blob) => {
    if (!blob || !ws || ws.readyState !== 1) { awaiting = false; return; }
    try { ws.send(blob); } catch (_) { awaiting = false; }
  }, "image/jpeg", 0.5);
}

// ─── Game over overlay ────────────────────────────────────────────────────────
function showGameOver() {
  triggerGameOverEffects();
  if (!resultEl) {
    resultEl = document.createElement("div");
    resultEl.className = "overlay";
    document.querySelector(".shell").appendChild(resultEl);
  }
  let title, tint;
  if (wins.player > wins.cpu)      { title = "YOU WIN! 🎉"; tint = WIN_COL; }
  else if (wins.cpu > wins.player) { title = "CPU WINS";    tint = C_COLOR; }
  else                             { title = "IT'S A TIE";  tint = TIE_COL; }

  resultEl.innerHTML =
    '<div class="card">' +
    '<h2 style="color:' + tint + '">' + title + '</h2>' +
    '<p style="font-size:20px">' +
    '<b style="color:' + P_COLOR + '">You</b> ' + wins.player +
    ' &nbsp;———&nbsp; ' + wins.cpu +
    ' <b style="color:' + C_COLOR + '">CPU</b></p>' +
    '<div class="modes"><button id="again" class="big">PLAY AGAIN</button></div>' +
    '<p class="small">Press <b>R</b> to return to the menu</p>' +
    '</div>';
  resultEl.classList.remove("hidden");
  document.getElementById("again").addEventListener("click", startGame);
}

// ─── Input ────────────────────────────────────────────────────────────────────
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "r") {
    phase = "menu"; particles = []; flashAlpha = 0;
    elMenu.classList.remove("hidden");
    if (resultEl) resultEl.classList.add("hidden");
    return;
  }
  if (phase === "countdown" && roundIntroTimer <= 0) {
    if      (k === "1") kbGesture = "rock";
    else if (k === "2") kbGesture = "paper";
    else if (k === "3") kbGesture = "scissors";
  }
});

// ─── Main loop ────────────────────────────────────────────────────────────────
function frame(ts) {
  maybeSend(ts); update(); render(); drawPip(); updateStatus(); updateGesturePill();
  requestAnimationFrame(frame);
}

document.getElementById("btn-play").addEventListener("click", () => { initCam(); startGame(); });

document.getElementById("fs").addEventListener("click", () => {
  const el = document.querySelector(".shell");
  const on = document.fullscreenElement || document.webkitFullscreenElement;
  if (on) { const x = document.exitFullscreen || document.webkitExitFullscreen; if (x) x.call(document); }
  else    { const x = el.requestFullscreen   || el.webkitRequestFullscreen;     if (x) x.call(el); }
});

connectWS();
requestAnimationFrame(frame);
