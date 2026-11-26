/**
 * Yugaanta — ui/charts.js
 * ---------------------------------------------------------------------------
 * Canvas charts of the universe's history, redrawn whenever the cosmology
 * changes and cursor-tracked during play:
 *   1. Scale factor a(t) — log-log, the master curve of the model.
 *   2. Energy components Ω_i(a) — radiation, matter, dark energy.
 *   3. Temperature T(t) — from Planck temperature to 2.725 K to zero.
 *   4. Growth factor D(a) — structure formation.
 * ---------------------------------------------------------------------------
 */

import { bus, EV } from "../core/events.js";
import { formatTime } from "../core/units.js";

const W = 306, H = 140;

export class Charts {
  constructor(engine) {
    this.engine = engine;
    this.pane = document.getElementById("tab-charts");
    this.canvases = {};
    this._build();
    bus.on(EV.PARAMS_REBUILT, () => this.redrawAll());
    this.redrawAll();
  }

  _build() {
    this.pane.innerHTML = "";
    const mk = (id, title) => {
      const titleEl = document.createElement("div");
      titleEl.className = "chart-title";
      titleEl.textContent = title;
      const c = document.createElement("canvas");
      c.className = "chart";
      c.width = W; c.height = H;
      this.pane.appendChild(c);
      this.pane.appendChild(titleEl);
      this.canvases[id] = c;
    };
    mk("a", "Scale factor a(t) — log₁₀ axes");
    mk("dens", "Energy content vs scale factor a");
    mk("T", "Temperature of the universe T(t)");
    mk("D", "Growth of structure D(a) — 1e-5 ripples → galaxies");
  }

  redrawAll() {
    this._drawScaleFactor();
    this._drawDensities();
    this._drawTemp();
    this._drawGrowth();
  }

  _ctx(id) {
    const c = this.canvases[id];
    if (!c) return null;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    // grid
    ctx.strokeStyle = "rgba(120,150,255,0.12)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(0, i * H / 4); ctx.lineTo(W, i * H / 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i * W / 4, 0); ctx.lineTo(i * W / 4, H); ctx.stroke();
    }
    return ctx;
  }

  _plot(ctx, pts, color, width = 1.6) {
    if (!pts.length) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const X = x * (W - 8) + 4;
      const Y = H - 6 - y * (H - 12);
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    });
    ctx.stroke();
  }

  /** Map t over [1e-32 s … 1e3 Gyr] on log-x. */
  _tAxis() {
    const t0 = 1e-32;
    const t1 = 1e3 * 3.15576e16;
    return (u) => Math.pow(10, Math.log10(t0) + u * (Math.log10(t1) - Math.log10(t0)));
  }

  _drawScaleFactor() {
    const ctx = this._ctx("a");
    if (!ctx) return;
    const cosmo = this.engine.cosmo;
    const tAt = this._tAxis();
    const lna0 = Math.log(1e-8), lna1 = Math.log(30);
    const pts = [];
    for (let i = 0; i < 200; i++) {
      const t = tAt(i / 199);
      const a = Math.max(1e-8, cosmo.aAt(t));
      const y = (Math.log10(a) - Math.log10(1e-8)) / (Math.log10(30) - Math.log10(1e-8));
      const x = i / 199;
      pts.push([x, Math.max(0, Math.min(1, y))]);
    }
    this._plot(ctx, pts, "#62a8ff");
    // NOW marker
    const uNow = (Math.log10(cosmo.t0) - Math.log10(1e-32)) / (Math.log10(1e3 * 3.15576e16) - Math.log10(1e-32));
    ctx.strokeStyle = "rgba(255,210,110,0.9)";
    ctx.beginPath(); ctx.moveTo(uNow * (W - 8) + 4, 4); ctx.lineTo(uNow * (W - 8) + 4, H - 6); ctx.stroke();
  }

  _drawDensities() {
    const ctx = this._ctx("dens");
    if (!ctx) return;
    const cosmo = this.engine.cosmo;
    const lna0 = Math.log(1e-6), lna1 = Math.log(4);
    const series = {
      r: { pts: [], color: "#ff8f5e" },
      m: { pts: [], color: "#62a8ff" },
      l: { pts: [], color: "#b57bff" },
    };
    for (let i = 0; i < 220; i++) {
      const lna = lna0 + (lna1 - lna0) * i / 219;
      const a = Math.exp(lna);
      const d = cosmo.densities(a);
      const x = i / 219;
      series.r.pts.push([x, d.fracR]);
      series.m.pts.push([x, d.fracM]);
      series.l.pts.push([x, d.fracL]);
    }
    for (const s of Object.values(series)) this._plot(ctx, s.pts, s.color);
  }

  _drawTemp() {
    const ctx = this._ctx("T");
    if (!ctx) return;
    const cosmo = this.engine.cosmo;
    const tAt = this._tAxis();
    const pts = [];
    const logTMin = 0.1, logTMax = 32;
    for (let i = 0; i < 220; i++) {
      const t = tAt(i / 219);
      const T = this.engine.state ? (t < 1e-32 ? 1.16e29 : 2.72548 / Math.max(1e-8, cosmo.aAt(t))) : 0;
      const y = (Math.log10(Math.max(T, 1)) - logTMin) / (logTMax - logTMin);
      pts.push([i / 219, Math.max(0, Math.min(1, y))]);
    }
    this._plot(ctx, pts, "#ffcf6e");
  }

  _drawGrowth() {
    const ctx = this._ctx("D");
    if (!ctx) return;
    const cosmo = this.engine.cosmo;
    const pts = [];
    const lna0 = Math.log(1e-5), lna1 = Math.log(1.2);
    for (let i = 0; i < 220; i++) {
      const a = Math.exp(lna0 + (lna1 - lna0) * i / 219);
      const D = cosmo.growth(a);
      // log-ish scale for visibility
      const y = Math.log10(Math.max(D, 1e-4) * 1e4) / 4;
      pts.push([i / 219, Math.max(0, Math.min(1, y))]);
    }
    this._plot(ctx, pts, "#6ee7a0");
  }

  /** Cursor markers for current time (cheap overlay redraw). */
  updateCursor(state) {
    void state;
    // (cursor lines are drawn on param rebuild + per-2s refresh to save CPU)
    if (!this._acc) this._acc = 0;
    this._acc++;
    if (this._acc % 120 === 0) this.redrawAll();
  }
}
