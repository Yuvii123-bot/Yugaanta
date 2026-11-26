/**
 * Yugaanta — cosmology/perturbations.js
 * ---------------------------------------------------------------------------
 * STRUCTURE FORMATION — how 1e-5 ripples in the CMB become galaxies.
 *
 * Pipeline (all stages test-verified):
 *
 *  1. ΛCDM matter power spectrum with the BBKS transfer function:
 *        P(k) = A k^{ns} T²(k),
 *        T(q) = ln(1+2.34q)/(2.34q) · [1+3.89q+(16.1q)²+(5.46q)³+(6.71q)⁴]^{−1/4},
 *        q = k / (Ωm h² Mpc⁻¹)
 *     normalised so that σ(8 Mpc/h) = σ8 = 0.8102 (Planck 2018).
 *
 *  2. Gaussian random field δ(x) on a periodic box: Hermitian complex modes
 *     δ_k drawn with ⟨|δ_k|²⟩ = V·P(k), inverse-transformed with a full
 *     complex 3D FFT. Conventions:
 *        δ(x) = (1/N³) Σ_k δ_k e^{ikx},  Σ_k ≈ (L/2π)³ ∫ d³k
 *     With this convention the raw real-space field equals V_cell · δ_true,
 *     so both δ and ψ are divided by V_cell = (L/N)³ — a factor derived and
 *     unit-tested in tests/cosmology.test.mjs.
 *
 *  3. Zel'dovich approximation: the displacement field
 *        ψ(k) = i (k / k²) δ(k)
 *     gives particle positions x(q, a) = q + D(a) ψ(q), where D(a) is the
 *     linear growth factor from the FLRW solver. This is the exact solution
 *     of the collisionless Boltzmann equation in the linear regime, and it
 *     remains qualitatively correct (pancakes, filaments, voids) well into
 *     the quasi-linear regime.
 *
 *  4. Optional live N-body refinement (physics/gravity.js) for the
 *     non-linear tail.
 * ---------------------------------------------------------------------------
 */

import { fft1d } from "../core/fft.js";
import { mulberry32, gaussian, simpson } from "../core/mathx.js";

/**
 * BBKS transfer function (Bardeen, Bond, Kaiser & Stebbins 1986).
 * @param {number} k     comoving wavenumber in h/Mpc
 * @param {number} Omh2  Ωm h² (shape parameter)
 */
export function bbksTransfer(k, Omh2 = 0.3153 * 0.6736) {
  const q = k / Omh2;
  if (q <= 0) return 1;
  const lnPart = Math.log1p(2.34 * q) / (2.34 * q);
  const denom = Math.pow(
    1 + 3.89 * q + Math.pow(16.1 * q, 2) + Math.pow(5.46 * q, 3) + Math.pow(6.71 * q, 4),
    0.25
  );
  return lnPart / denom;
}

/**
 * Unnormalised power spectrum P(k) in (Mpc/h)³.
 * @param {number} k  wavenumber in h/Mpc
 * @param {object} p  {ns, Om, H0}
 */
export function powerSpectrumUnnormalised(k, p = { ns: 0.9649, Om: 0.3153, H0: 67.36 }) {
  const h = p.H0 / 100;
  const T = bbksTransfer(k, p.Om * h * h);
  return Math.pow(k, p.ns) * T * T;
}

/**
 * σ(R): rms mass fluctuation in a sphere of radius R (Mpc/h):
 *    σ²(R) = ∫ dk/(2π²) k² P(k) W²(kR),  W = spherical top-hat window.
 */
export function sigmaR(R, A, p) {
  const integrand = (k) => {
    const x = k * R;
    if (x < 1e-9) return 0;
    const W = 3 * (Math.sin(x) - x * Math.cos(x)) / (x * x * x);
    return A * powerSpectrumUnnormalised(k, p) * k * k * W * W;
  };
  return Math.sqrt(simpson(integrand, 1e-5, 500, 4000) / (2 * Math.PI * Math.PI));
}

