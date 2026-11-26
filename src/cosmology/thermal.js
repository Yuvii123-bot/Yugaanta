/**
 * Yugaanta — cosmology/thermal.js
 * ---------------------------------------------------------------------------
 * Thermal history of the universe: radiation temperature, expansion cooling,
 * entropy per baryon, thermal epoch markers (weak freeze-out, e± annihilation,
 * neutrino decoupling, photon decoupling).
 *
 * Key relations:
 *   Tγ(t)   = T0 / a(t)                        (photon temperature, exact by definition of a)
 *   Tν(t)   = (4/11)^{1/3} Tγ                  (after neutrino decoupling)
 *   H(t)    = sqrt(π²·g★/90) T² / M_Pl         (radiation era, natural units)
 *   t(s)    ≈ 0.738 (g★/10.75)^{-1/2} (T/MeV)^{-2}   (radiation-era fit)
 * ---------------------------------------------------------------------------
 */

import { C, COSMO_DEFAULT } from "../core/constants.js";
import { cmbTemperature, TNU_RATIO } from "./flrw.js";

/** Effective relativistic degrees of freedom g*(T) — display-grade fit.
 *  Full SM: 106.75 above all thresholds. Steps down at each mass threshold. */
export function gStar(TeV) {
  // TeV in GeV
  if (TeV > 100) return 106.75;               // full Standard Model plasma
  if (TeV > 0.15) return 61.75;               // below QCD: quarks → hadrons (mostly pions)
  if (TeV > 1.0e-3 * 0.511) return 10.75;     // below muons: γ + e± + ν
  if (TeV > 1.0e-9) return 3.36;              // below e±: γ + ν (2 + 2×7/8×3.046)
  return 3.36;                                // photons + cold neutrinos
}

/** Entropy degrees of freedom g*s(T) (approximate steps, as above). */
export const gStarEntropy = gStar;

/**
 * Radiation-era time-temperature relation (analytic fit, natural units):
 *   t ≈ 0.738 s · (10.75/g*)^{1/2} · (T/MeV)^{-2}
 * Useful for labels in the first second; the numeric FLRW table remains the
 * master clock — this is a cross-check.
 */
export function radiationEraTimeSeconds(TMeV) {
  const g = gStar(TMeV * 1e-3); // MeV → GeV
  return 0.738 * Math.sqrt(10.75 / g) / (TMeV * TMeV);
}

/** Inverse: temperature (MeV) at radiation-era time t (s). */
export function radiationEraTempMeV(tSec) {
  return Math.sqrt(0.738 * Math.sqrt(10.75 / gStar(1e-3)) / tSec);
}

/** Hubble rate during radiation domination, H = T²·sqrt(π²·g★/90)/M_Pl (s^-1, SI). */
export function radiationEraHubble(TMeV) {
  const TK = TMeV * 1e9 * C.ev_K;             // MeV → K
  const kT = TK * C.kB;                        // J
  const Mpl = C.m_planck * C.c * C.c;          // Planck mass energy, J
  return Math.sqrt(Math.PI * Math.PI * gStar(TMeV * 1e-3) / 90) * kT * kT / (Mpl * C.hbar);
}

/**
 * Number density of relativistic species (Fermi-Dirac / Bose-Einstein).
 * n = g ζ(3)/π² (kT/ħc)³ × (3/4 for fermions)
 */
export function relativisticDensity(TK, isFermion) {
  const kt = TK * C.kB;
  const base = 1.2020569 / (Math.PI * Math.PI) * Math.pow(kt / (C.hbar * C.c), 3);
  return isFermion ? base * 0.75 : base;
}

/**
 * Photon-to-baryon ratio η — the fundamental baryogenesis measure.
 * η ≈ 6.1e-10 (Planck 2018): for every billion photons there is ~1 baryon.
 * The matter-antimatter asymmetry ε ≈ 6e-10 is why anything exists at all.
 */
export const BARYON_PHOTON_RATIO = 6.11e-10;

/** CMB photon number density today (per m³) — ≈ 4.1e8 / m³ (411/cm³). */
export function photonDensityToday() {
  return relativisticDensity(COSMO_DEFAULT.T0, false) * 2;
}

/**
 * Blackbody colour of radiation at temperature T (approximate RGB, 0..1).
 * Used to tint the primordial fireball: 1e10 K → blinding blue-white,
 * 3000 K → orange-red, <1000 K → dark.
 */
export function blackbodyTint(TK) {
  // Planck-locus approximation (Tanner Helland style fit, condensed).
  const t = Math.max(1000, Math.min(40000, TK)) / 100;
  let r, g, b;
  if (t <= 66) r = 255;
  else r = clamp255(329.698727446 * Math.pow(t - 60, -0.1332047592));
  if (t <= 66) g = clamp255(99.4708025861 * Math.log(t) - 161.1195681661);
  else g = clamp255(288.1221695283 * Math.pow(t - 60, -0.0755148492));
  if (t >= 66) b = 255;
  else if (t <= 19) b = 0;
  else b = clamp255(138.5177312231 * Math.log(t - 10) - 305.0447927307);
  return [r / 255, g / 255, b / 255];
}
const clamp255 = (x) => Math.max(0, Math.min(255, x)) / 255;

/** Named thermal epochs (t in seconds, T in K) for the timeline. */
export const THERMAL_EPOCHS = [
  { t: 0,            T: 1.4e32,      label: "Planck temperature — physics as we know it ends" },
  { t: 1e-32,        T: 1.2e29,      label: "Reheating — the hot Big Bang ignites" },
  { t: 1e-11,        T: 1.3e15,      label: "Electroweak symmetry breaking — particles get mass" },
  { t: 1e-5,         T: 1.8e12,      label: "QCD confinement — quarks become hadrons" },
  { t: 1,            T: 1.0e10,      label: "Neutrino decoupling — the cosmic neutrino background freezes" },
  { t: 10,           T: 3.2e9,       label: "Weak freeze-out — n/p ratio locks at 1/6" },
  { t: 60,           T: 1.4e9,       label: "e± annihilation — matter wins, photons win the energy" },
  { t: 180,          T: 9.4e8,       label: "Deuterium bottleneck opens — BBN floods helium" },
  { t: 1.2e3,        T: 3.8e8,       label: "BBN ends — 75% H, 25% He by mass, forever" },
  { t: 6.2e12,       T: 8900,        label: "Matter-radiation equality — gravity takes over" },
  { t: 1.2e13,       T: 3000,        label: "Recombination — the universe becomes transparent" },
];
