/**
 * Yugaanta — physics/thermodynamics.js
 * ---------------------------------------------------------------------------
 * Thermodynamics of the cosmos: blackbody radiation, entropy of the
 * universe, adiabatic cooling of ideal gases, and the arrow of time.
 *
 * The entropy budget (Egan & Lineweaver 2010, with SMBH corrections):
 *   - CMB photons:      ~2.6 × 10^88 k
 *   - neutrinos:        ~1.7 × 10^89 k
 *   - SMBH horizons:    ~3.1 × 10^104 k   ← dominates by 10 orders of magnitude
 *   - stars/gas/dust:   negligible
 * Total ≈ 3.1e104 k — the universe is still FAR from equilibrium (heat death).
 * ---------------------------------------------------------------------------
 */

import { C } from "../core/constants.js";

/**
 * Blackbody energy density u = a T⁴ (J/m³).
 */
export const blackbodyEnergyDensity = (TK) => C.aRad * TK ** 4;

/**
 * Blackbody pressure (radiation): p = u/3.
 */
export const radiationPressure = (TK) => C.aRad * TK ** 4 / 3;

/**
 * Photon gas entropy density: s = (4/3) a T³ (J/m³/K).
 */
export const photonEntropyDensity = (TK) => (4 / 3) * C.aRad * TK ** 3;

/**
 * Bekenstein-Hawking entropy of a black hole:
 *   S = (k_B c³ A) / (4 G ħ),  A = 4π r_s²
 *   S/k ≈ 1.05e77 (M/M☉)²
 * The single largest entropy reservoir in the universe.
 */
export function blackHoleEntropy(M) {
  const rs = 2 * C.G * M / (C.c * C.c);
  const area = 4 * Math.PI * rs * rs;
  return C.kB * Math.pow(C.c, 3) * area / (4 * C.G * C.hbar);
}

/**
 * Ideal gas adiabatic relation: T ∝ ρ^{γ−1} (γ=5/3 monoatomic).
 * Used for gas cooling in the intergalactic medium.
 */
export function adiabaticCooling(T0, rho, rho0, gamma = 5 / 3) {
  return T0 * Math.pow(rho / rho0, gamma - 1);
}

/**
 * Compton cooling of gas against the CMB (matters in the dark ages):
 * rate Γ = (8 σ_T a_r T_cmb⁴)/(3 m_e c) — energy exchange with relic photons.
 * Returns the timescale (s) for baryonic gas at temperature T_gas.
 */
export function comptonCoolingTimescale(Tcmb, Tgas, baryonDensity) {
  const uGamma = C.aRad * Tcmb ** 4;
  const rate = (8 * C.sigmaT * uGamma) / (3 * C.m_e * C.c * C.c) * (Tgas - Tcmb) / Tgas;
  const rhoEnergy = baryonDensity * (1.5 * C.kB * Tgas);
  return rate > 0 ? rhoEnergy / (rate * uGamma) : Infinity;
}

/**
 * Jeans length (m) — the minimum scale that can collapse:
 *   λ_J = √(15 k T / (4 π G μ m_p ρ))
 */
export function jeansLength(TK, rhoKgM3, mu = 0.6) {
  return Math.sqrt(15 * C.kB * TK / (4 * Math.PI * C.G * mu * C.m_p * rhoKgM3));
}

/**
 * Jeans mass (kg) — the minimum mass that can collapse at temperature T.
 */
export function jeansMass(TK, rhoKgM3, mu = 0.6) {
  const lam = jeansLength(TK, rhoKgM3, mu);
  return (Math.PI / 6) * rhoKgM3 * Math.pow(lam, 3);
}

/**
 * Virial temperature: the temperature at which a halo of mass M and radius
 * R is in equilibrium:  T_vir = μ m_p G M / (2 k R).
 */
export function virialTemperature(M, R, mu = 0.6) {
  return mu * C.m_p * C.G * M / (2 * C.kB * R);
}

/**
 * Free-fall (dynamical) time:  t_ff = √(3π / (32 G ρ)).
 */
export function freeFallTime(rhoKgM3) {
  return Math.sqrt(3 * Math.PI / (32 * C.G * rhoKgM3));
}

/**
 * Hubble-vs-freefall: a halo collapses if t_ff < t_H. This comparison at
 * recombination is WHY the first stars take ~100 Myr to appear.
 */
export function collapseFeasibility(rhoKgM3, hubbleRate) {
  return freeFallTime(rhoKgM3) < 1 / hubbleRate;
}

export default {
  blackbodyEnergyDensity, radiationPressure, photonEntropyDensity,
  blackHoleEntropy, jeansLength, jeansMass, virialTemperature,
  freeFallTime, collapseFeasibility,
};
