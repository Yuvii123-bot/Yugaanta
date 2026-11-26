/**
 * Yugaanta — render/universeview.js
 * ---------------------------------------------------------------------------
 * THE UNIVERSE REALM — the cosmic web at 440 Mpc across.
 *
 * Contents:
 *  - GPU particle cloud (Zel'dovich positions updated per frame with the
 *    growth factor D(a) from the FLRW solver): filaments, walls, voids.
 *  - The primordial fireball: an all-enclosing shader sphere whose colour
 *    follows the blackbody tint of the photon temperature T(t). Opaque while
 *    the plasma is ionized, fading to nothing at recombination — the moment
 *    "the universe becomes transparent" is visible in the render itself.
 *  - The CMB sky: after recombination, a faint all-sky sphere carrying a
 *    procedural ΔT/T ≈ 1e-5 anisotropy map — the seeds of all galaxies.
 *  - Marker sprites + labels for the Milky Way, Andromeda and "You are here".
 * ---------------------------------------------------------------------------
 */

import * as THREE from "three";
import { makeGlowTexture, makeCMBTexture } from "./renderer.js";

const VERT = `
attribute float aSize;
attribute vec3 aColor;
varying vec3 vColor;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (320.0 / -mv.z);
  gl_PointSize = clamp(gl_PointSize, 1.0, 9.0);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
varying vec3 vColor;
uniform float uOpacity;
void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r = length(d);
  float a = smoothstep(0.5, 0.12, r);
  gl_FragColor = vec4(vColor * (0.55 + 0.9 * (1.0 - r * 2.0)), a * uOpacity);
}`;

const FIREBALL_VERT = `
varying vec3 vPos;
varying vec3 vNormalW;
void main() {
  vPos = position;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FIREBALL_FRAG = `
varying vec3 vPos;
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;
uniform float uEnergy;

