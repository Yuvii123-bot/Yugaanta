/**
 * Yugaanta — core/fft.js
 * ---------------------------------------------------------------------------
 * Minimal in-place radix-2 complex FFT (Cooley-Tukey, iterative).
 * Used to generate the Gaussian random density field for structure
 * formation: δ(k) is drawn from the ΛCDM power spectrum P(k), transformed
 * to real space, then differentiated in Fourier space to obtain the
 * Zel'dovich displacement field ψ.
 *
 * Length must be a power of two. Both real and imaginary arrays are
 * transformed together (a complex transform), which is what we need since
 * δ(k) is complex (random phases).
 * ---------------------------------------------------------------------------
 */

/**
 * In-place complex FFT.
 * @param {Float64Array} re - real parts, length n (power of 2)
 * @param {Float64Array} im - imaginary parts, length n
 * @param {boolean} inverse - forward (false) or inverse (true) transform
 */
export function fft1d(re, im, inverse = false) {
  const n = re.length;
  if ((n & (n - 1)) !== 0) throw new Error("fft1d: length must be a power of 2");
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  // Butterfly passes
  for (let len = 2; len <= n; len <<= 1) {
    const ang = 2 * Math.PI / len * (inverse ? 1 : -1);
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      const half = len >> 1;
      for (let k = 0; k < half; k++) {
        const uRe = re[i + k], uIm = im[i + k];
        const vRe = re[i + k + half] * curRe - im[i + k + half] * curIm;
        const vIm = re[i + k + half] * curIm + im[i + k + half] * curRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + half] = uRe - vRe;
        im[i + k + half] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
}

/**
 * 3D FFT of a real-valued field stored in a flat array of side N^3,
 * applied as three passes of 1D transforms along each axis.
 * The field is treated as real: imaginary part is zeroed on entry.
 *
 * Because this is O(N³ log N) with N=64 → 262144 cells, a full 3D transform
 * here is ~2M butterfly ops per axis-pass — a few tens of ms in JS.
 */
export class FFT3 {
  constructor(N) {
    this.N = N;
    this.re = new Float64Array(N);
    this.im = new Float64Array(N);
  }
  /** Transform axis `axis` (0=x,1=y,2=z) of the cube `cube` (Float64Array N³). */
  transformAxis(cube, axis, inverse = false) {
    const N = this.N, N2 = N * N;
    const re = this.re, im = this.im;
    if (axis === 0) {
      for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) {
        const base = (z * N + y) * N;
        for (let x = 0; x < N; x++) { re[x] = cube[base + x]; im[x] = 0; }
        fft1d(re, im, inverse);
        for (let x = 0; x < N; x++) cube[base + x] = re[x];
      }
    } else if (axis === 1) {
      for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
        const base = z * N2 + x;
        for (let y = 0; y < N; y++) { re[y] = cube[base + y * N]; im[y] = 0; }
        fft1d(re, im, inverse);
        for (let y = 0; y < N; y++) cube[base + y * N] = re[y];
      }
    } else {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const base = y * N + x;
        for (let z = 0; z < N; z++) { re[z] = cube[base + z * N2]; im[z] = 0; }
        fft1d(re, im, inverse);
        for (let z = 0; z < N; z++) cube[base + z * N2] = re[z];
      }
    }
  }
  forward(cube) {
    this.transformAxis(cube, 0, false);
    this.transformAxis(cube, 1, false);
    this.transformAxis(cube, 2, false);
  }
  inverse(cube) {
    this.transformAxis(cube, 0, true);
    this.transformAxis(cube, 1, true);
    this.transformAxis(cube, 2, true);
  }
}
