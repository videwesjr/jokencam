// Canvas dimensions — must match the HTML attribute values.
export const W = 900;
export const H = 560;

export const CFG = {
  WIN_ROUNDS:    3,
  MAX_ROUNDS:    5,
  INTRO_FRAMES:  60,      // 1 s "ROUND X" animation before the countdown starts
  CD_FRAMES:     3 * 60,  // 3 s player countdown
  SHOOT_FRAMES:  40,      // 0.67 s SHOOT! burst
  REVEAL_FRAMES: 2 * 60,  // 2 s result display
};

export const LAYOUT = {
  BOX_W: 370, BOX_H: 370, BOX_Y: 52,
  PL_X:  20,
  CPU_X: W - 370 - 20, // 510
  CX:    W / 2,         // 450
};
// Vertical centre of the info strip below the gesture boxes
const _infoTop = LAYOUT.BOX_Y + LAYOUT.BOX_H + 16;
LAYOUT.INFO_CY = _infoTop + (H - _infoTop - 8) / 2;

export const PAL = {
  PLAYER: "#3b82f6",
  CPU:    "#f97316",
  WIN:    "#22c55e",
  LOSE:   "#ef4444",
  TIE:    "#eab308",
};

export const MOVE = {
  LIST:    ["rock", "paper", "scissors"],
  SYMBOLS: { rock: "✊", paper: "✋", scissors: "✌️" },
  LABELS:  { rock: "ROCK", paper: "PAPER", scissors: "SCISSORS" },
  label(g) { return `${this.SYMBOLS[g] || ""}  ${this.LABELS[g] || ""}`; },
};
