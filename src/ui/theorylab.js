/**
 * Yugaanta — ui/theorylab.js
 * ---------------------------------------------------------------------------
 * THE FALSIFICATION LAB UI — prove or disprove the Big Bang with your own
 * hands. Parameter sliders + famous presets + a live pass/fail scoreboard
 * comparing the simulation's own outputs against independent measurements
 * of the real universe. Change the model, watch specific predictions break.
 * ---------------------------------------------------------------------------
 */

import { bus, EV } from "../core/events.js";
import { FALSIFY_PRESETS } from "../cosmology/falsify.js";

export class TheoryLab {
  constructor(engine) {
    this.engine = engine;
    this.pane = document.getElementById("tab-lab");
    this._build();
    bus.on(EV.PARAMS_REBUILT, ({ initial }) => {
      if (!initial) this._refreshResults();
    });
    this._refreshResults();
  }

  _build() {
    this.pane.innerHTML = "";
    const intro = document.createElement("p");
    intro.innerHTML = `<b style="color:var(--accent2)">Can the Big Bang be disproved?</b>
      A theory that can't fail explains nothing. Below: 12 predictions of this
      simulation checked against independent measurements. Change the physics
      with the sliders — if a prediction turns <span style="color:var(--bad)">red</span>,
      that version of cosmology is falsified by real data.`;
    this.pane.appendChild(intro);

    // presets
    const presetRow = document.createElement("div");
    presetRow.className = "preset-row";
    for (const p of FALSIFY_PRESETS) {
      const b = document.createElement("button");
      b.textContent = p.name.split("—")[0].trim();
      b.title = p.blurb;
      b.addEventListener("click", () => {
        this._applyPreset(p);
      });
      presetRow.appendChild(b);
    }
    this.pane.appendChild(presetRow);
    this.blurb = document.createElement("p");
    this.pane.appendChild(this.blurb);

    // sliders
    this._mkSlider("H0", "Hubble constant H₀ (km/s/Mpc)", 50, 100, 0.1, (v) => v);
    this._mkSlider("Om", "Matter fraction Ωm", 0.0, 1.2, 0.001, (v) => v);
    this._mkSlider("Ob", "Baryon fraction Ωb", 0.0, 0.3, 0.0005, (v) => v);
    this._mkSlider("w", "Dark energy w = p/ρc²", -1.6, -0.5, 0.01, (v) => v);
    this._mkSlider("T0", "CMB temperature today (K)", 0, 5.5, 0.01, (v) => v);
    this._mkSlider("sigma8", "Fluctuation amplitude σ₈", 0.2, 1.6, 0.01, (v) => v);

    // run button
    const runB = document.createElement("button");
    runB.textContent = "▶ Run the universe with these physics";
    runB.style.cssText = "width:100%;margin-top:8px;padding:8px;background:var(--accent);color:#04101f;font-weight:700;border:none;border-radius:8px;cursor:pointer";
    runB.addEventListener("click", () => this._run());
    this.pane.appendChild(runB);

    // results
    this.results = document.createElement("div");
    this.pane.appendChild(this.results);
    this.verdict = document.createElement("div");
    this.pane.appendChild(this.verdict);
  }

  _mkSlider(key, label, min, max, step, fmt) {
    const wrap = document.createElement("div");
    wrap.className = "param";
    const p = this.engine.params[key];
    const lb = document.createElement("label");
    lb.innerHTML = `${label} <b class="mono">${fmt(p ?? (min + max) / 2)}</b>`;
    const input = document.createElement("input");
    input.type = "range";
    input.min = min; input.max = max; input.step = step;
    input.value = p ?? (min + max) / 2;
    input.addEventListener("input", () => {
      lb.innerHTML = `${label} <b class="mono">${fmt(parseFloat(input.value))}</b>`;
      this._pending = this._pending || {};
      this._pending[key] = parseFloat(input.value);
    });
    wrap.appendChild(lb); wrap.appendChild(input);
    this.pane.appendChild(wrap);
    (this._sliders = this._sliders || {})[key] = { input, lb, fmt };
  }

  _applyPreset(preset) {
    // clear pending, set sliders from params after rebuild
    this._pending = { ...preset.params };
    this.blurb.textContent = preset.blurb;
    this._run();
    // sync sliders
    for (const [k, s] of Object.entries(this._sliders)) {
      const v = this.engine.params[k];
      if (v !== undefined && v >= parseFloat(s.input.min) && v <= parseFloat(s.input.max)) {
        s.input.value = v;
        s.lb.innerHTML = `${s.lb.textContent.split(/ \d| \-/)[0]} <b class="mono">${s.fmt(v)}</b>`;
      }
    }
  }

  _run() {
    const params = { ...this._pending };
    // Only drop Ode if it was never explicitly set (recomputed by flatness)
    if (params.Ode === undefined) delete params.Ode;
    this.engine.rebuild(params, {}, false);
    this._pending = null;
    this._refreshResults();
    bus.emit(EV.PARAMS_CHANGED, { params: this.engine.params });
  }

  _refreshResults() {
    const res = this.engine.getFalsification();
    if (!res) return;
    this.results.innerHTML = "";
    for (const row of res.rows) {
      const el = document.createElement("div");
      el.className = "res-row";
      const chipCls = row.ok === true ? "ok" : row.ok === false ? "bad" : "na";
      const chipTxt = row.ok === true ? "✓" : row.ok === false ? "✗" : "•";
      el.innerHTML = `
        <div class="chip ${chipCls}">${chipTxt}</div>
        <div class="name">${row.name}<br><small style="color:var(--ink-dim)">${row.note}</small></div>
        <div class="sim">${row.simStr}</div>
        <div class="obs">${row.obsStr}</div>`;
      this.results.appendChild(el);
    }
    const v = res.verdict;
    this.verdict.className = "verdict " + (v.pass ? "pass" : "fail");
    this.verdict.innerHTML = `<b>${v.pass ? "✓" : "✗"} ${v.headline}</b>` +
      (v.notes.length ? `<br><br>${v.notes.map(n => "⚠ " + n).join("<br>")}` : "");
  }
}
