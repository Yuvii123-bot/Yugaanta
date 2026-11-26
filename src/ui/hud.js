/**
 * Yugaanta — ui/hud.js
 * ---------------------------------------------------------------------------
 * Heads-up display: era banner, live cosmology readouts (t, z, a, T_CMB,
 * H(t), horizon), the density-fraction bar, and the time-flow control
 * (with the headline 10,000× preset and adaptive tour mode).
 * ---------------------------------------------------------------------------
 */

import { bus, EV } from "../core/events.js";
import { formatTime, formatDist, formatSpeed, SPEED_PRESETS, trim } from "../core/units.js";
import { blackbodyTint } from "../cosmology/thermal.js";

export class HUD {
  constructor(engine) {
    this.engine = engine;
    this.$ = (id) => document.getElementById(id);
    this._buildRestartButton();
    this._buildSpeedButtons();
    this._bindJumpButtons();
    bus.on(EV.SPEED_CHANGED, ({ mult, auto }) => {
      this.$("clock-speed").textContent = auto ? "AUTO" : formatSpeed(mult);
      this.$("clock-note").textContent = mult >= 1
        ? `1 s = ${formatTime(mult)} of universe time`
        : "slow motion — Planck era";
    });
    this.$("auto-speed").addEventListener("change", (e) => {
      if (e.target.checked) this.engine.clock.setSpeed(this.engine.clock.speed, true);
      else this.engine.clock.setSpeed(this.engine.clock.speed, false);
    });
  }

  /** ⟲ RESTART — rewind the universe to the singularity (t = 0). */
  _buildRestartButton() {
    const btn = document.createElement("button");
    btn.id = "restart-btn";
    btn.textContent = "⟲ RESTART · SINGULARITY";
    btn.title = "Rewind to t = 0 and replay the whole universe";
    btn.addEventListener("click", () => {
      const clock = this.engine.clock;
      clock.paused = false;
      clock.auto = true;
      const autoChk = this.$("auto-speed");
      if (autoChk) autoChk.checked = true;
      document.querySelectorAll("#speed-buttons button").forEach(b => b.classList.remove("active"));
      clock.jumpTo(0);                    // t = 0 → Planck epoch
      bus.emit(EV.RESTART, {});           // camera + realm reset (main.js)
      this.$("clock-speed").textContent = "AUTO";
      this.$("clock-note").textContent = "t = 0 — replaying from the singularity";
    });
    const clockbox = this.$("clockbox");
    clockbox.insertBefore(btn, this.$("speed-buttons"));
  }

  _buildSpeedButtons() {
    const row = this.$("speed-buttons");
    for (const p of SPEED_PRESETS) {
      const b = document.createElement("button");
      b.textContent = p.label;
      b.title = p.note;
      b.dataset.mult = p.mult;
      b.addEventListener("click", () => {
        this.engine.clock.setSpeed(p.mult, false);
        this.$("auto-speed").checked = false;
        row.querySelectorAll("button").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
      });
      row.appendChild(b);
    }
    const b10k = row.querySelector("button[data-mult='10000']");
    if (b10k) { b10k.classList.add("active"); b10k.style.borderColor = "var(--accent2)"; }
  }

  _bindJumpButtons() {
    const JUMPS = [
      { label: "Big Bang", t: () => 1.0e-32 },
      { label: "First Nuclei", t: () => this.engine.bbn.tB },
      { label: "CMB Released", t: () => this.engine.rec.tStarSec },
      { label: "First Stars", t: () => 0.18e6 * 3.15576e13 },
      { label: "First Galaxies", t: () => 1e9 * 3.15576e7 },
      { label: "Solar System", t: () => 9.2e9 * 3.15576e7 },
      { label: "NOW", t: () => this.engine.cosmo.t0 },
      { label: "Far Future", t: () => 1e14 * 3.15576e7 },
    ];
    const row = this.$("jump-buttons");
    for (const j of JUMPS) {
      const b = document.createElement("button");
      b.textContent = j.label;
      b.className = "jumpbtn";
      b.addEventListener("click", () => {
        this.engine.clock.auto = false;
        this.$("auto-speed").checked = false;
        this.engine.clock.jumpTo(j.t());
      });
      row.appendChild(b);
    }
  }

  /** Per-frame refresh. */
  update(state) {
    const era = state.era;
    this.$("era-name").textContent = era.name;
    this.$("era-desc").textContent = era.desc.length > 220 ? era.desc.slice(0, 217) + "…" : era.desc;
    this.$("st-time").textContent = formatTime(state.t);
    this.$("st-z").textContent = state.z > 1e4 ? state.z.toExponential(2) : trim(state.z, 4);
    this.$("st-a").textContent = state.a > 1e-4 ? trim(state.a, 5) : state.a.toExponential(3);
    this.$("st-t").textContent = state.T > 0 ? `${trim(state.T, 4)} K` : "—";
    this.$("st-h").textContent = `${trim(state.Hkm, 4)} km/s/Mpc`;
    this.$("st-hor").textContent = formatDist(state.horizonComoving);

    // density bar
    const d = state.dens;
    const pr = (d.fracR * 100), pm = (d.fracM * 100), pl = (d.fracL * 100);
    this.$("seg-r").style.width = `${pr}%`;
    this.$("seg-m").style.width = `${pm}%`;
    this.$("seg-l").style.width = `${pl}%`;
    this.$("lg-r").textContent = `${pr < 0.1 ? pr.toExponential(1) : trim(pr, 3)}%`;
    this.$("lg-m").textContent = `${pm < 0.1 ? pm.toExponential(1) : trim(pm, 3)}%`;
    this.$("lg-l").textContent = `${pl < 0.1 ? pl.toExponential(1) : trim(pl, 3)}%`;

    // tint the era name by the photon temperature
    if (state.T > 500) {
      const [r, g, b] = blackbodyTint(state.T);
      this.$("era-name").style.color = `rgb(${r * 255},${g * 255},${b * 255})`;
    } else {
      this.$("era-name").style.color = "var(--accent2)";
    }
  }
}
