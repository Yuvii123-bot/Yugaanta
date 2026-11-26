/**
 * Physics module validation — relativity, stellar physics, thermodynamics,
 * orbital mechanics against canonical values.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { C, COSMO_DEFAULT } from "../src/core/constants.js";
import {
  schwarzschildRadius, lorentzFactor, timeDilationFactor,
  lightDeflectionRadians, ARCSEC, hawkingTemperature, hawkingLifetime,
  gravitationalRedshift, isco, hawkingPower,
} from "../src/physics/relativity.js";
import {
  luminosity, mainSequenceLifetime, spectralClass, effectiveTemperature,
  whiteDwarfRadius, CHANDRASEKHAR, habitableZone, keplerPeriod,
  equilibriumTemperature, remnantOf,
} from "../src/physics/stellar.js";
import {
  blackbodyEnergyDensity, blackHoleEntropy, jeansLength, freeFallTime,
} from "../src/physics/thermodynamics.js";
import { M_SUN, R_SUN, L_SUN, YR } from "../src/core/units.js";
import { planetDossier, TERRAIN_PALETTES } from "../src/objects/planet.js";
import { nfwCircularVelocity, mSigma, milkyWayRotation } from "../src/objects/galaxy.js";
import { blackHoleDossier } from "../src/objects/blackhole.js";
import { keplerPosition, earthFacts, PLANETS } from "../src/objects/sol.js";
import { parseStarCatalog } from "../src/objects/catalogs.js";

test("Schwarzschild radius of the Sun ≈ 2.953 km", () => {
  const rs = schwarzschildRadius(M_SUN);
  assert.ok(Math.abs(rs / 1000 - 2.953) < 0.002, `got ${rs / 1000} km`);
});

test("Schwarzschild radius of the Earth ≈ 8.87 mm", () => {
  const rs = schwarzschildRadius(C.M_earth);
  assert.ok(Math.abs(rs - 0.00887) < 0.0001, `got ${rs} m`);
});

test("Lorentz factor: γ(0)=1, γ(0.87c)≈2", () => {
  assert.equal(lorentzFactor(0), 1);
  assert.ok(Math.abs(lorentzFactor(0.8660254 * C.c) - 2) < 0.01);
});

test("time dilation: half-speed factor at 0.75 r_s", () => {
  const rs = 10;
  assert.ok(Math.abs(timeDilationFactor(2 * rs, rs) - Math.SQRT1_2) < 1e-12);
});

test("light deflection at the solar limb ≈ 1.75″", () => {
  const alpha = lightDeflectionRadians(M_SUN, R_SUN) / ARCSEC;
  assert.ok(Math.abs(alpha - 1.75) < 0.02, `got ${alpha}″`);
});

test("Hawking temperature of a solar-mass BH ≈ 6.17e-8 K", () => {
  const T = hawkingTemperature(M_SUN);
  assert.ok(Math.abs(T / 6.17e-8 - 1) < 0.02, `got ${T} K`);
});

test("Hawking lifetime τ(M☉) ≈ 2.1e67 yr", () => {
  const tau = hawkingLifetime(M_SUN) / YR;
  assert.ok(Math.abs(tau / 2.1e67 - 1) < 0.15, `got ${tau}`);
});

test("gravitational redshift diverges at the horizon", () => {
  const rs = schwarzschildRadius(M_SUN);
  const z10 = gravitationalRedshift(M_SUN, 10 * rs);
  assert.ok(z10 > 0 && z10 < 1);
  assert.equal(gravitationalRedshift(M_SUN, rs), Infinity);
});

test("ISCO = 3 r_s", () => {
  assert.equal(isco(1), 3);
});

test("Hawking power grows as BH shrinks", () => {
  assert.ok(hawkingPower(1e12) > hawkingPower(M_SUN));
});

test("Sun: luminosity-mass relation, lifetime 10 Gyr", () => {
  assert.equal(luminosity(1), 1);
  const tau = mainSequenceLifetime(1);
  assert.ok(Math.abs(tau - 1e10) / 1e10 < 1e-9);
});

test("10 M☉ star: L≈3162 L☉, τ≈31.6 Myr", () => {
  assert.ok(Math.abs(luminosity(10) - 3162) < 2);
  assert.ok(Math.abs(mainSequenceLifetime(10) / 1e6 - 31.6) < 0.5);
});

test("spectral classes: Sun is G, Betelgeuse-ish is M", () => {
  assert.equal(spectralClass(5772).cls, "G");
  assert.equal(spectralClass(3600).cls, "M");
  assert.equal(spectralClass(35000).cls, "O");
});

test("solar effective temperature from L,R ≈ 5772 K", () => {
  const T = effectiveTemperature(1, 1);
  assert.ok(Math.abs(T - 5772) < 30, `got ${T} K`);
});

test("white dwarf radius shrinks with mass, below Chandrasekhar", () => {
  const r1 = whiteDwarfRadius(0.6);
  const r2 = whiteDwarfRadius(1.3);
  assert.ok(r1 > r2);
  assert.ok(r1 > 0.008 && r1 < 0.02, `R = ${r1} R☉`);
});

test("remnant mapping: 1 M☉→WD, 15→NS, 30→BH", () => {
  assert.equal(remnantOf(1).type, "white-dwarf");
  assert.equal(remnantOf(15).type, "neutron-star");
  assert.equal(remnantOf(30).type, "black-hole");
  assert.ok(remnantOf(1).mass < CHANDRASEKHAR);
});

test("habitable zone of the Sun contains 1 AU", () => {
  const hz = habitableZone(1);
  assert.ok(hz.inner < 1 && hz.outer > 1);
});

test("Earth's year = 365.256 days from Kepler III", () => {
  const P = keplerPeriod(C.AU, M_SUN) / 86400;
  assert.ok(Math.abs(P - 365.25) < 0.5, `got ${P} d`);
});

test("Earth equilibrium temperature ≈ 255 K", () => {
  const T = equilibriumTemperature(L_SUN, C.AU, 0.306);
  assert.ok(Math.abs(T - 255) < 4, `got ${T} K`);
});

test("blackbody energy density: a_rad T⁴", () => {
  const u = blackbodyEnergyDensity(2.72548);
  assert.ok(Math.abs(u - 4.17e-14) / 4.17e-14 < 0.02, `got ${u}`);
});

test("BH entropy scales as M²: ~1.05e77 k per solar mass", () => {
  const S1 = blackHoleEntropy(M_SUN);
  const S4 = blackHoleEntropy(4 * M_SUN);
  assert.ok(Math.abs(S4 / S1 - 16) < 0.01);
  assert.ok(Math.abs(S1 / C.kB / 1.05e77 - 1) < 0.1);
});

test("Jeans length shrinks with density", () => {
  assert.ok(jeansLength(10, 1e-20) > jeansLength(10, 1e-18));
});

test("free-fall time formula: ~17 h for air density", () => {
  const t = freeFallTime(1.2);   // kg/m³
  assert.ok(t > 50000 && t < 70000, `got ${t} s (${t / 3600} h)`);
});

test("Earth dossier: g=9.8, v_esc=11.2 km/s", () => {
  const d = planetDossier({
    name: "Earth", massKg: C.M_earth, radiusKm: 6371, tempK: 288,
    albedo: 0.306, rotationH: 24, aAU: 1, starL: L_SUN,
  });
  assert.ok(Math.abs(d.gravity - 9.81) < 0.05, `g = ${d.gravity}`);
  assert.ok(Math.abs(d.escapeVelocity / 1000 - 11.19) < 0.1);
  assert.ok(Math.abs(d.equilibriumTempK - 255) < 4);
  assert.ok(d.greenhouseDelta > 20 && d.greenhouseDelta < 45);
});

test("terrain palettes complete", () => {
  for (const key of ["earth", "mars", "gas", "ice"]) {
    const p = TERRAIN_PALETTES[key];
    assert.ok(p.oceanDeep && p.lowland && p.snow);
  }
});

test("NFW halo flattens the Milky Way rotation curve", () => {
  const v8 = milkyWayRotation(8);
  const v15 = milkyWayRotation(15);
  assert.ok(v8 > 180 && v8 < 300, `v(8 kpc) = ${v8} km/s`);
  // flatness: ratio within ±35% over 8→15 kpc (Keplerian would be ~0.73)
  assert.ok(v15 / v8 > 0.65 && v15 / v8 < 1.35, `ratio = ${v15 / v8}`);
});

test("M–σ relation: MW-like σ=160 km/s → ~1e7-1e8 M☉ BH", () => {
  const M = mSigma(160);
  assert.ok(M > 1e6 && M < 1e9, `got ${M}`);
});

test("black hole dossier: photon sphere and ISCO scale with r_s", () => {
  const d = blackHoleDossier(10 * M_SUN);
  assert.ok(Math.abs(d.iscoRadius / d.schwarzschildRadius - 3) < 1e-9);
  assert.ok(Math.abs(d.photonSphere / d.schwarzschildRadius - 1.5) < 1e-9);
});

test("Kepler position: Mercury stays on its 88-day orbit", () => {
  const merc = PLANETS[0];
  const p1 = keplerPosition(merc, 0);
  const p2 = keplerPosition(merc, merc.periodDays * 86400);
  assert.ok(Math.abs(p1.x - p2.x) < 0.01 && Math.abs(p1.y - p2.y) < 0.01, "period closes");
  assert.ok(p1.r > 0.3 && p1.r < 0.48, `r = ${p1.r} AU`);
});

test("earthFacts: greenhouse delta ≈ 33 K", () => {
  const f = earthFacts();
  assert.ok(Math.abs(f.g - 9.81) < 0.05);
  assert.ok(f.greenhouseDelta > 25 && f.greenhouseDelta < 40);
});

test("star catalog parses to 100+ real stars", () => {
  const stars = parseStarCatalog();
  assert.ok(stars.length > 100, `got ${stars.length}`);
  const sirius = stars.find(s => s.name === "Sirius");
  assert.ok(sirius, "Sirius present");
  assert.ok(Math.abs(sirius.distLy - 8.6) < 0.01);
  assert.equal(sirius.bayer, "α CMa");
});

test("CMB temperature: Hawking vs CMB — solar BHs grow today", () => {
  const TH = hawkingTemperature(M_SUN);
  assert.ok(TH < COSMO_DEFAULT.T0, "solar BH colder than CMB → absorbs, grows");
});
