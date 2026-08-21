/**
 * Camera — maps between world and screen coordinates.
 *
 * World origin (0,0) sits at the canvas centre at zoom 1. `x`/`y` are the
 * world coordinates at the canvas centre.
 */
export default class Camera {
  constructor({ width, height }) {
    this.width = width || 800;
    this.height = height || 600;
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.minZoom = 0.12;
    this.maxZoom = 4;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.width / 2) / this.zoom + this.x,
      y: (sy - this.height / 2) / this.zoom + this.y,
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.width / 2,
      y: (wy - this.y) * this.zoom + this.height / 2,
    };
  }

  /** Pan by a SCREEN-space delta. */
  pan(dxScreen, dyScreen) {
    this.x -= dxScreen / this.zoom;
    this.y -= dyScreen / this.zoom;
  }

  /** Zoom by `factor` keeping the world point under (sx, sy) fixed. */
  zoomAt(sx, sy, factor) {
    const before = this.screenToWorld(sx, sy);
    this.zoom = this._clampZoom(this.zoom * factor);
    const after = this.screenToWorld(sx, sy);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
  }

  /** Set an absolute zoom level around the canvas centre. */
  setZoom(z) {
    this.zoom = this._clampZoom(z);
  }

  /**
   * Fit all nodes into the viewport with padding.
   * @param {Array<{x:number, y:number}>} nodes
   * @param {number} [padding]
   */
  fitGraph(nodes, padding = 70) {
    if (!nodes || nodes.length === 0) {
      this.reset();
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    }
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const availW = Math.max(60, this.width - padding * 2);
    const availH = Math.max(60, this.height - padding * 2);
    const zoom = this._clampZoom(Math.min(availW / spanX, availH / spanY, 2.2));
    this.zoom = zoom;
    this.x = (minX + maxX) / 2;
    this.y = (minY + maxY) / 2;
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
  }

  _clampZoom(z) {
    return Math.max(this.minZoom, Math.min(this.maxZoom, z));
  }
}
