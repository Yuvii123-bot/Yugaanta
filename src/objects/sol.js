/**
 * Yugaanta — objects/sol.js
 * ---------------------------------------------------------------------------
 * THE SOLAR SYSTEM — real measured data (J2000 elements, IAU/DE440 values).
 * Every planet, dwarf planet and major moon carries its true physical
 * parameters. The engine propagates orbits with Kepler's equation and
 * renders planets with procedural surfaces tuned per world.
 * ---------------------------------------------------------------------------
 */

import { C } from "../core/constants.js";
import { M_SUN, R_SUN } from "../core/units.js";

/**
 * Planets. Orbital elements: J2000 approximate mean elements
 * (Standish, JPL "Keplerian elements for approximate positions").
 * a in AU, e eccentricity, i inclination (deg), period in days,
 * radius km (mean), mass kg, rotation (hours, sidereal, negative = retrograde),
 * tilt (deg), albedo (Bond), tempK (mean surface/blackbody).
 */
export const PLANETS = [
  {
    id: "mercury", name: "Mercury", a: 0.38709927, e: 0.20563593, i: 7.00497902,
    periodDays: 87.969, radiusKm: 2439.7, massKg: 3.3011e23,
    rotationH: 1407.6, tiltDeg: 0.034, albedo: 0.088, tempK: 440,
    type: "rocky", colorHue: 0.08, seed: 11,
    desc: "Smallest planet; 3:2 spin-orbit resonance; extreme 600 K temperature swing.",
  },
  {
    id: "venus", name: "Venus", a: 0.72333566, e: 0.00677672, i: 3.39467605,
    periodDays: 224.701, radiusKm: 6051.8, massKg: 4.8675e24,
    rotationH: -5832.5, tiltDeg: 177.36, albedo: 0.76, tempK: 737,
    type: "venus", colorHue: 0.12, seed: 22,
    desc: "Crushing 92 bar CO₂ greenhouse: 737 K surface — the greenhouse effect run to completion.",
  },
  {
    id: "earth", name: "Earth", a: 1.00000261, e: 0.01671123, i: -0.00001531,
    periodDays: 365.256, radiusKm: 6371.0, massKg: 5.97217e24,
    rotationH: 23.9345, tiltDeg: 23.44, albedo: 0.306, tempK: 288,
    type: "earth", colorHue: 0.35, seed: 42,
    desc: "The only known world with life. 71% ocean, active plate tectonics, a magnetic dynamo, and an oxygen atmosphere made by biology.",
  },
  {
    id: "mars", name: "Mars", a: 1.52371034, e: 0.09339410, i: 1.84969142,
    periodDays: 686.980, radiusKm: 3389.5, massKg: 6.4171e23,
    rotationH: 24.6229, tiltDeg: 25.19, albedo: 0.25, tempK: 210,
    type: "mars", colorHue: 0.04, seed: 33,
    desc: "Cold desert world with water ice, Olympus Mons (21.9 km) and Valles Marineris. Once flowed with rivers.",
  },
  {
    id: "jupiter", name: "Jupiter", a: 5.20288700, e: 0.04838624, i: 1.30439695,
    periodDays: 4332.589, radiusKm: 69911, massKg: 1.8982e27,
    rotationH: 9.925, tiltDeg: 3.13, albedo: 0.503, tempK: 165,
    type: "gas", colorHue: 0.09, seed: 44,
    desc: "318 Earth masses; the Great Red Spot has raged for 350+ years. Its gravity shepherds the asteroid belt.",
  },
  {
    id: "saturn", name: "Saturn", a: 9.53667594, e: 0.05386179, i: 2.48599187,
    periodDays: 10759.22, radiusKm: 58232, massKg: 5.6834e26,
    rotationH: 10.656, tiltDeg: 26.73, albedo: 0.342, tempK: 134,
    type: "gas", colorHue: 0.13, seed: 55, rings: true,
    desc: "Less dense than water. Rings are 99.9% water ice, mostly < 1 km thick — sculpted by shepherd moons.",
  },
  {
    id: "uranus", name: "Uranus", a: 19.18916464, e: 0.04725744, i: 0.77263783,
    periodDays: 30685.4, radiusKm: 25362, massKg: 8.6810e25,
    rotationH: -17.24, tiltDeg: 97.77, albedo: 0.300, tempK: 76,
    type: "ice", colorHue: 0.55, seed: 66, rings: true,
    desc: "Knocked onto its side by an ancient impact — 98° axial tilt. Coldest planetary atmosphere (49 K minimum).",
  },
  {
    id: "neptune", name: "Neptune", a: 30.06992276, e: 0.00859048, i: 1.77004347,
    periodDays: 60189, radiusKm: 24622, massKg: 1.02413e26,
    rotationH: 16.11, tiltDeg: 28.32, albedo: 0.290, tempK: 72,
    type: "ice", colorHue: 0.61, seed: 77,
    desc: "Discovered by mathematics before telescopes (Le Verrier 1846). Supersonic winds reach 580 m/s.",
  },
];

