import { NODE_RADIUS } from '../visualization/AlgorithmRenderer.js';

/**
 * GraphInteraction — pointer handling for the canvas:
 *   HOVER / SELECT / DRAG (nodes) / PAN / ZOOM + the Lab edit tools.
 *
 * Hit-testing always goes screen → camera inverse transform → world.
 */
export default class GraphInteraction {
  /**
   * @param {object} opts
   * @param {HTMLCanvasElement} opts.canvas
   * @param {import('../camera/Camera.js').default} opts.camera
   * @param {import('../graph/Graph.js').default} opts.graph
   * @param {object} [opts.callbacks]
   */
  constructor({ canvas, camera, graph, callbacks = {}, draggableNodes = true }) {
    this.canvas = canvas;
    this.camera = camera;
    this.graph = graph;
    this.cb = callbacks;
    this.draggableNodes = draggableNodes;

    this.tool = 'select'; // select | add-node | add-edge | delete-node | delete-edge | set-start
    this.hovered = null;
    this.hoveredEdge = null;
    this.selected = null;
    this.edgeSource = null; // first node of an add-edge operation
    this.dragging = false;
    this._drag = null;

    this._bind();
    this._updateCursor();
  }

  setGraph(g) {
    this.graph = g;
    this.selected = null;
    this.hovered = null;
    this.hoveredEdge = null;
    this.edgeSource = null;
    this.dragging = false;
    this._drag = null;
    this._updateCursor();
  }

  setDraggable(flag) {
    this.draggableNodes = flag;
    this._updateCursor();
  }

  setTool(t) {
    this.tool = t;
    this.edgeSource = null;
    this._updateCursor();
    if (this.cb.onToolChange) this.cb.onToolChange(t);
  }

  select(id) {
    this.selected = id;
  }

  clearSelection() {
    this.selected = null;
  }

