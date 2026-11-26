/**
 * Yugaanta — physics/gravity.js
 * ---------------------------------------------------------------------------
 * N-body gravity — Barnes & Hut (1986) octree, O(N log N).
 *
 * Used for the optional live N-body refinement of the cosmic web and for
 * procedural satellite dynamics. Implementation notes:
 *   - Flat typed-array tree (fast, GC-free)
 *   - Multipole acceptance criterion: s/d < θ (θ=0.6 default)
 *   - Plummer softening ε to avoid singularities
 *   - KDK leapfrog integrator (symplectic, energy-stable)
 *
 * Units are carried by the caller: default cosmological mode uses
 * comoving Mpc, km/s, 10¹⁰ M☉ with G = 4.30091e-9 (Mpc)³/(km²s²)/(10¹⁰M☉).
 * ---------------------------------------------------------------------------
 */

/**
 * Gravitational constant in astrophysical units:
 * G = 4.30091e-9 Mpc (km/s)² / M☉ ... per 1e10 M☉ for numerical sanity.
 */
export const G_ASTRO = 4.30091e-9;   // Mpc (km/s)² per (10^10 M☉)

/**
 * Barnes-Hut tree builder + force calculator over flat typed arrays.
 * Positions are x,y,z triples in a flat Float64Array.
 */
export class BarnesHut {
  /**
   * @param {Float64Array} pos  length 3N
   * @param {Float32Array} mass length N
   * @param {object} opts {theta, eps, boxSize}
   */
  constructor(pos, mass, opts = {}) {
    this.pos = pos;
    this.mass = mass;
    this.N = mass.length;
    this.theta = opts.theta ?? 0.6;
    this.eps = opts.eps ?? 0.3;
    this.boxSize = opts.boxSize ?? 440;
    this._build();
  }

  _build() {
    const N = this.N;
    // Node arrays (flat): cx,cy,cz, half-size, mass, comx,comy,comz, children[8]
    const maxNodes = 8 * N + 64;
    this.nHalf = new Float64Array(maxNodes);
    this.nCx = new Float64Array(maxNodes);
    this.nCy = new Float64Array(maxNodes);
    this.nCz = new Float64Array(maxNodes);
    this.nMass = new Float64Array(maxNodes);
    this.nCom = new Float64Array(maxNodes * 3);
    this.nChild = new Int32Array(maxNodes * 8).fill(-1);
    this.nBody = new Int32Array(maxNodes).fill(-1);   // leaf body index
    this.nodeCount = 0;

    // bounds
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < N; i++) {
      const x = this.pos[3 * i], y = this.pos[3 * i + 1], z = this.pos[3 * i + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ) * 1.001;
    const half = size / 2;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;

    const newNode = (hx, x, y, z) => {
      const id = this.nodeCount++;
      this.nHalf[id] = hx;
      this.nCx[id] = x; this.nCy[id] = y; this.nCz[id] = z;
      return id;
    };

    const root = newNode(half, cx, cy, cz);
    const insert = (nodeId, body) => {
      // iteratively descend
      let cur = nodeId;
      let depth = 0;
      while (true) {
        // accumulate mass & COM
        const m = this.mass[body];
        this.nMass[cur] += m;
        const i3 = 3 * cur;
        this.nCom[i3] += this.pos[3 * body] * m;
        this.nCom[i3 + 1] += this.pos[3 * body + 1] * m;
        this.nCom[i3 + 2] += this.pos[3 * body + 2] * m;

        if (this.nHalf[cur] < 1e-6 || depth > 48) {
          this.nBody[cur] = body;   // force leaf at tiny cells
          return;
        }
        if (this.nBody[cur] >= 0 && this.nBody[cur] !== body) {
          // split: push existing body down
          const old = this.nBody[cur];
          this.nBody[cur] = -1;
          const o3 = 3 * old;
          const ox = this.pos[o3], oy = this.pos[o3 + 1], oz = this.pos[o3 + 2];
          const childHalf = this.nHalf[cur] / 2;
          const oxChild = this.nCx[cur] + (ox > this.nCx[cur] ? childHalf : -childHalf);
          const oyChild = this.nCy[cur] + (oy > this.nCy[cur] ? childHalf : -childHalf);
          const ozChild = this.nCz[cur] + (oz > this.nCz[cur] ? childHalf : -childHalf);
          const octOld =
            (ox > this.nCx[cur] ? 1 : 0) | (oy > this.nCy[cur] ? 2 : 0) | (oz > this.nCz[cur] ? 4 : 0);
          let cOld = this.nChild[8 * cur + octOld];
          if (cOld < 0) cOld = this.nChild[8 * cur + octOld] = newNode(childHalf, oxChild, oyChild, ozChild);
          // re-place old body into the child (single level; recursion via loop)
          const cm3 = 3 * cOld;
          this.nMass[cOld] += this.mass[old];
          this.nCom[cm3] += ox * this.mass[old];
          this.nCom[cm3 + 1] += oy * this.mass[old];
          this.nCom[cm3 + 2] += oz * this.mass[old];
          this.nBody[cOld] = old;
        }
        const oct =
          (this.pos[3 * body] > this.nCx[cur] ? 1 : 0) |
          (this.pos[3 * body + 1] > this.nCy[cur] ? 2 : 0) |
          (this.pos[3 * body + 2] > this.nCz[cur] ? 4 : 0);
        let child = this.nChild[8 * cur + oct];
        if (child < 0) {
          const childHalf = this.nHalf[cur] / 2;
          const xChild = this.nCx[cur] + ((oct & 1) ? childHalf : -childHalf);
          const yChild = this.nCy[cur] + ((oct & 2) ? childHalf : -childHalf);
          const zChild = this.nCz[cur] + ((oct & 4) ? childHalf : -childHalf);
          child = this.nChild[8 * cur + oct] = newNode(childHalf, xChild, yChild, zChild);
        }
        cur = child;
        depth++;
      }
    };

    for (let b = 0; b < N; b++) insert(root, b);

    // finalize COMs
    for (let n = 0; n < this.nodeCount; n++) {
      const m = this.nMass[n];
      if (m > 0) {
        const i3 = 3 * n;
        this.nCom[i3] /= m; this.nCom[i3 + 1] /= m; this.nCom[i3 + 2] /= m;
      }
    }
    this.root = root;
  }

