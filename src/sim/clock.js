/**
 * Yugaanta — sim/clock.js
 * ---------------------------------------------------------------------------
 * The cosmic clock. Holds absolute cosmic time t (seconds since the start
 * of the model universe) and the time-flow multiplier. The headline flow
 * rate is 10,000× real time, with adaptive tour mode that scales speed per
 * era so the entire 13.8-billion-year history (and its deep future) plays
 * as a continuous experience.
 * ---------------------------------------------------------------------------
 */

import { bus, EV } from "../core/events.js";
import { SPEED_PRESETS, formatSpeed, formatTime } from "../core/units.js";

export class CosmicClock {
  /**
   * @param {object} cosmo FLRW cosmology (for t0 and adaptive pacing)
   */
  constructor(cosmo) {
    this.cosmo = cosmo;
    this.t = 1e-32;             // start at reheating — the "hot Big Bang"
    this.speed = 1;             // wall-clock multiplier
    this.auto = true;           // adaptive tour pacing
    this.paused = false;
    this._era = null;
    this._acc = 0;
  }

  /** Advance the clock by real elapsed seconds. */
  advance(dtReal) {
    if (this.paused) return;
    this.t += dtReal * this.speed;
    bus.emit(EV.TIME_CHANGED, { t: this.t });
  }

  setSpeed(mult, auto = false) {
    this.speed = mult;
    this.auto = auto;
    bus.emit(EV.SPEED_CHANGED, { mult, auto });
  }

  jumpTo(t) {
    this.t = Math.max(0, t);
    bus.emit(EV.TIME_CHANGED, { t: this.t });
    bus.emit(EV.ERA_CHANGED, { t: this.t });
  }

  /**
   * Adaptive tour pacing: given the current era's span, choose a speed that
   * crosses it in ~6 wall-clock seconds — except that "real physics" eras
   * (like a star's life at 10000×) get minimum natural speeds.
   */
  autoSpeedFor(era, nextEra) {
    if (!era) return 1;
    const tStart = era.tStart;
    const tEnd = Math.min(nextEra ? nextEra.tStart : era.tEnd, this.cosmo.tRip);
    const span = Math.max(tEnd - tStart, 1e-45);
    // Cross each era in ~5-8 s of wall clock.
    const target = span / 6;
    // Clamp: during the Planck/inflation window, we run "slow motion"
    // (multiplier < 1) so the first instants are watchable.
    return Math.max(1e-34, Math.min(target, 1e30));
  }

  /** Format helpers shared by the UI. */
  timeString() { return formatTime(this.t); }
  speedString() { return this.auto ? "AUTO · " + formatSpeed(this.speed) : formatSpeed(this.speed); }
}
