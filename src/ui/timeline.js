/**
 * Yugaanta — ui/timeline.js
 * ---------------------------------------------------------------------------
 * The master timeline scrubber. Log10 time axis from 1e-43 s to 1e100 yr —
 * the whole life of the universe in one bar. Dragging the playhead jumps the
 * cosmic clock; event markers show where BBN, recombination, first stars,
 * the solar system, now, and the deep future sit on the axis.
 * ---------------------------------------------------------------------------
 */

import { bus, EV } from "../core/events.js";
import { YR } from "../core/units.js";

// axis: log10(t seconds) from -43 (Planck) to 100+22.7 (1e100 yr ≈ 1e107.5 s)
const T_MIN_LOG = -43;
const T_MAX_LOG = 107.7;

const norm = (tSec) =>
  (Math.log10(Math.max(tSec, 1e-43)) - T_MIN_LOG) / (T_MAX_LOG - T_MIN_LOG);
const denorm = (u) => Math.pow(10, T_MIN_LOG + u * (T_MAX_LOG - T_MIN_LOG));

export class Timeline {
  constructor(engine) {
    this.engine = engine;
    this.track = document.getElementById("tl-track");
    this.fill = document.getElementById("tl-fill");
    this.cursor = document.getElementById("tl-cursor");
    this.ticks = document.getElementById("tl-ticks");
    this._buildTicks();
    this._bindDrag();
    bus.on(EV.TIME_CHANGED, ({ t }) => this.setCursor(t));
    bus.on(EV.ERA_CHANGED, ({ t }) => this.setCursor(t));
  }

  _buildTicks() {
    this.ticks.innerHTML = "";
    const events = this.engine.events;
    for (const ev of events) {
      const u = norm(ev.t);
      if (u < 0 || u > 1) continue;
      const el = document.createElement("div");
      el.className = "tick";
      el.style.left = `${u * 100}%`;
      el.title = `${ev.label} — ${ev.t.toExponential(2)} s`;
      el.dataset.label = ev.label;
      this.ticks.appendChild(el);
    }
  }

  _bindDrag() {
    const seek = (clientX) => {
      const rect = this.track.getBoundingClientRect();
      const u = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const t = denorm(u);
      this.engine.clock.auto = false;
      document.getElementById("auto-speed").checked = false;
      this.engine.clock.jumpTo(t);
    };
    let dragging = false;
    this.track.addEventListener("pointerdown", (e) => { dragging = true; seek(e.clientX); });
    window.addEventListener("pointermove", (e) => { if (dragging) seek(e.clientX); });
    window.addEventListener("pointerup", () => { dragging = false; });
  }

  setCursor(t) {
    const u = norm(t);
    this.cursor.style.left = `calc(${u * 100}% - 1px)`;
    this.fill.style.width = `${u * 100}%`;
  }
}
