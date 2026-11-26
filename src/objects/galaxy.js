/**
 * Yugaanta — objects/galaxy.js
 * ---------------------------------------------------------------------------
 * Galaxy models: dark matter halos (NFW profile), rotation curves with
 * baryonic components, the Tully-Fisher relation, the M–σ relation, and
 * a procedural galaxy star-field generator (spiral arms, bulge, halo, dust).
 *
 * WHY dark matter is unavoidable (shown in the UI):
 *   Newtonian prediction from visible mass alone: v(r) declines as r^-1/2
 *   beyond the disk. Observed: flat at ~220 km/s. The NFW halo closes the
 *   gap — and the same dark matter that flattens rotation curves seeds the
 *   cosmic web (perturbations.js).
 * ---------------------------------------------------------------------------
 */

import { C } from "../core/constants.js";

/**
 * NFW halo (Navarro–Frenk–White):
 *   ρ/ρs = 1/[x(1+x)²],  x = r/rs
 *   M(<x) = M200 · f(x)/f(c),  f(x) = ln(1+x) − x/(1+x)
 */
export function nfwMass(rMpc, M200, c = 10, rvirMpc = 0.2) {
  const rs = rvirMpc / c;
  const x = Math.max(rMpc / rs, 1e-6);
  const f = (t) => Math.log1p(t) - t / (1 + t);
  return M200 * f(x) / f(c);
}

/** Circular velocity (km/s) of an NFW halo. */
export function nfwCircularVelocity(rMpc, M200, c = 10, rvirMpc = 0.2) {
  const mass = nfwMass(rMpc, M200, c, rvirMpc);   // M☉
  const Gk = 4.30091e-9;   // (km/s)² Mpc / M☉
  return Math.sqrt(Gk * mass / Math.max(rMpc, 1e-9));
}

/**
 * Milky Way rotation curve: halo + exponential disk + bulge + gas.
 * Returns v_c(r) in km/s — flat at ~220-240 km/s beyond the disk,
 * matching observation (Rubin 1970s, Gaia today).
 */
export function milkyWayRotation(rKpc) {
  const r = Math.max(rKpc, 0.05) / 1000;   // → Mpc
  const vHalo = nfwCircularVelocity(r, 1.0e12, 12, 0.25);
  // Exponential disk: v_d² = 4πGΣ0Rd·y²[I0K0 − I1K1], y=r/2Rd
  const Rd = 3.5e-3;   // 3.5 kpc in Mpc
  const Mdisk = 6.5e10;
  const y = r / (2 * Rd);
  const bessel = besselPair(y);
  const Gk = 4.30091e-9;
  const Sigma0 = Mdisk / (2 * Math.PI * Rd * Rd);
  const vd2 = 4 * Math.PI * Gk * Sigma0 * Rd * y * y * bessel;
  const vDisk = Math.sqrt(Math.max(vd2, 0));
  // Bulge (Hernquist): v_b² = GM_b r/(r+a)²
  const Mb = 1.5e10, aB = 0.7e-3;
  const vb = Math.sqrt(Gk * Mb * r / Math.pow(r + aB, 2));
  return Math.sqrt(vHalo * vHalo + vDisk * vDisk + vb * vb);
}

/** Bessel pair I0(y)K0(y) − I1(y)K1(y) for the exponential disk.
 *  I0,I1 via convergent series; K0,K1 via their integral definitions
 *  K_ν(x) = ∫₀^∞ e^{−x cosh t} cosh(νt) dt (Simpson, converges fast). */
function besselPair(y) {
  if (y < 0.1) return y * y / 2 * (1 + y * y / 4);
  if (y > 25) return 1;
  // I0, I1 (series)
  let i0 = 1, term = 1;
  for (let k = 1; k < 30; k++) { term *= Math.pow(y / 2, 2) / (k * k); i0 += term; if (term < 1e-16) break; }
  let i1 = y / 2; term = y / 2;
  for (let k = 1; k < 30; k++) { term *= Math.pow(y / 2, 2) / (k * (k + 1)); i1 += term; if (term < 1e-16) break; }
  // K0, K1 (numerical quadrature of the integral definition)
  const K = (nu) => {
    let sum = 0;
    const n = 600;
    const tmax = 30;
    for (let i = 0; i <= n; i++) {
      const t = tmax * i / n;
      const w = (i === 0 || i === n) ? 0.5 : (i % 2 === 1 ? 2 : 1);
      const ch = Math.cosh(Math.min(t, 700));
      const integrand = Math.exp(-y * Math.min(ch, 700)) * Math.pow(ch, nu);
      sum += w * integrand;
    }
    return sum * (tmax / n) * (2 / 3);
  };
  const k0 = K(0), k1 = K(1);
  return Math.max(i0 * k0 - i1 * k1, 0);
}

/**
 * Tully–Fisher: v_flat ≈ 220 (L/L☉)^0.25 × (0.014/z)^0.1 km/s —
 * the empirical law dark matter made famous.
 */
export function tullyFisherVelocity(lSolar) {
  return 220 * Math.pow(Math.max(lSolar, 1e5), 0.25) * Math.pow(0.014 / 0.014, 0.1);
}

/**
 * M–σ relation (Kormendy & Ho 2013):
 *   log10(M_BH/M☉) = 8.49 + 4.384 log10(σ/200 km/s)
 * The supermassive black hole grows WITH its galaxy's bulge — co-evolution.
 */