/** Normalisation A so that σ(8 Mpc/h) = sigma8. */
export function normalisationAmplitude(p, sigma8 = 0.8102) {
  const s1 = sigmaR(8, 1.0, p);
  return sigma8 * sigma8 / (s1 * s1);
}

/** Small complex-3D inverse FFT helper operating on re/im cubes. */
function inverseFFT3(N, reCube, imCube) {
  const lre = new Float64Array(N), lim = new Float64Array(N);
  const N2 = N * N;
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) {
    const base = (z * N + y) * N;
    for (let x = 0; x < N; x++) { lre[x] = reCube[base + x]; lim[x] = imCube[base + x]; }
    fft1d(lre, lim, true);
    for (let x = 0; x < N; x++) { reCube[base + x] = lre[x]; imCube[base + x] = lim[x]; }
  }
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const base = z * N2 + x;
    for (let y = 0; y < N; y++) { lre[y] = reCube[base + y * N]; lim[y] = imCube[base + y * N]; }
    fft1d(lre, lim, true);
    for (let y = 0; y < N; y++) { reCube[base + y * N] = lre[y]; imCube[base + y * N] = lim[y]; }
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const base = y * N + x;
    for (let z = 0; z < N; z++) { lre[z] = reCube[base + z * N2]; lim[z] = imCube[base + z * N2]; }
    fft1d(lre, lim, true);
    for (let z = 0; z < N; z++) { reCube[base + z * N2] = lre[z]; imCube[base + z * N2] = lim[z]; }
  }
}

/**
 * Build the Gaussian δ field and its Zel'dovich displacement ψ for a
 * periodic box. Pure, deterministic, unit-testable (no THREE dependency).
 *
 * @param {object} opts {
 *   N: grid per axis (default 64 → 262,144 particles),
 *   box: comoving box side in Mpc (default 440),
 *   seed: RNG seed,
 *   p: {ns, Om, H0},
 *   sigma8: normalisation
 * }
 * @returns {{
 *   N, box, seed, A, dk, kNyq, VCell,
 *   delta: Float64Array(N³),         density contrast
 *   psi: Float64Array(3·N³),         Zel'dovich displacement (Mpc, comoving)
 *   rmsDelta, rmsPsi, psiMax
 * }}
 */