  /**
   * Acceleration on body i (3-vector added into out[3]).
   */
  accelOn(i, out) {
    const xi = this.pos[3 * i], yi = this.pos[3 * i + 1], zi = this.pos[3 * i + 2];
    const eps2 = this.eps * this.eps;
    const Gm = G_ASTRO;
    // iterative traversal with explicit stack
    const stack = new Int32Array(4096);
    let sp = 0;
    stack[sp++] = this.root;
    let ax = 0, ay = 0, az = 0;
    while (sp > 0) {
      const n = stack[--sp];
      if (this.nMass[n] === 0) continue;
      const dx = this.nCom[3 * n] - xi;
      const dy = this.nCom[3 * n + 1] - yi;
      const dz = this.nCom[3 * n + 2] - zi;
      const d2 = dx * dx + dy * dy + dz * dz;
      const s = 2 * this.nHalf[n];
      if (this.nBody[n] === i) continue;
      if (this.nBody[n] >= 0 || s * s < this.theta * this.theta * d2) {
        // treat as single mass (leaf or far enough)
        const inv = 1 / Math.sqrt(d2 + eps2);
        const f = Gm * this.nMass[n] * inv * inv * inv;
        ax += f * dx; ay += f * dy; az += f * dz;
      } else {
        for (let o = 0; o < 8; o++) {
          const c = this.nChild[8 * n + o];
          if (c >= 0 && sp < 4090) stack[sp++] = c;
        }
      }
    }
    out[0] = ax; out[1] = ay; out[2] = az;
    return out;
  }
}

/**
 * KDK leapfrog step for the whole system (comoving mode: no expansion drag;
 * the Zel'dovich base field supplies the linear part).
 */
export function leapfrogStep(pos, vel, mass, dt, accFn) {
  const N = mass.length;
  const acc = new Float64Array(3);
  // first kick (half)
  for (let i = 0; i < N; i++) {
    accFn(i, acc);
    vel[3 * i] += 0.5 * dt * acc[0];
    vel[3 * i + 1] += 0.5 * dt * acc[1];
    vel[3 * i + 2] += 0.5 * dt * acc[2];
  }
  // drift
  for (let i = 0; i < N * 3; i++) pos[i] += vel[i] * dt;
  // second kick (half) with fresh accelerations
  for (let i = 0; i < N; i++) {
    accFn(i, acc);
    vel[3 * i] += 0.5 * dt * acc[0];
    vel[3 * i + 1] += 0.5 * dt * acc[1];
    vel[3 * i + 2] += 0.5 * dt * acc[2];
  }
}

/**
 * Two-body orbital elements from state vectors (vis-viva machinery):
 * returns {a, e, energy, angularMomentum} for debug/validation.
 */
export function twoBodyElements(rx, ry, rz, vx, vy, vz, M) {
  const mu = G_ASTRO * 1e10 * M;   // caller-defined units caveat
  const r = Math.hypot(rx, ry, rz);
  const v2 = vx * vx + vy * vy + vz * vz;
  const energy = v2 / 2 - mu / r;
  const a = -mu / (2 * energy);
  const hx = ry * vz - rz * vy;
  const hy = rz * vx - rx * vz;
  const hz = rx * vy - ry * vx;
  const h = Math.hypot(hx, hy, hz);
  const e = Math.sqrt(Math.max(0, 1 + 2 * energy * h * h / (mu * mu)));
  return { a, e, energy, h };
}

export default { BarnesHut, leapfrogStep, G_ASTRO, twoBodyElements };
