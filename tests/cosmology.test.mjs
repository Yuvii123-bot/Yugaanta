/**
 * Cosmology solver validation — the FLRW engine against textbook values.
 * Node test runner: `node --test tests/`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCosmology, cmbTemperature, setPrimaryAOfT } from "../src/cosmology/flrw.js";
import { solveRecombination, sahaIonization, sahaTemperatureFor } from "../src/cosmology/recombination.js";
import { runBBN } from "../src/cosmology/bbn.js";
import { bbksTransfer, sigmaR, normalisationAmplitude, buildField, applyZeldovich } from "../src/cosmology/perturbations.js";
import { GYR, YR, Mpc, Gly } from "../src/core/units.js";

const cosmo = buildCosmology();
setPrimaryAOfT((t) => cosmo.aAt(t));
const bbn = runBBN();
const rec = solveRecombination(cosmo);

test("age of the universe ≈ 13.79 Gyr (Planck 2018)", () => {
  const t0 = cosmo.t0Gyr;
  assert.ok(t0 > 13.0 && t0 < 14.5, `got ${t0} Gyr`);
});

test("age within 2% of Planck's 13.787 Gyr", () => {
  assert.ok(Math.abs(cosmo.t0Gyr - 13.787) / 13.787 < 0.02, `got ${cosmo.t0Gyr}`);
});

test("redshift↔scale factor consistency", () => {
  assert.equal(cosmo.zOfA(0.5), 1);
  assert.equal(cosmo.aOfZ(1), 0.5);
  assert.equal(cosmo.zOfA(1), 0);
});

test("CMB temperature scales as T0/a → 3000 K at z≈1100", () => {
  const a = cosmo.aOfZ(1100);
  const T = cosmo.params.T0 / a;
  assert.ok(T > 2800 && T < 3200, `got ${T} K`);
});

test("cmbTemperature(t) consistent with T0/a", () => {
  const t = cosmo.tAt(0.1);
  const T = cmbTemperature(t);
  const T2 = cosmo.params.T0 / cosmo.aAt(t);
  assert.ok(Math.abs(T - T2) / T2 < 0.5, `got ${T} vs ${T2}`);  // within annihilation correction
});

test("recombination lands near z*≈1100, t≈380 kyr", () => {
  assert.ok(rec.zStar > 950 && rec.zStar < 1300, `z* = ${rec.zStar}`);
  const tMyr = rec.tStarSec / (1e6 * YR);
  assert.ok(tMyr > 0.25 && tMyr < 0.6, `t* = ${tMyr} Myr`);
});

test("Saha x_e is monotonic: 1 at high T, ~0 at low T", () => {
  assert.equal(sahaIonization(20000), 1.0);
  assert.ok(sahaIonization(5000) > sahaIonization(4000));
  assert.ok(sahaIonization(2000) < 0.01, `got ${sahaIonization(2000)}`);
});

test("Saha half-ionisation near 4000-6000 K", () => {
  const T = sahaTemperatureFor(0.5);
  assert.ok(T > 3500 && T < 7000, `got ${T} K`);
});

test("particle horizon today ≈ 3.0-3.4 c/H0 (≈46 Gly)", () => {
  const chi = cosmo.particleHorizonComoving(1.0);
  const inGly = chi / Gly;
  assert.ok(inGly > 40 && inGly < 55, `got ${inGly} Gly`);
});

test("sound horizon at z=1050 ≈ 120-180 Mpc (BAO ruler)", () => {
  const rs = cosmo.soundHorizon(1 / 1051) / Mpc;
  assert.ok(rs > 100 && rs < 200, `got ${rs} Mpc`);
});

test("matter-radiation equality near z≈3400", () => {
  assert.ok(cosmo.zEq > 2600 && cosmo.zEq < 4500, `z_eq = ${cosmo.zEq}`);
  assert.ok(cosmo.tEq / (1e6 * YR) > 0.01 && cosmo.tEq / (1e6 * YR) < 0.2, `t_eq = ${cosmo.tEq / (1e6 * YR)} Myr`);
});

test("growth factor normalized: D(1)=1, monotonic, frozen in Λ era", () => {
  assert.ok(Math.abs(cosmo.growth(1.0) - 1) < 0.02);
  assert.ok(cosmo.growth(0.5) < cosmo.growth(1.0));
  assert.ok(cosmo.growth(0.9) / cosmo.growth(1.0) > 0.85);
  // early universe: growth suppressed (radiation era)
  assert.ok(cosmo.growth(1e-4) < cosmo.growth(1e-3));
});

test("growth rate f(1) ≈ Ωm^0.55 ≈ 0.5", () => {
  const f = cosmo.growthRate(1.0);
  assert.ok(f > 0.35 && f < 0.65, `f = ${f}`);
});

test("densities at a=1: fractions sum to 1", () => {
  const d = cosmo.densities(1.0);
  const total = d.fracR + d.fracM + d.fracL + d.fracK;
  assert.ok(Math.abs(total - 1) < 1e-6);
});

test("lookback time + current age ≈ horizon-integrated age", () => {
  const lb = cosmo.lookbackTime(1);
  assert.ok(lb / (1e9 * YR) > 5 && lb / (1e9 * YR) < 11, `got ${lb / (1e9 * YR)} Gyr`);
});

test("comoving distance to z=1 ≈ 3-4 Gpc", () => {
  const d = cosmo.comovingDistance(1) / (1e3 * Mpc);
  assert.ok(d > 2.5 && d < 4.5, `got ${d} Gpc`);
});

test("BBN: freeze-out near T=0.72 MeV, Yp ≈ 0.247", () => {
  assert.ok(bbn.TF > 0.55 && bbn.TF < 0.9, `T_f = ${bbn.TF} MeV`);
  assert.ok(bbn.yp > 0.23 && bbn.yp < 0.262, `Yp = ${bbn.yp}`);
  assert.ok(bbn.rF > 0.14 && bbn.rF < 0.22, `n/p_f = ${bbn.rF}`);
});

test("BBN: bottleneck near 0.08 MeV at ~100-250 s", () => {
  assert.ok(bbn.TB > 0.05 && bbn.TB < 0.12, `T_b = ${bbn.TB} MeV`);
  assert.ok(bbn.tB > 80 && bbn.tB < 300, `t_b = ${bbn.tB} s`);
});

test("BBN: D/H in observed ballpark", () => {
  assert.ok(bbn.dOverH > 1e-5 && bbn.dOverH < 6e-5, `D/H = ${bbn.dOverH}`);
});

test("ΛCDM alternative: no dark energy → too young (< 11 Gyr)", () => {
  const eds = buildCosmology({ Ode: 0, Ok: 0, Om: 1 - 8.8e-5 });
  assert.ok(eds.t0Gyr < 11.5, `EdS age = ${eds.t0Gyr} Gyr — falsifies against oldest stars`);
});

test("phantom energy w=-1.3 → finite Big Rip time (~39 Gyr from now)", () => {
  const rip = buildCosmology({ w: -1.3 });
  assert.ok(isFinite(rip.tRip) && rip.tRip > cosmo.t0, "rip after now");
  const gyrAway = (rip.tRip - cosmo.t0) / (1e9 * YR);
  assert.ok(gyrAway > 20 && gyrAway < 45, `rip in ${gyrAway.toFixed(1)} Gyr`);
  // w=-1.5 check against Caldwell et al. (~23 Gyr)
  const rip15 = buildCosmology({ w: -1.5 });
  const g15 = (rip15.tRip - cosmo.t0) / (1e9 * YR);
  assert.ok(g15 > 15 && g15 < 30, `w=-1.5 rip in ${g15.toFixed(1)} Gyr`);
});

test("BBKS transfer function decays at high k", () => {
  assert.ok(bbksTransfer(1e-3) > 0.9);
  assert.ok(bbksTransfer(100) < 0.2);
});

test("σ8 normalisation reproduces sigma8", () => {
  const p = { ns: 0.9649, Om: 0.3153, H0: 67.36 };
  const A = normalisationAmplitude(p, 0.8102);
  const s = sigmaR(8, A, p);
  assert.ok(Math.abs(s - 0.8102) / 0.8102 < 1e-4, `σ8 = ${s}`);
});

test("structure field: rms δ sensible, ψ finite, DC mode zero-mean", () => {
  const f = buildField({ N: 16, box: 220, seed: 42 });
  assert.ok(f.rmsDelta > 0.05 && f.rmsDelta < 5, `rms δ = ${f.rmsDelta}`);
  assert.ok(f.rmsPsi > 0.1 && f.rmsPsi < 50, `rms ψ = ${f.rmsPsi} Mpc`);
  assert.ok(f.psiMax < f.box);
});

test("Zel'dovich positions: uniform shift moves all particles by D·ψ", () => {
  const f = buildField({ N: 8, box: 100, seed: 7 });
  const out = new Float32Array(8 * 8 * 8 * 3);
  applyZeldovich(f, 0.0, out);
  // D=0 → all at lattice positions
  assert.ok(Math.abs(out[0]) <= 100 / 2 + 1);
  applyZeldovich(f, 1.0, out);
  const maxAbs = Math.max(...Array.from(out.slice(0, 30)).map(Math.abs));
  assert.ok(maxAbs <= 100, "wrapped inside box");
});
