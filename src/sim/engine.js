/**
 * Yugaanta — sim/engine.js
 * ---------------------------------------------------------------------------
 * The Simulation Engine — the orchestrator of everything physical.
 *
 * Owns:
 *   - the FLRW cosmology (rebuildable from Theory Lab parameters),
 *   - BBN results, recombination solution, era registry, event registry,
 *   - the cosmic clock and adaptive tour pacing,
 *   - the structure-formation field (Gaussian δ + Zel'dovich ψ),
 *   - growth factor application over time,
 *   - realm (view) orchestration: which renderer is active at which zoom.
 *
 * Pure-physics parts are importable in Node for the test suite; the render
 * and UI layers subscribe through the event bus.
 * ---------------------------------------------------------------------------
 */

import { buildCosmology, cmbTemperature, A_START, T_REHEAT, H_INFLATION } from "../cosmology/flrw.js";
import { COSMO_DEFAULT } from "../core/constants.js";
import { runBBN } from "../cosmology/bbn.js";
import { solveRecombination } from "../cosmology/recombination.js";
import { buildEraRegistry, buildEventRegistry, eraAt } from "../cosmology/epochs.js";
import { runFalsification } from "../cosmology/falsify.js";
import { buildField, applyZeldovich } from "../cosmology/perturbations.js";
import { setPrimaryAOfT } from "../cosmology/flrw.js";
import { CosmicClock } from "./clock.js";
import { bus, EV } from "../core/events.js";
import { mulberry32 } from "../core/mathx.js";

export class SimulationEngine {
  constructor(params = {}, fieldOpts = {}) {
    this.params = { ...COSMO_DEFAULT, ...params };
    this.fieldOpts = fieldOpts;
    this.rebuild(params, fieldOpts, true);
    this.clock = new CosmicClock(this.cosmo);
    setPrimaryAOfT((t) => this.cosmo.aAt(t));
    this._lastEraId = null;
  }

  /**
   * Rebuild all physics from parameters (Theory Lab "Run" action).
   */
  rebuild(params = {}, fieldOpts = {}, initial = false) {
    this.params = { ...this.params, ...params };
    const t0 = performance.now();

    this.cosmo = buildCosmology(this.params);
    setPrimaryAOfT((t) => this.cosmo.aAt(t));
    this.bbn = runBBN({ eta: 6.11e-10 * (this.params.Ob ?? 0.0493) / 0.0493 });
    this.rec = solveRecombination(this.cosmo);
    this.eras = buildEraRegistry(this.cosmo, this.bbn, this.rec);
    this.events = buildEventRegistry(this.cosmo, this.bbn, this.rec);
    this.falsification = runFalsification(this.cosmo, this.bbn, this.rec);

    if (this.params.T0 > 0 && (initial || fieldOpts.force)) {
      this.field = buildField({
        N: fieldOpts.N ?? 64,
        box: fieldOpts.box ?? 440,
        seed: fieldOpts.seed ?? 31337,
        p: { ns: this.params.ns, Om: this.params.Om, H0: this.params.H0 },
        sigma8: this.params.sigma8,
      });
    }
    this.buildMs = performance.now() - t0;
    bus.emit(EV.PARAMS_REBUILT, { engine: this, initial });
    this.clock?.jumpTo(this.clock.t);   // re-emit
  }

  /** Advance the simulation by real elapsed seconds. */
  update(dtReal) {
    const clock = this.clock;
    // adaptive speed: recompute on era change
    const era = this.eraAt(clock.t);
    if (clock.auto && era) {
      const idx = this.eras.indexOf(era);
      const next = this.eras[idx + 1];
      const want = clock.autoSpeedFor(era, next);
      if (Math.abs(want - clock.speed) > want * 0.2) {
        clock.setSpeed(want, true);
      }
    }
    clock.advance(dtReal);
    const e = this.eraAt(clock.t);
    if (e && e.id !== this._lastEraId) {
      this._lastEraId = e.id;
      bus.emit(EV.ERA_CHANGED, { era: e, t: clock.t });
    }
  }

  eraAt(t) { return eraAt(this.eras, t); }

  /**
   * Snapshot of the physical state of the universe at the current clock
   * time — the HUD's data source.
   */
  state() {
    const t = this.clock.t;
    const a = t < T_REHEAT
      ? A_START * Math.exp(H_INFLATION * (t - T_REHEAT))
      : this.cosmo.aAt(t);
    const T = cmbTemperature(t, this.params.T0 || 2.72548);
    const dens = this.cosmo.densities(Math.max(a, A_START));
    const Hkm = t < T_REHEAT ? H_INFLATION / 1000 : this.cosmo.Hkm(Math.max(a, A_START));
    return {
      t, a, z: 1 / a - 1, T,
      Hkm,
      dens,
      horizonComoving: this.cosmo.particleHorizonComoving(Math.max(a, A_START)),
      growth: this.cosmo.growth(Math.max(a, A_START)),
      growthRate: this.cosmo.growthRate(Math.max(a, A_START)),
      soundHorizon: this.cosmo.soundHorizon(Math.max(a, A_START)),
      era: this.eraAt(t),
    };
  }

  /**
   * Particle positions for the current growth factor — fills outPositions
   * (Float32Array) for the GPU. Cheap: one add per particle per component.
   */
  particlePositions(outPositions) {
    if (!this.field) return null;
    const a = this.cosmo.aAt(this.clock.t);
    const D = this.cosmo.growth(Math.max(a, A_START));
    applyZeldovich(this.field, D, outPositions);
    return outPositions;
  }

  /** Run the falsification suite for the current params (cached). */
  getFalsification() {
    return this.falsification;
  }

  /**
   * Deterministic RNG for procedural content anchored to cosmic time —
   * e.g. "which galaxies exist at t". Used by the galaxy view.
   */
  rngFor(salt) {
    return mulberry32((salt * 2654435761 + Math.floor(this.cosmo.t0)) >>> 0);
  }
}

export default SimulationEngine;
