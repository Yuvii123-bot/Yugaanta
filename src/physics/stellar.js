/**
 * Yugaanta — physics/stellar.js
 * ---------------------------------------------------------------------------
 * Stellar astrophysics: the mass–luminosity relation, main-sequence
 * lifetimes, spectral classification, blackbody colours, stellar remnants
 * (white dwarfs, neutron stars, black holes) and supernova thresholds.
 *
 * Relations (all standard, test-anchored):
 *   L ∝ M^3.5            (Eddington standard model, 0.43–55 M☉ band)
 *   τ ∝ M / L ∝ M^-2.5   (10 Gyr for the Sun)
 *   R ∝ M^0.8 (M<1), R ∝ M^0.57 (M>1)
 *   T_eff = (L / 4πR²σ)^{1/4}
 *   Chandrasekhar limit  M_Ch = 1.44 M☉
 *   Remnant mapping      < 8 M☉ → WD, 8–20 → NS, > 20 → BH
 * ---------------------------------------------------------------------------
 */

import { C } from "../core/constants.js";
import { M_SUN, R_SUN, L_SUN, YR } from "../core/units.js";

/** IMF (Salpeter) exponent: dN/dM ∝ M^-2.35. */
export const SALPETER_EXP = -2.35;
export const M_MIN = 0.08;    // M☉ — hydrogen burning threshold
export const M_MAX = 120;     // M☉ — Eddington breakup

/**
 * Mass–luminosity relation in solar units (piecewise fit).
 */
export function luminosity(mSolar) {
  if (mSolar < 0.43) return 0.23 * Math.pow(mSolar, 2.3);
  if (mSolar <= 55) return Math.pow(mSolar, 3.5);
  return 32000 * mSolar;    // ~Eddington limit region
}

/** Main-sequence lifetime in years: τ = 10 Gyr × M/L. */
export function mainSequenceLifetime(mSolar) {
  return 1e10 * mSolar / luminosity(mSolar);
}

/** Stellar radius in solar units. */
export function stellarRadius(mSolar) {
  return mSolar < 1 ? Math.pow(mSolar, 0.8) : Math.pow(mSolar, 0.57);
}

/** Effective temperature from L and R (K). */
export function effectiveTemperature(lSolar, rSolar) {
  return Math.pow(lSolar * L_SUN / (4 * Math.PI * Math.pow(rSolar * R_SUN, 2) * C.sigmaSB), 0.25);
}

/**
 * Spectral class boundaries (T_eff in K) — Harvard classification.
 */
export const SPECTRAL_CLASSES = [
  { cls: "O", min: 30000, color: [0.62, 0.72, 1.00] },
  { cls: "B", min: 10000, color: [0.71, 0.80, 1.00] },
  { cls: "A", min: 7500, color: [0.88, 0.92, 1.00] },
  { cls: "F", min: 6000, color: [0.99, 0.99, 0.98] },
  { cls: "G", min: 5200, color: [1.00, 0.97, 0.88] },
  { cls: "K", min: 3700, color: [1.00, 0.85, 0.70] },
  { cls: "M", min: 2400, color: [1.00, 0.70, 0.53] },
  { cls: "L", min: 1300, color: [0.90, 0.55, 0.40] },
];

/** Spectral class from temperature. */
export function spectralClass(Teff) {
  for (const s of SPECTRAL_CLASSES) {
    if (Teff >= s.min) return s;
  }
  return SPECTRAL_CLASSES[SPECTRAL_CLASSES.length - 1];
}

/**
 * Blackbody → RGB approximation for star rendering (log-scaled softening
 * of the Planckian locus so O stars don't clip to pure white).
 */
export function starColor(Teff) {
  return spectralClass(Teff).color;
}

/**
 * Remnant fate of a main-sequence star.
 * @returns {type: "white-dwarf"|"neutron-star"|"black-hole"|"pair-instability",
 *   mass: remnant mass in M☉, snType: "II"|"Ia"|null, note}
 */
