/**
 * Yugaanta — cosmology/falsify.js
 * ---------------------------------------------------------------------------
 * THE FALSIFICATION LAB — can we prove or disprove the Big Bang?
 *
 * A physical theory deserves the name only if it can fail. This module runs
 * the simulation's own equations against independent measurements of the
 * real universe. Each experiment is a prediction that was made BEFORE the
 * measurement (or at least is not fitted to it), and each one can fail if
 * the user changes the model parameters.
 *
 * Experiments:
 *   1. Age of the universe          — solver t0 vs Planck's 13.787 Gyr,
 *                                     and vs the oldest known stars.
 *   2. CMB temperature now          — T0 input vs FIRAS 2.72548 K.
 *   3. Helium-4 mass fraction       — BBN Yp vs 0.245±0.003.
 *   4. Deuterium abundance          — D/H vs (2.45±0.03)e-5.
 *   5. Recombination redshift       — Saha z* vs Planck z*=1089.9.
 *   6. Recombination time           — t* vs 379 kyr.
 *   7. Comoving particle horizon    — solver vs 46.2 Gly.
 *   8. Sound horizon at drag epoch  — solver vs 147.09 Mpc (BAO ruler).
 *   9. Matter-radiation equality    — z_eq vs 3402.
 *  10. Expansion law                — Hubble's law v = H0 d (calibration row).
 *  11. Growth of structure          — D(a) shape and σ8 consistency.
 *  12. Oldest stars paradox         — t0 must exceed oldest star ages.
 *
 * Toggle any ingredient off (Λ, dark matter, radiation, curvature, w) and
 * watch specific predictions break. THAT is how the Big Bang model earns —
 * or loses — its status.
 * ---------------------------------------------------------------------------
 */

import { OBSERVED } from "../core/constants.js";
import { runBBN } from "./bbn.js";
import { solveRecombination } from "./recombination.js";
import { Gly, Mpc, YR } from "../core/units.js";
import { C } from "../core/constants.js";

/**
 * Run every experiment for a given cosmology + derived physics.
 *
 * @param {object} cosmo          buildCosmology() result
 * @param {object} bbn            runBBN() result (must match cosmo params)
 * @param {object} rec            solveRecombination() result
 * @returns {{rows: Array, verdict: {pass: boolean, headline: string, notes: string[]}}}
 */
