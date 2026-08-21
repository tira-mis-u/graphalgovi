import { COLORS, NODE_RADIUS, nodeStyle, edgeStyle } from './AlgorithmRenderer.js';

const FONT = '"IBM Plex Mono", "SFMono-Regular", Menlo, Consolas, monospace';

/**
 * GraphRenderer — draws the graph onto a Canvas 2D context using the camera.
 * Consumes style descriptors from AlgorithmRenderer; owns NO algorithm logic.
 * Renders edge weight / flow labels and per-node extra labels.
 */
export default class GraphRenderer {
  render(ctx, { graph, camera, state, ui }) {
    const w = camera.width;
    const h = camera.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    this._drawGrid(ctx, camera, w, h);

    const nodes = graph.getNodes();
    const edges = graph.getEdges();
    const showWeights = !!(ui.showWeights || graph.weighted);

    // PASS 1 — edge lines only (so later edges never cover earlier labels)
    for (const edge of edges) {
      const a = graph.getNode(edge.from);
      const b = graph.getNode(edge.to);
      if (!a || !b) continue;
      let st = state ? edgeStyle(state, edge, graph) : { color: COLORS.edge, width: 1.4, status: 'idle', extra: '', dashed: false };
      if (ui.hoveredEdge === edge.id && st.status === 'idle') {
        st = { ...st, color: '#5a6a8a', width: 2 };
      }
      this._drawEdge(ctx, camera, a, b, edge, st, false, ui);
    }

    // PASS 2 — nodes
    for (const node of nodes) {
      const st = state ? nodeStyle(state, node.id, ui) : this._idleStyle();
      this._drawNode(ctx, camera, node, st, ui);
    }

    // PASS 3 — weight / flow labels ON TOP of edges AND nodes (numbers/names
    // must always win over any geometry)
    if (showWeights || state) {
      for (const edge of edges) {
        const a = graph.getNode(edge.from);
        const b = graph.getNode(edge.to);
        if (!a || !b) continue;
        const st = state ? edgeStyle(state, edge, graph) : { color: COLORS.edge, width: 1.4, status: 'idle', extra: '', dashed: false };
        this._drawEdgeLabelOnTop(ctx, camera, a, b, edge, st, showWeights);
      }
    }
  }

  _drawEdgeLabelOnTop(ctx, camera, a, b, edge, st, showWeights) {
    const pa = camera.worldToScreen(a.x, a.y);
    const pb = camera.worldToScreen(b.x, b.y);
    if (edge.from === edge.to) {
      if (drawLabel) {
      this._edgeLabel(ctx, pa.x, pa.y - (NODE_RADIUS + 16) * camera.zoom, edge, st, showWeights, camera);
    }
      return;
    }
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const startPad = (NODE_RADIUS + 1) * camera.zoom;
    const endPad = (NODE_RADIUS + 1) * camera.zoom;
    const x1 = pa.x + ux * startPad;
    const y1 = pa.y + uy * startPad;
    const x2 = pb.x - ux * endPad;
    const y2 = pb.y - uy * endPad;
    this._edgeLabel(ctx, (x1 + x2) / 2, (y1 + y2) / 2, edge, st, showWeights, camera);
  }

  _idleStyle() {
    return { fill: COLORS.unvisitedFill, stroke: COLORS.unvisitedStroke, strokeWidth: 1.5, radius: NODE_RADIUS, status: 'unvisited', extra: '', isHover: false, isSelected: false, isStart: false, isTarget: false };
  }

