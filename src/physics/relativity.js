/**
 * Yugaanta — physics/relativity.js
 * ---------------------------------------------------------------------------
 * Special & general relativity formulas used by the simulation:
 *   - Lorentz factor / velocity addition
 *   - Schwarzschild geometry: radius, time dilation, ISCO, orbital velocity
 *   - Kerr basics (spin parameter, ergosphere)
 *   - Light deflection (lensing)
 *   - Gravitational redshift
 *   - Hawking radiation (temperature, lifetime, power)
 *   - Cosmological redshift of photon energy / wavelength
 *
 * All formulas are classical textbook results; each carries a test.
 * ---------------------------------------------------------------------------
 */

import { C } from "../core/constants.js";

/** Lorentz factor γ = 1/√(1−v²/c²). */
export function lorentzFactor(v) {
  const beta = v / C.c;
  return 1 / Math.sqrt(1 - beta * beta);
}

/** Relativistic velocity addition (1D): w = (u+v)/(1+uv/c²). */
export function velocityAddition(u, v) {
  return (u + v) / (1 + u * v / (C.c * C.c));
}

/** Relativistic energy E = γmc², kinetic K = (γ−1)mc². */
export function relativisticEnergy(massKg, v) {
  return lorentzFactor(v) * massKg * C.c * C.c;
}

/**
 * Schwarzschild radius r_s = 2GM/c².
 * Sun → 2.953 km, Earth → 8.87 mm, M☉ per unit → 2.953 km.
 */
export const schwarzschildRadius = (M) => 2 * C.G * M / (C.c * C.c);

/**
 * Gravitational time dilation dτ/dt = √(1 − r_s/r) for a stationary
 * observer outside a Schwarzschild black hole.
 */
export function timeDilationFactor(r, rs) {
  const x = 1 - rs / r;
  return x > 0 ? Math.sqrt(x) : 0;
}

/** Innermost stable circular orbit: r_ISCO = 3 r_s (Schwarzschild). */
export const isco = (rs) => 3 * rs;

/**
 * Circular orbital velocity in Schwarzschild geometry:
 *   v = √(GM/(r − r_s)) ... exact coordinate result: v/c = √(r_s/(2(r−r_s)))
 * returns fraction of c.
 */
export function orbitalVelocityFraction(r, rs) {
  return Math.sqrt(rs / (2 * (r - rs)));
}

/** Kerr spin parameter a* = Jc/(GM²), ergosphere radius at equator:
 *  r_ergo = (GM/c²)(1 + √(1−a*²)). */
export function ergosphereRadius(M, aStar) {
  const rG = C.G * M / (C.c * C.c);
  return rG * (1 + Math.sqrt(Math.max(0, 1 - aStar * aStar)));
}

/**
 * Light deflection by a mass at impact parameter b:
 *   α = 4GM/(c²b) — twice the Newtonian value (Einstein 1915).
 * Sun limb (b = R☉): 1.75 arcsec — the 1919 Eddington test.
 */
export function lightDeflectionRadians(M, b) {
  return 4 * C.G * M / (C.c * C.c * b);
}
export const ARCSEC = Math.PI / (180 * 3600);

/**
 * Gravitational redshift:  1+z = 1/√(1 − 2GM/(rc²)).
 */
export function gravitationalRedshift(M, r) {
  const x = 1 - 2 * C.G * M / (r * C.c * C.c);
  // At (or numerically indistinguishable from) the horizon, z → ∞
  return x > 1e-12 ? 1 / Math.sqrt(x) - 1 : Infinity;
}

/**
 * Hawking temperature of a black hole:
 *   T_H = ħc³ / (8π G M k_B)
 * M☉ → 6.17e-8 K. A solar-mass hole is colder than the CMB — it GROWS today.
 */
export function hawkingTemperature(M) {
  return C.hbar * Math.pow(C.c, 3) / (8 * Math.PI * C.G * M * C.kB);
}

/**
 * Hawking evaporation power:
 *   P = ħc⁶ / (15360 π G² M²)
 */
export function hawkingPower(M) {
  return C.hbar * Math.pow(C.c, 6) / (15360 * Math.PI * C.G * C.G * M * M);
}

/**
 * Hawking evaporation lifetime:
 *   τ = 5120 π G² M³ / (ħ c⁴)
 * ≈ 2.1e67 yr for M☉ — the death clock of the black hole era.
 */
export function hawkingLifetime(M) {
  return 5120 * Math.PI * C.G * C.G * Math.pow(M, 3) / (C.hbar * Math.pow(C.c, 4));
}

/**
 * Photon energy shift by cosmological expansion: E_obs = E_emit/(1+z),
 * wavelength stretches by (1+z) — the "tired light" that ISN'T tired,
 * just stretched.
 */
export const cosmologicalPhotonStretch = (lambdaEmit, z) => lambdaEmit * (1 + z);

/**
 * CMB temperature at redshift z: T(z) = T0(1+z).
 * At z=1100: ≈ 3000 K — the universe glows orange like a furnace wall.
 */
export const cmbTempAtZ = (z, T0 = 2.72548) => T0 * (1 + z);

/**
 * Superluminal recession is NOT a violation of relativity: galaxies beyond
 * the Hubble radius recede faster than c because SPACE expands, while
 * nothing moves through space faster than c. Documented via the Hubble
 * sphere radius: r_H = c/H0.
 */
export const hubbleSphereRadius = (H0_SI) => C.c / H0_SI;

/**
 * Proper distance rate in FLRW: ḋ = H·d + v_pec. The first term is expansion
 * of space (can exceed c); the second is local motion (cannot).
 */
export const recessionVelocity = (H_SI, d) => H_SI * d;

export default {
  lorentzFactor, schwarzschildRadius, timeDilationFactor, isco,
  lightDeflectionRadians, gravitationalRedshift, hawkingTemperature,
  hawkingPower, hawkingLifetime, cmbTempAtZ,
};
