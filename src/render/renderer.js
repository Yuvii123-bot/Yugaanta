/**
 * Yugaanta — render/renderer.js
 * ---------------------------------------------------------------------------
 * WebGL renderer setup (three.js). One renderer, one scene graph, with
 * per-realm view groups that activate/deactivate by zoom range. The physics
 * engine never touches three.js — this layer subscribes to the event bus.
 * ---------------------------------------------------------------------------
 */

import * as THREE from "three";

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.fog = null;
  return scene;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.005,
    5e6
  );
  return camera;
}

/** Global resize handling. */
export function bindResize(renderer, camera) {
  const onResize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", onResize);
  return onResize;
}

/** util: make a canvas texture with a radial glow (for galaxy cores etc). */
export function makeGlowTexture(color = "255,220,160", size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, `rgba(${color},1)`);
  g.addColorStop(0.25, `rgba(${color},0.5)`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Procedural CMB anisotropy sky texture (±250 μK map, canvas). */
export function makeCMBTexture(seed = 777) {
  const w = 1024, h = 512;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  // lightweight value noise in 2D, octaved — deterministic
  let s = seed >>> 0;
  const rand = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const grid = new Float32Array(256 * 256);
  for (let i = 0; i < grid.length; i++) grid[i] = rand() * 2 - 1;
  const at = (x, y) => grid[((y & 255) * 256) + (x & 255)];
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    let fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi), b = at(xi + 1, yi), cc = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * fx + (cc - a) * fy + (a - b - cc + d) * fx * fy;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0, amp = 1, freq = 4;
      for (let o = 0; o < 6; o++) {
        v += amp * noise(x / w * freq + o * 13.7, y / h * freq * 0.5 + o * 7.9);
        amp *= 0.55; freq *= 2;
      }
      // normalize roughly to ±1, scale to ±250 μK
      const t = Math.max(-1, Math.min(1, v / 1.6));
      const uK = t * 250;
      // Planck-style colormap: blue (cold) → red (hot)
      const n = (t + 1) / 2;
      const r = Math.max(0, Math.min(1, 0.2 + 1.1 * n - 0.3 * n * n));
      const gch = Math.max(0, Math.min(1, 0.55 - 0.5 * Math.abs(n - 0.5)));
      const b = Math.max(0, Math.min(1, 1.1 - 1.6 * n));
      const o4 = (y * w + x) * 4;
      img.data[o4] = r * 255;
      img.data[o4 + 1] = gch * 255;
      img.data[o4 + 2] = b * 255;
      img.data[o4 + 3] = 255;
      void uK;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
