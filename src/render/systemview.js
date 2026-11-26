/**
 * Yugaanta — render/systemview.js
 * ---------------------------------------------------------------------------
 * THE SOLAR SYSTEM REALM — real Keplerian orbits propagated live from the
 * cosmic clock. 1 unit = 0.1 AU. Planets are procedural-shader worlds with
 * their real sizes (boosted ×40 for visibility by default — toggleable),
 * real orbital elements, and the real moons of each world.
 * ---------------------------------------------------------------------------
 */

import * as THREE from "three";
import { PLANETS, MOONS, DWARF_PLANETS, BELTS, keplerPosition, orbitalSpeed } from "../objects/sol.js";
import { makeGlowTexture } from "./renderer.js";

const AU_PER_UNIT = 0.1;
const SCALE_BOOST = 40;   // planet mesh exaggeration (toggleable)

const PLANET_VERT = `
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vWorld;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vPos = position;
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const PLANET_FRAG = `
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vWorld;
uniform vec3 uLightDir;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform float uSeed;
uniform float uStyle;    // 0 rocky, 1 gas/banded, 2 earthlike, 3 ice
uniform float uTime;

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
    p = p * 2.02 + vec3(9.7, 3.1, 5.3);
    a *= 0.5;
  }
  return v;
}
void main() {
  vec3 n = normalize(vPos);
  float h;
  if (uStyle > 1.5 && uStyle < 2.5) {
    // Earth-like: warped continents
    vec3 w = n * 3.0 + fbm(n * 4.0 + uSeed) * 0.9;
    h = fbm(w);
  } else if (uStyle > 0.5 && uStyle < 1.5) {
    // gas giant bands
    float band = sin(n.y * 22.0 + fbm(n * 6.0 + vec3(uTime * 0.01, uSeed, 0.0)) * 3.0);
    h = 0.5 + 0.5 * band;
  } else {
    h = fbm(n * 4.2 + uSeed);
  }
  vec3 col = mix(uColA, uColB, smoothstep(0.30, 0.62, h));
  col = mix(col, uColC, smoothstep(0.62, 0.86, h));
  // lighting
  float diff = max(dot(vNormal, normalize(uLightDir)), 0.0);
  float amb = 0.035;
  vec3 lit = col * (amb + diff * 1.05);
  gl_FragColor = vec4(lit, 1.0);
}`;

const SUN_FRAG = `
varying vec3 vNormal;
varying vec3 vPos;
uniform float uTime;
void main() {
  float n = sin(vPos.x * 8.0 + uTime * 0.8) * sin(vPos.y * 7.0 - uTime * 0.6) * sin(vPos.z * 9.0 + uTime * 0.5);
  vec3 base = vec3(1.0, 0.86, 0.55);
  vec3 hot = vec3(1.0, 0.97, 0.85);
  vec3 col = mix(base, hot, 0.5 + 0.5 * n);
  gl_FragColor = vec4(col * 1.15, 1.0);
}`;

export class SystemView {
  constructor(scene, engine) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.engine = engine;
    this.planetMeshes = new Map();
    this.moonMeshes = [];
    this.beltPoints = [];
    this.trueScale = false;
    this._build();
  }

  _build() {
    // --- Sun ---
    const sunGeo = new THREE.SphereGeometry(0.0465, 32, 32);   // true-ish radius 0.046 AU
    const sunMat = new THREE.ShaderMaterial({
      vertexShader: PLANET_VERT, fragmentShader: SUN_FRAG,
      uniforms: { uTime: { value: 0 } },
    });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.userData = { type: "star", id: "sol", name: "The Sun" };
    this.group.add(this.sun);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture("255,210,140"), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.scale.setScalar(2.2);
    this.group.add(glow);

    // --- planets + orbits ---
    for (const p of [...PLANETS, ...DWARF_PLANETS]) {
      const radiusUnits = (p.radiusKm * 1000 / (AU_PER_UNIT * 1.495978707e11)) * (this.trueScale ? 1 : SCALE_BOOST);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(radiusUnits, 0.015), 32, 24),
        this._planetMaterial(p)
      );
      mesh.userData = { type: "planet", id: p.id, data: p };
      this.group.add(mesh);
      this.planetMeshes.set(p.id, { mesh, data: p });

      // orbit line (ellipse in ecliptic plane, inclinated)
      const pts = [];
      const e = p.e, a = p.a / AU_PER_UNIT;
      const inc = p.i * Math.PI / 180;
      for (let k = 0; k <= 180; k++) {
        const E = k / 180 * Math.PI * 2;
        const xv = a * (Math.cos(E) - e);
        const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
        pts.push(new THREE.Vector3(xv, yv * Math.sin(inc), yv * Math.cos(inc)));
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const orbit = new THREE.Line(orbitGeo, new THREE.LineBasicMaterial({
        color: 0x3a5aa8, transparent: true, opacity: 0.28,
      }));
      this.group.add(orbit);
    }

    // --- moons (only rendered when zoomed close to their parent) ---
    for (const m of MOONS) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.008, m.radiusKm * 1000 / (AU_PER_UNIT * 1.495978707e11)) * (this.trueScale ? 1 : SCALE_BOOST), 16, 12),
        this._planetMaterial({ ...m, type: m.type, colorHue: m.colorHue, seed: m.seed })
      );
      mesh.userData = { type: "moon", id: m.id, data: m };
      mesh.visible = false;
      this.group.add(mesh);
      this.moonMeshes.push({ mesh, data: m });
    }

    // --- belts ---
    for (const belt of BELTS) {
      if (belt.id === "oort") continue;   // too big for this view scale
      const n = this.engine.perfMode ? belt.count / 4 : belt.count;
      const pos = new Float32Array(Math.floor(n) * 3);
      for (let i = 0; i < n; i++) {
        const r = (belt.innerAU + Math.random() * (belt.outerAU - belt.innerAU)) / AU_PER_UNIT;
        const th = Math.random() * Math.PI * 2;
        pos[i * 3] = r * Math.cos(th);
        pos[i * 3 + 1] = (Math.random() - 0.5) * r * 0.06;
        pos[i * 3 + 2] = r * Math.sin(th);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        color: belt.id === "asteroid" ? 0x9a8f80 : 0x7fa8c8,
        size: 0.02, sizeAttenuation: true, transparent: true, opacity: 0.7,
        depthWrite: false,
      }));
      this.group.add(pts);
      this.beltPoints.push(pts);
    }
  }

  _planetMaterial(p) {
    const hue = p.colorHue ?? 0.1;
    const style = p.type === "gas" ? 1 : p.type === "earth" ? 2 : p.type === "ice" ? 3 : 0;
    const cA = new THREE.Color().setHSL(hue, 0.45, 0.30);
    const cB = new THREE.Color().setHSL((hue + 0.03) % 1, 0.42, 0.45);
    const cC = new THREE.Color().setHSL((hue + 0.06) % 1, 0.30, 0.62);
    if (p.type === "earth") { cA.setRGB(0.05, 0.14, 0.32); cB.setRGB(0.13, 0.32, 0.13); cC.setRGB(0.75, 0.72, 0.66); }
    if (p.type === "mars") { cA.setRGB(0.45, 0.22, 0.10); cB.setRGB(0.60, 0.32, 0.15); cC.setRGB(0.78, 0.52, 0.32); }
    if (p.type === "venus") { cA.setRGB(0.72, 0.58, 0.30); cB.setRGB(0.84, 0.70, 0.40); cC.setRGB(0.92, 0.82, 0.52); }
    if (p.type === "ice") { cA.setRGB(0.35, 0.55, 0.78); cB.setRGB(0.45, 0.65, 0.85); cC.setRGB(0.70, 0.85, 0.95); }
    return new THREE.ShaderMaterial({
      vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG,
      uniforms: {
        uLightDir: { value: new THREE.Vector3(1, 0, 0) },
        uColA: { value: cA }, uColB: { value: cB }, uColC: { value: cC },
        uSeed: { value: (p.seed ?? 1) * 3.13 },
        uStyle: { value: style },
        uTime: { value: 0 },
      },
    });
  }

  /**
   * Kepler propagation. tAbs = cosmic seconds; positions relative to now.
   */
  update(tState, dt, cameraDist) {
    // Planet epoch: J2000 ≈ 13.772 Gyr after BB; offset in seconds
    const tJ2000 = 13.772e9 * 3.15576e7;
    const dtSec = tState.t - tJ2000;
    for (const { mesh, data } of this.planetMeshes.values()) {
      const pos = keplerPosition(data, dtSec);
      mesh.position.set(
        pos.x / AU_PER_UNIT,
        pos.z / AU_PER_UNIT,
        -pos.y / AU_PER_UNIT
      );
      mesh.rotation.y += dt * 24 / Math.abs(data.rotationH) * 0.02;
      const u = mesh.material.uniforms;
      if (u && u.uTime) u.uTime.value += dt;
      if (u && u.uLightDir) u.uLightDir.value.copy(mesh.position).multiplyScalar(-1).normalize();
    }
    // moons follow parents (simple circular orbits, correct periods)
    for (const { mesh, data } of this.moonMeshes) {
      const parent = this.planetMeshes.get(data.parent);
      if (!parent) continue;
      const parentDist = cameraDist;
      const showMoons = parentDist < 4;   // within ~0.4 AU
      mesh.visible = showMoons;
      if (!showMoons) continue;
      const period = Math.abs(data.periodDays) * 86400;
      const ang = (tState.t / period) * Math.PI * 2 * (data.periodDays < 0 ? -1 : 1);
      const aKm = data.aKm / 1e5;               // units: 1e5 km
      const rU = aKm / (AU_PER_UNIT * 1.495978707e8) * SCALE_BOOST;
      mesh.position.copy(parent.mesh.position);
      mesh.position.x += rU * Math.cos(ang);
      mesh.position.z += rU * Math.sin(ang);
    }
    if (this.sun.material.uniforms) this.sun.material.uniforms.uTime.value += dt;
  }

  get pickables() {
    const out = [];
    if (this.sun) out.push({ obj: this.sun, info: { type: "star", id: "sol", name: "The Sun", data: null } });
    for (const { mesh, data } of this.planetMeshes.values()) {
      out.push({ obj: mesh, info: { type: "planet", id: data.id, name: data.name, data } });
    }
    for (const { mesh, data } of this.moonMeshes) {
      out.push({ obj: mesh, info: { type: "moon", id: data.id, name: data.name, data } });
    }
    return out;
  }
}