  _drawGrid(ctx, camera, w, h) {
    const spacing = this._gridSpacing(camera.zoom);
    const topLeft = camera.screenToWorld(0, 0);
    const bottomRight = camera.screenToWorld(w, h);
    const startX = Math.floor(topLeft.x / spacing) * spacing;
    const startY = Math.floor(topLeft.y / spacing) * spacing;

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x <= bottomRight.x; x += spacing) {
      const p = camera.worldToScreen(x, 0);
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, h);
    }
    for (let y = startY; y <= bottomRight.y; y += spacing) {
      const p = camera.worldToScreen(0, y);
      ctx.moveTo(0, p.y);
      ctx.lineTo(w, p.y);
    }
    ctx.stroke();
  }

  _gridSpacing(zoom) {
    for (const s of [25, 50, 100, 200, 400]) {
      if (s * zoom >= 42) return s;
    }
    return 800;
  }

  _drawEdge(ctx, camera, a, b, edge, st, drawLabel, ui) {
    const pa = camera.worldToScreen(a.x, a.y);
    const pb = camera.worldToScreen(b.x, b.y);

    ctx.lineCap = 'round';
    ctx.strokeStyle = st.color;
    ctx.lineWidth = st.width;
    if (st.dashed) ctx.setLineDash([6, 5]);

    // Self-loop.
    if (edge.from === edge.to) {
      ctx.beginPath();
      ctx.arc(pa.x, pa.y - NODE_RADIUS * camera.zoom - 6, 12 * camera.zoom, Math.PI * 0.15, Math.PI * 0.85, false);
      ctx.stroke();
      ctx.setLineDash([]);
      if (drawLabel) {
      this._edgeLabel(ctx, pa.x, pa.y - (NODE_RADIUS + 16) * camera.zoom, edge, st, showWeights, camera);
    }
      return;
    }

    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;

    const startPad = (NODE_RADIUS + 1) * camera.zoom;
    const endPad = (NODE_RADIUS + 1) * camera.zoom;
    const x1 = pa.x + ux * startPad;
    const y1 = pa.y + uy * startPad;
    const x2 = pb.x - ux * endPad;
    const y2 = pb.y - uy * endPad;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (edge.directed) this._drawArrow(ctx, x1, y1, x2, y2, st.color);

    if (drawLabel) {
      this._edgeLabel(ctx, (x1 + x2) / 2, (y1 + y2) / 2, edge, st, showWeights, camera);
    }
  }

  _edgeLabel(ctx, mx, my, edge, st, showWeights, camera) {
    let text = st.extra || '';
    if (!text && showWeights) text = String(edge.weight);
    if (!text) return;

    const fontSize = Math.max(10, 11.5 * Math.min(camera.zoom, 1.6));
    ctx.font = `600 ${fontSize}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const width = ctx.measureText(text).width + 12;
    const height = fontSize + 8;

    // opaque, theme-aware chip so the weight is always readable on top of edges
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = COLORS.bg;
    const r = 5;
    const x = mx - width / 2;
    const y = my - height / 2;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, width, height, r);
    else ctx.rect(x, y, width, height);
    ctx.fill();
    ctx.strokeStyle = st.color;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // high-contrast theme label colour (NOT the edge colour) so the weight
    // is always crisp and readable in both light and dark themes
    ctx.fillStyle = COLORS.label;
    ctx.fillText(text, mx, my + 0.5);
  }

  _drawArrow(ctx, x1, y1, x2, y2, color) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = 8;
    const spread = 0.42;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(angle - spread), y2 - head * Math.sin(angle - spread));
    ctx.lineTo(x2 - head * Math.cos(angle + spread), y2 - head * Math.sin(angle + spread));
    ctx.closePath();
    ctx.fill();
  }

  _drawNode(ctx, camera, node, st, ui) {
    const p = camera.worldToScreen(node.x, node.y);
    const r = st.radius * camera.zoom;
    const zoom = camera.zoom;

    if (st.isStart) {
      ctx.strokeStyle = COLORS.startRing;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (st.isTarget) {
      ctx.strokeStyle = COLORS.targetRing;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (st.isSelected) {
      ctx.save();
      ctx.strokeStyle = COLORS.selected;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (ui.edgeSource && ui.edgeSource === node.id) {
      ctx.save();
      ctx.strokeStyle = COLORS.edgeActive;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = st.fill;
    ctx.fill();
    ctx.lineWidth = st.strokeWidth;
    ctx.strokeStyle = st.stroke;
    ctx.stroke();

    if (st.status === 'current') {
      ctx.strokeStyle = COLORS.currentStroke;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 3.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Label below the node.
    const fontSize = Math.max(10, 12 * Math.min(zoom, 1.6));
    ctx.font = `600 ${fontSize}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const labelY = p.y + r + 5;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(node.label, p.x + 1, labelY + 1);
    ctx.fillStyle = st.status === 'unvisited' ? COLORS.labelDim : COLORS.label;
    ctx.fillText(node.label, p.x, labelY);

    // Extra label (distance, f-score, flow, group…).
    if (st.extra) {
      const extraSize = Math.max(9, 10.5 * Math.min(zoom, 1.6));
      ctx.font = `${extraSize}px ${FONT}`;
      const ey = labelY + fontSize + 3;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(st.extra, p.x + 1, ey + 1);
      ctx.fillStyle = st.stroke;
      ctx.fillText(st.extra, p.x, ey);
    }

    // START / TARGET / SOURCE / SINK badge.
    let badge = null;
    let badgeColor = COLORS.startRing;
    if (st.isStart) badge = 'START';
    else if (st.isTarget) { badge = 'TARGET'; badgeColor = COLORS.targetRing; }
    if (st.extra === 'SOURCE') { badge = 'SOURCE'; badgeColor = COLORS.sourceStroke; }
    if (st.extra === 'SINK') { badge = 'SINK'; badgeColor = COLORS.sinkStroke; }

    if (badge) {
      ctx.font = `600 ${Math.max(9, 10)}px ${FONT}`;
      const by = p.y - r - 20;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillText(badge, p.x + 1, by + 1);
      ctx.fillStyle = badgeColor;
      ctx.fillText(badge, p.x, by);
    }
  }
}

