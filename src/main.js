/**
 * Yugaanta — main.js
 * ---------------------------------------------------------------------------
 * Application entry point: wires the physics engine, the render realms,
 * the UI panels and the animation loop together. Also owns the About tab.
 *
 * Flow: physics core (pure JS) → SimulationEngine → event bus →
 *       RealmManager (three.js views) + HUD/Timeline/Charts/TheoryLab/Inspector
 * ---------------------------------------------------------------------------
 */

import * as THREE from "three";
import { createRenderer, createScene, createCamera, bindResize } from "./render/renderer.js";
import OrbitZoomControls from "./render/controls.js";
import { LabelManager } from "./render/labels.js";
import { RealmManager, REALMS } from "./render/realms.js";
import { UniverseView } from "./render/universeview.js";
import { GalaxyView } from "./render/galaxyview.js";
import { SystemView } from "./render/systemview.js";
import { PlanetView } from "./render/planetview.js";
import { SimulationEngine } from "./sim/engine.js";
import { HUD } from "./ui/hud.js";
import { Timeline } from "./ui/timeline.js";
import { Charts } from "./ui/charts.js";
import { TheoryLab } from "./ui/theorylab.js";
import { Inspector } from "./ui/inspector.js";
import { bus, EV } from "./core/events.js";
import { formatTime } from "./core/units.js";

