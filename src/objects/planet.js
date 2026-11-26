/**
 * Yugaanta — objects/planet.js
 * ---------------------------------------------------------------------------
 * Planet physical model: computed properties (gravity, escape velocity,
 * equilibrium temperature, habitability, orbital details) and procedural
 * terrain generation seeds for the surface renderer.
 *
 * The terrain itself is drawn by GLSL shaders (render/planetview.js) using
 * domain-warped fBm — the numbers here parameterize the shaders and feed
 * the Inspector's physics readouts.
 * ---------------------------------------------------------------------------
 */

import { C } from "../core/constants.js";

/**
 * Compute the full physical dossier of a planet-like body.
 * @param {object} p {name, massKg, radiusKm, tempK, albedo, rotationH, aAU, starL, starTeff}
 */
export function planetDossier(p) {
  const R = p.radiusKm * 1000;
  const M = p.massKg;
  const g = C.G * M / (R * R);
  const vesc = Math.sqrt(2 * C.G * M / R);
  const density = M / (4 / 3 * Math.PI * R ** 3);
  const Teq = p.starL
    ? Math.pow(p.starL * (1 - p.albedo) / (16 * Math.PI * C.sigmaSB * Math.pow(p.aAU * C.AU, 2)), 0.25)
    : p.tempK;
  const daySec = Math.abs(p.rotationH) * 3600;
  const retrograde = p.rotationH < 0;
  // Habitability heuristics (documented as heuristic):
  const hz = p.starL ? { inner: Math.sqrt(p.starL / 1.1), outer: Math.sqrt(p.starL / 0.53) } : null;
  const inHz = hz ? p.aAU >= hz.inner && p.aAU <= hz.outer : false;
  const waterPlausible = inHz && p.massKg > 0.1 * C.M_earth && p.massKg < 6 * C.M_earth && p.tempK > 200;
  return {
    name: p.name,
    radiusM: R, massKg: M,
    gravity: g, gravityG: g / 9.81,
    escapeVelocity: vesc,
    densityKgM3: density,
    densityGcc: density / 1000,
    equilibriumTempK: Teq,
    observedTempK: p.tempK,
    greenhouseDelta: p.tempK - Teq,
    dayLengthH: p.rotationH, daySec, retrograde,
    albedo: p.albedo,
    orbitalPeriodDays: p.periodDays ?? null,
    inHabitableZone: inHz,
    waterPlausible,
    terrainSeed: p.seed ?? 1,
    terrainStyle: p.type ?? "rocky",
    colorHue: p.colorHue ?? 0.1,
  };
}

/**
 * Procedural terrain palette per world style (used by shaders):
 * ocean/deep, ocean/shore, lowland, upland, mountain, snow, atmosphere tint.
 */
