/**
 * Yugaanta — core/mathx.js
 * ---------------------------------------------------------------------------
 * Numerics toolkit: integration (RK4, Simpson), root finding, interpolation
 * tables, statistics, RNG. All pure functions, no dependencies, safe to use
 * in Node (the test suite) and in the browser.
 * ---------------------------------------------------------------------------
 */

/** Clamp x into [lo, hi]. */
export const clamp = (x, lo, hi) => x < lo ? lo : (x > hi ? hi : x);

/** Linear interpolation. */
export const lerp = (a, b, t) => a + (b - a) * t;

/** Smooth 0..1 easing (3rd-order Hermite). */
export const smoothstep = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

/** Quintic easing — smoother for camera transitions. */
export const smootherstep = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };

/**
 * Classic RK4 step for a first-order ODE system dy/dt = f(t, y).
 * `f` receives (t, y, out) and must write derivatives into `out`.
 * State may be a scalar (length-1 arrays are used internally).
 */
export function rk4Step(f, t, y, h) {
  const n = y.length;
  const k1 = new Float64Array(n), k2 = new Float64Array(n),
        k3 = new Float64Array(n), k4 = new Float64Array(n);
  const tmp = new Float64Array(n);
  f(t, y, k1);
  for (let i = 0; i < n; i++) tmp[i] = y[i] + 0.5 * h * k1[i];
  f(t + 0.5 * h, tmp, k2);
  for (let i = 0; i < n; i++) tmp[i] = y[i] + 0.5 * h * k2[i];
  f(t + 0.5 * h, tmp, k3);
  for (let i = 0; i < n; i++) tmp[i] = y[i] + h * k3[i];
  f(t + h, tmp, k4);
  for (let i = 0; i < n; i++) y[i] += h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  return y;
}

/**
 * Composite Simpson integration of f over [a, b] with n panels (n even).
 * O(n) evaluations, error O(h^4) — used for redshift-distance integrals.
 */
export function simpson(f, a, b, n = 1000) {
  if (n % 2 === 1) n += 1;
  const h = (b - a) / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const w = (i === 0 || i === n) ? 1 : (i % 2 === 1 ? 4 : 2);
    sum += w * f(a + i * h);
  }
  return sum * h / 3;
}

/**
 * Adaptive trapezoid with Richardson refinement — robust for integrands
 * with a near-singularity at an endpoint (e.g. growth-factor integral).
 */
export function trapezoidAdaptive(f, a, b, tol = 1e-8, maxIter = 20) {
  let n = 1;
  let h = b - a;
  let T = 0.5 * h * (f(a) + f(b));
  for (let iter = 1; iter <= maxIter; iter++) {
    let sum = 0;
    for (let i = 1; i <= n; i++) sum += f(a + (i - 0.5) * h);
    const T2 = 0.5 * T + 0.5 * h * sum;
    const err = Math.abs(T2 - T) / 3;
    T = T2;
    h /= 2;
    n *= 2;
    if (err < tol * Math.max(1, Math.abs(T))) break;
  }
  return T;
}

/** Bisection root find on [lo, hi] — assumes sign change. */
export function bisectRoot(f, lo, hi, tol = 1e-12, maxIter = 200) {
  let flo = f(lo), fhi = f(hi);
  if (flo * fhi > 0) return flo === 0 ? lo : (fhi === 0 ? hi : NaN);
  for (let i = 0; i < maxIter; i++) {
    const mid = 0.5 * (lo + hi);
    const fm = f(mid);
    if (fm === 0 || (hi - lo) < tol) return mid;
    if (flo * fm < 0) { hi = mid; fhi = fm; }
    else { lo = mid; flo = fm; }
  }
  return 0.5 * (lo + hi);
}

/** Newton-Raphson with bisection fallback bracket for robustness. */
export function newtonRoot(f, df, x0, tol = 1e-12, maxIter = 100) {
  let x = x0;
  for (let i = 0; i < maxIter; i++) {
    const fx = f(x);
    if (Math.abs(fx) < tol) return x;
    const d = df(x);
    if (d === 0 || !isFinite(d)) break;
    x -= fx / d;
  }
  return x;
}