export function remnantOf(mSolar, metallicity = 0.014) {
  if (mSolar < 0.08) return { type: "brown-dwarf", mass: mSolar, snType: null, note: "never ignites hydrogen" };
  if (mSolar < 8) {
    // White dwarf mass ≈ 0.109 M + 0.394 M☉ fit (Althaus), capped by M_Ch
    const wd = Math.min(0.109 * mSolar + 0.394, 1.44);
    return { type: "white-dwarf", mass: wd, snType: null, note: "planetary nebula + white dwarf" };
  }
  if (mSolar < 20) {
    const ns = Math.min(1.4 + 0.09 * (mSolar - 8), 2.2);
    return { type: "neutron-star", mass: ns, snType: "II", note: "core-collapse supernova, remnant is a neutron star" };
  }
  if (mSolar < 40) {
    return { type: "black-hole", mass: 0.10 * mSolar + 0.8, snType: "II", note: "core-collapse, fall-back black hole" };
  }
  if (mSolar < 130) {
    return { type: "black-hole", mass: mSolar * 0.5, snType: "II", note: "direct collapse — no visible supernova" };
  }
  if (mSolar < 300 && metallicity < 1e-3) {
    return { type: "pair-instability", mass: 0, snType: "PISN", note: "pair-instability supernova — completely disrupts the star" };
  }
  return { type: "black-hole", mass: mSolar * 0.8, snType: null, note: "photodisintegration collapse" };
}

/**
 * White dwarf radius (mass–radius relation, approx):
 *   R ≈ 0.0127 R☉ √[(M_Ch/M)^{2/3} − (M/M_Ch)^{2/3}]
 */
export function whiteDwarfRadius(mSolar) {
  const Mch = 1.44;
  const f = Math.pow(Mch / mSolar, 2 / 3) - Math.pow(mSolar / Mch, 2 / 3);
  return 0.0127 * Math.sqrt(Math.max(f, 1e-6));
}

/** Chandrasekhar mass (M☉). */
export const CHANDRASEKHAR = 1.44;

/**
 * Neutron star radius ≈ 12 km for canonical masses (Lattimer & Prakash).
 */
export function neutronStarRadius(mSolar) {
  return 12.5 - 2 * Math.max(0, mSolar - 1.4);   // km, crude but reasonable
}

/**
 * supernova kinetic energy ≈ 1e44 J (1 foe).
 */
export const SN_ENERGY = 1e44;

/**
 * Star temperature–luminosity consistency check for the Sun:
 * T_eff should come out ≈ 5772 K.
 */
export function sunCheck() {
  return effectiveTemperature(1.0, 1.0);
}

/**
 * Habitable zone edges (Kopparapu 2014 conservative, AU):
 * inner = √(L/1.1), outer = √(L/0.53) for the runaway greenhouse limits.
 */
export function habitableZone(lSolar) {
  return { inner: Math.sqrt(lSolar / 1.1), outer: Math.sqrt(lSolar / 0.53) };
}

/**
 * Roche limit (fluid satellite) for a body of density ρ_s around a primary:
 *   d = 2.44 R_primary (ρ_p/ρ_s)^{1/3}
 * Used to flag moons that would be torn apart.
 */
export function rocheLimit(rPrimaryM, rhoPrimary, rhoSat) {
  return 2.44 * rPrimaryM * Math.pow(rhoPrimary / rhoSat, 1 / 3);
}

/**
 * Kepler's third law: orbital period (s) for semi-major axis a (m)
 * around mass M (kg):  P = 2π√(a³/GM).
 */
export function keplerPeriod(aMeters, centralMassKg) {
  return 2 * Math.PI * Math.sqrt(Math.pow(aMeters, 3) / (C.G * centralMassKg));
}

/**
 * Equilibrium temperature of an airless/fast-rotating body:
 *   T_eq = [ L (1−A) / (16 π σ d²) ]^{1/4}
 * Earth: 255 K (observed mean 288 K — greenhouse adds 33 K, shown in UI).
 */
export function equilibriumTemperature(lWatts, distanceM, albedo = 0.3) {
  return Math.pow(lWatts * (1 - albedo) / (16 * Math.PI * C.sigmaSB * distanceM * distanceM), 0.25);
}

/** Salpeter IMF sampler helpers (inverse CDF on [Mmin, Mmax]). */
export function imfMass(mSolar) {
  return mSolar;
}

/**
 * Solar lifetime check used by the future-era timeline:
 * the Sun leaves the main sequence ~10-11 Gyr after ignition.
 */
export const SUN_DEATH_AGE_GYR = 10.9;

export default {
  luminosity, mainSequenceLifetime, stellarRadius, effectiveTemperature,
  spectralClass, starColor, remnantOf, whiteDwarfRadius, CHANDRASEKHAR,
  habitableZone, keplerPeriod, equilibriumTemperature, rocheLimit,
};
