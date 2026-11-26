/**
 * Yugaanta — render/planetview.js
 * ---------------------------------------------------------------------------
 * THE PLANET REALM — fly down to a world's surface. One unit = one planet
 * radius. GLSL domain-warped fBm terrain per world style (Earth continents,
 * Mars deserts, gas-giant bands, ice crusts), animated cloud layer, day/night
 * terminator, atmospheric rim scattering, and city lights on the night side
 * of inhabited worlds. The minimum zoom puts you at the cloud tops —
 * the surface fills the view.
 * ---------------------------------------------------------------------------
 */

import * as THREE from "three";
import { TERRAIN_PALETTES } from "../objects/planet.js";

const TERRAIN_VERT = `
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vWorldPos;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vPos = position;
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const TERRAIN_FRAG = `
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vWorldPos;
uniform vec3 uLightDir;
uniform vec3 uOceanDeep;
uniform vec3 uOceanShore;
uniform vec3 uLowland;
uniform vec3 uUpland;
uniform vec3 uMountain;
uniform vec3 uSnow;
uniform float uSeed;
uniform float uSeaLevel;
uniform float uBanded;
uniform float uTime;
uniform float uCityLights;

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
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p = p * 2.04 + vec3(7.1, 11.9, 3.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 n = normalize(vPos);
  float lat = n.y;
  vec3 h;

  if (uBanded > 0.5) {
    // gas giant: latitudinal bands + storm swirls
    float bands = sin(n.y * 26.0 + fbm(n * 5.0 + vec3(uTime * 0.008, uSeed, 0.0)) * 4.0);
    h = 0.5 + 0.35 * bands + 0.2 * (fbm(n * 8.0 + vec3(uSeed)) - 0.5);
  } else {
    // continents via domain-warped fBm (the "look" of real coastlines)
    vec3 w = n * 2.6 + fbm(n * 3.4 + uSeed) * 0.85;
    h = fbm(w) * 0.5 + 0.5;
    // polar ice caps
    float ice = smoothstep(0.72, 0.86, abs(lat) + 0.12 * (h - 0.5));
    h = mix(h, 1.0, ice);
  }

  vec3 col;
  float sl = uSeaLevel;
  if (h < sl) {
    col = mix(uOceanDeep, uOceanShore, smoothstep(0.0, sl, h) / max(sl, 0.001));
  } else if (h < sl + 0.12) {
    col = mix(uLowland, uUpland, smoothstep(sl, sl + 0.12, h));
  } else if (h < sl + 0.28) {
    col = mix(uUpland, uMountain, smoothstep(sl + 0.12, sl + 0.28, h));
  } else {
    col = mix(uMountain, uSnow, smoothstep(sl + 0.28, 0.95, h));
  }
  if (uBanded > 0.5) {
    col = mix(uOceanDeep, uLowland, h);
    col = mix(col, uSnow, smoothstep(0.85, 1.0, h));
  }

  // lighting with soft terminator
  float diff = max(dot(vNormal, normalize(uLightDir)), 0.0);
  float night = smoothstep(0.05, -0.08, dot(vNormal, normalize(uLightDir)));
  // city lights on the night side of habitable worlds
  float city = 0.0;
  if (uCityLights > 0.5) {
    float land = step(sl, h);
    city = land * night * step(0.55, hash(floor(n * 90.0))) * smoothstep(0.5, 0.6, h);
  }
  vec3 lit = col * (0.04 + diff * 1.15);
  lit += vec3(1.0, 0.85, 0.55) * city * 0.7;
  gl_FragColor = vec4(lit, 1.0);
}`;

const CLOUD_FRAG = `
varying vec3 vNormal;
varying vec3 vPos;
uniform vec3 uLightDir;
uniform float uSeed;
uniform float uTime;
uniform float uCoverage;
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
    p = p * 2.11 + vec3(5.3, 9.1, 1.7);
    a *= 0.5;
  }
  return v;
}
void main() {
  vec3 n = normalize(vPos);
  float c = fbm(n * 3.4 + vec3(uTime * 0.006, uSeed, -uTime * 0.004));
  c += 0.4 * fbm(n * 7.0 - vec3(uTime * 0.01));
  float alpha = smoothstep(0.9 - uCoverage * 0.5, 1.15 - uCoverage * 0.3, c) * 0.85;
  float diff = max(dot(vNormal, normalize(uLightDir)), 0.0);
  gl_FragColor = vec4(vec3(0.06 + diff), alpha);
}`;

const ATMO_FRAG = `
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vWorldPos;
uniform vec3 uColor;
uniform vec3 uLightDir;
void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - abs(dot(viewDir, vNormal)), 2.6);
  float diff = max(dot(vNormal, normalize(uLightDir)), 0.0);
  gl_FragColor = vec4(uColor * (0.25 + diff), fres * (0.15 + 0.75 * diff));
}`;

export class PlanetView {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this._builtFor = null;
    this.current = null;
    this.pickables = [];
  }

  /** Build a planet view for a body descriptor {name, seed, type, colorHue, rotationH, cityLights}. */
  buildFor(body) {
    const key = `${body.id}|${body.seed}`;
    if (this._builtFor === key) { this.current = body; return; }
    while (this.group.children.length) {
      const c = this.group.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    const pal = TERRAIN_PALETTES[body.type] ?? TERRAIN_PALETTES.rocky;
    const style = body.type === "gas" ? 1 : 0;

    const terrMat = new THREE.ShaderMaterial({
      vertexShader: TERRAIN_VERT, fragmentShader: TERRAIN_FRAG,
      uniforms: {
        uLightDir: { value: new THREE.Vector3(1, 0.2, 0.3).normalize() },
        uOceanDeep: { value: new THREE.Vector3(...pal.oceanDeep) },
        uOceanShore: { value: new THREE.Vector3(...pal.oceanShore) },
        uLowland: { value: new THREE.Vector3(...pal.lowland) },
        uUpland: { value: new THREE.Vector3(...pal.upland) },
        uMountain: { value: new THREE.Vector3(...pal.mountain) },
        uSnow: { value: new THREE.Vector3(...pal.snow) },
        uSeed: { value: (body.seed ?? 1) * 2.71 },
        uSeaLevel: { value: pal.seaLevel },
        uBanded: { value: pal.banded ? 1 : 0 },
        uTime: { value: 0 },
        uCityLights: { value: body.cityLights ? 1 : 0 },
      },
    });
    this.terrain = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), terrMat);
    this.terrain.userData = { type: "planet-surface", id: body.id, name: body.name };
    this.group.add(this.terrain);

    // clouds
    if (pal.clouds > 0.01) {
      this.clouds = new THREE.Mesh(
        new THREE.SphereGeometry(1.015, 64, 48),
        new THREE.ShaderMaterial({
          vertexShader: TERRAIN_VERT, fragmentShader: CLOUD_FRAG,
          uniforms: {
            uLightDir: terrMat.uniforms.uLightDir,
            uSeed: { value: (body.seed ?? 1) * 1.61 },
            uTime: { value: 0 },
            uCoverage: { value: pal.clouds },
          },
          transparent: true, depthWrite: false,
        })
      );
      this.group.add(this.clouds);
    } else this.clouds = null;

    // atmosphere rim
    if (pal.atmosphere) {
      this.atmo = new THREE.Mesh(
        new THREE.SphereGeometry(1.06, 48, 32),
        new THREE.ShaderMaterial({
          vertexShader: TERRAIN_VERT, fragmentShader: ATMO_FRAG,
          uniforms: {
            uColor: { value: new THREE.Vector3(...pal.atmosphere) },
            uLightDir: terrMat.uniforms.uLightDir,
          },
          transparent: true, depthWrite: false,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
        })
      );
      this.group.add(this.atmo);
    }

    // rings (Saturn, Uranus)
    if (body.rings) {
      const ringGeo = new THREE.RingGeometry(1.4, 2.4, 96);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xd8c8a8, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 - (body.tiltDeg ?? 20) * Math.PI / 180 * 0.6;
      this.group.add(ring);
    }

    this._builtFor = key;
    this.current = body;
    this.pickables = [{ obj: this.terrain, info: { type: "planet-surface", id: body.id, name: body.name } }];
  }

  update(body, dt, sunDirWorld) {
    this.buildFor(body);
    const u = this.terrain.material.uniforms;
    u.uTime.value += dt;
    if (sunDirWorld) u.uLightDir.value.copy(sunDirWorld).normalize();
    if (this.clouds) this.clouds.material.uniforms.uTime.value += dt;
    // rotation
    const dayRate = 0.02 / Math.max(0.5, Math.abs(body.rotationH ?? 24) / 24);
    this.terrain.rotation.y += dt * dayRate;
    if (this.clouds) this.clouds.rotation.y += dt * dayRate * 1.06;
  }
}
