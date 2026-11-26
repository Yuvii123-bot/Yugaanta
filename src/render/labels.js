/**
 * Yugaanta — render/labels.js
 * ---------------------------------------------------------------------------
 * HTML label overlay — projects 3D world positions to screen space every
 * frame and positions absolutely-placed divs. Labels hide when behind the
 * camera or outside the viewport, and can be styled per-usage.
 * ---------------------------------------------------------------------------
 */

import * as THREE from "three";

export class LabelManager {
  constructor(container) {
    this.container = container;         // #labels div
    this.items = [];
    this._v = new THREE.Vector3();
  }

  /**
   * Register a label. obj may be an Object3D (tracks its world position)
   * or a fixed THREE.Vector3. opts: {text, cls, minDist, maxDist, ref}
   * Returns handle with .el and .remove().
   */
  add(obj, text, opts = {}) {
    const el = document.createElement("div");
    el.className = "lbl" + (opts.cls ? " " + opts.cls : "");
    el.textContent = text;
    el.style.display = "none";
    this.container.appendChild(el);
    const item = { obj, el, minDist: opts.minDist ?? 0, maxDist: opts.maxDist ?? Infinity, ref: opts.ref ?? null, offset: opts.offset ?? [0, 0] };
    this.items.push(item);
    return item;
  }

  setText(item, text) { item.el.textContent = text; }

  remove(item) {
    const i = this.items.indexOf(item);
    if (i >= 0) this.items.splice(i, 1);
    item.el.remove();
  }

  clear() {
    for (const it of this.items) it.el.remove();
    this.items = [];
  }

  /** Update all labels against the camera. */
  update(camera, dist) {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    for (const item of this.items) {
      let p = null;
      if (item.obj.isObject3D) {
        item.obj.getWorldPosition(this._v);
        p = this._v;
      } else if (item.obj.isVector3) {
        p = item.obj;
      }
      if (!p) { item.el.style.display = "none"; continue; }
      if (dist < item.minDist || dist > item.maxDist) { item.el.style.display = "none"; continue; }
      this._v.copy(p).project(camera);
      if (this._v.z > 1 || this._v.z < -1) { item.el.style.display = "none"; continue; }
      const x = (this._v.x * 0.5 + 0.5) * w + item.offset[0];
      const y = (-this._v.y * 0.5 + 0.5) * h + item.offset[1];
      if (x < -100 || x > w + 100 || y < -30 || y > h + 30) {
        item.el.style.display = "none";
        continue;
      }
      item.el.style.display = "block";
      item.el.style.left = `${x}px`;
      item.el.style.top = `${y}px`;
    }
  }
}
