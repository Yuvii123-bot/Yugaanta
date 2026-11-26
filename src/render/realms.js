/**
 * Yugaanta — render/realms.js
 * ---------------------------------------------------------------------------
 * THE SCALE MANAGER — one continuous zoom across 26 orders of magnitude.
 *
 * Realms:
 *   universe  1 unit = 1 Mpc   (box 440 Mpc)   zoom 1–400 units
 *   galaxy    1 unit = 1 kpc   (MW r=26)       zoom 0.5–120 units
 *   system    1 unit = 0.1 AU  (Neptune 300)   zoom 0.05–700 units
 *   planet    1 unit = 1 R     (Earth 1.0)     zoom 1.02–6 units
 *
 * Focus targets hand off between realms (double-click a marker → fly in).
 * The realm switch is a quick fade; camera bounds re-fit automatically.
 * ---------------------------------------------------------------------------
 */

import * as THREE from "three";
import { bus, EV } from "../core/events.js";
import { C } from "../core/constants.js";

export const REALMS = [
  { id: "universe", name: "OBSERVABLE UNIVERSE", unitM: 1 * 1e6 * C.pc, min: 1, max: 400, note: "440 Mpc of cosmic web — every dot is ~10⁵ galaxies' worth of dark matter" },
  { id: "galaxy", name: "THE MILKY WAY", unitM: 1000 * C.pc, min: 0.4, max: 140, note: "100-400 billion stars across a 100,000-light-year disk" },
  { id: "system", name: "THE SOLAR SYSTEM", unitM: 0.1 * C.AU, min: 0.06, max: 800, note: "Keplerian orbits, propagated live from the cosmic clock" },
  { id: "planet", name: "PLANET SURFACE", unitM: 6.371e6, min: 1.02, max: 6, note: "Procedural terrain from orbit to cloud tops" },
];

export class RealmManager {
  /**
   * @param {THREE.Scene} scene
   * @param {object} engine
   * @param {OrbitZoomControls} controls
   * @param {LabelManager} labels
   */
  constructor(scene, engine, controls, labels) {
    this.scene = scene;
    this.engine = engine;
    this.controls = controls;
    this.labels = labels;
    this.realmIndex = 0;
    this.fadeT = 0;
    this.views = {};
    this.pickables = [];
    this.fadeOverlay = null;
    this._pendingRealm = null;
  }

  registerView(id, view) {
    this.views[id] = view;
    view.group.visible = false;
  }

  /** Enter a realm by index or id. */
  goto(idOrIndex) {
    const idx = typeof idOrIndex === "number" ? idOrIndex
      : REALMS.findIndex(r => r.id === idOrIndex);
    if (idx < 0 || idx >= REALMS.length) return;
    const realm = REALMS[idx];
    this.realmIndex = idx;
    this._pendingRealm = null;
    for (const [rid, v] of Object.entries(this.views)) {
      v.group.visible = (rid === realm.id);
    }
    this.controls.setBounds(realm.min, realm.max);
    bus.emit(EV.REALM_CHANGED, { realm, index: idx });
    this._refreshRealmUI();
    return realm;
  }

  _refreshRealmUI() {
    const el = document.getElementById("realm-name");
    const hint = document.getElementById("realm-hint");
    const realm = REALMS[this.realmIndex];
    if (el) el.textContent = realm.name;
    if (hint) hint.textContent = realm.note;
    document.querySelectorAll("#realm-buttons button").forEach((b, i) => {
      b.classList.toggle("active", i === this.realmIndex);
    });
  }

