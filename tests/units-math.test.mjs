/**
 * Units, math utilities and FFT validation.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { C } from "../src/core/constants.js";
import {
  clamp, lerp, rk4Step, simpson, bisectRoot, solveKepler, trueAnomaly,
  mulberry32, gaussian, LookupTable, logMap, logNorm,
} from "../src/core/mathx.js";
import { fft1d } from "../src/core/fft.js";
import { ValueNoise, FBM } from "../src/core/noise.js";
import { formatTime, formatDist, formatMass, sci, trim, YR } from "../src/core/units.js";
import { photonDensity, planckBlambda, wienPeak } from "../src/core/constants.js";
import { zToA, aToZ } from "../src/core/constants.js";

test("clamp and lerp", () => {
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(clamp(-1, 0, 1), 0);
  assert.equal(lerp(0, 10, 0.5), 5);
});

test("RK4 integrates dy/dt = y → e^t", () => {
  const y = [1];
  const f = (t, yv, out) => { out[0] = yv[0]; };
  for (let i = 0; i < 100; i++) rk4Step(f, i * 0.01, y, 0.01);
  assert.ok(Math.abs(y[0] - Math.E) < 1e-6, `got ${y[0]}`);
});

test("Simpson integrates x² over [0,3] → 9", () => {
  assert.ok(Math.abs(simpson((x) => x * x, 0, 3, 100) - 9) < 1e-10);
});

test("bisection root find", () => {
  const r = bisectRoot((x) => x * x - 2, 0, 2);
  assert.ok(Math.abs(r - Math.SQRT2) < 1e-10);
});

test("Kepler solver: circular orbit E=M", () => {
  assert.ok(Math.abs(solveKepler(1.0, 0) - 1.0) < 1e-12);
});

test("Kepler solver: e=0.9 round trip", () => {
  const M = 2.5;
  const E = solveKepler(M, 0.9);
  const back = E - 0.9 * Math.sin(E);
  assert.ok(Math.abs(back - M) < 1e-9);
  const nu = trueAnomaly(M, 0.9);
  assert.ok(isFinite(nu));
});

test("RNG deterministic, gaussian standard-ish", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  assert.equal(a(), b());
  const rng = mulberry32(7);
  let s = 0;
  for (let i = 0; i < 2000; i++) s += gaussian(rng);
  assert.ok(Math.abs(s / 2000) < 0.1, `mean = ${s / 2000}`);
});

test("LookupTable forward and inverse", () => {
  const xs = [0, 1, 2, 3, 4, 5];
  const ys = xs.map((x) => x * x);
  const t = new LookupTable(xs, ys);
  // linear interp of a quadratic: within segment tolerance
  assert.ok(Math.abs(t.get(2.5) - 6.25) < 0.5, `got ${t.get(2.5)}`);
  assert.ok(Math.abs(t.get(2.5) - 6.5) < 1e-9);
  assert.ok(Math.abs(t.getInverse(4) - 2) < 1e-9);
});

test("logMap/logNorm round trip", () => {
  const x = logMap(0.25, 10, 1000);
  assert.ok(Math.abs(logNorm(x, 10, 1000) - 0.25) < 1e-9);
});

test("FFT: transform of a pure sinusoid recovers a single bin", () => {
  const n = 64;
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = Math.cos(2 * Math.PI * 4 * i / n);
  fft1d(re, im, false);
  // bin 4 and bin 60 should be n/2; others ≈ 0
  assert.ok(Math.abs(re[4] - 32) < 1e-9, `re[4]=${re[4]}`);
  assert.ok(Math.abs(re[60] - 32) < 1e-9);
  let maxOther = 0;
  for (let i = 0; i < n; i++) if (i !== 4 && i !== 60) maxOther = Math.max(maxOther, Math.abs(re[i]));
  assert.ok(maxOther < 1e-8, `leak = ${maxOther}`);
});

test("FFT round trip", () => {
  const n = 32;
  const re = new Float64Array(n), im = new Float64Array(n);
  const re0 = new Float64Array(n);
  for (let i = 0; i < n; i++) { re0[i] = Math.sin(i) * 3 + i * 0.1; re[i] = re0[i]; }
  fft1d(re, im, false);
  fft1d(re, im, true);
  for (let i = 0; i < n; i++) assert.ok(Math.abs(re[i] - re0[i]) < 1e-9);
});

test("noise: deterministic and bounded", () => {
  const n1 = new ValueNoise(5);
  const n2 = new ValueNoise(5);
  assert.equal(n1.noise3(1.5, 2.5, 3.5), n2.noise3(1.5, 2.5, 3.5));
  const fbm = new FBM(9);
  for (let i = 0; i < 200; i++) {
    const v = fbm.fbm3(i * 0.1, i * 0.23, i * 0.37);
    assert.ok(v >= -1.001 && v <= 1.001, `v = ${v}`);
  }
});

test("formatTime spans 143 orders of magnitude", () => {
  assert.ok(formatTime(1e-43).includes("10"));
  assert.ok(formatTime(1).includes("s"));
  assert.ok(formatTime(YR * 13.787e9).includes("Gyr"));
  assert.ok(formatTime(YR * 1e100).includes("10^"));
});

test("formatDist formats metres to Gly", () => {
  assert.ok(formatDist(1).includes("m"));
  assert.ok(formatDist(C.AU).includes("AU"));
  assert.ok(formatDist(1e26).includes("Gly"));
});

test("formatMass uses M☉ for stars", () => {
  assert.ok(formatMass(2e30).includes("M☉"));
});

test("sci() renders superscripts", () => {
  assert.ok(sci(3.2e-35).includes("×10"));
});

test("trim trims to significant digits", () => {
  assert.equal(trim(1.23456, 3), "1.23");
});

test("photon density today ≈ 411 /cm³", () => {
  const n = photonDensity(2.72548);   // per m³
  assert.ok(Math.abs(n / 1e6 - 411) / 411 < 0.05, `got ${n / 1e6} /cm³`);
});

test("Wien peak of the CMB ≈ 1.06 mm", () => {
  const lam = wienPeak(2.72548);
  assert.ok(Math.abs(lam - 1.063e-3) < 2e-5, `got ${lam} m`);
});

test("Planck spectrum peaks at the Wien wavelength", () => {
  const T = 300;
  const peak = wienPeak(T);
  const B = (lam) => planckBlambda(lam, T);
  const atPeak = B(peak);
  const off = B(peak * 0.7);
  assert.ok(atPeak > off * 0.9, "peak is a maximum-ish");
  assert.ok(B(peak) > B(peak * 2), "decays at long λ");
});

test("z↔a conversions", () => {
  assert.equal(zToA(0), 1);
  assert.equal(aToZ(1), 0);
  assert.equal(zToA(1100), 1 / 1101);
});
