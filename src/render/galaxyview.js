/**
 * Yugaanta — render/galaxyview.js
 * ---------------------------------------------------------------------------
 * THE GALAXY REALM — a procedural Milky Way you can fly into.
 *
 * ~120,000 instanced point-sprite stars generated from the galaxy model
 * (barred spiral: bulge, 4 log-spiral arms, halo, HII regions), with the
 * Sun's position marked, Sgr A* at the centre, and globular-cluster
 * sprinkles in the halo. Entering via the Sun marker hands off to the
 * Solar System realm.
 * ---------------------------------------------------------------------------
 */

import * as THREE from "three";
import { generateGalaxyStars, GALAXIES } from "../objects/galaxy.js";
import { makeGlowTexture } from "./renderer.js";

const VERT = `
attribute float aSize;
attribute vec3 aColor;
varying vec3 vColor;
varying float vAlpha;
uniform float uFaint;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float s = aSize * (46.0 / -mv.z);
  gl_PointSize = clamp(s, 0.8, 7.0);
  vAlpha = mix(0.55, 1.0, uFaint);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r = length(d);
  float a = smoothstep(0.5, 0.05, r);
  gl_FragColor = vec4(vColor, a * vAlpha);
}`;

export class GalaxyView {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this._builtFor = null;
    this.pickables = [];
  }

  /** Build (or rebuild) the galaxy point cloud for a galaxy parameter set. */
  buildFor(galParams, engine) {
    const key = `${galParams.seed}|${galParams.arms}`;
    if (this._builtFor === key) return;
    // clear previous
    while (this.group.children.length) {
      const c = this.group.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    const N = engine?.perfMode ? 40000 : 120000;
    const g = generateGalaxyStars(galParams, N);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(g.pos, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(g.col, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(g.size, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uFaint: { value: 0 } },
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.group.add(this.points);

    // core glow
    const core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture("255,225,180"), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85,
    }));
    core.scale.setScalar(6);
    this.group.add(core);

    // Sagittarius A* marker
    this.bhMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    this.bhMarker.position.set(0, 0, 0);
    this.group.add(this.bhMarker);

    // Sun position: 8.2 kpc from centre, in the disk
    this.sunMesh = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture("255,246,200"), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.sunMesh.scale.setScalar(1.6);
    this.sunMesh.position.set(4.5, 0.01, 6.8);
    this.group.add(this.sunMesh);

    // globular clusters in the halo
    const globCount = 60;
    const globPos = new Float32Array(globCount * 3);
    for (let i = 0; i < globCount; i++) {
      const r = 6 + Math.random() * 26;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      globPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      globPos[i * 3 + 1] = r * Math.cos(ph);
      globPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute("position", new THREE.BufferAttribute(globPos, 3));
    this.globulars = new THREE.Points(gg, new THREE.PointsMaterial({
      color: 0xffe9c8, size: 0.35, sizeAttenuation: true,
      transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.group.add(this.globulars);

    this._builtFor = key;
    this.pickables = [
      { obj: this.sunMesh, info: { type: "system-target", id: "sol", name: "The Sun (G2V)", note: "Our star — double-click to enter the Solar System" } },
      { obj: this.bhMarker, info: { type: "blackhole", id: "sgra", name: "Sagittarius A*", massMsun: 4.297e6, note: "4.3 million solar masses, 26,670 ly away" } },
    ];
  }

  update(galParams, engine, dt) {
    this.buildFor(galParams, engine);
    if (this.points) {
      // subtle rotation of the disk (galactic year ~230 Myr at MW radius)
      this.points.rotation.y += dt * 0.0006;
      this.globulars.rotation.y += dt * 0.0002;
    }
  }
}

export { GALAXIES };