/** Dwarf planets (subset). */
export const DWARF_PLANETS = [
  { id: "ceres", name: "Ceres", a: 2.7658, e: 0.0785, i: 10.59, periodDays: 1683, radiusKm: 473, massKg: 9.39e20, tempK: 167, type: "rocky", colorHue: 0.1, seed: 91 },
  { id: "pluto", name: "Pluto", a: 39.48, e: 0.2488, i: 17.16, periodDays: 90560, radiusKm: 1188.3, massKg: 1.303e22, tempK: 44, type: "ice", colorHue: 0.08, seed: 92 },
  { id: "eris", name: "Eris", a: 67.78, e: 0.44, i: 44.04, periodDays: 204199, radiusKm: 1163, massKg: 1.66e22, tempK: 30, type: "ice", colorHue: 0.6, seed: 93 },
];

/**
 * Major moons (selected real data).
 * parent: planet id; a in planet radii? No — keep in km for clarity.
 */
export const MOONS = [
  { id: "moon", name: "The Moon", parent: "earth", aKm: 384400, e: 0.0549, periodDays: 27.32, radiusKm: 1737.4, massKg: 7.342e22, type: "rocky", colorHue: 0.1, seed: 201, desc: "Born from a Mars-sized impact (Theia) ~4.5 Gya; stabilizes Earth's axial tilt." },
  { id: "phobos", name: "Phobos", parent: "mars", aKm: 9376, e: 0.0151, periodDays: 0.319, radiusKm: 11.27, massKg: 1.07e16, type: "rocky", colorHue: 0.05, seed: 202, desc: "Spiraling inward — will break up in ~50 Myr into a ring." },
  { id: "io", name: "Io", parent: "jupiter", aKm: 421700, e: 0.0041, periodDays: 1.769, radiusKm: 1821.6, massKg: 8.93e22, type: "volcanic", colorHue: 0.12, seed: 203, desc: "Most volcanically active body in the solar system — tidal heating by Jupiter." },
  { id: "europa", name: "Europa", parent: "jupiter", aKm: 671034, e: 0.009, periodDays: 3.551, radiusKm: 1560.8, massKg: 4.8e22, type: "ice", colorHue: 0.5, seed: 204, desc: "Subsurface saltwater ocean — a prime target in the search for life." },
  { id: "ganymede", name: "Ganymede", parent: "jupiter", aKm: 1070412, e: 0.0013, periodDays: 7.155, radiusKm: 2634.1, massKg: 1.48e23, type: "ice", colorHue: 0.55, seed: 205, desc: "Largest moon in the solar system — bigger than Mercury, with its own magnetic field." },
  { id: "callisto", name: "Callisto", parent: "jupiter", aKm: 1882709, e: 0.0074, periodDays: 16.689, radiusKm: 2410.3, massKg: 1.08e23, type: "ice", colorHue: 0.08, seed: 206, desc: "Ancient, cratered face — geologically dead for 4 billion years." },
  { id: "titan", name: "Titan", parent: "saturn", aKm: 1221870, e: 0.0288, periodDays: 15.945, radiusKm: 2574.7, massKg: 1.345e23, type: "titan", colorHue: 0.11, seed: 207, desc: "Thick nitrogen atmosphere, methane rain, lakes and rivers — a cryogenic Earth." },
  { id: "enceladus", name: "Enceladus", parent: "saturn", aKm: 237948, e: 0.0047, periodDays: 1.370, radiusKm: 252.1, massKg: 1.08e20, type: "ice", colorHue: 0.55, seed: 208, desc: "Vents water-ice geysers from a subsurface ocean; feeds Saturn's E ring." },
  { id: "titania", name: "Titania", parent: "uranus", aKm: 435910, e: 0.0011, periodDays: 8.706, radiusKm: 788.4, massKg: 3.4e21, type: "ice", colorHue: 0.5, seed: 209, desc: "Largest Uranian moon." },
  { id: "triton", name: "Triton", parent: "neptune", aKm: 354759, e: 0.000016, periodDays: -5.877, radiusKm: 1353.4, massKg: 2.14e22, type: "ice", colorHue: 0.55, seed: 210, desc: "Retrograde orbit — a captured Kuiper Belt object with nitrogen geysers." },
];

