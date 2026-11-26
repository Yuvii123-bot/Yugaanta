/**
 * Yugaanta — core/events.js
 * ---------------------------------------------------------------------------
 * Tiny synchronous pub/sub event bus. The simulation decouples the physics
 * engine (sim/*) from the rendering and UI layers (render/*, ui/*) purely
 * through these events, so the physics core can be tested headless in Node.
 * ---------------------------------------------------------------------------
 */

export class EventBus {
  constructor() { this.map = new Map(); }
  /** Subscribe; returns an unsubscribe function. */
  on(type, fn) {
    if (!this.map.has(type)) this.map.set(type, new Set());
    this.map.get(type).add(fn);
    return () => this.off(type, fn);
  }
  off(type, fn) { this.map.get(type)?.delete(fn); }
  /** Publish to all listeners; listener exceptions are contained. */
  emit(type, payload) {
    const set = this.map.get(type);
    if (!set) return;
    for (const fn of set) {
      try { fn(payload); }
      catch (err) { console.error(`[events] handler for "${type}" failed:`, err); }
    }
  }
}

/** Shared bus for the whole app (one per page load). */
export const bus = new EventBus();

/** Event names used across the app (single source of truth). */
export const EV = {
  TIME_CHANGED: "time-changed",       // {t}
  SPEED_CHANGED: "speed-changed",     // {mult, auto}
  ERA_CHANGED: "era-changed",         // {era}
  PARAMS_CHANGED: "params-changed",   // {params}
  REALM_CHANGED: "realm-changed",     // {realm}
  FOCUS_CHANGED: "focus-changed",     // {target}
  PICK: "pick",                       // {info}
  PARAMS_REBUILT: "params-rebuilt",   // {cosmo}
  LOADING_PROGRESS: "loading-progress", // {pct, msg}
  APP_READY: "app-ready",
};