export function mSigma(M_sigmaKms) {
  return Math.pow(10, 8.49 + 4.384 * Math.log10(Math.max(M_sigmaKms, 1) / 200));
}

/** Milky Way central black hole (GRAVITY Collaboration). */
export const SGR_A_STAR_MASS = 4.297e6;   // M☉

/** Known giant galaxies. */
export const GALAXIES = [
  { name: "Milky Way", type: "SBbc", massMsun: 1.15e12, stellarMass: 6.4e10, radiusKpc: 26, bhMass: SGR_A_STAR_MASS, distLy: 0, rotVel: 233, arms: 4, bar: true, seed: 7, desc: "Our barred spiral — 100-400 billion stars, one of ~2 trillion galaxies." },
  { name: "Andromeda (M31)", type: "SA(s)b", massMsun: 1.5e12, stellarMass: 1.5e11, radiusKpc: 35, bhMass: 1.4e8, distLy: 2.537e6, rotVel: 260, arms: 2, bar: false, seed: 8, desc: "The nearest large galaxy; inbound at 110 km/s for a ~4.5 Gyr merger." },
  { name: "Sombrero (M104)", type: "SA(s)a", massMsun: 8e11, stellarMass: 8e10, radiusKpc: 20, bhMass: 1e9, distLy: 31.1e6, rotVel: 350, arms: 0, bar: false, seed: 9, desc: "Bulge-dominated elliptical-spiral hybrid with a giant black hole." },
  { name: "Triangulum (M33)", type: "SA(s)cd", massMsun: 5e10, stellarMass: 6e9, radiusKpc: 9, bhMass: 0, distLy: 2.73e6, rotVel: 110, arms: 3, bar: false, seed: 10, desc: "Flocculent spiral; smallest of the Local Group's big three." },
  { name: "Whirlpool (M51)", type: "SA(s)bc", massMsun: 1.6e11, stellarMass: 3.2e10, radiusKpc: 12, bhMass: 4e7, distLy: 23e6, rotVel: 210, arms: 2, bar: false, seed: 11, desc: "Grand-design spiral sculpted by its interacting companion NGC 5195." },
  { name: "M87", type: "E0-1 pec", massMsun: 2.4e12, stellarMass: 1.2e12, radiusKpc: 40, bhMass: 6.5e9, distLy: 53.5e6, rotVel: 350, arms: 0, bar: false, seed: 12, desc: "Hosts the first black hole ever photographed (EHT 2019) and a 5000 ly jet." },
];

/**
 * Procedural galaxy star-field generator — populates positions/colors for
 * the galaxy renderer. Seeds make each galaxy unique but reproducible.
 */
export function generateGalaxyStars(params, count = 60000) {
  const { seed, arms = 2, bar = false, type = "spiral", radiusKpc = 20 } = params;
  let s = seed >>> 0;
  const rand = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);

  const R = radiusKpc;
  const pitch = 0.35;   // spiral pitch angle (radians)
  for (let i = 0; i < count; i++) {
    const u = rand();
    let x, y, z, ageT;
    if (u < 0.16) {
      // bulge — Hernquist-ish spheroid
      const r = R * 0.10 * Math.pow(rand(), 0.7);
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(2 * rand() - 1);
      x = r * Math.sin(ph) * Math.cos(th);
      y = r * Math.sin(ph) * Math.sin(th) * 0.75;
      z = r * Math.cos(ph) * 0.6;
      ageT = 1;   // old red population
    } else if (u < 0.18) {
      // halo — sparse, extended
      const r = R * (0.3 + 1.6 * Math.pow(rand(), 1.6));
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(2 * rand() - 1);
      x = r * Math.sin(ph) * Math.cos(th);
      y = r * Math.cos(ph);
      z = r * Math.sin(ph) * Math.sin(th);
      ageT = 1;
    } else {
      // disk with spiral arms: log-spiral + scatter
      const t = Math.pow(rand(), 0.62);          // radial density profile
      const r = R * 0.12 + t * R * 0.95;
      const armIndex = Math.floor(rand() * arms);
      const baseAngle = (2 * Math.PI * armIndex) / arms + Math.log(r / R + 0.3) / pitch;
      const scatter = gauss() * (0.16 + 0.24 * (1 - t));
      const ang = bar && r < R * 0.28
        ? gauss() * 0.4
        : baseAngle + scatter;
      x = r * Math.cos(ang) + gauss() * R * 0.02;
      z = r * Math.sin(ang) + gauss() * R * 0.02;
      y = gauss() * R * 0.016 * (1.4 - t);       // disk thickness
      ageT = t < 0.6 ? 0.25 : 0.7;               // arms young/blue, outer older
    }
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    // colour: young population blue-white, old yellow-red, with HII sparks
    let cr, cg, cb;
    if (rand() < 0.03) { cr = 1.0; cg = 0.45; cb = 0.55; }         // HII region pink
    else if (ageT < 0.4) { cr = 0.62 + rand() * 0.2; cg = 0.72 + rand() * 0.18; cb = 1.0; }
    else { cr = 1.0; cg = 0.85 - rand() * 0.15; cb = 0.65 - rand() * 0.15; }
    col[i * 3] = cr; col[i * 3 + 1] = cg; col[i * 3 + 2] = cb;
    size[i] = 0.4 + rand() * 1.6;
  }
  return { pos, col, size, count };
}

export default { nfwMass, nfwCircularVelocity, milkyWayRotation, mSigma, tullyFisherVelocity, GALAXIES, generateGalaxyStars };