// hash & value noise (3D)
float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec3(11.3, 7.7, 3.1);
    a *= 0.5;
  }
  return v;
}
void main() {
  vec3 p = normalize(vPos) * 3.0;
  float n = fbm(p * 2.5 + vec3(uTime * 0.15));
  float n2 = fbm(p * 6.0 - vec3(uTime * 0.08, 0.0, uTime * 0.05));
  float plasma = 0.45 + 0.55 * n + 0.35 * (n2 - 0.5);
  vec3 col = uColor * (0.55 + plasma * 1.5) * uEnergy;
  col += vec3(1.0, 0.85, 0.6) * pow(plasma, 6.0) * uEnergy;   // hot sparks
  gl_FragColor = vec4(col, uOpacity);
}`;

const CMB_FRAG = `
varying vec3 vPos;
uniform sampler2D uMap;
uniform float uOpacity;
void main() {
  vec3 n = normalize(vPos);
  vec2 uv = vec2(atan(n.z, n.x) / 6.283185 + 0.5, acos(clamp(-n.y, -1.0, 1.0)) / 3.141592);
  vec3 c = texture2D(uMap, uv).rgb;
  gl_FragColor = vec4(c * uOpacity, uOpacity);
}`;

export class UniverseView {
  /**
   * @param {THREE.Scene} scene
   * @param {object} engine sim engine (field, cosmo)
   */
  constructor(scene, engine) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.engine = engine;
    this.boxMpc = engine.field ? engine.field.box : 440;
    this._positions = null;
    this._built = false;
    this.fireball = null;
    this.cmbSky = null;
    this.markers = new THREE.Group();
    this.group.add(this.markers);
  }

  /** Build GPU buffers lazily (called once the field is ready). */
  ensureBuilt() {
    if (this._built) return;
    const field = this.engine.field;
    if (!field) return;
    const N3 = field.N * field.N * field.N;
    this._positions = new Float32Array(N3 * 3);
    const colors = new Float32Array(N3 * 3);
    const sizes = new Float32Array(N3);
    // Colour by density contrast: dense → warm bright, voids → dim blue
    for (let i = 0; i < N3; i++) {
      const d = field.delta[i];
      const s = Math.max(-1, Math.min(4, d * 2.2));
      const r = 0.28 + 0.72 * Math.max(0, Math.min(1, s));
      const g = 0.35 + 0.45 * Math.max(0, Math.min(1, s));
      const b = 0.55 + 0.25 * Math.max(0, Math.min(1, 1 - s));
      colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
      sizes[i] = 1.1 + 1.9 * Math.max(0, Math.min(1, s));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._positions, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uOpacity: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.group.add(this.points);
    this._built = true;
    this._buildFireball();
    this._buildMarkers();
  }

  _buildFireball() {
    const geo = new THREE.SphereGeometry(this.boxMpc * 0.85, 64, 48);
    const mat = new THREE.ShaderMaterial({
      vertexShader: FIREBALL_VERT,
      fragmentShader: FIREBALL_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1 },
        uColor: { value: new THREE.Color(1, 0.96, 0.92) },
        uEnergy: { value: 1 },
      },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    this.fireball = new THREE.Mesh(geo, mat);
    this.group.add(this.fireball);
  }

  _buildCMB() {
    const geo = new THREE.SphereGeometry(this.boxMpc * 0.85, 64, 48);
    const mat = new THREE.ShaderMaterial({
      vertexShader: FIREBALL_VERT,
      fragmentShader: CMB_FRAG,
      uniforms: { uMap: { value: makeCMBTexture() }, uOpacity: { value: 0 } },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    this.cmbSky = new THREE.Mesh(geo, mat);
    this.group.add(this.cmbSky);
  }

  _buildMarkers() {
    const mk = (x, y, z, color) => {
      const tex = makeGlowTexture(color);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      sp.scale.setScalar(6);
      sp.position.set(x, y, z);
      this.markers.add(sp);
      return sp;
    };
    // Milky Way & Andromeda — placed in the box as two major halos
    this.mwMarker = mk(30, -18, 22, "255,235,190");
    this.m31Marker = mk(-88, 44, -60, "230,238,255");
    this.sunMarker = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture("160,200,255"), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.sunMarker.scale.setScalar(3.4);
    this.sunMarker.position.set(30.6, -17.3, 22.4);
    this.markers.add(this.sunMarker);
  }

  /**
   * Per-frame update. tState from engine.state().
   */
  update(tState, dt, labels, camera, pickables) {
    if (!this._built) this.ensureBuilt();
    if (!this._built) return;
    // particle positions follow the growth factor
    this.engine.particlePositions(this._positions);
    this.points.geometry.attributes.position.needsUpdate = true;

    // fireball opacity/energy from temperature
    const T = tState.T;
    const fb = this.fireball.material.uniforms;
    fb.uTime.value += dt;
    if (this.cmbSky) {
      this.cmbSky.material.uniforms.uOpacity.value =
        Math.max(0, Math.min(0.85, (T - 120) / 2200));
    }
    if (T > 3200) {
      if (!this.cmbSky) this._buildCMB();
      // opaque plasma: opacity ramps 0→1 as we enter the fireball era
      const ionized = Math.min(1, Math.max(0, (T - 2600) / 600));
      fb.uOpacity.value = ionized;
      const energy = Math.min(2.2, Math.pow(T / 3200, 0.55));
      fb.uEnergy.value = 0.35 + energy;
      const tt = Math.min(1, T / 8000);
      fb.uColor.value.setRGB(
        0.9 + 0.1 * tt,
        0.72 + 0.24 * tt,
        0.5 + 0.42 * tt
      );
    } else {
      fb.uOpacity.value = Math.max(0, Math.min(1, (T - 1500) / 1700));
      fb.uEnergy.value = 0.3;
    }

    // pickables registry
    pickables.length = 0;
    if (this.mwMarker) pickables.push({ obj: this.mwMarker, info: { type: "galaxy-target", id: "milky-way", name: "Milky Way", note: "Double-click to enter our galaxy" } });
    if (this.m31Marker) pickables.push({ obj: this.m31Marker, info: { type: "galaxy-target", id: "m31", name: "Andromeda (M31)", note: "1 trillion stars, inbound for a collision" } });
    if (this.sunMarker) pickables.push({ obj: this.sunMarker, info: { type: "system-target", id: "sol", name: "The Sun — You are here", note: "Double-click to enter the Solar System" } });
  }

  /** Show/hide particles before first structure (radiation era). */
  setParticleOpacity(v) {
    if (this.points) this.points.material.uniforms.uOpacity.value = v;
  }
}
