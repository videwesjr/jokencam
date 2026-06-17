import { state, fx } from "./state.js";
import { Particles } from "./particles.js";
import { Effects } from "./effects.js";
import { Game } from "./game.js";
import { UI } from "./ui.js";
import { render } from "./renderer.js";
import { Camera } from "./camera.js";

// ─── Input ───────────────────────────────────────────────────────────────────
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();

  if (k === "r") {
    state.phase = "menu";
    Particles.clear();
    fx.flash.alpha = 0;
    UI.showMenu();
    UI.hideResult();
    return;
  }

  // Keyboard gesture fallback — only active during the live countdown (not intro)
  if (state.phase === "countdown" && state.timers.intro <= 0) {
    if      (k === "1") state.kbGesture = "rock";
    else if (k === "2") state.kbGesture = "paper";
    else if (k === "3") state.kbGesture = "scissors";
  }
});

// ─── Frame loop ───────────────────────────────────────────────────────────────
function frame(ts) {
  Camera.send(ts);    // push JPEG frame to Python gesture server
  Game.update();      // advance state machine + timers
  Particles.update(); // physics step
  Effects.update();   // decay flash/shake, tick gameover effects
  render();           // draw arena canvas
  Camera.drawPip();   // draw camera preview panel
  Camera.updateUI();  // sync status text + gesture pill
  requestAnimationFrame(frame);
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
document.getElementById("btn-play").addEventListener("click", () => {
  Camera.startVideo();
  Game.start();
});

document.getElementById("fs").addEventListener("click", () => {
  const el = document.querySelector(".shell");
  const on = document.fullscreenElement || document.webkitFullscreenElement;
  if (on) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
  else    { (el.requestFullscreen    || el.webkitRequestFullscreen).call(el); }
});

Camera.connect();
requestAnimationFrame(frame);
