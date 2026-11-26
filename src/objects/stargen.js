/**
 * Yugaanta — objects/stargen.js
 * ---------------------------------------------------------------------------
 * Procedural star & system generator — populates the galaxy view with
 * physically-plausible stars beyond the real catalog. Uses the Salpeter
 * IMF for masses, empirical relations for luminosity/radius/temperature,
 * and a metallicity-based planet occurrence estimate.
 * ---------------------------------------------------------------------------
 */

import { mulberry32, powerLawSample } from "../core/mathx.js";
import { luminosity, stellarRadius, effectiveTemperature, mainSequenceLifetime, habitableZone } from "../physics/stellar.js";
import { M_MIN, M_MAX } from "../physics/stellar.js";

/**
 * Generate a star from a seed.
 */
export function generateStar(seed) {
  const rng = mulberry32(seed);
  const m = powerLawSample(rng, -2.35, M_MIN, M_MAX);   // M☉
  const L = luminosity(m);
  const R = stellarRadius(m);
  const Teff = effectiveTemperature(L, R);
  const metallicity = 0.5 + rng() * 1.4;                // [Fe/H] proxy ×solar
  // Planet occurrence scales with metallicity (Fischer & Valenti 2005)
  const planetOccurrence = Math.min(0.9, 0.08 + 0.55 * Math.log10(Math.max(metallicity, 0.1)) + rng() * 0.35);
  const hz = habitableZone(L);
  const binary = rng() < 0.3;
  return {
    seed,
    name: null,           // filled by caller for catalog stars
    massSolar: m,
    luminositySolar: L,
    radiusSolar: R,
    teffK: Teff,
    lifetimeGyr: mainSequenceLifetime(m) / 1e9,
    metallicity,
    hasPlanets: rng() < planetOccurrence,
    planetCount: hasPlanets ? 1 + Math.floor(rng() * 8) : 0,
    hz,
    binary,
    ageGyr: rng() * Math.min(13.7, mainSequenceLifetime(m) / 1e9 * 1.05),
  };
}

/**
 * Procedural planetary system for a generated star.
 * Planets placed from the snow line outward, plus some inside.
 * @returns [{aAU, massEarth, radiusEarth, type, tempK}]
 */
export function generateSystem(star, seedOffset = 0) {
  const rng = mulberry32((star.seed + seedOffset * 7919) >>> 0);
  const snowLine = 2.7 * Math.sqrt(star.luminositySolar);   // AU (Hayashi)
  const planets = [];
  let a = 0.04 * Math.sqrt(star.luminositySolar) + rng() * 0.03;
  for (let i = 0; i < star.planetCount; i++) {
    const massEarth = a < snowLine
      ? 0.1 + rng() * rng() * 20              // rocky/super-Earth regime
      : 5 + Math.pow(rng(), 2) * 400;         // giants beyond snow line
    const radiusEarth = massEarth < 2
      ? 0.8 + massEarth * 0.25
      : Math.pow(massEarth, 0.27) * 1.1;      // bulk density flattens
    const Teq = 278 * Math.pow(star.luminositySolar, 0.25) / Math.sqrt(a);
    const type = massEarth > 30 ? "gas"
      : a >= snowLine ? "ice"
      : Teq > 600 ? "venus" : "rocky";
    planets.push({
      aAU: a,
      massEarth,
      radiusEarth,
      type,
      tempK: Teq,
      eccentricity: rng() * 0.25,
      seed: (star.seed + i * 101) >>> 0,
    });
    a *= 1.5 + rng() * 0.9;                   // geometric spacing (Titius-Bode-ish)
    if (a > 40 * Math.sqrt(star.luminositySolar)) break;
  }
  return planets;
}

/**
 * Local stellar neighborhood generator (for the galaxy view "sky"):
 * N stars with 3D positions (kpc), magnitudes and types in a smooth
 * distribution around the Sun's location (8.2 kpc from galactic center).
 */
export function generateNeighborhood(seed = 9001, count = 2000) {
  const rng = mulberry32(seed);
  const stars = [];
  for (let i = 0; i < count; i++) {
    const s = generateStar(rng() * 4294967295 >>> 0);
    // disk distribution: exponential in R, gaussian in z
    const r = 8.2 + (rng() - 0.5) * 4;
    const th = rng() * Math.PI * 2;
    const z = 0.35 * (rng() - 0.5) * 2;
    stars.push({
      ...s,
      xKpc: r * Math.cos(th),
      yKpc: r * Math.sin(th),
      zKpc: z,
      name: i < 120 ? catalogName(rng) : null,
    });
  }
  return stars;
}

/** Mythic-ish procedural names for catalog stars. */
const NAME_PARTS_A = ["Al", "Be", "Ce", "De", "E", "Fa", "Ga", "Ha", "Io", "Ka", "Lo", "Mi", "No", "O", "Pa", "Qe", "Ra", "Sa", "Ta", "U", "Va", "We", "Xa", "Ya", "Za"];
const NAME_PARTS_B = ["rakis", "llora", "menta", "dris", "vora", "nis", "thea", "lis", "rion", "phus", "dane", "ros", "tara", "via", "gus", "mer", "tide", "lara", "cene", "dor"];
function catalogName(rng) {
  const a = NAME_PARTS_A[Math.floor(rng() * NAME_PARTS_A.length)];
  const b = NAME_PARTS_B[Math.floor(rng() * NAME_PARTS_B.length)];
  const n = 100 + Math.floor(rng() * 8900);
  return `${a}${b} ${n}`;
}

export default { generateStar, generateSystem, generateNeighborhood };
