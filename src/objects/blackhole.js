/**
 * Yugaanta — objects/blackhole.js
 * ---------------------------------------------------------------------------
 * Black hole dossier: Schwarzschild geometry, Hawking thermodynamics,
 * tidal forces, orbital mechanics near the horizon. Used by the Inspector
 * and by the future-era renderer (evaporating BHs in the Black Hole Era).
 * ---------------------------------------------------------------------------
 */

import { C } from "../core/constants.js";
import {
  schwarzschildRadius, hawkingTemperature, hawkingPower, hawkingLifetime,
  isco, timeDilationFactor, gravitationalRedshift,
} from "../physics/relativity.js";

/**
 * Build the complete physical dossier of a black hole.
 * @param {number} massKg
 * @param {object} opts {name, aStar (Kerr spin 0..1), accretionRate}
 */
export function blackHoleDossier(massKg, opts = {}) {
  const rs = schwarzschildRadius(massKg);
  const TH = hawkingTemperature(massKg);
  const P = hawkingPower(massKg);
  const tau = hawkingLifetime(massKg);
  const tCMBGrowth = 4.6e-14;   // s/K: BH grows while TH < 2.725 K
  const growing = TH < 2.72548;
  const rG = C.G * massKg / (C.c * C.c);   // gravitational radius GM/c²
  return {
    name: opts.name ?? "black hole",
    massKg,
    schwarzschildRadius: rs,
    gravitationalRadius: rG,
    iscoRadius: isco(rs),
    photonSphere: 1.5 * rs,
    ergosphereEq: opts.aStar ? rG * (1 + Math.sqrt(1 - opts.aStar ** 2)) : null,
    hawkingTempK: TH,
    hawkingPowerW: P,
    evaporationSeconds: tau,
    growsFromCMB: growing,           // absorbs CMB heat until universe cools
    Tdiary: `evaporates in ${(tau / (YR_SEC)).toExponential(2)} yr`,
    timeDilationAt10Rs: timeDilationFactor(10 * rs, rs),
    redshiftAt10Rs: gravitationalRedshift(massKg, 10 * rs),
    tidalAtHorizon: tidalAcceleration(massKg, rs),
  };
}

const YR_SEC = 3.15576e7;

/**
 * Tidal (spaghettification) acceleration difference across a 2 m human
 * falling feet-first at radius r: Δa ≈ 2GM h/r³.
 * For Sagittarius A*: survivable at the horizon; for a 5 M☉ hole: fatal.
 */
export function tidalAcceleration(massKg, r) {
  const h = 2;   // metres
  return 2 * C.G * massKg * h / Math.pow(r, 3);
}

/** Named notable black holes. */
export const NOTABLE_BLACK_HOLES = [
  { name: "Sagittarius A*", massMsun: 4.297e6, distLy: 26696, spin: 0.9, note: "The Milky Way's own monster — imaged by the EHT in 2022." },
  { name: "M87*", massMsun: 6.5e9, distLy: 53.5e6, spin: 0.9, note: "First photograph of a black hole (April 10, 2019)." },
  { name: "Cygnus X-1", massMsun: 21.2, distLy: 6070, spin: 0.95, note: "First widely-accepted stellar black hole (1971 bet between Hawking & Thorne)." },
  { name: "Gaia BH1", massMsun: 9.62, distLy: 1560, spin: 0, note: "Dormant black hole found by stellar kinematics (2022)." },
  { name: "GW190521 remnant", massMsun: 142, distLy: 17000e6, spin: 0.7, note: "Intermediate-mass hole born from an LIGO merger." },
  { name: "TON 618", massMsun: 6.6e10, distLy: 104e8, spin: 0.5, note: "One of the most massive known — 66 billion suns." },
];

export default { blackHoleDossier, tidalAcceleration, NOTABLE_BLACK_HOLES };
