import { MOVE } from "./constants.js";
import { state } from "./state.js";

export const Camera = {
  videoEl:  document.getElementById("cam"),
  grabEl:   document.getElementById("grab"),
  grabCtx:  document.getElementById("grab").getContext("2d"),
  pipEl:    document.getElementById("pip"),
  pipCtx:   document.getElementById("pip").getContext("2d"),
  statusEl: document.getElementById("status"),
  pillEl:   document.getElementById("gesture-display"),

  videoReady: false,
  wsReady:    false,
  ws:         null,
  awaiting:   false,
  lastSend:   0,

  // ─── Initialisation ─────────────────────────────────────────────────────────
  async startVideo() {
    try {
      if (this.videoEl.srcObject) this.videoEl.srcObject.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
      this.videoEl.srcObject = stream; await this.videoEl.play(); this.videoReady = true;
    } catch (_) { this.videoReady = false; }
  },

  connect() {
    try {
      this.ws = new WebSocket(`ws://${location.hostname}:8765`);
      this.ws.binaryType = "arraybuffer";
      this.ws.onopen    = () => { this.wsReady = true; };
      this.ws.onmessage = (e) => {
        this.awaiting = false;
        try { const m = JSON.parse(e.data); if (m.gesture) state.gesture = m.gesture; } catch (_) {}
      };
      this.ws.onclose = () => {
        this.wsReady = false; this.awaiting = false;
        setTimeout(() => this.connect(), 1500);
      };
      this.ws.onerror = () => {};
    } catch (_) { setTimeout(() => this.connect(), 1500); }
  },

  // ─── Per-frame ──────────────────────────────────────────────────────────────
  send(ts) {
    if (!this.ws || this.ws.readyState !== 1 || this.awaiting || !this.videoReady) return;
    if (ts - this.lastSend < 50) return;
    this.lastSend = ts; this.awaiting = true;
    this.grabCtx.drawImage(this.videoEl, 0, 0, this.grabEl.width, this.grabEl.height);
    this.grabEl.toBlob((blob) => {
      if (!blob || !this.ws || this.ws.readyState !== 1) { this.awaiting = false; return; }
      try { this.ws.send(blob); } catch (_) { this.awaiting = false; }
    }, "image/jpeg", 0.5);
  },

  drawPip() {
    const { pipCtx: pc, pipEl, videoEl, videoReady } = this;
    pc.save(); pc.translate(pipEl.width, 0); pc.scale(-1, 1);
    if (videoReady) {
      pc.drawImage(videoEl, 0, 0, pipEl.width, pipEl.height);
      pc.restore();
      const hasGesture = state.gesture !== "none";
      pc.fillStyle = hasGesture ? "rgba(34,197,94,0.88)" : "rgba(239,68,68,0.75)";
      pc.fillRect(0, pipEl.height - 30, pipEl.width, 30);
      pc.fillStyle = "#ffffff"; pc.font = "bold 12px monospace";
      pc.textAlign = "center"; pc.textBaseline = "middle";
      pc.fillText(hasGesture ? MOVE.label(state.gesture) : "NO GESTURE", pipEl.width / 2, pipEl.height - 15);
      pc.textBaseline = "alphabetic";
    } else {
      pc.restore();
      pc.fillStyle = "#0f172a"; pc.fillRect(0, 0, pipEl.width, pipEl.height);
      pc.fillStyle = "#475569"; pc.font = "12px monospace";
      pc.textAlign = "center"; pc.textBaseline = "middle";
      pc.fillText("camera off — keyboard play", pipEl.width / 2, pipEl.height / 2);
      pc.textBaseline = "alphabetic";
    }
  },

  updateUI() {
    this._updateStatus();
    this._updateGesturePill();
  },

  _updateStatus() {
    if (!this.wsReady)    { this.statusEl.textContent = "connecting to tracker…"; return; }
    if (!this.videoReady) { this.statusEl.textContent = "enable camera for gesture input"; return; }
    this.statusEl.textContent = state.gesture !== "none" ? "gesture detected ✓" : "show your hand";
  },

  _updateGesturePill() {
    const hasG = state.gesture !== "none";
    this.pillEl.textContent = hasG ? MOVE.label(state.gesture) : "no gesture";
    this.pillEl.classList.toggle("detected", hasG);
  },
};
