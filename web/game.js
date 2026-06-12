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
const CPU_X = W - BOX_W - 20;   // 510
const CX    = W / 2;             // 450

// ─── Game config ─────────────────────────────────────────────────────────────
const WIN_ROUNDS   = 3;
const MAX_ROUNDS   = 5;
const CD_FRAMES    = 3 * 60;    // 3s countdown
const SHOOT_FRAMES = 40;        // 0.67s SHOOT! flash
const REVEAL_FRAMES = 2 * 60;   // 2s result display

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

// ─── State ───────────────────────────────────────────────────────────────────
let phase = "menu";
let roundNum = 0;
let wins = { player: 0, cpu: 0 };
let cdTimer = 0, shootTimer = 0, revealTimer = 0;
let currentGesture = "none";
let playerChoice = null, cpuChoice = null, roundResult = null;
let frameT = 0;
let camReady = false, wsReady = false;
let kbGesture = null;
let resultEl = null;

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
  elMenu.classList.add("hidden");
  if (resultEl) resultEl.classList.add("hidden");
  updateHUD();
  startRound();
}

function startRound() {
  roundNum++;
  playerChoice = null; cpuChoice = null; roundResult = null; kbGesture = null;
  cdTimer = CD_FRAMES;
  phase = "countdown";
  elRoundNum.textContent = roundNum;
}