  // ------------------------------------------------------------------ events
  _bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => this._onDown(e));
    c.addEventListener('pointermove', (e) => this._onMove(e));
    c.addEventListener('pointerup', (e) => this._onUp(e));
    c.addEventListener('pointercancel', (e) => this._onUp(e));
    c.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    c.addEventListener('dblclick', (e) => this._onDbl(e));
    c.addEventListener('pointerleave', () => {
      if (!this._drag) {
        this.hovered = null;
        this.hoveredEdge = null;
        this._updateCursor();
      }
    });
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _worldFromScreen(p) {
    return this.camera.screenToWorld(p.x, p.y);
  }

  _nodeAt(w) {
    const t = NODE_RADIUS + 6 / this.camera.zoom;
    let best = null;
    let bestD = Infinity;
    for (const n of this.graph.getNodes()) {
      const d = Math.hypot(n.x - w.x, n.y - w.y);
      if (d <= t && d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  _edgeAt(w) {
    const tol = 7 / this.camera.zoom;
    let best = null;
    let bestD = Infinity;
    for (const e of this.graph.getEdges()) {
      const a = this.graph.getNode(e.from);
      const b = this.graph.getNode(e.to);
      if (!a || !b) continue;
      const d = distToSegment(w.x, w.y, a.x, a.y, b.x, b.y);
      if (d <= tol && d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  _onDown(e) {
    const p = this._pos(e);
    const w = this._worldFromScreen(p);
    const node = this._nodeAt(w);

    // --- edit tools (no drag) ---
    if (this.tool === 'add-node') {
      if (this.cb.onAddNode) this.cb.onAddNode(w.x, w.y);
      return;
    }
    if (this.tool === 'delete-node') {
      if (node && this.cb.onDeleteNode) this.cb.onDeleteNode(node.id);
      return;
    }
    if (this.tool === 'delete-edge') {
      const ed = this._edgeAt(w);
      if (ed && this.cb.onDeleteEdge) this.cb.onDeleteEdge(ed.id);
      return;
    }
    if (this.tool === 'set-start') {
      if (node) {
        this.selected = node.id;
        if (this.cb.onSetStart) this.cb.onSetStart(node.id);
      }
      return;
    }
    if (this.tool === 'set-target') {
      if (node) {
        this.selected = node.id;
        if (this.cb.onSetTarget) this.cb.onSetTarget(node.id);
      }
      return;
    }
    if (this.tool === 'pick-edge') {
      const ed = this._edgeAt(w);
      if (ed && this.cb.onPickEdge) this.cb.onPickEdge(ed.id);
      return;
    }
    if (this.tool === 'add-edge') {
      if (!node) return;
      if (!this.edgeSource) {
        this.edgeSource = node.id;
        this.selected = node.id;
        if (this.cb.onEdgeSource) this.cb.onEdgeSource(node.id);
        this._updateCursor();
        return;
      }
      const from = this.edgeSource;
      this.edgeSource = null;
      if (node.id === from) {
        this._updateCursor();
        return;
      }
      if (this.cb.onAddEdge) this.cb.onAddEdge(from, node.id);
      this._updateCursor();
      return;
    }

    // --- select tool: node drag or pan ---
    this.canvas.setPointerCapture(e.pointerId);
    if (node) {
      this.selected = node.id;
      if (this.cb.onNodeSelect) this.cb.onNodeSelect(node.id);
      if (this.draggableNodes) {
        this._drag = { type: 'node', id: node.id, sx: p.x, sy: p.y, moved: false };
      } else {
        this._drag = null; // districts / domain objects are fixed — select only
      }
    } else {
      this.selected = null;
      if (this.cb.onNodeSelect) this.cb.onNodeSelect(null);
      this._drag = { type: 'pan', sx: p.x, sy: p.y, lastX: p.x, lastY: p.y, moved: false };
    }
    this.dragging = true;
    this._updateCursor();
  }

  _onMove(e) {
    const p = this._pos(e);

    if (this._drag) {
      const dx = p.x - this._drag.sx;
      const dy = p.y - this._drag.sy;
      if (Math.hypot(dx, dy) > 4) this._drag.moved = true;

      if (this._drag.type === 'node') {
        const w = this._worldFromScreen(p);
        const n = this.graph.getNode(this._drag.id);
        if (n) {
          n.x = w.x;
          n.y = w.y;
          if (this.cb.onNodeMoved) this.cb.onNodeMoved(n.id);
        }
      } else if (this._drag.type === 'pan') {
        const dxs = p.x - this._drag.lastX;
        const dys = p.y - this._drag.lastY;
        this.camera.pan(dxs, dys);
        this._drag.lastX = p.x;
        this._drag.lastY = p.y;
        if (this.cb.onViewChanged) this.cb.onViewChanged();
      }
      return;
    }

    // hover (all tools) for live feedback
    const w = this._worldFromScreen(p);
    const node = this._nodeAt(w);
    const nodeId = node ? node.id : null;
    const edge = (this.tool === 'delete-edge' || this.tool === 'pick-edge') ? this._edgeAt(w) : null;
    const edgeId = edge ? edge.id : null;
    if (nodeId !== this.hovered || edgeId !== this.hoveredEdge) {
      this.hovered = nodeId;
      this.hoveredEdge = edgeId;
      this._updateCursor();
    }
  }

  _onUp(e) {
    if (this._drag) {
      const wasNodeDrag = this._drag.type === 'node';
      const moved = this._drag.moved;
      this._drag = null;
      this.dragging = false;
      if (!wasNodeDrag && !moved) {
        const p = this._pos(e);
        const w = this._worldFromScreen(p);
        if (this.cb.onCanvasClick) this.cb.onCanvasClick(w);
      }
      this._updateCursor();
    }
  }

  _onWheel(e) {
    e.preventDefault();
    const p = this._pos(e);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    this.camera.zoomAt(p.x, p.y, factor);
    if (this.cb.onViewChanged) this.cb.onViewChanged();
  }

  _onDbl(e) {
    const w = this._worldFromScreen(this._pos(e));
    const node = this._nodeAt(w);
    if (node && this.tool === 'select') {
      this.selected = node.id;
      if (this.cb.onSetStart) this.cb.onSetStart(node.id);
    }
  }

  _updateCursor() {
    const c = this.canvas;
    if (this.dragging) {
      c.style.cursor = 'grabbing';
      return;
    }
    switch (this.tool) {
      case 'add-node':
      case 'delete-node':
      case 'delete-edge':
        c.style.cursor = 'crosshair';
        break;
      case 'add-edge':
        c.style.cursor = this.edgeSource ? 'copy' : 'crosshair';
        break;
      case 'set-start':
      case 'set-target':
        c.style.cursor = 'pointer';
        break;
      case 'pick-edge':
        c.style.cursor = 'crosshair';
        break;
      default:
        c.style.cursor = this.hovered ? (this.draggableNodes ? 'grab' : 'pointer') : 'default';
        break;
    }
  }
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