export const TERRAIN_PALETTES = {
  earth: {
    oceanDeep: [0.008, 0.031, 0.13],
    oceanShore: [0.05, 0.16, 0.33],
    lowland: [0.10, 0.28, 0.10],
    upland: [0.32, 0.26, 0.14],
    mountain: [0.42, 0.36, 0.30],
    snow: [0.93, 0.95, 0.97],
    atmosphere: [0.35, 0.58, 1.0],
    clouds: 1.0,
    seaLevel: 0.52,
  },
  mars: {
    oceanDeep: [0.42, 0.20, 0.10],
    oceanShore: [0.52, 0.26, 0.12],
    lowland: [0.58, 0.30, 0.14],
    upland: [0.66, 0.38, 0.20],
    mountain: [0.75, 0.48, 0.28],
    snow: [0.92, 0.93, 0.95],
    atmosphere: [0.85, 0.62, 0.45],
    clouds: 0.06,
    seaLevel: 0.0,
  },
  venus: {
    oceanDeep: [0.75, 0.60, 0.30],
    oceanShore: [0.82, 0.68, 0.38],
    lowland: [0.85, 0.72, 0.42],
    upland: [0.88, 0.78, 0.48],
    mountain: [0.90, 0.82, 0.52],
    snow: [0.95, 0.88, 0.60],
    atmosphere: [0.95, 0.85, 0.55],
    clouds: 1.0,
    seaLevel: 0.0,
  },
  rocky: {
    oceanDeep: [0.30, 0.28, 0.26],
    oceanShore: [0.38, 0.34, 0.30],
    lowland: [0.42, 0.38, 0.34],
    upland: [0.50, 0.45, 0.40],
    mountain: [0.58, 0.53, 0.47],
    snow: [0.85, 0.85, 0.88],
    atmosphere: [0.4, 0.45, 0.5],
    clouds: 0.0,
    seaLevel: 0.0,
  },
  ice: {
    oceanDeep: [0.45, 0.58, 0.75],
    oceanShore: [0.55, 0.66, 0.82],
    lowland: [0.70, 0.78, 0.88],
    upland: [0.78, 0.85, 0.92],
    mountain: [0.85, 0.90, 0.95],
    snow: [0.95, 0.97, 0.99],
    atmosphere: [0.55, 0.70, 0.95],
    clouds: 0.25,
    seaLevel: 0.3,
  },
  gas: {
    oceanDeep: [0.75, 0.58, 0.40],
    oceanShore: [0.80, 0.62, 0.42],
    lowland: [0.85, 0.68, 0.46],
    upland: [0.90, 0.76, 0.55],
    mountain: [0.95, 0.85, 0.65],
    snow: [0.98, 0.92, 0.75],
    atmosphere: [0.85, 0.70, 0.50],
    clouds: 0.0,
    seaLevel: 0.0,
    banded: true,
  },
  volcanic: {
    oceanDeep: [0.85, 0.30, 0.08],
    oceanShore: [0.92, 0.42, 0.12],
    lowland: [0.25, 0.20, 0.18],
    upland: [0.35, 0.28, 0.24],
    mountain: [0.45, 0.38, 0.32],
    snow: [0.95, 0.75, 0.35],
    atmosphere: [0.9, 0.4, 0.2],
    clouds: 0.3,
    seaLevel: 0.35,
  },
  titan: {
    oceanDeep: [0.55, 0.42, 0.10],
    oceanShore: [0.62, 0.50, 0.16],
    lowland: [0.68, 0.55, 0.20],
    upland: [0.72, 0.60, 0.26],
    mountain: [0.76, 0.65, 0.32],
    snow: [0.85, 0.75, 0.45],
    atmosphere: [0.92, 0.75, 0.35],
    clouds: 0.6,
    seaLevel: 0.45,
  },
};

/**
 * Generate a small heightmap (for canvas-based previews).
 * Returns Float32Array of size×size in [0,1] — domain-warped fBm on a plane.
 */
export function generateHeightmap(seed, size = 256, style = "rocky") {
  // lightweight local noise (mirrors core/noise.js to keep this file standalone)
  let s = seed >>> 0;
  const rand = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const grid = new Float32Array(256 * 256);
  for (let i = 0; i < grid.length; i++) grid[i] = rand() * 2 - 1;
  const at = (x, y) => grid[((y & 255) * 256 + (x & 255))];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const noise2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = fade(x - xi), yf = fade(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return (a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf);
  };
  const out = new Float32Array(size * size);
  const sea = TERRAIN_PALETTES[style]?.seaLevel ?? 0.5;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const nx = px / size * 8, ny = py / size * 8;
      let v = 0, amp = 0.5, freq = 1;
      for (let o = 0; o < 5; o++) {
        v += amp * noise2(nx * freq + o * 17.3, ny * freq + o * 9.1);
        amp *= 0.5; freq *= 2;
      }
      out[py * size + px] = Math.max(0, Math.min(1, (v + 1) / 2 * (style === "mars" || style === "rocky" ? 1.4 : 1.0) - (style === "gas" ? 0 : 0)));
      void sea;
    }
  }
  return out;
}

export default { planetDossier, TERRAIN_PALETTES, generateHeightmap };
