/**
 * Yugaanta — render/controls.js
 * ---------------------------------------------------------------------------
 * Camera controls: orbital drag + logarithmic zoom. The zoom is logarithmic
 * because the simulation spans 46 orders of magnitude — linear zoom dies
 * somewhere between a galaxy and a bacterium. Log zoom makes every octave of
 * scale cost the same flick of the wheel, enabling smooth travel from the
 * observable universe down to a planet's clouds.
 * ---------------------------------------------------------------------------
 */

import * as THREE from "three";
import { clamp } from "../core/mathx.js";

export class OrbitZoomControls {
  /**
   * @param {THREE.Camera} camera
   * @param {HTMLElement} dom
   * @param {object} opts {minDist, maxDist, onFocusPick(cb)}
   */
  constructor(camera, dom, opts = {}) {
    this.camera = camera;
    this.dom = dom;
    this.target = new THREE.Vector3(0, 0, 0);
    this.dist = opts.dist ?? 10;
    this.minDist = opts.minDist ?? 0.01;
    this.maxDist = opts.maxDist ?? 1e6;
    this.theta = 0.6;        // azimuth
    this.phi = 1.1;          // polar from +Y
    this.zoomSpeed = 0.14;
    this.autoRotate = 0;     // rad/s (gentle drift)

    this._vTheta = 0; this._vPhi = 0;
    this._targetDist = this.dist;
    this._dragging = false;
    this._lastX = 0; this._lastY = 0;
    this._pinch = 0;
    this._onPick = opts.onPick ?? null;
    this._doubleClickTimer = 0;
    this._bindEvents();
    this.update(0);
  }

  _bindEvents() {
    const dom = this.dom;
    dom.addEventListener("pointerdown", (e) => {
      this._dragging = true;
      this._lastX = e.clientX; this._lastY = e.clientY;
      dom.setPointerCapture(e.pointerId);
      dom.classList.add("dragging");
    });
    dom.addEventListener("pointermove", (e) => {
      if (!this._dragging) return;
      const dx = e.clientX - this._lastX;
      const dy = e.clientY - this._lastY;
      this._lastX = e.clientX; this._lastY = e.clientY;
      this._vTheta += dx * 0.0045;
      this._vPhi += dy * 0.0035;
    });
    dom.addEventListener("pointerup", () => {
      this._dragging = false;
      this.dom.classList.remove("dragging");
    });
    dom.addEventListener("wheel", (e) => {
      e.preventDefault();
      const dz = -Math.sign(e.deltaY) * this.zoomSpeed * (e.deltaMode === 1 ? 3 : 1);
      this.zoomBy(dz);
    }, { passive: false });
    // touch pinch
    dom.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (this._pinch > 0) this.zoomBy(-Math.log(d / this._pinch) * 0.8);
        this._pinch = d;
      }
    }, { passive: false });
    dom.addEventListener("touchend", () => { this._pinch = 0; });
    dom.addEventListener("dblclick", (e) => {
      if (this._onPick) this._onPick(e, true);
    });
    dom.addEventListener("click", (e) => {
      if (this._onPick) this._onPick(e, false);
    });
  }

  zoomBy(dLog) {
    this._targetDist = clamp(
      this._targetDist * Math.exp(-dLog),
      this.minDist, this.maxDist
    );
  }

  setBounds(min, max) {
    this.minDist = min;
    this.maxDist = max;
    this._targetDist = clamp(this._targetDist, min, max);
  }

  setTarget(v) { this.target.copy(v); }
  getTarget() { return this.target.clone(); }
  setDist(d) { this.dist = d; this._targetDist = d; }

  /** Focus transition: animate to a new target + distance. */
  flyTo(targetVec, dist) {
    this._flyTarget = targetVec.clone();
    this._flyDist = clamp(dist, this.minDist, this.maxDist);
    this._flyT = 0;
  }

  update(dt) {
    // fly animation
    if (this._flyT !== undefined && this._flyT < 1) {
      this._flyT = Math.min(1, this._flyT + dt * 1.6);
      const s = this._flyT * this._flyT * (3 - 2 * this._flyT);
      this.target.lerp(this._flyTarget, Math.min(1, s * 2));
      this._targetDist = this.dist * (1 - s) + this._flyDist * s;
    }
    // damping
    this.theta += this._vTheta + this.autoRotate * dt;
    this.phi = clamp(this.phi + this._vPhi, 0.02, Math.PI - 0.02);
    this._vTheta *= 0.86;
    this._vPhi *= 0.86;
    // exponential smoothing on distance
    this.dist += (this._targetDist - this.dist) * Math.min(1, dt * 6);
    const sinPhi = Math.sin(this.phi);
    this.camera.position.set(
      this.target.x + this.dist * sinPhi * Math.cos(this.theta),
      this.target.y + this.dist * Math.cos(this.phi),
      this.target.z + this.dist * sinPhi * Math.sin(this.theta)
    );
    this.camera.lookAt(this.target);
  }
}

export default OrbitZoomControls;