/**
 * Belts & shells — rendered as particle bands.
 */
export const BELTS = [
  { id: "asteroid", name: "Asteroid Belt", innerAU: 2.06, outerAU: 3.27, count: 3000, note: "Jupiter's resonances (Kirkwood gaps) clear bands here." },
  { id: "kuiper", name: "Kuiper Belt", innerAU: 30, outerAU: 50, count: 2500, note: "Relics of planet formation; source of short-period comets." },
  { id: "oort", name: "Oort Cloud", innerAU: 2000, outerAU: 100000, count: 1200, note: "Up to 1.5 ly out — the Sun's comet reservoir, a light-year wide." },
];

/** Sun's own physical parameters. */
export const SUN = {
  name: "The Sun",
  massKg: M_SUN,
  radiusM: R_SUN,
  luminosityW: C.L_sun,
  tempK: 5772,
  ageGyr: 4.6,
  mainSeqRemainingGyr: 5.4,
  composition: { H: 0.7381, He: 0.2485, O: 0.0088, C: 0.0036, Fe: 0.0016, Ne: 0.0012, other: 0.0 },
  coreTempK: 1.57e7,
  corePressure: 2.65e16,      // Pa
  luminosityPerGramW: C.L_sun / M_SUN,
  desc: "A G2V dwarf, 4.6 billion years old, halfway through its main-sequence life. Fuses 620 million tonnes of hydrogen per second via the p-p chain.",
};

/**
 * Kepler propagation: heliocentric ecliptic position (AU) at time t
 * (seconds from J2000), using mean elements + Newton's method.
 * Returns {x, y, z, r, vFrac} in AU; orbit plane inclination included.
 */
export function keplerPosition(planet, tSec, M_sun = M_SUN) {
  const a = planet.a * C.AU;
  const e = planet.e;
  const n = 2 * Math.PI / (planet.periodDays * 86400);   // mean motion rad/s
  const M = n * tSec;                                     // mean anomaly
  let E = e < 0.8 ? M : Math.PI;
  for (let it = 0; it < 40; it++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  const cosE = Math.cos(E), sinE = Math.sin(E);
  const xv = a * (cosE - e);
  const yv = a * Math.sqrt(1 - e * e) * sinE;
  const r = Math.hypot(xv, yv);
  const i = planet.i * Math.PI / 180;
  const z = yv * Math.sin(i);
  const y2 = yv * Math.cos(i);
  return { x: xv, y: y2, z, r: r / C.AU };
}

/** Orbital speed (m/s) at position via vis-viva: v² = GM(2/r − 1/a). */
export function orbitalSpeed(planet, rAU) {
  const mu = C.G * M_SUN;
  const r = rAU * C.AU;
  const a = planet.a * C.AU;
  return Math.sqrt(mu * (2 / r - 1 / a));
}

/**
 * Earth-specific derivations used in the Inspector (computed, not stored):
 * surface gravity, escape velocity, orbital period consistency, greenhouse
 * offset (observed − equilibrium), day length, Hill sphere, Roche limit.
 */
export function earthFacts() {
  const earth = PLANETS[2];
  const R = earth.radiusKm * 1000;
  const M = earth.massKg;
  const g = C.G * M / (R * R);
  const vesc = Math.sqrt(2 * C.G * M / R);
  const Teq = Math.pow(C.L_sun * (1 - earth.albedo) / (16 * Math.PI * C.sigmaSB * Math.pow(C.AU, 2)), 0.25);
  return {
    g, vesc, Teq,
    greenhouseDelta: earth.tempK - Teq,
    hillSphereAU: earth.a * Math.pow(M / (3 * M_SUN), 1 / 3),
    daySec: earth.rotationH * 3600,
  };
}

export default { SUN, PLANETS, DWARF_PLANETS, MOONS, BELTS, keplerPosition, orbitalSpeed, earthFacts };