async function boot() {
  const loader = document.getElementById("loader");
  const loadFill = document.getElementById("loadbar-fill");
  const loadMsg = document.getElementById("loadmsg");
  const setProgress = (pct, msg) => {
    loadFill.style.width = `${pct}%`;
    if (msg) loadMsg.textContent = msg;
  };

  setProgress(8, "Solving the Friedmann equations (RK4, 130k steps)…");
  await frame();

  const canvas = document.getElementById("scene");
  const renderer = createRenderer(canvas);
  const scene = createScene();
  const camera = createCamera();
  bindResize(renderer, camera);
  const labels = new LabelManager(document.getElementById("labels"));

  const perfMode = document.getElementById("perf-mode");

  const engine = new SimulationEngine({}, { N: 64, box: 440, seed: 31337 });
  engine.perfMode = perfMode.checked;
  perfMode.addEventListener("change", () => {
    engine.perfMode = perfMode.checked;
    if (engine.views?.universe) { /* rebuilt lazily */ }
    rebuildField(engine);
  });
  engine.clock.jumpTo(1.0e-32);   // start at the Hot Big Bang

  setProgress(45, "Generating the primordial density field (FFT, 262k particles)…");
  await frame();

  async function rebuildField(eng) {
    eng.rebuild({}, { N: eng.perfMode ? 32 : 64, box: 440, seed: 31337, force: true }, false);
    if (realms.views.universe) {
      realms.views.universe._built = false;
      if (realms.views.universe.points) {
        realms.views.universe.group.remove(realms.views.universe.points);
        realms.views.universe.points = null;
      }
    }
    setProgress(30, "Rebuilding the density field…");
    await frame();
  }

  // Camera controls + picking
  const controls = new OrbitZoomControls(camera, canvas, {
    dist: 220, minDist: 1, maxDist: 400,
    onPick: (e, isDouble) => handlePick(e, isDouble),
  });
  document.getElementById("invert-zoom").addEventListener("change", (e) => {
    controls.setInvertZoom(e.target.checked);
  });

  // Realm manager + views
  const realms = new RealmManager(scene, engine, controls, labels);
  const universeView = new UniverseView(scene, engine);
  const galaxyView = new GalaxyView(scene);
  const systemView = new SystemView(scene, engine);
  const planetView = new PlanetView(scene);
  realms.registerView("universe", universeView);
  realms.registerView("galaxy", galaxyView);
  realms.registerView("system", systemView);
  realms.registerView("planet", planetView);
  engine.views = realms.views;
  realms.goto(0);

  // UI
  const hud = new HUD(engine);
  const timeline = new Timeline(engine);
  const charts = new Charts(engine);
  const lab = new TheoryLab(engine);
  const inspector = new Inspector(engine, realms);

  // About tab
  const about = document.getElementById("tab-about");
  about.innerHTML = `
    <h3>YUGAANTA</h3>
    <p>A real-time 3D universe simulation from the Big Bang to now and into the
    deep future — built on the ΛCDM model with every equation solved live:
    the Friedmann equations (RK4), Big Bang nucleosynthesis, Saha recombination,
    ΛCDM structure growth via the Zel'dovich approximation, Keplerian orbits,
    stellar evolution, and black-hole thermodynamics.</p>
    <h3>CONTROLS</h3>
    <p>· Scroll / pinch — zoom through 46 billion light-years<br/>
       · Drag — orbit around the focus<br/>
       · Double-click objects — fly to them (galaxy → solar system → planet)<br/>
       · Timeline — scrub through 10⁻⁴³ s → 10¹⁰⁰ yr<br/>
       · Theory Lab — change physics & try to falsify the Big Bang<br/>
       · Space — pause · ↑/↓ — time flow speed<br/>
       · R — cycle realm (universe → galaxy → system → planet)</p>
    <h3>SCIENCE NOTES</h3>
    <p>Every derived number in the HUD and Inspector comes from the equations
    in <span class="mono">src/cosmology</span> and <span class="mono">src/physics</span>,
    validated by the test suite (<span class="mono">npm test</span>). The Theory Lab
    shows which predictions break when you change the model — the honest way to
    test a cosmology. Known simplifications (Saha recombination, BBN trace
    abundances, display-grade temperature model in the e± annihilation window)
    are documented in <span class="mono">docs/THEORY.md</span>.</p>`;

  // Realm buttons
  const realmRow = document.getElementById("realm-buttons");
  REALMS.forEach((r, i) => {
    const b = document.createElement("button");
    b.textContent = r.name.split(" ")[0];
    b.title = r.name;
    b.addEventListener("click", () => {
      realms.goto(i);
      controls.setDist([220, 60, 90, 3.2][i]);
    });
    realmRow.appendChild(b);
  });
  realms._refreshRealmUI();

  // Side-panel toggle (prevents overlap on smaller screens)
  const sideToggle = document.getElementById("side-toggle");
  sideToggle.addEventListener("click", () => {
    const side = document.getElementById("side");
    side.classList.toggle("minimized");
    sideToggle.classList.toggle("active", !side.classList.contains("minimized"));
  });

  // RESTART — back to the singularity (t = 0): clock handled by the HUD,
  // camera + realm handled here.
  bus.on(EV.RESTART, () => {
    realms.goto(0);
    controls.setDist(220);
    controls.setTarget(new THREE.Vector3(0, 0, 0));
  });

  // Tab switching
  document.querySelectorAll(".tab").forEach(t => {
    t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      document.querySelectorAll(".tabpane").forEach(x => x.classList.add("hidden"));
      document.getElementById("tab-" + t.dataset.tab).classList.remove("hidden");
    });
  });

  // Picking
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const tooltip = document.getElementById("tooltip");
  function handlePick(e, isDouble) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const pickables = realms.pickables ?? [];
    let hit = null;
    // sprites and meshes
    const objs = pickables.map(p => p.obj);
    const intersects = raycaster.intersectObjects(objs, false);
    if (intersects.length) {
      const obj = intersects[0].object;
      hit = pickables.find(p => p.obj === obj)?.info;
    }
    if (isDouble && hit) {
      realms.focusTarget(hit);
    } else if (hit) {
      bus.emit(EV.PICK, { ...hit });
      document.querySelector('.tab[data-tab="insp"]')?.click();
    } else if (isDouble) {
      // Double-click on empty space = zoom IN one step (was: realm switch,
      // which felt like random zoom-out during exploration).
      controls.zoomStep(1);
    }
    if (hit && !isDouble) {
      tooltip.style.display = "block";
      tooltip.innerHTML = `<div class="tt-name">${hit.name ?? ""}</div><div class="tt-info">${hit.note ?? ""}</div>`;
      tooltip.style.left = `${e.clientX + 12}px`;
      tooltip.style.top = `${e.clientY + 12}px`;
      clearTimeout(handlePick._tt);
      handlePick._tt = setTimeout(() => { tooltip.style.display = "none"; }, 2600);
    }
  }

  // keyboard
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      engine.clock.paused = !engine.clock.paused;
    } else if (e.code === "ArrowUp") {
      engine.clock.auto = false;
      engine.clock.setSpeed(engine.clock.speed * 3, false);
    } else if (e.code === "ArrowDown") {
      engine.clock.auto = false;
      engine.clock.setSpeed(Math.max(1e-34, engine.clock.speed / 3), false);
    } else if (e.code === "KeyR") {
      const next = (realms.realmIndex + 1) % REALMS.length;
      realms.goto(next);
      controls.setDist([220, 60, 90, 3.2][next]);
    }
  });

  // Main loop
  let last = performance.now();
  let fpsAcc = 0, fpsN = 0;
  function loop(now) {
    const dtReal = Math.min(0.1, (now - last) / 1000);
    last = now;
    engine.update(dtReal);
    controls.update(dtReal);
    realms.update(dtReal);
    const state = engine.state();
    hud.update(state);
    charts.updateCursor(state);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  setProgress(88, "Igniting the first stars…");
  await frame();
  setProgress(100, "Ready");
  loader.classList.add("done");
  bus.emit(EV.APP_READY, {});
  requestAnimationFrame(loop);
}

function frame() {
  return new Promise((res) => requestAnimationFrame(() => res()));
}

boot().catch((err) => {
  console.error(err);
  const loadMsg = document.getElementById("loadmsg");
  if (loadMsg) loadMsg.textContent = "Failed to start: " + err.message;
});
