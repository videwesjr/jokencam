import { CFG, MOVE } from "./constants.js";
import { roundWinner } from "./helpers.js";
import { state, fx } from "./state.js";
import { Particles } from "./particles.js";
import { Effects } from "./effects.js";
import { UI } from "./ui.js";

export const Game = {
  // ─── Public API ─────────────────────────────────────────────────────────────
  start() {
    Object.assign(state, { round: 0, wins: { player: 0, cpu: 0 }, result: null });
    Object.assign(fx,    { shakeFrames: 0, fireworkTimer: 0, bounce: { player: 0, cpu: 0 } });
    fx.flash.alpha = 0;
    Particles.clear();
    UI.hideMenu(); UI.hideResult();
    UI.syncScores(state.wins);
    this._startRound();
  },

  update() {
    state.frame++;
    const t = state.timers;
    if (state.phase === "countdown") {
      if (t.intro > 0) t.intro--;
      else if (--t.cd <= 0) this._lock();
    } else if (state.phase === "shoot") {
      if (--t.shoot  <= 0) state.phase = "reveal";
    } else if (state.phase === "reveal") {
      if (--t.reveal <= 0) this._end();
    }
  },

  // ─── State-machine steps ────────────────────────────────────────────────────
  _startRound() {
    state.round++;
    Object.assign(state.choice, { player: null, cpu: null });
    Object.assign(state.timers, { cd: CFG.CD_FRAMES, intro: CFG.INTRO_FRAMES });
    state.result    = null;
    state.kbGesture = null;
    state.phase     = "countdown";
    UI.updateRound(state.round);
  },

  _lock() {
    const raw = state.kbGesture || state.gesture;
    state.choice.player = MOVE.LIST.includes(raw) ? raw : null;
    state.choice.cpu    = MOVE.LIST[Math.floor(Math.random() * 3)];
    state.result        = roundWinner(state.choice.player, state.choice.cpu);

    if (state.result === "player") { state.wins.player++; fx.bounce.player = 28; UI.bumpScore("player"); }
    if (state.result === "cpu")    { state.wins.cpu++;    fx.bounce.cpu    = 28; UI.bumpScore("cpu");    }

    UI.syncScores(state.wins);
    Effects.onRoundResult(state.result);
    state.timers.shoot  = CFG.SHOOT_FRAMES;
    state.timers.reveal = CFG.REVEAL_FRAMES;
    state.phase = "shoot";
  },

  _end() {
    const { wins, round } = state;
    const gameOver = wins.player >= CFG.WIN_ROUNDS
                  || wins.cpu    >= CFG.WIN_ROUNDS
                  || round       >= CFG.MAX_ROUNDS;
    if (gameOver) {
      state.phase = "gameover";
      Effects.onGameOver(wins);
      UI.showGameOver(wins, () => Game.start());
    } else {
      this._startRound();
    }
  },
};
