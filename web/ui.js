import { PAL } from "./constants.js";

export const UI = {
  _scoreP:   document.getElementById("scoreP"),
  _scoreC:   document.getElementById("scoreC"),
  _roundEl:  document.getElementById("roundNum"),
  _menuEl:   document.getElementById("menu"),
  _resultEl: null,

  // ─── Score + round display ──────────────────────────────────────────────────
  syncScores({ player, cpu }) {
    this._scoreP.textContent = player;
    this._scoreC.textContent = cpu;
  },

  bumpScore(side) {
    const el = side === "player" ? this._scoreP : this._scoreC;
    el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
  },

  updateRound(n) {
    this._roundEl.textContent = n;
    this._roundEl.classList.remove("pop"); void this._roundEl.offsetWidth; this._roundEl.classList.add("pop");
  },

  // ─── Overlay visibility ─────────────────────────────────────────────────────
  hideMenu()   { this._menuEl.classList.add("hidden"); },
  showMenu()   { this._menuEl.classList.remove("hidden"); },
  hideResult() { if (this._resultEl) this._resultEl.classList.add("hidden"); },

  showGameOver(wins, onPlayAgain) {
    if (!this._resultEl) {
      this._resultEl = document.createElement("div");
      this._resultEl.className = "overlay";
      document.querySelector(".shell").appendChild(this._resultEl);
    }
    const [title, tint] =
      wins.player > wins.cpu ? ["YOU WIN! 🎉", PAL.WIN]  :
      wins.cpu > wins.player ? ["CPU WINS",    PAL.CPU]  :
                               ["IT'S A TIE",  PAL.TIE];

    this._resultEl.innerHTML = `
      <div class="card">
        <h2 style="color:${tint}">${title}</h2>
        <p style="font-size:20px">
          <b style="color:${PAL.PLAYER}">You</b> ${wins.player}
          &nbsp;———&nbsp;
          ${wins.cpu} <b style="color:${PAL.CPU}">CPU</b>
        </p>
        <div class="modes"><button id="again" class="big">PLAY AGAIN</button></div>
        <p class="small">Press <b>R</b> to return to the menu</p>
      </div>`;
    this._resultEl.classList.remove("hidden");
    document.getElementById("again").addEventListener("click", onPlayAgain);
  },
};