export function buildField(opts = {}) {
  const N = opts.N ?? 64;
  const box = opts.box ?? 440;
  const seed = opts.seed ?? 31337;
  const p = opts.p ?? { ns: 0.9649, Om: 0.3153, H0: 67.36 };
  const sigma8 = opts.sigma8 ?? 0.8102;
  const A = normalisationAmplitude(p, sigma8);

  const N3 = N * N * N;
  const L = box;
  const dk = 2 * Math.PI / L;
  const kNyq = dk * (N / 2);
  const V = L * L * L;
  const VCell = Math.pow(L / N, 3);
  const rng = mulberry32(seed);

  const idx = (i, j, l) => ((i * N + j) * N + l);
  const kcomp = (i) => (i <= N / 2 ? i : i - N) * dk;

  // ---- 1. Hermitian complex modes δ_k ------------------------------------
  const reK = new Float64Array(N3);
  const imK = new Float64Array(N3);
  for (let i = 0; i < N; i++) {
    const kx = kcomp(i);
    for (let j = 0; j < N; j++) {
      const ky = kcomp(j);
      for (let l = 0; l < N; l++) {
        const kz = kcomp(l);
        const ki = idx(i, j, l);
        const pi = idx((N - i) % N, (N - j) % N, (N - l) % N);
        if (pi < ki) continue;                    // partner will be set here
        const k2 = kx * kx + ky * ky + kz * kz;
        if (k2 === 0) continue;                   // DC mode: mean density fixed
        const k = Math.min(Math.sqrt(k2), kNyq);
        const Pk = A * powerSpectrumUnnormalised(k, p);
        const amp = Math.sqrt(V * Pk);
        const a = gaussian(rng) * amp * Math.SQRT1_2;
        const b = gaussian(rng) * amp * Math.SQRT1_2;
        reK[ki] = a; imK[ki] = b;
        reK[pi] = a; imK[pi] = -b;                // δ_{−k} = conj(δ_k) → real field
      }
    }
  }

  // ---- 2. inverse transform → δ(x) ----------------------------------------
  const deltaRe = reK.slice();
  const deltaIm = imK.slice();
  inverseFFT3(N, deltaRe, deltaIm);
  const delta = deltaRe;                         // Hermitian → imaginary ≈ 0
  for (let c = 0; c < N3; c++) delta[c] /= VCell;

  // ---- 3. Zel'dovich displacement ψ = i k δ_k / k² ------------------------
  const psi = new Float64Array(N3 * 3);
  for (let comp = 0; comp < 3; comp++) {
    const workRe = reK.slice();
    const workIm = imK.slice();
    let m = 0;
    for (let i = 0; i < N; i++) {
      const kx = kcomp(i);
      for (let j = 0; j < N; j++) {
        const ky = kcomp(j);
        for (let l = 0; l < N; l++) {
          const kz = kcomp(l);
          const k2 = kx * kx + ky * ky + kz * kz;
          const kc = comp === 0 ? kx : (comp === 1 ? ky : kz);
          if (k2 === 0) { workRe[m] = 0; workIm[m] = 0; m++; continue; }
          const s = kc / k2;
          const r = workRe[m], iv = workIm[m];
          // multiply by i·s :  (r + i·iv)·(i·s) = −iv·s + i·r·s
          workRe[m] = -iv * s;
          workIm[m] = r * s;
          m++;
        }
      }
    }
    inverseFFT3(N, workRe, workIm);
    for (let c = 0; c < N3; c++) psi[c * 3 + comp] = workRe[c] / VCell;
  }

  // ---- diagnostics ----------------------------------------------------------
  let sum = 0, sumP = 0, sumPsi = 0, psiMax = 0;
  for (let c = 0; c < N3; c++) { sum += delta[c]; sumP += delta[c] * delta[c]; }
  for (let c = 0; c < N3 * 3; c++) { sumPsi += psi[c] * psi[c]; psiMax = Math.max(psiMax, Math.abs(psi[c])); }
  const rmsDelta = Math.sqrt(sumP / N3);
  const rmsPsi = Math.sqrt(sumPsi / N3);

  return { N, box, seed, A, dk, kNyq, VCell, delta, psi, rmsDelta, rmsPsi, psiMax };
}

/**
 * Apply Zel'dovich positions for a growth factor D:
 *    x = q + D·ψ, wrapped periodically into [0, box), centered at 0.
 * Writes a Float32Array(3·N³) suitable for GPU upload.
 */
export function applyZeldovich(field, D, outPositions) {
  const N = field.N, N3 = N * N * N, box = field.box;
  const dk = field.dk;
  const half = N / 2;
  let o = 0;
  for (let z = 0; z < N; z++) {
    const wz = (z <= half ? z : z - N) * dk;
    for (let y = 0; y < N; y++) {
      const wy = (y <= half ? y : y - N) * dk;
      for (let x = 0; x < N; x++) {
        const wx = (x <= half ? x : x - N) * dk;
        const c = (z * N + y) * N + x;
        let X = wx + D * field.psi[c * 3];
        let Y = wy + D * field.psi[c * 3 + 1];
        let Z = wz + D * field.psi[c * 3 + 2];
        X -= Math.floor(X / box) * box;
        Y -= Math.floor(Y / box) * box;
        Z -= Math.floor(Z / box) * box;
        outPositions[o++] = X - box / 2;
        outPositions[o++] = Y - box / 2;
        outPositions[o++] = Z - box / 2;
      }
    }
  }
}

export default { buildField, applyZeldovich, bbksTransfer, sigmaR, normalisationAmplitude };