/**
 * Monotone lookup table with linear interpolation, built from two arrays.
 * Assumes xs strictly increasing. get(x) clamps to ends.
 */
export class LookupTable {
  constructor(xs, ys) {
    this.xs = xs;
    this.ys = ys;
    this.n = xs.length;
    this.lo = xs[0];
    this.hi = xs[this.n - 1];
  }
  /** Index just below x (binary search). */
  index(x) {
    let lo = 0, hi = this.n - 1;
    if (x <= this.lo) return 0;
    if (x >= this.hi) return this.n - 2;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.xs[mid] <= x) lo = mid; else hi = mid;
    }
    return lo;
  }
  get(x) {
    const i = this.index(x);
    const x0 = this.xs[i], x1 = this.xs[i + 1];
    const t = (x - x0) / (x1 - x0);
    return this.ys[i] + (this.ys[i + 1] - this.ys[i]) * t;
  }
  /** Inverse lookup: for monotonically increasing ys, find x(y). */
  getInverse(y) {
    // Binary search over ys (assume increasing; fall back to scan otherwise)
    let lo = 0, hi = this.n - 1;
    const inc = this.ys[this.n - 1] > this.ys[0];
    if (inc) {
      if (y <= this.ys[0]) return this.xs[0];
      if (y >= this.ys[this.n - 1]) return this.xs[this.n - 1];
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (this.ys[mid] <= y) lo = mid; else hi = mid;
      }
    } else {
      if (y >= this.ys[0]) return this.xs[0];
      if (y <= this.ys[this.n - 1]) return this.xs[this.n - 1];
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (this.ys[mid] >= y) lo = mid; else hi = mid;
      }
    }
    const y0 = this.ys[lo], y1 = this.ys[lo + 1];
    const t = (y - y0) / (y1 - y0);
    return this.xs[lo] + (this.xs[lo + 1] - this.xs[lo]) * t;
  }
}

/**
 * Deterministic 32-bit RNG (mulberry32). The universe should be
 * reproducible: same seed → same structures, stars and planets.
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform: standard normal from a uniform RNG. */
export function gaussian(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Sample from a power-law distribution p(x) ∝ x^alpha on [lo, hi]. */
export function powerLawSample(rng, alpha, lo, hi) {
  const a1 = alpha + 1;
  const u = rng();
  if (Math.abs(a1) < 1e-9) return lo * Math.pow(hi / lo, u);
  return lo * Math.pow(1 + u * (Math.pow(hi / lo, a1) - 1), 1 / a1);
}

/** Mean of an array. */
export const mean = (arr) => arr.reduce((s, x) => s + x, 0) / arr.length;

/** Standard deviation of an array (population). */
export function stdev(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
}

/** Two-point RGB lerp with values in 0..1 floats. */
export function mixColor(c1, c2, t) {
  return [
    c1[0] + (c2[0] - c1[0]) * t,
    c1[1] + (c2[1] - c1[1]) * t,
    c1[2] + (c2[2] - c1[2]) * t,
  ];
}

/** Shortest-path angle difference in (-pi, pi]. */
export function angleDiff(a, b) {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/** e^x clamped to avoid overflow (used in Saha / BBN exponentials). */
export const expSafe = (x) => Math.exp(Math.min(x, 700));

/** Solve Kepler's equation M = E - e sin E by Newton iteration. */
export function solveKepler(M, e) {
  M = M % (2 * Math.PI);
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 30; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    const dE = f / fp;
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

/**
 * True anomaly from mean anomaly via Kepler's equation:
 *   ν = 2 atan2(√(1+e) sin(E/2), √(1−e) cos(E/2))
 */
export function trueAnomaly(M, e) {
  const E = solveKepler(M, e);
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
}

/** Log-space interpolation across [x0, x1] with parameter t∈[0,1]. */
export const logLerp = (x0, x1, t) => Math.exp(Math.log(x0) * (1 - t) + Math.log(x1) * t);

/** Map t∈[0,1] onto a log range. */
export const logMap = (t, lo, hi) => Math.exp(Math.log(lo) * (1 - t) + Math.log(hi) * t);

/** Inverse of logMap: where in [0,1] does x sit on a log scale. */
export const logNorm = (x, lo, hi) => Math.log(x / lo) / Math.log(hi / lo);
