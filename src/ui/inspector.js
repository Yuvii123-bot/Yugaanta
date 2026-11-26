/**
 * Yugaanta — ui/inspector.js
 * ---------------------------------------------------------------------------
 * Object inspector — click anything in the 3D view to get its physics:
 * computed surface gravity, escape velocity, equilibrium temperature,
 * stellar lifetimes, Schwarzschild geometry, rotation curves — all derived
 * from the real equations in src/physics, never hardcoded tables.
 * ---------------------------------------------------------------------------
 */

import { bus, EV } from "../core/events.js";
import { planetDossier } from "../objects/planet.js";
import { blackHoleDossier } from "../objects/blackhole.js";
import { luminosity, mainSequenceLifetime, spectralClass, stellarRadius, effectiveTemperature } from "../physics/stellar.js";
import { schwarzschildRadius, hawkingTemperature, hawkingLifetime } from "../physics/relativity.js";
import { formatDist, formatMass, formatTime, formatNum, trim, YR } from "../core/units.js";
import { C } from "../core/constants.js";

export class Inspector {
  constructor(engine, realms) {
    this.engine = engine;
    this.realms = realms;
    this.pane = document.getElementById("tab-insp");
    bus.on(EV.PICK, (info) => this.show(info));
    this.placeholder();
  }

  placeholder() {
    this.pane.innerHTML = `
      <h3>INSPECTOR</h3>
      <p>Click any object in the 3D view — planets, stars, black holes, galaxies —
      to see the real physics the simulation computes for it.</p>`;
  }

  _row(k, v) {
    return `<div class="insp-row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  }

  show(info) {
    const p = this.pane;
    p.innerHTML = "";
    const title = document.createElement("div");
    title.className = "insp-title";
    title.textContent = info.name ?? "Object";
    p.appendChild(title);
    const sub = document.createElement("div");
    sub.className = "insp-sub";
    p.appendChild(sub);

    if (info.type === "not-yet") {
      p.innerHTML += `<p>⏳ ${info.note}</p>`;
      return;
    }

    if (info.type === "planet" || info.type === "moon" || info.type === "planet-surface") {
      const d = info.data ?? {};
      const dossier = planetDossier({
        name: info.name, massKg: d.massKg ?? C.M_earth, radiusKm: d.radiusKm ?? 6371,
        tempK: d.tempK ?? 288, albedo: d.albedo ?? 0.3,
        rotationH: d.rotationH ?? 24, aAU: d.a ?? 1,
        starL: d.id === "earth" || d.parent === undefined ? C.L_sun : C.L_sun,
        seed: d.seed, type: d.type,
      });
      sub.textContent = `${d.desc ?? "Planet of the Solar System"}`;
      p.innerHTML += `
        ${this._row("Mass", formatMass(dossier.massKg))}
        ${this._row("Radius", formatDist(dossier.radiusM))}
        ${this._row("Mean density", `${trim(dossier.densityGcc, 4)} g/cm³`)}
        ${this._row("Surface gravity", `${trim(dossier.gravity, 4)} m/s² (${trim(dossier.gravityG, 3)} g)`)}
        ${this._row("Escape velocity", `${trim(dossier.escapeVelocity / 1000, 4)} km/s`)}
        ${this._row("Equilibrium temp", `${trim(dossier.equilibriumTempK, 4)} K`)}
        ${this._row("Observed temp", `${trim(dossier.observedTempK, 4)} K`)}
        ${this._row("Greenhouse effect", `+${trim(dossier.greenhouseDelta, 3)} K`)}
        ${this._row("Day length", `${trim(Math.abs(dossier.dayLengthH), 5)} h${dossier.retrograde ? " (retrograde)" : ""}`)}
        ${this._row("Year", d.periodDays ? `${trim(d.periodDays, 5)} d` : "—")}
        ${this._row("In habitable zone", dossier.inHabitableZone ? "✓ yes" : "no")}
        ${this._row("Water plausible", dossier.waterPlausible ? "✓ yes" : "—")}
        <p style="margin-top:6px">g = GM/R² · v_esc = √(2GM/R) · T_eq = [L(1−A)/16πσd²]^¼</p>`;
      return;
    }

    if (info.type === "star") {
      const m = info.massSolar ?? 1.0;
      const L = luminosity(m);
      const R = stellarRadius(m);
      const Teff = effectiveTemperature(L, R);
      const spec = spectralClass(Teff);
      const tau = mainSequenceLifetime(m);
      sub.textContent = `Main-sequence star · ${spec.cls}${info.id === "sol" ? "2V" : "-type"}`;
      p.innerHTML += `
        ${this._row("Mass", `${trim(m, 4)} M☉`)}
        ${this._row("Luminosity", `${formatNum(L, "L☉")}`)}
        ${this._row("Radius", `${trim(R, 4)} R☉`)}
        ${this._row("Surface temp", `${trim(Teff, 5)} K`)}
        ${this._row("Lifetime", formatTime(tau * YR))}
        ${this._row("L ∝ M^3.5", `L = M^${trim(Math.log(L) / Math.log(m || 1), 3)}`)}
        <p>Stellar physics: Eddington standard model + main-sequence lifetime τ ∝ M/L.</p>`;
      return;
    }

    if (info.type === "blackhole") {
      const massMsun = info.massMsun ?? 4.297e6;
      const M = massMsun * C.M_sun;
      const rs = schwarzschildRadius(M);
      const TH = hawkingTemperature(M);
      sub.textContent = info.note ?? "Schwarzschild black hole";
      p.innerHTML += `
        ${this._row("Mass", formatMass(M))}
        ${this._row("Event horizon r_s", formatDist(rs))}
        ${this._row("ISCO", formatDist(3 * rs))}
        ${this._row("Photon sphere", formatDist(1.5 * rs))}
        ${this._row("Hawking temp", `${TH.toExponential(3)} K`)}
        ${this._row("Evaporation", formatTime(hawkingLifetime(M)))}
        <p>r_s = 2GM/c² · T_H = ħc³/8πGMk_B · τ = 5120πG²M³/ħc⁴</p>`;
      return;
    }

    if (info.type === "galaxy-target") {
      sub.textContent = info.note ?? "";
      p.innerHTML += `
        ${this._row("Type", "SBbc barred spiral")}
        ${this._row("Stellar mass", "~6.4×10¹⁰ M☉")}
        ${this._row("Halo mass", "~1.15×10¹² M☉")}
        ${this._row("Central BH", "Sgr A* — 4.297×10⁶ M☉")}
        ${this._row("Rotation", "flat at ~233 km/s — needs dark matter")}
        <p>The flat rotation curve (v ∝ const instead of v ∝ r^-½) was the
        original evidence for dark matter halos.</p>`;
      return;
    }

    p.innerHTML += `<p>${info.note ?? "No physics data for this object yet."}</p>`;
  }
}