function lockRound() {
  const g = kbGesture || currentGesture;
  playerChoice = GESTURES.includes(g) ? g : null;
  cpuChoice    = cpuPick();
  roundResult  = winner(playerChoice, cpuChoice);
  if (roundResult === "player") wins.player++;
  else if (roundResult === "cpu") wins.cpu++;
  updateHUD();
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

// ─── Update ──────────────────────────────────────────────────────────────────
function update() {
  frameT++;
  if (phase === "countdown") {
    if (--cdTimer <= 0) lockRound();
  } else if (phase === "shoot") {
    if (--shootTimer <= 0) phase = "reveal";
  } else if (phase === "reveal") {
    if (--revealTimer <= 0) endRound();
  }
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

function hexRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// ─── Background ──────────────────────────────────────────────────────────────
function drawBg() {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0d1b2e");
  g.addColorStop(1, "#16243a");
  ctx.fillStyle = g;
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

// ─── Win dots + round label ───────────────────────────────────────────────────
function drawHeader() {
  if (phase === "menu") return;
  ctx.textAlign = "center";
  ctx.font = "12px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillText("ROUND " + roundNum + " OF " + MAX_ROUNDS, CX, 26);

  const dotR = 7, dotGap = 20;
  for (let i = 0; i < WIN_ROUNDS; i++) {
    ctx.beginPath();
    ctx.arc(CX - 70 - i * dotGap, 22, dotR, 0, Math.PI * 2);
    ctx.fillStyle = i < wins.player ? P_COLOR : hexRgba(P_COLOR, 0.18);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(CX + 70 + i * dotGap, 22, dotR, 0, Math.PI * 2);
    ctx.fillStyle = i < wins.cpu ? C_COLOR : hexRgba(C_COLOR, 0.18);
    ctx.fill();
  }
}

// ─── VS circle ────────────────────────────────────────────────────────────────
function drawVS() {
  const cy = BOX_Y + BOX_H / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, cy, 26, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("VS", CX, cy);
  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

// ─── Gesture box ─────────────────────────────────────────────────────────────
function drawBox(bx, label, baseColor, gesture, hidden, result) {
  const x = bx, y = BOX_Y, w = BOX_W, h = BOX_H;
  const pulse = 0.55 + 0.45 * Math.sin(frameT * 0.09);

  let borderColor = baseColor;
  let borderAlpha = 0.55;
  let glowColor   = null;
  let glowBlur    = 0;

  if (result === "win") {
    borderColor = WIN_COL; borderAlpha = pulse; glowColor = WIN_COL; glowBlur = 24;
  } else if (result === "lose") {
    borderColor = LOSE_COL; borderAlpha = 0.4;
  } else if (result === "tie") {
    borderColor = TIE_COL; borderAlpha = pulse * 0.8;
  } else if (label === "PLAYER" && phase === "countdown") {
    if (currentGesture !== "none") { borderColor = WIN_COL; borderAlpha = pulse; }
  }

  ctx.save();
  if (glowColor) { ctx.shadowColor = glowColor; ctx.shadowBlur = glowBlur; }
  rr(ctx, x, y, w, h, 18);
  ctx.fillStyle = result === "win"
    ? hexRgba(WIN_COL, 0.06)
    : result === "lose"
    ? hexRgba(LOSE_COL, 0.04)
    : "rgba(255,255,255,0.03)";
  ctx.fill();
  ctx.strokeStyle = hexRgba(borderColor, borderAlpha);
  ctx.lineWidth = 2.5;
  rr(ctx, x, y, w, h, 18);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Label
  ctx.fillStyle = hexRgba(baseColor, 0.9);
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + 30);

  // Emoji / gesture symbol
  const ey = y + h * 0.52;
  ctx.font = "86px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (hidden) {
    ctx.globalAlpha = 0.35 + 0.2 * Math.sin(frameT * 0.07);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("?", x + w / 2, ey);
    ctx.globalAlpha = 1;
  } else if (gesture && SYMBOLS[gesture]) {
    ctx.fillText(SYMBOLS[gesture], x + w / 2, ey);
  } else {
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#ffffff";
    ctx.fillText("?", x + w / 2, ey);
    ctx.globalAlpha = 1;
  }
  ctx.textBaseline = "alphabetic";

  // Gesture name at bottom
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  if (!hidden && gesture && LABELS[gesture]) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(LABELS[gesture], x + w / 2, y + h - 16);
  } else if (phase === "countdown" && label === "PLAYER" && currentGesture === "none") {
    ctx.fillStyle = hexRgba(LOSE_COL, 0.65);
    ctx.fillText("SHOW YOUR HAND", x + w / 2, y + h - 16);
  }

  ctx.restore();
}

// ─── Info area (below boxes) ──────────────────────────────────────────────────
function drawInfo() {
  const iy = BOX_Y + BOX_H + 16;
  const cy = iy + (H - iy - 8) / 2;

  if (phase === "countdown") {
    const secs = Math.max(1, Math.ceil(cdTimer / 60));
    const sc   = 1 + 0.04 * Math.sin(frameT * 0.07);
    ctx.save();
    ctx.translate(CX, cy - 8);
    ctx.scale(sc, sc);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 86px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(secs), 0, 0);
    ctx.textBaseline = "alphabetic";
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("HOLD YOUR MOVE", CX, cy + 52);

  } else if (phase === "shoot") {
    const t  = 1 - shootTimer / SHOOT_FRAMES;
    const sc = 1 + t * 0.5;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t * 1.4);
    ctx.translate(CX, cy - 8);
    ctx.scale(sc, sc);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SHOOT!", 0, 0);
    ctx.textBaseline = "alphabetic";
    ctx.restore();

  } else if (phase === "reveal") {
    let text, color;
    if (roundResult === "tie")    { text = "TIE!";     color = TIE_COL; }
    else if (roundResult === "player") { text = "YOU WIN!"; color = WIN_COL; }
    else                               { text = "CPU WINS"; color = C_COLOR; }

    const pu = 1 + 0.04 * Math.sin(frameT * 0.12);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur  = 18;
    ctx.translate(CX, cy - 12);
    ctx.scale(pu, pu);
    ctx.fillStyle = color;
    ctx.font = "bold 66px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 0);
    ctx.textBaseline = "alphabetic";
    ctx.restore();

    if (roundResult !== "tie" && playerChoice && cpuChoice) {
      const sub = roundResult === "player"
        ? LABELS[playerChoice] + " beats " + LABELS[cpuChoice]
        : LABELS[cpuChoice]   + " beats " + LABELS[playerChoice];
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(sub, CX, cy + 50);
    }

  } else if (phase === "menu") {
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = "15px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("show ✊  ✋  ✌️  to the camera", CX, cy);
    ctx.textBaseline = "alphabetic";
  }
}

// ─── Main render ─────────────────────────────────────────────────────────────
function render() {
  drawBg();
  drawHeader();

  const inGame  = phase !== "menu";
  const isReveal = phase === "reveal" || phase === "shoot";

  let pResult = null, cResult = null;
  if (isReveal) {
    if (roundResult === "tie") {
      pResult = "tie"; cResult = "tie";
    } else if (roundResult === "player") {
      pResult = "win"; cResult = "lose";
    } else {
      pResult = "lose"; cResult = "win";
    }
  }

  const pGesture = inGame ? (isReveal ? playerChoice : currentGesture) : null;
  const cGesture = inGame ? cpuChoice : null;

  drawBox(PL_X,  "PLAYER", P_COLOR, pGesture, false,        pResult);
  drawBox(CPU_X, "CPU",    C_COLOR, cGesture, !isReveal,     cResult);
  drawVS();
  drawInfo();
}