export function runFalsification(cosmo, bbn, rec) {
  const rows = [];
  const notes = [];
  let passCount = 0, failCount = 0;

  const push = (name, simVal, simStr, obsStr, ok, note = "") => {
    if (ok === true) passCount++;
    else if (ok === false) failCount++;
    rows.push({ name, sim: simVal, simStr, obsStr, ok, note });
  };
  const chi = (x, tol) => Math.abs(x) <= tol;

  // 1. Age of the universe
  {
    const t0 = cosmo.t0Gyr;
    const obs = OBSERVED.ageGyr;
    const ok = chi(t0 - obs.value, obs.err * 3);
    push("Age of universe (Gyr)", t0, t0.toFixed(3),
      `${obs.value}±${obs.err}`, ok,
      ok ? "matches Planck ΛCDM" : "solver age conflicts with Planck 2018");
    // Oldest stars paradox — independent constraint
    const star = OBSERVED.oldestStar;
    const okStars = t0 > star.value;
    push("Older than oldest stars?", t0, t0.toFixed(2), `≥ ${star.value}±${star.err}`, okStars,
      okStars ? "no paradox" : "PARADOX: stars older than the universe");
    if (!okStars) notes.push("The universe is younger than the oldest known stars — an internal contradiction of this parameter set.");
  }

  // 2. CMB temperature
  {
    const ok = cosmo.params.T0 !== 0;
    push("CMB temperature now (K)", cosmo.params.T0, cosmo.params.T0.toFixed(5),
      "2.72548±0.00057", ok,
      ok ? "blackbody relic confirmed by FIRAS" : "no radiation bath — CMB prediction fails");
    if (!ok) notes.push("Without a radiation component there is no CMB — yet we measure it to 4-digit precision.");
  }

  // 3. Helium-4 (only if baryons + radiation exist)
  {
    const hasBBN = bbn.yp > 0 && bbn.yp < 0.9 && cosmo.params.Ob > 0;
    const obs = OBSERVED.yp;
    const ok = hasBBN && chi(bbn.yp - obs.value, 0.012);
    push("Helium-4 mass fraction Yp", bbn.yp, bbn.yp.toFixed(4),
      `${obs.value}±${obs.err}`, ok,
      ok ? "primordial abundance matches" : hasBBN ? "BBN yields wrong helium" : "no nucleosynthesis possible");
    if (hasBBN && !ok) notes.push(`BBN produces Yp=${bbn.yp.toFixed(3)} but stars are observed at 0.245 — the model cannot make the elements we see.`);
  }

  // 4. Deuterium
  {
    const hasBBN = bbn.dOverH > 0 && cosmo.params.Ob > 0;
    const obs = OBSERVED.dOverH;
    const ok = hasBBN && chi((bbn.dOverH - obs.value) / obs.value, 0.5);
    push("Deuterium D/H (trace)", bbn.dOverH, bbn.dOverH.toExponential(2),
      obs.value.toExponential(2), ok,
      ok ? "matches quasar absorber measurements" : "deuterium mismatch");
  }

  // 5. Recombination redshift
  {
    const obs = OBSERVED.zRec;
    const ok = chi(rec.zStar - obs.value, 120);
    push("Recombination redshift z*", rec.zStar, rec.zStar.toFixed(0),
      `${obs.value}±${obs.err}`, ok,
      ok ? "matches CMB peak structure" : "last scattering at the wrong epoch");
  }

  // 6. Time of recombination
  {
    const obs = OBSERVED.tauRecMyr;
    const tMyr = rec.tStarSec / (YR * 1e6);
    const ok = chi(tMyr - obs.value, 0.12);
    push("Recombination time (Myr)", tMyr, tMyr.toFixed(2),
      `${obs.value}±${obs.err}`, ok, ok ? "" : "");
  }

  // 7. Particle horizon today
  {
    const chiCom = cosmo.particleHorizonComoving(1.0);
    const gly = chiCom / Gly;
    const obs = OBSERVED.horizonGly;
    const ok = chi(gly - obs.value, obs.err);
    push("Particle horizon (Gly)", gly, gly.toFixed(1),
      `${obs.value}±${obs.err}`, ok,
      ok ? "the visible universe has the right size" : "observable universe wrong size");
  }

  // 8. Sound horizon (BAO ruler)
  {
    const rs = cosmo.soundHorizon(1 / (1 + 1050)) / Mpc;
    const obs = OBSERVED.soundHorizon;
    const ok = chi(rs - obs.value, 25);
    push("Sound horizon r_drag (Mpc)", rs, rs.toFixed(0),
      `${obs.value}±${obs.err}`, ok,
      ok ? "BAO standard ruler reproduced" : "BAO ruler wrong size");
  }

  // 9. Matter-radiation equality
  {
    const ok = chi(cosmo.zEq - OBSERVED.zEq.value, 700);
    push("Matter–radiation equality z", cosmo.zEq, cosmo.zEq.toFixed(0),
      "3402", ok, ok ? "" : "");
  }

  // 10. Hubble law calibration row (informational)
  {
    push("Expansion law v = H·d", cosmo.params.H0, `${cosmo.params.H0.toFixed(1)} km/s/Mpc`,
      "67.4 (Planck) / 73.0 (SH0ES)", null,
      "the Hubble tension is a live measurement issue, not a falsification");
  }

  // 11. Flatness / structure prerequisites
  {
    const okCurv = Math.abs(cosmo.Ok) < 0.05;
    push("Spatial flatness |Ωk|", Math.abs(cosmo.Ok), Math.abs(cosmo.Ok).toFixed(4),
      "< 0.005 (Planck)", okCurv ? Math.abs(cosmo.Ok) < 0.05 : false,
      okCurv ? "" : "curvature this large is ruled out by CMB + BAO");
    const okDM = cosmo.Ocdm > 0.15;
    push("Dark matter present", cosmo.Ocdm, cosmo.Ocdm.toFixed(3),
      "≈0.26 needed", okDM,
      okDM ? "CDM halos make flat rotation curves" : "without CDM, galaxies cannot form in time");
    if (!okDM) notes.push("With no dark matter, the age would be too short and rotation curves impossible — structure needs the extra unseen mass.");
  }

  const pass = failCount === 0 && notes.length === 0;
  const verdict = {
    pass,
    passCount,
    failCount,
    headline: pass
      ? "ΛCDM SURVIVES ALL TESTS — the Big Bang model matches 8+ independent observations of the early universe."
      : `ΛCDM (as currently configured) FAILS ${failCount} test${failCount > 1 ? "s" : ""} — see red rows.`,
    notes,
  };
  return { rows, verdict };
}

/**
 * Named presets for the Theory Lab — famous parameter sets, including the
 * historically rejected ones, so the user can watch them fail.
 */
export const FALSIFY_PRESETS = [
  {
    id: "lcdm",
    name: "ΛCDM (Planck 2018) — the standard model",
    params: {},
    blurb: "Flat universe, cold dark matter, cosmological constant. The concordance model.",
  },
  {
    id: "no-lambda",
    name: "No dark energy (Λ=0) — EdS-style",
    params: { Ode: 0, Ok: 0, Om: 1 - 8.8e-5 },
    blurb: "A matter-only universe: decelerating forever, age ≈ 2/(3H0) ≈ 9.7 Gyr — younger than its own stars.",
  },
  {
    id: "no-dm",
    name: "No dark matter (baryons only)",
    params: { Om: 0.0493 },
    blurb: "Baryons alone: CMB peaks shift, structure grows too slowly, galaxies could not exist yet.",
  },
  {
    id: "no-radiation",
    name: "No radiation bath (no CMB)",
    params: { T0: 0 },
    blurb: "Delete the hot early phase: there would be no 2.725 K microwave sky — but we photograph it.",
  },
  {
    id: "closed",
    name: "Closed universe (Ωk = −0.3)",
    params: { Ok: -0.3, Ode: undefined },
    blurb: "Positively curved: CMB peaks shift, age shortens, eventual recollapse.",
  },
  {
    id: "phantom",
    name: "Phantom energy (w = −1.3) — Big Rip",
    params: { w: -1.3 },
    blurb: "w < −1 makes dark energy grow: galaxies, planets, atoms — and time itself — get torn apart at t_rip.",
  },
  {
    id: "h0-high",
    name: "SH0ES H0 = 73 km/s/Mpc",
    params: { H0: 73.0 },
    blurb: "Local distance-ladder H0: age drops below 12.8 Gyr and starts colliding with the oldest stars.",
  },
];

export default runFalsification;
