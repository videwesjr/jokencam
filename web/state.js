// Shared mutable singletons — all modules import the same reference.

// Game state: drives all logic and rendering decisions.
export const state = {
  phase:     "menu", // "menu" | "countdown" | "shoot" | "reveal" | "gameover"
  round:     0,
  wins:      { player: 0, cpu: 0 },
  timers:    { cd: 0, shoot: 0, reveal: 0, intro: 0 },
  choice:    { player: null, cpu: null },
  result:    null,    // "player" | "cpu" | "tie"
  gesture:   "none",  // live value written by Camera on each WebSocket message
  kbGesture: null,    // keyboard override set during countdown
  frame:     0,       // monotonic counter used by animation math
};

// Visual effect state: decoupled from game logic.
export const fx = {
  flash:         { alpha: 0, color: "#fff" },
  shakeFrames:   0,
  fireworkTimer: 0,
  bounce:        { player: 0, cpu: 0 }, // countdown frames for win-dot pop
};