// ─── Camera panel ─────────────────────────────────────────────────────────────
function drawPip() {
  pctx.save();
  pctx.translate(pip.width, 0);
  pctx.scale(-1, 1);
  if (camReady) {
    pctx.drawImage(cam, 0, 0, pip.width, pip.height);
    pctx.restore();
    const hasG = currentGesture !== "none";
    pctx.fillStyle = hasG ? "rgba(34,197,94,0.88)" : "rgba(239,68,68,0.75)";
    pctx.fillRect(0, pip.height - 30, pip.width, 30);
    pctx.fillStyle = "#ffffff";
    pctx.font = "bold 12px monospace";
    pctx.textAlign = "center";
    pctx.textBaseline = "middle";
    pctx.fillText(
      hasG ? ((SYMBOLS[currentGesture] || "") + "  " + (LABELS[currentGesture] || "")) : "NO GESTURE",
      pip.width / 2, pip.height - 15
    );
    pctx.textBaseline = "alphabetic";
  } else {
    pctx.restore();
    pctx.fillStyle = "#0f172a";
    pctx.fillRect(0, 0, pip.width, pip.height);
    pctx.fillStyle = "#475569";
    pctx.font = "12px monospace";
    pctx.textAlign = "center";
    pctx.textBaseline = "middle";
    pctx.fillText("camera off — keyboard play", pip.width / 2, pip.height / 2);
    pctx.textBaseline = "alphabetic";
  }
}

function updateStatus() {
  if (!wsReady)   { elStatus.textContent = "connecting to tracker…"; return; }
  if (!camReady)  { elStatus.textContent = "enable camera for gesture input"; return; }
  elStatus.textContent = currentGesture !== "none" ? "gesture detected ✓" : "show your hand";
}

function updateGesturePill() {
  const hasG = currentGesture !== "none";
  elGesture.textContent = hasG
    ? ((SYMBOLS[currentGesture] || "") + "  " + (LABELS[currentGesture] || ""))
    : "no gesture";
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
      try {
        const m = JSON.parse(e.data);
        if (m.gesture) currentGesture = m.gesture;
      } catch (_) {}
    };
    ws.onclose = () => { wsReady = false; awaiting = false; setTimeout(connectWS, 1500); };
    ws.onerror = () => {};
  } catch (_) {
    setTimeout(connectWS, 1500);
  }
}

async function initCam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
    cam.srcObject = stream;
    await cam.play();
    camReady = true;
  } catch (_) { camReady = false; }
}

function maybeSend(ts) {
  if (!ws || ws.readyState !== 1 || awaiting || !camReady) return;
  if (ts - lastSend < 50) return;
  lastSend = ts;
  awaiting = true;
  gctx.drawImage(cam, 0, 0, grab.width, grab.height);
  grab.toBlob((blob) => {
    if (!blob || !ws || ws.readyState !== 1) { awaiting = false; return; }
    blob.arrayBuffer().then((b) => { if (ws.readyState === 1) ws.send(b); else awaiting = false; });
  }, "image/jpeg", 0.5);
}

// ─── Game over overlay ────────────────────────────────────────────────────────
function showGameOver() {
  if (!resultEl) {
    resultEl = document.createElement("div");
    resultEl.className = "overlay";
    document.querySelector(".shell").appendChild(resultEl);
  }
  let title, tint;
  if (wins.player > wins.cpu)      { title = "YOU WIN! 🎉"; tint = WIN_COL; }
  else if (wins.cpu > wins.player) { title = "CPU WINS";              tint = C_COLOR; }
  else                             { title = "IT’S A TIE";       tint = TIE_COL; }

  resultEl.innerHTML =
    '<div class="card">' +
    '<h2 style="color:' + tint + '">' + title + '</h2>' +
    '<p style="font-size:20px">' +
    '<b style="color:' + P_COLOR + '">You</b> ' + wins.player +
    ' &nbsp;———&nbsp; ' + wins.cpu +
    ' <b style="color:' + C_COLOR + '">CPU</b>' +
    '</p>' +
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
    phase = "menu";
    elMenu.classList.remove("hidden");
    if (resultEl) resultEl.classList.add("hidden");
    return;
  }
  if (phase === "countdown") {
    if (k === "1") kbGesture = "rock";
    else if (k === "2") kbGesture = "paper";
    else if (k === "3") kbGesture = "scissors";
  }
});

// ─── Main loop ────────────────────────────────────────────────────────────────
function frame(ts) {
  maybeSend(ts);
  update();
  render();
  drawPip();
  updateStatus();
  updateGesturePill();
  requestAnimationFrame(frame);
}

document.getElementById("btn-play").addEventListener("click", () => {
  initCam();
  startGame();
});

document.getElementById("fs").addEventListener("click", () => {
  const el = document.querySelector(".shell");
  const on = document.fullscreenElement || document.webkitFullscreenElement;
  if (on) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
});

connectWS();
requestAnimationFrame(frame);