  /**
   * Per-frame update: active view physics + realm boundary checks.
   */
  update(dtReal) {
    const state = this.engine.state();
    const realm = REALMS[this.realmIndex];
    const view = this.views[realm.id];
    const camDist = this.controls.dist;

    if (!view) return;
    if (realm.id === "universe") {
      view.update(state, dtReal, this.labels, this.controls.camera, this.pickables);
      // fade the cosmic web in as structure grows
      const vis = Math.min(1, Math.max(0.05, state.growth * 40));
      view.setParticleOpacity(this.engine.params.T0 === 0 ? 0 : vis);
      if (view.fireball) {
        view.fireball.visible = state.T > 800;
      }
      if (view.cmbSky) view.cmbSky.visible = state.T <= 3200 && state.T > 60;
      this._ensureLabelsUniverse(view);
    } else if (realm.id === "galaxy") {
      const mw = { seed: 7, arms: 4, bar: true, radiusKpc: 26 };
      view.update(mw, this.engine, dtReal);
      this.pickables = view.pickables;
      this._ensureLabelsGalaxy(view);
    } else if (realm.id === "system") {
      if (state.t < 9.2e9 * 3.15576e7) {
        // The Sun does not exist yet — show the primordial state
        view.group.visible = false;
        if (this._preSolarNote) this._preSolarNote.visible = true;
      } else {
        view.group.visible = true;
        if (this._preSolarNote) this._preSolarNote.visible = false;
      }
      view.update(state, dtReal, camDist);
      this.pickables = view.pickables;
      this._ensureLabelsSystem(view);
    } else if (realm.id === "planet") {
      const body = this._planetBody ?? { id: "earth", name: "Earth", seed: 42, type: "earth", rotationH: 24, cityLights: true };
      const sunDir = new THREE.Vector3(1, 0.15, 0.4);
      view.update(body, dtReal, sunDir);
      this.pickables = view.pickables;
      this._ensureLabelsPlanet(view, body);
    }

    this.labels.update(this.controls.camera, camDist);
  }

  // --- label provisioning (created once per realm) ---
  _ensureLabelsUniverse(view) {
    if (this._uniLabels) return;
    this._uniLabels = [
      this.labels.add(view.mwMarker, "Milky Way", { cls: "big" }),
      this.labels.add(view.m31Marker, "Andromeda (M31)", { cls: "big" }),
      this.labels.add(view.sunMarker, "The Sun — you are here", { cls: "" }),
    ];
  }
  _ensureLabelsGalaxy(view) {
    if (this._galLabels) return;
    this._galLabels = [
      this.labels.add(view.sunMesh, "The Sun", { cls: "big" }),
      this.labels.add(view.bhMarker, "Sgr A* — 4.3M M☉ black hole", { cls: "dim" }),
    ];
  }
  _ensureLabelsSystem(view) {
    if (this._sysLabels) return;
    this._sysLabels = [];
    for (const { mesh, data } of view.planetMeshes.values()) {
      this._sysLabels.push(this.labels.add(mesh, data.name, {}));
    }
    this._sysLabels.push(this.labels.add(view.sun, "The Sun", { cls: "big" }));
  }
  _ensureLabelsPlanet(view, body) {
    if (this._plLabels && this._plLabelsFor === body.id) return;
    if (this._plLabels) for (const l of this._plLabels) this.labels.remove(l);
    this._plLabels = [this.labels.add(view.terrain, body.name, { cls: "big" })];
    this._plLabelsFor = body.id;
  }

  /**
   * Focus hand-offs. Called by main.js on picks.
   */
  focusTarget(info) {
    if (info.type === "galaxy-target" && info.id === "milky-way") {
      this.goto("galaxy");
      this.controls.setDist(60);
    } else if (info.type === "galaxy-target" && info.id === "m31") {
      // show info only
      bus.emit(EV.PICK, info);
    } else if (info.type === "system-target") {
      const state = this.engine.state();
      if (state.t < 9.2e9 * 3.15576e7) {
        bus.emit(EV.PICK, { type: "not-yet", name: "The Sun", note: "The Sun has not formed yet at this cosmic time — jump to ~9.2 Gyr (or press NOW) and return." });
        return;
      }
      this.goto("system");
      this.controls.setDist(90);
    } else if (info.type === "planet") {
      this._planetBody = {
        id: info.id, name: info.data.name, seed: info.data.seed,
        type: info.data.type, rotationH: info.data.rotationH,
        colorHue: info.data.colorHue, rings: info.data.rings, tiltDeg: info.data.tiltDeg,
        cityLights: info.id === "earth",
      };
      this.goto("planet");
      this.controls.setDist(3.2);
    }
  }

  /** Distance to focus in metres (for the HUD scale readout). */
  focusDistanceMetres() {
    const realm = REALMS[this.realmIndex];
    return this.controls.dist * realm.unitM;
  }
}
