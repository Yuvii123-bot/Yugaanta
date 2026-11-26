/**
 * Yugaanta — core/noise.js
 * ---------------------------------------------------------------------------
 * Deterministic procedural noise used for terrain, the CMB sky texture and
 * galaxy fields. Implements seeded value noise with smooth interpolation,
 * fractal Brownian motion (fBm), ridged noise and a 3D spherical-friendly
 * variant. Everything is pure JS — no textures required.
 * ---------------------------------------------------------------------------
 */

import { mulberry32 } from "./mathx.js";

/**
 * Permutation-based gradient-free value noise. We precompute a table of
 * 256 random values from the seed; lattice points hash into the table.
 */
export class ValueNoise {
  constructor(seed = 1234) {
    const rng = mulberry32(seed);
    this.perm = new Uint8Array(512);
    this.vals = new Float32Array(256);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) { p[i] = i; this.vals[i] = rng(); }
    // Fisher-Yates shuffle of the permutation
    for (let i = 255; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }
  hash(x, y, z) {
    return this.perm[(this.perm[(this.perm[x & 255] + (y & 255)) & 255] + (z & 255)) & 255];
  }
  /** Fade curve (quintic) — C2-continuous. */
  static fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  /** 3D value noise in [-1, 1]. */
  noise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = ValueNoise.fade(xf), v = ValueNoise.fade(yf), w = ValueNoise.fade(zf);
    const v000 = this.vals[this.hash(xi, yi, zi)];
    const v100 = this.vals[this.hash(xi + 1, yi, zi)];
    const v010 = this.vals[this.hash(xi, yi + 1, zi)];
    const v110 = this.vals[this.hash(xi + 1, yi + 1, zi)];
    const v001 = this.vals[this.hash(xi, yi, zi + 1)];
    const v101 = this.vals[this.hash(xi + 1, yi, zi + 1)];
    const v011 = this.vals[this.hash(xi, yi + 1, zi + 1)];
    const v111 = this.vals[this.hash(xi + 1, yi + 1, zi + 1)];
    const x00 = v000 + (v100 - v000) * u;
    const x10 = v010 + (v110 - v010) * u;
    const x01 = v001 + (v101 - v001) * u;
    const x11 = v011 + (v111 - v011) * u;
    const y0 = x00 + (x10 - x00) * v;
    const y1 = x01 + (x11 - x01) * v;
    return (y0 + (y1 - y0) * w) * 2 - 1;
  }
  /** 2D convenience wrapper (z fixed at 0). */
  noise2(x, y) { return this.noise3(x, y, 0); }
}

/**
 * Fractal Brownian motion: sum of octaves of value noise with geometric
 * amplitude falloff. `lacunarity` 2 and `gain` 0.5 give classic fBm.
 */
export class FBM {
  constructor(seed = 1234, octaves = 5, lacunarity = 2.0, gain = 0.5) {
    this.layers = [];
    for (let i = 0; i < octaves; i++) {
      this.layers.push({
        n: new ValueNoise(seed + i * 1013904223),
        freq: Math.pow(lacunarity, i),
        amp: Math.pow(gain, i),
      });
    }
    this.norm = 1 / this.layers.reduce((s, L) => s + L.amp, 0);
  }
  /** fBm in [-1, 1] at 3D point (use on spheres via x,y,z to avoid seams). */
  fbm3(x, y, z) {
    let sum = 0;
    for (const L of this.layers) sum += L.amp * L.n.noise3(x * L.freq, y * L.freq, z * L.freq);
    return sum * this.norm;
  }
  fbm2(x, y) { return this.fbm3(x, y, 0); }
  /** Ridged variant: |noise| sharpened — good for mountain chains. */
  ridged3(x, y, z) {
    let sum = 0;
    for (const L of this.layers) {
      const n = 1 - Math.abs(L.n.noise3(x * L.freq, y * L.freq, z * L.freq));
      sum += L.amp * n * n;
    }
    return (sum * this.norm) * 2 - 1;
  }
  /** Billowed variant (abs of noise) — good for cloud puffs. */
  billow3(x, y, z) {
    let sum = 0;
    for (const L of this.layers) sum += L.amp * (Math.abs(L.n.noise3(x * L.freq, y * L.freq, z * L.freq)) * 2 - 1);
    return sum * this.norm;
  }
}

/**
 * Domain-warped fBm: the classic technique for believable continents —
 * sample fBm at a position displaced by another fBm field.
 */
export function warpedFbm(fbm, wx, wy, wz, warpStrength = 1.0) {
  const qx = fbm.fbm3(wx + 13.1, wy + 7.7, wz + 3.3);
  const qy = fbm.fbm3(wx + 91.2, wy + 51.9, wz + 27.5);
  const qz = fbm.fbm3(wx + 41.6, wy + 29.2, wz + 17.1);
  return fbm.fbm3(
    wx + warpStrength * qx,
    wy + warpStrength * qy,
    wz + warpStrength * qz
  );
}

/**
 * Gaussian random field smoothing helper — 1D kernel from a Gaussian.
 * (Used to smooth canvas-generated textures before upload.)
 */
export function gaussianKernel1D(sigma = 2) {
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float64Array(2 * r + 1);
  let s = 0;
  for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-i * i / (2 * sigma * sigma)); s += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= s;
  return k;
}
