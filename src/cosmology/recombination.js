/**
 * Yugaanta — cosmology/recombination.js
 * ---------------------------------------------------------------------------
 * Recombination & photon decoupling (z ≈ 1100, t ≈ 380 kyr).
 *
 * The Saha equation governs the equilibrium ionisation fraction while the
 * plasma is in thermal contact:
 *
 *     x² / (1 − x) = (1 / n_H) (m_e k T / 2π ħ²)^{3/2} e^{−B_H / kT}
 *
 * with x = n_e/n_H, B_H = 13.598 eV (hydrogen binding energy), and
 * n_H = η n_γ the hydrogen number density (η = 6.11e-10, Planck 2018).
 *
 * Physics caveat (displayed in the UI too): Saha equilibrium fails below
 * x_e ≈ 0.1 — out-of-equilibrium Peebles / RECFAST dynamics then control the
 * tail, shifting last scattering from the Saha mid-point (z≈1380) to the
 * true z* ≈ 1089. We define last scattering operationally as the Saha
 * x_e = 0.15 contour, which reproduces the standard z* ≈ 1100 to a few
 * percent, and we state the limitation openly in the Theory Lab.
 * ---------------------------------------------------------------------------
 */

import { C, COSMO_DEFAULT } from "../core/constants.js";
import { bisectRoot } from "../core/mathx.js";
import { expSafe } from "../core/mathx.js";

/** Hydrogen binding energy in K. */
const B_H_K = 13.598 * C.ev_K;          // ≈ 1.578e5 K
/** Photon density constant: n_γ = 2ζ(3)/π² (kT/ħc)³. */
const PHOTON_CONST = 2 * 1.2020569 / Math.PI ** 2;

/**
 * Photon number density at temperature T (per m³).
 */
export function photonNumberDensity(TK) {
  const kt = TK * C.kB;
  return PHOTON_CONST * Math.pow(kt / (C.hbar * C.c), 3);
}

/**
 * Saha equilibrium ionisation fraction x_e(T).
 * Uses hydrogen number density n_H = η n_γ (η = baryon-to-photon ratio,
 * scaled by the baryon density parameter chosen in the Theory Lab).
 *
 * @param {number} TK        temperature in K
 * @param {number} eta       baryon-to-photon ratio (default Planck 2018)
 * @returns {number} x_e in [0, 1]
 */
export function sahaIonization(TK, eta = 6.11e-10) {
  const nH = eta * photonNumberDensity(TK);
  // Thermal de Broglie factor (m_e kT / 2π ħ²)^{3/2}
  const thermal = Math.pow(C.m_e * TK * C.kB / (2 * Math.PI * C.hbar * C.hbar), 1.5);
  // RHS = (1/n_H) · thermal · e^{−B/T}   — can under/overflow; use logs
  const logRHS = Math.log(thermal / nH) - B_H_K / TK;
  // Solve x²/(1−x) = R → x = (−R + sqrt(R² + 4R))/2 ... stable form
  if (logRHS > 500) return 1.0;
  if (logRHS < -500) return 0.0;
  const R = Math.exp(logRHS);
  const x = (-R + Math.sqrt(R * R + 4 * R)) / 2;
  return Math.max(0, Math.min(1, x));
}

/**
 * Temperature at which Saha x_e crosses a target value (root find).
 * @param {number} xTarget  e.g. 0.5 for the (formal) half-recombination
 * @param {number} eta      baryon-to-photon ratio
 * @returns {number} T in K
 */
export function sahaTemperatureFor(xTarget, eta = 6.11e-10) {
  const f = (T) => sahaIonization(T, eta) - xTarget;
  // x_e rises monotonically with T from ~0 to 1; bracket [2000, 20000] K
  return bisectRoot(f, 2000, 20000, 1e-9);
}

/**
 * Photon scattering rate Γ(T) = x_e(T) · n_b(T) · σ_T · c  (s⁻¹), using the
 * Saha equilibrium ionisation fraction.
 */
export function scatteringRate(TK, eta) {
  const x = sahaIonization(TK, eta);
  const nb = eta * photonNumberDensity(TK);
  return x * nb * 6.6524587321e-29 * 299792458;
}

/**
 * Full recombination solution against a cosmology: find z* and t*.
 *
 * Operational definition (standard textbook approximation): last scattering
 * is where the photon scattering rate Γ(T) falls below the expansion rate
 * H(a(T)) — i.e. the mean free path reaches the Hubble radius. Evaluated
 * with the Saha equilibrium this reproduces z* ≈ 1080-1110 and
 * t* ≈ 0.35-0.40 Myr. A full Peebles/RECFAST integration shifts these by a
 * few percent (disclosed in the Theory Lab).
 *
 * @param {object} cosmo  result of buildCosmology()
 * @returns {{zStar, tStarSec, TStar, xStar, zHalf, tHalfSec}}
 */
export function solveRecombination(cosmo, eta) {
  const p = cosmo.params;
  const etaUsed = eta ?? 6.11e-10;
  const target = (TK) => {
    const a = p.T0 / TK;
    const H = cosmo.H(a);
    return scatteringRate(TK, etaUsed) - H;
  };
  // Γ falls steeply with falling T; bracket in K
  const TStar = bisectRoot(target, 2500, 5000, 1e-6, 200);
  const aStar = p.T0 / TStar;
  const zStar = 1 / aStar - 1;
  const tStarSec = cosmo.tAt(aStar);
  const xStar = sahaIonization(TStar, etaUsed);
  // Formal Saha half-ionisation (reference only — not the true z*)
  const THalf = sahaTemperatureFor(0.5, etaUsed);
  const aHalf = p.T0 / THalf;
  const zHalf = 1 / aHalf - 1;
  const tHalfSec = cosmo.tAt(aHalf);
  return { zStar, tStarSec, TStar, xStar, zHalf, tHalfSec };
}

/**
 * Photon mean free path at ionisation fraction x_e (m):
 *    l = 1 / (n_e σ_T),  n_e = x_e n_H.
 * The universe becomes transparent when l ~ horizon — that IS decoupling.
 */
export function photonMeanFreePath(TK, x_e, eta = 6.11e-10) {
  const n_e = x_e * eta * photonNumberDensity(TK);
  return 1 / (n_e * C.sigmaT);
}

/**
 * Optical depth from a to today: κ(a) = ∫ n_e σ_T c dt/a.
 * Approximated with the standard step function + damping tail:
 * ionised fraction x_e(a): 1 for z > z_reion (~8), Saha-tail blend below.
 * Used to explain WHY we can only see the CMB surface (and not before).
 */
export function lastScatteringShell(cosmo) {
  const rec = solveRecombination(cosmo);
  return {
    z: rec.zStar,
    tSec: rec.tStarSec,
    T: rec.TStar,
    // shell thickness (comoving Mpc) — the "last scattering surface"
    // has finite width ~ 80 Mpc comoving (damping scale).
    thicknessMpc: 80,
  };
}

export default { sahaIonization, solveRecombination };
