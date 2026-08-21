/**
 * Real-World renderers — domain-specific Canvas visuals.
 * Each renderer paints a DOMAIN SCENE over the SAME graph the algorithm runs
 * on. Node/edge statuses come from the real execution snapshot.
 */

const FONT = '"IBM Plex Mono", monospace';
const SANS = '"IBM Plex Sans", system-ui, sans-serif';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function label(ctx, text, x, y, { size = 12, color = '#e6e9ef', align = 'center', baseline = 'middle', font = FONT, bold = false } = {}) {
  ctx.font = `${bold ? '600 ' : ''}${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(text, x + 0.6, y + 0.6);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function P(camera, x, y) {
  return camera.worldToScreen(x, y);
}

function zoomF(camera) {
  return Math.min(camera.zoom, 1.6);
}

function nodeStatus(state, id, def = 'unvisited') {
  return (state.nodes && state.nodes[id]) ? state.nodes[id].status : def;
}

function edgeStatus(state, id) {
  return (state.edges && state.edges[id]) ? state.edges[id].status : 'idle';
}

function seedRand(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function tracePolyline(ctx, camera, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const p = P(camera, x, y);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
}

// ============================================================================
// REVEAL GRAPH OVERLAY
// ============================================================================
function drawRevealOverlay(ctx, view) {
  const { graph, camera, ui, entities } = view;
  if (!ui.reveal) return;
  // Some scenes (the Hà Nội district map) place their objects at cell
  // centroids rather than at the raw node coordinates — reuse that mapping so
  // the graph overlay lines up with the picture exactly.
  const centroids = entities && entities.map && entities.map.centroids;
  const at = (n) => (centroids && centroids[n.id]) || n;
  const z = zoomF(camera);
  for (const n of graph.getNodes()) {
    const c = at(n);
    const p = P(camera, c.x, c.y);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9 * z, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15,17,21,0.72)';
    ctx.fill();
    ctx.strokeStyle = '#8a93a6';
    ctx.lineWidth = 1;
    ctx.stroke();
    label(ctx, n.label, p.x, p.y, { size: 10 * z, color: '#c9d1de' });
  }
  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const ca = at(a);
    const cb = at(b);
    const pa = P(camera, ca.x, ca.y);
    const pb = P(camera, cb.x, cb.y);
    ctx.strokeStyle = 'rgba(206,214,226,0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ============================================================================
// 1. CITY NAVIGATION — tiled choropleth map of Hà Nội
// ============================================================================
const cityBaseCache = new WeakMap();

function districtPaths(map) {
  const paths = {};
  for (const id in map.cells) {
    const p = new Path2D();
    for (const c of map.cells[id]) {
      const i = c % map.W;
      const j = (c / map.W) | 0;
      p.rect(map.minX + i * map.cell, map.minY + j * map.cell, map.cell, map.cell);
    }
    paths[id] = p;
  }
  return paths;
}

// per-district fill colour: same family per kind, slight jitter so each
// district reads as its own region (a real mosaic, not one flat colour).
function districtColor(id, kind, light) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  const t = h / 0xffff; // 0..1 jitter
  let base;
  if (light) {
    base = kind === 'quận' ? [146, 186, 138]
      : kind === 'thị xã' ? [178, 168, 200]
      : [168, 184, 162];
  } else {
    base = kind === 'quận' ? [58, 104, 56]
      : kind === 'thị xã' ? [96, 78, 122]
      : [48, 82, 46];
  }
  const f = (t - 0.5) * 0.32; // ±16% lightness jitter
  const c = base.map((v) => Math.max(0, Math.min(255, Math.round(v + v * f))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function cityBaseCanvas(map, light) {
  const cv = document.createElement('canvas');
  cv.width = map.W;
  cv.height = map.H;
  const c2 = cv.getContext('2d');
  const img = c2.createImageData(map.W, map.H);
  const data = img.data;
  const kinds = map.nodeKinds || [];
  const ids = map.nodeIds || [];
  const cache = new Map(); // owner index -> [r,g,b]
  for (let k = 0; k < map.owner.length; k++) {
    const o = map.owner[k];
    let c = cache.get(o);
    if (!c) {
      const kind = kinds[o] || 'huyện';
      const col = districtColor(ids[o] || String(o), kind, light);
      const m = col.match(/\d+/g).map(Number);
      c = m;
      cache.set(o, c);
    }
    const idx = k * 4;
    data[idx] = c[0];
    data[idx + 1] = c[1];
    data[idx + 2] = c[2];
    data[idx + 3] = 255;
  }
  c2.putImageData(img, 0, 0);
  return cv;
}

function drawPin(ctx, x, y, color, letter, camera) {
  const z = zoomF(camera);
  ctx.beginPath();
  ctx.arc(x, y, 12 * z, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#0f1216';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 4 * z, y + 10 * z);
  ctx.lineTo(x + 4 * z, y + 10 * z);
  ctx.lineTo(x, y + 17 * z);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  label(ctx, letter, x, y, { size: 11 * z, color: '#0f1216', bold: true });
}

// label with a soft halo so it stays readable over the mosaic
function haloLabel(ctx, text, x, y, opts) {
  ctx.font = `${opts.bold ? '600 ' : ''}${opts.size}px ${opts.font || FONT}`;
  ctx.textAlign = opts.align || 'center';
  ctx.textBaseline = opts.baseline || 'middle';
  const pad = Math.max(2, opts.size * 0.22);
  const tw = ctx.measureText(text).width;
  const th = opts.size;
  ctx.fillStyle = 'rgba(8,11,8,0.55)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x - tw / 2 - pad, y - th / 2 - pad * 0.7, tw + pad * 2, th + pad * 1.4, 3);
  } else {
    ctx.rect(x - tw / 2 - pad, y - th / 2 - pad * 0.7, tw + pad * 2, th + pad * 1.4);
  }
  ctx.fill();
  ctx.fillStyle = opts.color;
  ctx.fillText(text, x, y);
}

export function renderCity(ctx, view) {
  const { graph, camera, state, entities, ui } = view;
  const cz = camera.zoom;               // FULL zoom for all transforms
  const z = Math.min(cz, 1.6);          // capped zoom for text sizing only
  const w = camera.width;
  const h = camera.height;
  const light = ui && ui.theme === 'light';
  const map = entities.map;
  const centroids = map.centroids || {};

  const pal = light ? {
    water: 'rgba(118,176,200,0.65)', waterEdge: 'rgba(74,138,168,0.75)', waterText: '#3f7186',
    border: 'rgba(255,255,255,0.5)', frame: '#6b7686',
    road: 'rgba(120,130,145,0.75)', roadActive: '#d97706', route: '#e89e3b',
    chip: 'rgba(255,255,255,0.94)', chipText: '#4a5568',
    townDot: '#3f4a5c', labelOn: '#10141a', labelOff: '#46505e',
  } : {
    water: 'rgba(52,108,132,0.6)', waterEdge: 'rgba(82,150,176,0.7)', waterText: '#8fc4dc',
    border: 'rgba(14,22,14,0.85)', frame: '#1d2a1d',
    road: 'rgba(14,20,14,0.65)', roadActive: '#c98a2e', route: '#e89e3b',
    chip: 'rgba(8,12,8,0.8)', chipText: '#c7d2c5',
    townDot: '#0e1410', labelOn: '#f2f6f0', labelOff: '#c9d3c6',
  };

  let cache = cityBaseCache.get(map);
  if (!cache) {
    cache = {
      dark: cityBaseCanvas(map, false),
      light: cityBaseCanvas(map, true),
      paths: districtPaths(map),
    };
    cityBaseCache.set(map, cache);
  }
  const base = light ? cache.light : cache.dark;

  ctx.fillStyle = light ? '#eef1f4' : '#0a0f0a';
  ctx.fillRect(0, 0, w, h);

  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(w / 2 - camera.x * cz, h / 2 - camera.y * cz);
  ctx.scale(cz, cz);
  const mapW = map.maxX - map.minX;
  const mapH = map.maxY - map.minY;
  ctx.drawImage(base, map.minX, map.minY, mapW, mapH);

  // status tints over the whole district region
  const tint = {
    current: 'rgba(232,158,59,0.5)',
    settled: light ? 'rgba(46,124,82,0.42)' : 'rgba(74,124,89,0.55)',
    visited: light ? 'rgba(46,124,82,0.42)' : 'rgba(74,124,89,0.55)',
    closed: light ? 'rgba(46,124,82,0.42)' : 'rgba(74,124,89,0.55)',
    discovered: light ? 'rgba(47,111,228,0.32)' : 'rgba(91,127,176,0.45)',
    open: light ? 'rgba(47,111,228,0.32)' : 'rgba(91,127,176,0.45)',
    path: light ? 'rgba(14,116,144,0.3)' : 'rgba(85,196,221,0.4)',
  };
  for (const n of graph.getNodes()) {
    const st = nodeStatus(state, n.id);
    if (st === 'unvisited' || !tint[st]) continue;
    const p = cache.paths[n.id];
    if (!p) continue;
    ctx.fillStyle = tint[st];
    ctx.fill(p);
  }

  // district borders (crisp, subtle)
  ctx.strokeStyle = pal.border;
  ctx.lineWidth = 1 / cz;
  ctx.beginPath();
  for (const b of map.borders) {
    ctx.moveTo(b[0], b[1]);
    ctx.lineTo(b[2], b[3]);
  }
  ctx.stroke();

  ctx.strokeStyle = pal.frame;
  ctx.lineWidth = 2 / cz;
  ctx.strokeRect(map.minX, map.minY, mapW, mapH);
  ctx.restore();

  // Red River — thin, on the east bank
  if (entities.river) {
    tracePolyline(ctx, camera, entities.river);
    ctx.strokeStyle = pal.water;
    ctx.lineWidth = 10 * camera.zoom;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    tracePolyline(ctx, camera, entities.river);
    ctx.strokeStyle = pal.waterEdge;
    ctx.lineWidth = 5 * camera.zoom;
    ctx.stroke();
    const mid = entities.river[Math.floor(entities.river.length / 2)];
    const pm = P(camera, mid[0], mid[1] - 34);
    haloLabel(ctx, 'Sông Hồng', pm.x, pm.y, { size: 11 * z, color: pal.waterText, font: SANS, bold: true });
  }

  // lakes
  for (const lake of entities.lakes || []) {
    const p = P(camera, lake.x, lake.y);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, lake.rx * camera.zoom, lake.ry * camera.zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = pal.water;
    ctx.fill();
    ctx.strokeStyle = pal.waterEdge;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    haloLabel(ctx, lake.label, p.x, p.y, { size: 9.5 * z, color: pal.waterText, font: SANS });
  }

  // roads between district centroids (lines only — chips drawn later on top)
  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const ca = centroids[a.id] || a;
    const cb = centroids[b.id] || b;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, ca.x, ca.y);
    const pb = P(camera, cb.x, cb.y);
    const isRoute = st === 'path';
    ctx.lineCap = 'round';
    if (isRoute) {
      ctx.strokeStyle = pal.route;
      ctx.lineWidth = 6 * camera.zoom;
    } else {
      ctx.strokeStyle = st === 'active' ? pal.roadActive : pal.road;
      ctx.lineWidth = (st === 'active' ? 3 : 2.2) * camera.zoom;
    }
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  // district labels at their true centroid
  for (const n of graph.getNodes()) {
    const c = centroids[n.id] || { x: n.x, y: n.y };
    const p = P(camera, c.x, c.y);
    const st = nodeStatus(state, n.id);
    const ent = entities.nodes[n.id] || { name: n.id, kind: 'huyện' };
    ctx.beginPath();
    ctx.arc(p.x, p.y, (ent.kind === 'quận' ? 3.6 : 3) * z, 0, Math.PI * 2);
    ctx.fillStyle = st === 'unvisited' ? pal.townDot : pal.labelOn;
    ctx.fill();
    haloLabel(ctx, ent.name, p.x, p.y + 14 * z, {
      size: (ent.kind === 'quận' ? 11.5 : 9.5) * z,
      color: st === 'unvisited' ? pal.labelOff : pal.labelOn,
      font: SANS,
      bold: ent.kind === 'quận',
    });
  }

  // origin / destination pins at centroids
  for (const n of graph.getNodes()) {
    const c = centroids[n.id] || { x: n.x, y: n.y };
    const p = P(camera, c.x, c.y);
    if (state && state.start === n.id) drawPin(ctx, p.x, p.y - 22 * z, '#0e7490', 'A', camera);
    if (state && state.target === n.id) drawPin(ctx, p.x, p.y - 22 * z, '#b45309', 'B', camera);
  }

  drawRevealOverlay(ctx, view);

  // km weight chips — drawn on top of roads AND the reveal overlay so the
  // weights are always crisp and readable
  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const ca = centroids[a.id] || a;
    const cb = centroids[b.id] || b;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, ca.x, ca.y);
    const pb = P(camera, cb.x, cb.y);
    const extra = state.edges && state.edges[e.id] ? state.edges[e.id].extra : '';
    if (extra) continue;
    const isRoute = st === 'path';
    const mx = (pa.x + pb.x) / 2;
    const my = (pa.y + pb.y) / 2;
    chipLabel(ctx, `${e.weight}`, mx, my, {
      size: 10 * z,
      color: isRoute ? '#7a5a12' : pal.chipText,
      bg: pal.chip,
      border: isRoute ? pal.route : 'rgba(120,130,145,0.6)',
    });
  }

  if (ui.world && state && state.result && state.result.path && state.result.path.length > 1) {
    drawVehicle(ctx, view, state.result.path);
  }
}

/**
 * A small, rotated vehicle sprite (car / truck) drawn in screen space.
 * The vehicle faces its heading and decelerates near turns for believable
 * motion. Used by navigation and logistics scenes — no emoji, no teleport.
 */
function drawVehicleSprite(ctx, x, y, angle, kind, scale) {
  const s = scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (kind === 'truck') {
    // cab + cargo box
    ctx.fillStyle = '#d8a53a';
    rr(ctx, -14 * s, -6 * s, 12 * s, 12 * s, 2 * s);
    ctx.fill();
    ctx.fillStyle = '#b9852a';
    rr(ctx, 0 * s, -8 * s, 15 * s, 16 * s, 2 * s);
    ctx.fill();
    // windshield
    ctx.fillStyle = '#7fd0e0';
    ctx.fillRect(-10 * s, -4 * s, 4 * s, 8 * s);
    // wheels
    ctx.fillStyle = '#0f1216';
    ctx.beginPath();
    ctx.arc(-8 * s, 7 * s, 3 * s, 0, Math.PI * 2);
    ctx.arc(8 * s, 7 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // car: body + cabin
    ctx.fillStyle = '#e89e3b';
    rr(ctx, -13 * s, -5 * s, 26 * s, 10 * s, 3 * s);
    ctx.fill();
    ctx.fillStyle = '#c98a2e';
    rr(ctx, -7 * s, -8 * s, 13 * s, 9 * s, 2.5 * s);
    ctx.fill();
    // windshield
    ctx.fillStyle = '#7fd0e0';
    ctx.fillRect(2 * s, -7 * s, 3 * s, 7 * s);
    // wheels
    ctx.fillStyle = '#0f1216';
    ctx.beginPath();
    ctx.arc(-8 * s, 6 * s, 3 * s, 0, Math.PI * 2);
    ctx.arc(8 * s, 6 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Continuous motion with deceleration near turns (smoothstep over each leg).
function drawVehicle(ctx, view, path, kind = 'car') {
  const { graph, camera } = view;
  const z = zoomF(camera);
  const total = path.length - 1;
  if (total <= 0) return;
  const period = total > 4 ? 3000 : 2200;
  const t = ((performance.now() / period) % 1) * total;
  const i = Math.min(Math.floor(t), total - 1);
  // ease near the end of a leg so the vehicle slows before turning
  const f0 = t - i;
  const f = f0 < 0.2 ? f0 * 2.5 : f0 > 0.8 ? 1 - (1 - f0) * 2.5 : 1;
  const a = graph.getNode(path[i]);
  const b = graph.getNode(path[i + 1]);
  if (!a || !b) return;
  const pa = P(camera, a.x, a.y);
  const pb = P(camera, b.x, b.y);
  const x = pa.x + (pb.x - pa.x) * f;
  const y = pa.y + (pb.y - pa.y) * f;
  const angle = Math.atan2(pb.y - pa.y, pb.x - pa.x);
  drawVehicleSprite(ctx, x, y, angle, kind, 1.05 * Math.max(0.7, z));
}

// ============================================================================
// 2. FIBER NETWORK — infrastructure blueprint
// ============================================================================
function drawBuildingBlock(ctx, x, y, s, connected, current, light) {
  const top = 8;
  const front = connected ? (light ? '#d7ecdd' : '#2c4a33') : (light ? '#ffffff' : '#1b2330');
  const frontSt = current ? '#e89e3b' : connected ? '#3d7c52' : (light ? '#c9cfda' : '#3a4256');
  const roof = connected ? (light ? '#b9d9c2' : '#3c6346') : (light ? '#e4e8ee' : '#232c3a');
  ctx.beginPath();
  ctx.moveTo(x - s / 2, y - s / 2 + top);
  ctx.lineTo(x - s / 2 + 6, y - s / 2);
  ctx.lineTo(x + s / 2 + 6, y - s / 2);
  ctx.lineTo(x + s / 2, y - s / 2 + top);
  ctx.closePath();
  ctx.fillStyle = roof;
  ctx.fill();
  rr(ctx, x - s / 2, y - s / 2 + top, s, s - top, 3);
  ctx.fillStyle = front;
  ctx.fill();
  ctx.strokeStyle = frontSt;
  ctx.lineWidth = current ? 2.5 : 1.4;
  ctx.stroke();
  ctx.fillStyle = connected ? '#3d7c52' : (light ? '#d4dae2' : '#2a3343');
  const wsize = Math.max(2, s / 9);
  for (let wy = y - s / 2 + top + 7; wy < y + s / 2 - 5; wy += 11) {
    for (let wx = x - s / 2 + 7; wx < x + s / 2 - 5; wx += 11) {
      ctx.fillRect(wx, wy, wsize, wsize);
    }
  }
}

export function renderFiber(ctx, view) {
  const { graph, camera, state, entities } = view;
  const z = zoomF(camera);
  const w = camera.width;
  const h = camera.height;
  const light = view.ui && view.ui.theme === 'light';

  ctx.fillStyle = light ? '#eef1f4' : '#0c111c';
  ctx.fillRect(0, 0, w, h);

  const grid = 120;
  const tl = camera.screenToWorld(0, 0);
  const br = camera.screenToWorld(w, h);
  ctx.strokeStyle = light ? '#e4e8ee' : '#121a29';
  ctx.lineWidth = 10 * camera.zoom;
  for (let gy = Math.floor(tl.y / grid) * grid; gy <= br.y; gy += grid) {
    const p = P(camera, 0, gy);
    ctx.beginPath();
    ctx.moveTo(0, p.y);
    ctx.lineTo(w, p.y);
    ctx.stroke();
  }
  for (let gx = Math.floor(tl.x / grid) * grid; gx <= br.x; gx += grid) {
    const p = P(camera, gx, 0);
    ctx.beginPath();
    ctx.moveTo(p.x, 0);
    ctx.lineTo(p.x, h);
    ctx.stroke();
  }
  ctx.strokeStyle = light ? '#d4dae2' : '#1a2333';
  ctx.lineWidth = 1;
  for (let gy = Math.floor(tl.y / grid) * grid; gy <= br.y; gy += grid) {
    const p = P(camera, 0, gy);
    ctx.beginPath();
    ctx.moveTo(0, p.y);
    ctx.lineTo(w, p.y);
    ctx.stroke();
  }
  for (let gx = Math.floor(tl.x / grid) * grid; gx <= br.x; gx += grid) {
    const p = P(camera, gx, 0);
    ctx.beginPath();
    ctx.moveTo(p.x, 0);
    ctx.lineTo(p.x, h);
    ctx.stroke();
  }

  const trenchColor = light ? '#7c9fd8' : '#4a78b8'; // blue = candidate (never matches buildings)
  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    const mx = (pa.x + pb.x) / 2;
    const horizontalFirst = Math.abs(pb.x - pa.x) > Math.abs(pb.y - pa.y);
    const bend = horizontalFirst ? { x: mx, y: pa.y } : { x: pa.x, y: (pa.y + pb.y) / 2 };

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (st === 'tree' || st === 'matched') {
      ctx.strokeStyle = '#3d7c52';
      ctx.lineWidth = 5 * camera.zoom;
    } else if (st === 'rejected') {
      ctx.strokeStyle = '#e87a5d';
      ctx.lineWidth = 2.6;
      ctx.setLineDash([8 * z, 5 * z]);
    } else if (st === 'active') {
      ctx.strokeStyle = '#e89e3b';
      ctx.lineWidth = 3.5;
    } else {
      ctx.strokeStyle = trenchColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([7 * z, 5 * z]);
    }
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(bend.x, bend.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const n of graph.getNodes()) {
    const p = P(camera, n.x, n.y);
    const st = nodeStatus(state, n.id);
    const ent = entities.nodes[n.id] || { name: n.id };
    const connected = st === 'visited' || st === 'settled' || st === 'discovered' || st === 'current' || st === 'path';
    drawBuildingBlock(ctx, p.x, p.y, 42 * z, connected, st === 'current', light);
    label(ctx, ent.name, p.x, p.y + 26 * z, { size: 10 * z, color: connected ? (light ? '#1a1e26' : '#d7dce6') : (light ? '#5b6472' : '#7c8598'), font: SANS });
  }

  // cost tags drawn LAST so numbers always sit on top of buildings/trenches
  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    const mx = (pa.x + pb.x) / 2;
    const horizontalFirst = Math.abs(pb.x - pa.x) > Math.abs(pb.y - pa.y);
    const bend = horizontalFirst ? { x: mx, y: pa.y } : { x: pa.x, y: (pa.y + pb.y) / 2 };
    const tagColor = st === 'tree' || st === 'matched' ? '#3d7c52' : st === 'rejected' ? '#e87a5d' : (light ? '#3f6fb0' : '#7fa6d8');
    label(ctx, `$${e.weight}k`, bend.x, bend.y - 9 * z, { size: 10 * z, color: tagColor });
  }

  drawRevealOverlay(ctx, view);
}

// ============================================================================
// 3. NETWORK ROUTING — server racks + routers
// ============================================================================
export function renderNetwork(ctx, view) {
  const { graph, camera, state, entities } = view;
  const z = zoomF(camera);
  const light = view.ui && view.ui.theme === 'light';
  ctx.fillStyle = light ? '#eef1f4' : '#0c111c';
  ctx.fillRect(0, 0, camera.width, camera.height);

  ctx.strokeStyle = light ? 'rgba(15,17,21,0.04)' : 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let gx = -400; gx <= 400; gx += 100) {
    const p = P(camera, gx, 0);
    ctx.beginPath();
    ctx.moveTo(p.x, 0);
    ctx.lineTo(p.x, camera.height);
    ctx.stroke();
  }
  for (let gy = -300; gy <= 300; gy += 100) {
    const p = P(camera, 0, gy);
    ctx.beginPath();
    ctx.moveTo(0, p.y);
    ctx.lineTo(camera.width, p.y);
    ctx.stroke();
  }

  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    const isRoute = st === 'path';
    ctx.lineCap = 'round';
    ctx.strokeStyle = isRoute ? '#55c4dd' : st === 'active' ? '#e89e3b' : (light ? '#b8bfc9' : '#2b3346');
    ctx.lineWidth = isRoute ? 3.5 * z : 2 * z;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();

    if (isRoute || st === 'active') {
      const t = (performance.now() / 1200) % 1;
      const x = pa.x + (pb.x - pa.x) * t;
      const y = pa.y + (pb.y - pa.y) * t;
      ctx.beginPath();
      ctx.arc(x, y, 3.5 * z, 0, Math.PI * 2);
      ctx.fillStyle = '#55c4dd';
      ctx.fill();
    }
  }

  for (const n of graph.getNodes()) {
    const p = P(camera, n.x, n.y);
    const st = nodeStatus(state, n.id);
    const ent = entities.nodes[n.id] || { name: n.id, kind: 'router' };
    const isSource = st === 'source' || (state && state.start === n.id);
    const isSink = st === 'sink' || (state && state.target === n.id);
    const settled = st === 'settled' || st === 'closed' || st === 'visited';

    if (ent.kind === 'server') {
      const wu = 38 * z;
      rr(ctx, p.x - wu / 2, p.y - 16 * z, wu, 34 * z, 4 * z);
      ctx.fillStyle = light ? '#ffffff' : '#1a212e';
      ctx.fill();
      ctx.strokeStyle = isSink ? '#e87a5d' : isSource ? '#55c4dd' : (light ? '#c9cfda' : '#3a4256');
      ctx.lineWidth = 1.6;
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(p.x - wu / 2 + 8 * z + i * 11 * z, p.y + 6 * z, 2.2 * z, 0, Math.PI * 2);
        ctx.fillStyle = settled ? '#79b98f' : '#2a3343';
        ctx.fill();
      }
      label(ctx, ent.name, p.x, p.y + 26 * z, { size: 10.5 * z, color: light ? '#1a1e26' : '#e6e9ef', font: SANS });
    } else {
      const wu = 30 * z;
      rr(ctx, p.x - wu / 2, p.y - wu / 2, wu, wu, 4 * z);
      ctx.fillStyle = st === 'current' ? '#e89e3b' : settled ? (light ? '#d7ecdd' : '#24412f') : (light ? '#ffffff' : '#1a212e');
      ctx.fill();
      ctx.strokeStyle = st === 'current' ? '#f7cd86' : settled ? '#3d7c52' : (light ? '#c9cfda' : '#3a4256');
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.strokeStyle = light ? '#c9cfda' : '#3a4256';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x - 8 * z, p.y - wu / 2);
      ctx.lineTo(p.x - 8 * z, p.y - wu / 2 - 7 * z);
      ctx.moveTo(p.x + 8 * z, p.y - wu / 2);
      ctx.lineTo(p.x + 8 * z, p.y - wu / 2 - 7 * z);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(p.x - 8 * z + i * 8 * z, p.y + 8 * z, 2 * z, 0, Math.PI * 2);
        ctx.fillStyle = settled ? '#79b98f' : '#2a3343';
        ctx.fill();
      }
      label(ctx, ent.name, p.x, p.y + 22 * z, { size: 10.5 * z, color: light ? '#1a1e26' : '#c9d1de', font: SANS });
    }
    if (isSource) label(ctx, 'SOURCE', p.x, p.y - 22 * z, { size: 9 * z, color: '#55c4dd' });
    if (isSink) label(ctx, 'SINK', p.x, p.y - 22 * z, { size: 9 * z, color: '#e87a5d' });
  }

  // latency labels drawn LAST so numbers never hide behind racks/routers
  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    const extra = state.edges && state.edges[e.id] ? state.edges[e.id].extra : '';
    const txt = extra || `${e.weight} ms`;
    label(ctx, txt, (pa.x + pb.x) / 2, (pa.y + pb.y) / 2 - 7 * z, { size: 10.5 * z, color: extra ? '#f7cd86' : (light ? '#5b6472' : '#8a93a6') });
  }

  drawRevealOverlay(ctx, view);
}

// ============================================================================
// 4. SOFTWARE BUILD — a real CI build pipeline (kanban lanes)
// ============================================================================
export function renderBuild(ctx, view) {
  const { graph, camera, state, entities } = view;
  const cz = camera.zoom;
  const zs = Math.min(cz, 1.6); // text-size cap
  const light = view.ui && view.ui.theme === 'light';

  ctx.fillStyle = light ? '#eef1f4' : '#0b0f16';
  ctx.fillRect(0, 0, camera.width, camera.height);

  const order = (state && state.panel && state.panel.order) || (state && state.result && state.result.order) || [];
  const queue = (state && state.panel && state.panel.queue) || [];
  const queueSet = new Set(queue);
  const builtSet = new Set(order);

  // topological layers via longest path from sources
  const layer = {};
  for (const n of graph.getNodes()) layer[n.id] = 1;
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of graph.getEdges()) {
      if (layer[e.to] < layer[e.from] + 1) { layer[e.to] = layer[e.from] + 1; changed = true; }
    }
  }
  const maxLayer = Math.max(1, ...Object.values(layer));
  const byLayer = {};
  for (const n of graph.getNodes()) (byLayer[layer[n.id]] = byLayer[layer[n.id]] || []).push(n);
  for (const k in byLayer) byLayer[k].sort((a, b) => a.y - b.y);

  // ---- world-space board (camera transform applies, zoom/pan works) ----
  const WW = 900, WH = 520;
  const halfW = WW / 2, halfH = WH / 2;
  const cardW = Math.min(185, (WW / (maxLayer + 0.8)) - 62);
  const cardH = 74;
  const topH = -halfH + 74;
  const botH = halfH - 66;
  const colGap = 46;
  const colW = (WW - colGap * (maxLayer + 1)) / maxLayer;
  const pos = {};
  for (let L = 1; L <= maxLayer; L++) {
    const list = byLayer[L] || [];
    const cx = -halfW + colGap + colW * (L - 1) + colW / 2;
    const span = botH - topH;
    list.forEach((n, i) => {
      pos[n.id] = { x: cx, y: topH + span * ((i + 0.5) / Math.max(1, list.length)) };
    });
  }

  // dependency edges (world -> screen, behind cards)
  for (const e of graph.getEdges()) {
    const a = pos[e.from];
    const b = pos[e.to];
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x + cardW / 2, a.y);
    const pb = P(camera, b.x - cardW / 2, b.y);
    const col = st === 'cycle' ? '#e87a5d' : st === 'active' ? '#e89e3b' : (light ? '#c2c9d4' : '#2b3346');
    ctx.strokeStyle = col;
    ctx.lineWidth = st === 'cycle' ? 2.2 : 1.3;
    ctx.setLineDash(st === 'active' ? [] : [5 * cz, 4 * cz]);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    const mx = (pa.x + pb.x) / 2;
    ctx.bezierCurveTo(mx, pa.y, mx, pb.y, pb.x, pb.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const ang = Math.atan2(pb.y - pa.y, pb.x - pa.x);
    ctx.beginPath();
    ctx.moveTo(pb.x, pb.y);
    ctx.lineTo(pb.x - 9 * Math.cos(ang - 0.42), pb.y - 9 * Math.sin(ang - 0.42));
    ctx.lineTo(pb.x - 9 * Math.cos(ang + 0.42), pb.y - 9 * Math.sin(ang + 0.42));
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
  }

  // module cards
  for (const n of graph.getNodes()) {
    const wp = pos[n.id];
    const p = P(camera, wp.x, wp.y);
    const cw = cardW * cz;
    const ch = cardH * cz;
    const st = nodeStatus(state, n.id);
    const ent = entities.nodes[n.id] || { name: n.id };
    const isCurrent = st === 'current';
    const isBuilt = st === 'visited' || st === 'settled' || builtSet.has(n.id);
    const isReady = queueSet.has(n.id) || st === 'discovered' || st === 'open';
    const isBlocked = st === 'conflict' || st === 'articulation';

    let fill, stroke, badge, badgeText;
    if (isBlocked) { fill = light ? '#fdeceb' : '#2a1714'; stroke = '#e87a5d'; badge = '#e87a5d'; badgeText = 'BLOCKED'; }
    else if (isCurrent) { fill = light ? '#fff4e0' : '#2a2113'; stroke = '#e89e3b'; badge = '#e89e3b'; badgeText = 'BUILDING'; }
    else if (isBuilt) { fill = light ? '#ecf7ee' : '#14251a'; stroke = '#3d7c52'; badge = '#3d7c52'; badgeText = 'BUILT'; }
    else if (isReady) { fill = light ? '#f3f7ff' : '#16203a'; stroke = '#4a78b8'; badge = '#4a78b8'; badgeText = 'READY'; }
    else { fill = light ? '#ffffff' : '#151a24'; stroke = light ? '#c9cfda' : '#2b3346'; badge = light ? '#8b95a5' : '#5a6578'; badgeText = 'WAITING'; }

    rr(ctx, p.x - cw / 2, p.y - ch / 2, cw, ch, 11 * zs);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = isCurrent ? 2.4 : 1.5;
    ctx.stroke();

    label(ctx, ent.name, p.x - cw / 2 + 16 * zs, p.y - ch / 2 + 19 * zs, {
      size: 13 * zs, color: light ? '#1a1e26' : '#e6e9ef', font: SANS, bold: true, align: 'left',
    });

    const bw = 72 * zs;
    rr(ctx, p.x - cw / 2 + 16 * zs, p.y + ch / 2 - 29 * zs, bw, 18 * zs, 4.5 * zs);
    ctx.fillStyle = badge;
    ctx.fill();
    label(ctx, badgeText, p.x - cw / 2 + 16 * zs + bw / 2, p.y + ch / 2 - 20 * zs, {
      size: 9 * zs, color: (light && badgeText === 'WAITING') ? '#ffffff' : '#0b0f16', bold: true,
    });

    if (isBuilt) {
      const idx = order.indexOf(n.id) + 1;
      if (idx > 0) {
        ctx.beginPath();
        ctx.arc(p.x + cw / 2 - 22 * zs, p.y, 12.5 * zs, 0, Math.PI * 2);
        ctx.fillStyle = '#3d7c52';
        ctx.fill();
        label(ctx, String(idx), p.x + cw / 2 - 22 * zs, p.y + 0.5, { size: 11 * zs, color: '#ffffff', bold: true });
      }
    } else if (isCurrent) {
      const barW = cw - 32 * zs - 30 * zs;
      const bx = p.x - cw / 2 + 16 * zs;
      const by = p.y + ch / 2 - 9 * zs;
      ctx.fillStyle = light ? '#e8ecf2' : '#232a38';
      ctx.fillRect(bx, by, barW, 5 * zs);
      const t = (performance.now() / 1600) % 1;
      ctx.fillStyle = '#e89e3b';
      ctx.fillRect(bx, by, barW * t, 5 * zs);
    } else if (!isReady) {
      const unmet = graph.getEdges().filter((e) => e.to === n.id).length;
      label(ctx, `needs ${unmet}`, p.x + cw / 2 - 14 * zs, p.y, { size: 10 * zs, color: light ? '#5b6472' : '#8a93a6', align: 'right' });
    }
  }

  // build-order pipeline at the bottom (world coords)
  if (order.length > 0) {
    const slotW = Math.min(132, (WW - 80) / Math.max(1, order.length));
    const totalW = slotW * order.length;
    const startX = -totalW / 2;
    const py = halfH - 30;
    const pHead = P(camera, startX, py - 34 * 1);
    label(ctx, 'BUILD ORDER', pHead.x, pHead.y, { size: 10 * zs, color: light ? '#5b6472' : '#8a93a6', align: 'left', font: SANS, bold: true });
    order.forEach((id, i) => {
      const wx = startX + i * slotW;
      const chip = P(camera, wx + slotW / 2, py);
      rr(ctx, chip.x - (slotW * cz) / 2 + 2, chip.y - 14 * zs, slotW * cz - 4, 28 * zs, 6);
      ctx.fillStyle = light ? '#d7ecdd' : '#1c2b21';
      ctx.fill();
      ctx.strokeStyle = '#3d7c52';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      label(ctx, id, chip.x, chip.y, { size: 9 * zs, color: light ? '#1a1e26' : '#c9e6d0', font: SANS, bold: true });
      if (i < order.length - 1) {
        const arrow = P(camera, wx + slotW, py);
        label(ctx, '→', arrow.x, arrow.y, { size: 9 * zs, color: light ? '#9aa4b2' : '#3a4256' });
      }
    });
  }

  drawRevealOverlay(ctx, view);
}

// 5. WATER NETWORK — flowing pipes
// ============================================================================
// chip label: text with an opaque rounded background (for weights on edges)
function chipLabel(ctx, text, x, y, { size = 10, color = '#e6e9ef', bg = 'rgba(10,14,20,0.9)', border = null } = {}) {
  ctx.font = `600 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width;
  const h = size + 8;
  const w = tw + 12;
  const rx = x - w / 2;
  const ry = y - h / 2;
  ctx.fillStyle = bg;
  rr(ctx, rx, ry, w, h, 4);
  ctx.fill();
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + 0.5);
}

export function renderWater(ctx, view) {
  const { graph, camera, state, entities } = view;
  const z = zoomF(camera);
  const light = view.ui && view.ui.theme === 'light';
  ctx.fillStyle = light ? '#eef1f4' : '#0c111c';
  ctx.fillRect(0, 0, camera.width, camera.height);

  const maxCap = Math.max(1, ...graph.getEdges().map((e) => e.weight));

  // ---- PASS 1: pipes only ----
  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);

    const rec = state.edges && state.edges[e.id];
    const extra = rec ? rec.extra : '';
    const flow = extra ? parseFloat(extra.split('/')[0]) : 0;
    const cap = extra ? parseFloat(extra.split('/')[1]) : e.weight;
    const full = extra && flow >= cap;

    const baseW = (3 + 9 * (cap / maxCap)) * z;
    ctx.lineCap = 'round';
    // outer casing
    ctx.strokeStyle = full ? '#e87a5d' : st === 'active' ? '#e89e3b' : (light ? '#8fb6cc' : '#1f3a4a');
    ctx.lineWidth = baseW;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    // inner water channel (clearly different colour from the casing)
    ctx.strokeStyle = full ? '#f2a184' : (light ? '#4aa8d8' : '#2f6a8a');
    ctx.lineWidth = baseW * 0.55;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();

    // animated flow
    if (flow > 0 && view.ui.world) {
      const t = (performance.now() / 1000) % 1;
      const x = pa.x + (pb.x - pa.x) * t;
      const y = pa.y + (pb.y - pa.y) * t;
      ctx.beginPath();
      ctx.arc(x, y, baseW * 0.28 + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#7fd4f0';
      ctx.fill();
    }
  }

  // ---- PASS 3: nodes (reservoir / water tower / tanks / junctions) ----
  for (const n of graph.getNodes()) {
    const p = P(camera, n.x, n.y);
    const st = nodeStatus(state, n.id);
    const ent = entities.nodes[n.id] || { name: n.id, kind: 'junction' };

    if (ent.kind === 'reservoir') {
      // natural reservoir basin
      const bw = 96 * z;
      const bh = 38 * z;
      const grad = ctx.createLinearGradient(p.x - bw / 2, p.y, p.x + bw / 2, p.y);
      grad.addColorStop(0, light ? '#bfe0ee' : '#1c4a5e');
      grad.addColorStop(1, light ? '#8fc4da' : '#12354a');
      rr(ctx, p.x - bw / 2, p.y - bh / 2, bw, bh, 12 * z);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = light ? '#5e93ab' : '#2f7398';
      ctx.lineWidth = 2;
      ctx.stroke();
      // gentle waves (kept clear of the label which sits below)
      ctx.strokeStyle = light ? '#ffffff' : '#5fb3d8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let wx = p.x - bw / 2 + 14 * z; wx <= p.x + bw / 2 - 14 * z; wx += 4) {
        const wy = p.y - 6 * z + Math.sin(wx / 8) * 2.4 * z;
        if (wx === p.x - bw / 2 + 14 * z) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.stroke();
      label(ctx, 'RESERVOIR', p.x, p.y + bh / 2 + 13 * z, { size: 11 * z, color: light ? '#1a6b8a' : '#9fd6ec', bold: true, font: SANS });
    } else if (ent.kind === 'tank' && /city/i.test(ent.name)) {
      // city demand: a small skyline
      const buildings = [3, 5, 4, 6, 3];
      const bw2 = 20 * z;
      buildings.forEach((floors, i) => {
        const bx = p.x - (buildings.length / 2 - i - 0.5) * (bw2 + 4 * z);
        const bh2 = floors * 9 * z;
        const by = p.y + 10 * z - bh2;
        rr(ctx, bx - bw2 / 2, by, bw2, bh2, 2 * z);
        ctx.fillStyle = light ? '#cdd8e2' : '#22303c';
        ctx.fill();
        ctx.strokeStyle = light ? '#98a2b4' : '#3a4256';
        ctx.lineWidth = 1.1;
        ctx.stroke();
        // lit windows
        ctx.fillStyle = light ? '#7fd0e0' : '#4f9cc0';
        for (let wy = by + 4 * z; wy < by + bh2 - 4 * z; wy += 7 * z) {
          ctx.fillRect(bx - 6 * z, wy, 4 * z, 3 * z);
          ctx.fillRect(bx + 2 * z, wy, 4 * z, 3 * z);
        }
      });
      label(ctx, ent.name, p.x, p.y + 26 * z, { size: 10 * z, color: light ? '#1a1e26' : '#c9d1de', font: SANS });
    } else if (ent.kind === 'tank') {
      // elevated water tower
      const rTop = 18 * z;
      const tankY = p.y - 14 * z;
      // legs
      ctx.strokeStyle = light ? '#8b95a5' : '#3f6a80';
      ctx.lineWidth = 3 * z;
      ctx.beginPath();
      ctx.moveTo(p.x - 12 * z, p.y + 12 * z);
      ctx.lineTo(p.x - 7 * z, tankY + rTop);
      ctx.moveTo(p.x + 12 * z, p.y + 12 * z);
      ctx.lineTo(p.x + 7 * z, tankY + rTop);
      ctx.stroke();
      ctx.lineWidth = 1.6 * z;
      ctx.beginPath();
      ctx.moveTo(p.x - 7 * z, p.y + 12 * z);
      ctx.lineTo(p.x + 7 * z, p.y + 12 * z);
      ctx.stroke();
      // tank body (sphere + cap)
      ctx.beginPath();
      ctx.arc(p.x, tankY, rTop, 0, Math.PI * 2);
      const tg = ctx.createLinearGradient(p.x - rTop, tankY - rTop, p.x + rTop, tankY + rTop);
      tg.addColorStop(0, light ? '#e2f2f8' : '#2c6078');
      tg.addColorStop(1, light ? '#a7d3e4' : '#1c4a5e');
      ctx.fillStyle = tg;
      ctx.fill();
      ctx.strokeStyle = st === 'current' ? '#e89e3b' : (light ? '#5e93ab' : '#3f6a80');
      ctx.lineWidth = st === 'current' ? 2.6 : 2;
      ctx.stroke();
      // conical cap
      ctx.beginPath();
      ctx.moveTo(p.x - rTop * 0.55, tankY - rTop * 0.9);
      ctx.lineTo(p.x + rTop * 0.55, tankY - rTop * 0.9);
      ctx.lineTo(p.x, tankY - rTop * 1.5);
      ctx.closePath();
      ctx.fillStyle = light ? '#8fc4da' : '#2f7398';
      ctx.fill();
      label(ctx, ent.name, p.x, p.y + 26 * z, { size: 10 * z, color: light ? '#1a1e26' : '#c9d1de', font: SANS });
    } else {
      // junction valve
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11 * z, 0, Math.PI * 2);
      ctx.fillStyle = st === 'current' ? '#e89e3b' : (light ? '#ffffff' : '#16303f');
      ctx.fill();
      ctx.strokeStyle = st === 'current' ? '#f7cd86' : '#2f7398';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = '#2f7398';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p.x - 6 * z, p.y);
      ctx.lineTo(p.x + 6 * z, p.y);
      ctx.moveTo(p.x, p.y - 6 * z);
      ctx.lineTo(p.x, p.y + 6 * z);
      ctx.stroke();
      label(ctx, ent.name, p.x, p.y + 20 * z, { size: 9.5 * z, color: light ? '#1a1e26' : '#9fb6c4', font: SANS });
    }
  }

  // ---- PASS 4: flow labels drawn LAST (numbers always on top) ----
  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    const rec = state.edges && state.edges[e.id];
    const extra = rec ? rec.extra : '';
    const flow = extra ? parseFloat(extra.split('/')[0]) : 0;
    const cap = extra ? parseFloat(extra.split('/')[1]) : e.weight;
    const full = extra && flow >= cap;
    const baseW = (3 + 9 * (cap / maxCap)) * z;
    const txt = extra ? `${extra} L/s` : `${e.weight} L/s`;
    const col = full ? '#f2a184' : extra ? (light ? '#1a6b8a' : '#8fd0ea') : (light ? '#4f5f72' : '#9fb6c4');
    chipLabel(ctx, txt, (pa.x + pb.x) / 2, (pa.y + pb.y) / 2 - baseW / 2 - 9 * z, {
      size: 10 * z, color: col, bg: light ? 'rgba(255,255,255,0.92)' : 'rgba(10,14,20,0.88)', border: col,
    });
    if (full) chipLabel(ctx, 'CAPACITY REACHED', (pa.x + pb.x) / 2, (pa.y + pb.y) / 2 + baseW / 2 + 9 * z, {
      size: 8.5 * z, color: '#ffffff', bg: '#e87a5d', border: '#b95a43',
    });
  }

  drawRevealOverlay(ctx, view);
}

// ============================================================================
// 6. GAME PATHFINDING — clear, readable game world
// ============================================================================
const TERRAIN_DARK = { '.': '#2e4a2c', 'r': '#4a4d44', '~': '#1a4a66', 'm': '#6b4a24' };
const TERRAIN_LIGHT = { '.': '#cfe3c9', 'r': '#e2e3dc', '~': '#bcd9ea', 'm': '#e4d2ae' };
const TERRAIN_EDGE = { '.': '#3d6b3a', 'r': '#5a5d52', '~': '#2f7398', 'm': '#8a622f' };

const TERRAIN_LEGEND = [
  { key: '.', name: 'Grass', cost: 1 },
  { key: 'r', name: 'Road', cost: 1 },
  { key: 'm', name: 'Mud', cost: 3 },
  { key: '~', name: 'Water', cost: 4 },
];

export function renderGame(ctx, view) {
  const { graph, camera, state, entities, ui } = view;
  const z = zoomF(camera);
  const light = view.ui && view.ui.theme === 'light';
  const TERRAIN = light ? TERRAIN_LIGHT : TERRAIN_DARK;
  const tile = 84;

  ctx.fillStyle = light ? '#e7ecef' : '#0a0e12';
  ctx.fillRect(0, 0, camera.width, camera.height);

  const path = (state && state.result && state.result.path) || [];
  if (path.length > 1) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = light ? '#0e7490' : '#55c4dd';
    ctx.lineWidth = 10 * z;
    ctx.beginPath();
    path.forEach((id, i) => {
      const n = graph.getNode(id);
      if (!n) return;
      const p = P(camera, n.x, n.y);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2 * z;
    ctx.setLineDash([6 * z, 6 * z]);
    ctx.beginPath();
    path.forEach((id, i) => {
      const n = graph.getNode(id);
      if (!n) return;
      const p = P(camera, n.x, n.y);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const n of graph.getNodes()) {
    const ent = entities.nodes[n.id] || {};
    const t = ent.terrain || '.';
    const p = P(camera, n.x, n.y);
    const s = tile * camera.zoom;
    const st = nodeStatus(state, n.id);

    ctx.fillStyle = TERRAIN[t] || TERRAIN['.'];
    rr(ctx, p.x - s / 2 + 1, p.y - s / 2 + 1, s - 2, s - 2, 5 * z);
    ctx.fill();
    ctx.strokeStyle = TERRAIN_EDGE[t] || TERRAIN_EDGE['.'];
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x - s / 2, p.y - s / 2, s, s);
    ctx.clip();
    if (t === '~') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.4;
      for (let wy = p.y - s / 2 + 8; wy < p.y + s / 2; wy += 8) {
        ctx.beginPath();
        for (let wx = p.x - s / 2; wx <= p.x + s / 2; wx += 3) {
          const yy = wy + Math.sin(wx / 6) * 2;
          if (wx === p.x - s / 2) ctx.moveTo(wx, yy);
          else ctx.lineTo(wx, yy);
        }
        ctx.stroke();
      }
    } else if (t === 'm') {
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      for (let i = 0; i < 7; i++) {
        const sx = seedRand(n.id.charCodeAt(0) + i * 7);
        const sy = seedRand(n.id.charCodeAt(1) + i * 13);
        ctx.beginPath();
        ctx.arc(p.x - s / 2 + sx * s, p.y - s / 2 + sy * s, 2.4 * z, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (t === 'r') {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.moveTo(p.x - s / 2, p.y);
      ctx.lineTo(p.x + s / 2, p.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    if (st === 'unvisited') {
      ctx.fillStyle = light ? 'rgba(220,226,232,0.45)' : 'rgba(6,10,14,0.5)';
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    } else if (st === 'open' || st === 'discovered') {
      ctx.strokeStyle = light ? '#2f6fe4' : '#5b7fb0';
      ctx.lineWidth = 2.4;
      ctx.strokeRect(p.x - s / 2 + 1, p.y - s / 2 + 1, s - 2, s - 2);
    }

    if (st === 'current') {
      ctx.strokeStyle = '#e89e3b';
      ctx.lineWidth = 3;
      ctx.strokeRect(p.x - s / 2 + 1, p.y - s / 2 + 1, s - 2, s - 2);
    }
  }

  for (const n of graph.getNodes()) {
    const p = P(camera, n.x, n.y);
    const s = tile * camera.zoom;
    if (state && state.start === n.id) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 13 * z, 0, Math.PI * 2);
      ctx.fillStyle = '#2e7d4f';
      ctx.fill();
      ctx.strokeStyle = '#0f1216';
      ctx.lineWidth = 2;
      ctx.stroke();
      label(ctx, 'S', p.x, p.y, { size: 12 * z, color: '#ffffff', bold: true });
    }
    if (state && state.target === n.id) {
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s / 2 + 4);
      ctx.lineTo(p.x, p.y + s / 2 - 4);
      ctx.stroke();
      const fw = 20 * z;
      ctx.fillStyle = '#b45309';
      ctx.fillRect(p.x, p.y - s / 2 + 4, fw, 7 * z);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(p.x + c * (fw / 3), p.y - s / 2 + 4 + r * 3.5 * z, fw / 3, 3.5 * z);
        }
      }
      label(ctx, 'GOAL', p.x, p.y + s / 2 + 12 * z, { size: 9 * z, color: light ? '#7c4a12' : '#f2a184', bold: true });
    }
  }

  if (ui.world && state) {
    let cur = state.currentNode;
    if (state.complete && state.result && state.result.path) cur = state.result.path[state.result.path.length - 1];
    if (cur) {
      const n = graph.getNode(cur);
      if (n) {
        const p = P(camera, n.x, n.y);
        const r = 11 * z;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#e89e3b';
        ctx.fill();
        ctx.strokeStyle = '#0f1216';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#0f1216';
        ctx.beginPath();
        ctx.arc(p.x - 3.5 * z, p.y - 1.5 * z, 1.8 * z, 0, Math.PI * 2);
        ctx.arc(p.x + 3.5 * z, p.y - 1.5 * z, 1.8 * z, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawGameLegend(ctx, camera.width, camera.height, light);
  drawRevealOverlay(ctx, view);
}

function drawGameLegend(ctx, cw, ch, light) {
  const items = TERRAIN_LEGEND;
  const iw = 84;
  const ih = 20;
  const x0 = 14;
  const y0 = ch - 14 - ih;
  rr(ctx, x0 - 8, y0 - 8, items.length * iw + 16, ih + 16, 9);
  ctx.fillStyle = light ? 'rgba(255,255,255,0.9)' : 'rgba(12,17,28,0.85)';
  ctx.fill();
  ctx.strokeStyle = light ? '#c9cfda' : '#2b3346';
  ctx.lineWidth = 1;
  ctx.stroke();
  items.forEach((it, i) => {
    const x = x0 + i * iw;
    const cx = x + 9;
    const cy = y0 + ih / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fillStyle = (light ? TERRAIN_LIGHT : TERRAIN_DARK)[it.key];
    ctx.fill();
    ctx.strokeStyle = TERRAIN_EDGE[it.key];
    ctx.lineWidth = 1;
    ctx.stroke();
    label(ctx, `${it.name} ${it.cost}`, x + 18, cy, { size: 10, color: light ? '#1a1e26' : '#c9d1de', align: 'left', font: SANS });
  });
}

// ============================================================================
// 7. COURSE PLANNING — degree-plan board
// ============================================================================
export function renderCourse(ctx, view) {
  const { graph, camera, state, entities } = view;
  const cz = camera.zoom;
  const zs = Math.min(cz, 1.6);
  const light = view.ui && view.ui.theme === 'light';
  ctx.fillStyle = light ? '#eef1f4' : '#0c111c';
  ctx.fillRect(0, 0, camera.width, camera.height);

  const sem = {};
  for (const n of graph.getNodes()) sem[n.id] = 1;
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of graph.getEdges()) {
      if (sem[e.to] < sem[e.from] + 1) { sem[e.to] = sem[e.from] + 1; changed = true; }
    }
  }
  const maxSem = Math.max(1, ...Object.values(sem));
  const semNodes = {};
  for (const n of graph.getNodes()) (semNodes[sem[n.id]] = semNodes[sem[n.id]] || []).push(n);

  // world-space board
  const WW = 900, WH = 520;
  const halfW = WW / 2, halfH = WH / 2;
  const colW = (WW - 120) / Math.max(1, maxSem);
  const pos = {};
  for (let s = 1; s <= maxSem; s++) {
    const nodes = (semNodes[s] || []).slice().sort((a, b) => a.y - b.y);
    const cx = -halfW + 60 + colW * (s - 1) + colW / 2;
    const span = WH - 150;
    nodes.forEach((n, i) => {
      pos[n.id] = { x: cx, y: -halfH + 75 + span * ((i + 0.5) / Math.max(1, nodes.length)) };
    });
  }

  for (let s = 1; s <= maxSem; s++) {
    const cx = -halfW + 60 + colW * (s - 1) + colW / 2;
    const p = P(camera, cx, -halfH + 34);
    label(ctx, `SEMESTER ${s}`, p.x, p.y, { size: 11 * zs, color: light ? '#5b6472' : '#8a93a6', font: SANS, bold: true });
  }

  for (const e of graph.getEdges()) {
    const a = pos[e.from];
    const b = pos[e.to];
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x + 150 * 0.47, a.y);
    const pb = P(camera, b.x - 150 * 0.47, b.y);
    ctx.strokeStyle = st === 'cycle' ? '#e87a5d' : st === 'active' ? '#e89e3b' : (light ? '#c9cfda' : '#2b3346');
    ctx.lineWidth = st === 'cycle' ? 2 : 1.2;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    const mx = (pa.x + pb.x) / 2;
    ctx.bezierCurveTo(mx, pa.y, mx, pb.y, pb.x, pb.y);
    ctx.stroke();
  }

  for (const n of graph.getNodes()) {
    const wp = pos[n.id];
    const p = P(camera, wp.x, wp.y);
    const st = nodeStatus(state, n.id);
    const ent = entities.nodes[n.id] || { name: n.id };
    const done = st === 'visited' || st === 'settled';
    const active = st === 'current' || st === 'discovered' || st === 'open';
    const blocked = st === 'conflict' || st === 'articulation';
    const w = 155 * cz;
    const h = 48 * cz;

    rr(ctx, p.x - w / 2, p.y - h / 2, w, h, 7 * zs);
    ctx.fillStyle = active ? (light ? '#fff4e0' : '#2a2113') : done ? (light ? '#d7ecdd' : '#1c2b21') : (light ? '#ffffff' : '#151a24');
    ctx.fill();
    ctx.strokeStyle = blocked ? '#e87a5d' : active ? '#e89e3b' : done ? '#3d7c52' : (light ? '#c9cfda' : '#3a4256');
    ctx.lineWidth = 1.6;
    ctx.stroke();
    label(ctx, ent.name, p.x, p.y, { size: 11 * zs, color: light ? '#1a1e26' : '#e6e9ef', font: SANS });
    ctx.beginPath();
    ctx.arc(p.x - w / 2 + 10 * zs, p.y, 4 * zs, 0, Math.PI * 2);
    ctx.fillStyle = blocked ? '#e87a5d' : active ? '#e89e3b' : done ? '#3d7c52' : (light ? '#c9cfda' : '#3a4256');
    ctx.fill();
  }

  drawRevealOverlay(ctx, view);
}

// ============================================================================
// 8. JOB MATCHING — assignment board
// ============================================================================
export function renderMatching(ctx, view) {
  const { graph, camera, state, entities } = view;
  const z = zoomF(camera);
  const light = view.ui && view.ui.theme === 'light';
  ctx.fillStyle = light ? '#eef1f4' : '#0c111c';
  ctx.fillRect(0, 0, camera.width, camera.height);

  // divider + column headers in WORLD space so they stay glued to the board
  // under zoom / pan (candidates live left of x=0, jobs right of x=0)
  const mid = P(camera, 0, 0);
  const divTop = P(camera, 0, -330);
  const divBot = P(camera, 0, 330);
  ctx.strokeStyle = light ? '#d4dae2' : '#232a38';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mid.x, divTop.y);
  ctx.lineTo(mid.x, divBot.y);
  ctx.stroke();
  const candH = P(camera, -150, -300);
  const jobH = P(camera, 150, -300);
  label(ctx, 'CANDIDATES', candH.x, candH.y, { size: 11 * z, color: light ? '#5b6472' : '#8a93a6', align: 'center', font: SANS });
  label(ctx, 'JOBS', jobH.x, jobH.y, { size: 11 * z, color: light ? '#5b6472' : '#8a93a6', align: 'center', font: SANS });

  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    ctx.strokeStyle = st === 'matched' ? '#3d7c52' : st === 'active' ? '#e89e3b' : (light ? '#dde2e9' : '#232a38');
    ctx.lineWidth = st === 'matched' ? 3 : st === 'active' ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  for (const n of graph.getNodes()) {
    const p = P(camera, n.x, n.y);
    const st = nodeStatus(state, n.id);
    const ent = entities.nodes[n.id] || { name: n.id, kind: 'candidate' };
    const matched = st === 'visited' || st === 'matched';
    const w = 168 * z;
    const h = 52 * z;
    const isLeft = n.x < 0;

    rr(ctx, p.x - w / 2, p.y - h / 2, w, h, 7 * z);
    ctx.fillStyle = matched ? (light ? '#d7ecdd' : '#1c2b21') : st === 'current' ? (light ? '#fff4e0' : '#2a2113') : (light ? '#ffffff' : '#151a24');
    ctx.fill();
    ctx.strokeStyle = matched ? '#3d7c52' : st === 'current' ? '#e89e3b' : (light ? '#c9cfda' : '#3a4256');
    ctx.lineWidth = 1.6;
    ctx.stroke();

    const ax = isLeft ? p.x - w / 2 + 20 * z : p.x + w / 2 - 20 * z;
    ctx.beginPath();
    ctx.arc(ax, p.y, 13 * z, 0, Math.PI * 2);
    ctx.fillStyle = matched ? '#3d7c52' : st === 'current' ? '#e89e3b' : '#4a78b8';
    ctx.fill();
    const initials = ent.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
    label(ctx, initials, ax, p.y, { size: 8 * z, color: '#ffffff', bold: true });

    const nameX = isLeft ? p.x - w / 2 + 40 * z : p.x + w / 2 - 40 * z;
    const align = isLeft ? 'left' : 'right';
    label(ctx, ent.name, nameX, p.y - 7 * z, { size: 11 * z, color: light ? '#1a1e26' : '#e6e9ef', font: SANS, bold: true, align });
    label(ctx, ent.skills || ent.req || '', nameX, p.y + 11 * z, { size: 9.5 * z, color: light ? '#5b6472' : '#8a93a6', align });

    if (matched) label(ctx, '✓ ASSIGNED', p.x, p.y - h / 2 - 9 * z, { size: 9 * z, color: '#3d7c52', bold: true });
  }

  drawRevealOverlay(ctx, view);
}

// ============================================================================
// 9. CRITICAL INFRASTRUCTURE — metro-style transport map
// ============================================================================
export function renderCritical(ctx, view) {
  const { graph, camera, state, entities, ui } = view;
  const z = zoomF(camera);
  const light = view.ui && view.ui.theme === 'light';
  const closed = ui.closed || new Set();

  // --- land with a river + fields so it reads as a real region map ---
  ctx.fillStyle = light ? '#eef1ec' : '#10141b';
  ctx.fillRect(0, 0, camera.width, camera.height);

  // river (decorative, running along the left)
  const riverPts = [[-420, 260], [-380, 120], [-360, -20], [-340, -140], [-320, -260]];
  tracePolyline(ctx, camera, riverPts);
  ctx.strokeStyle = light ? '#a9ccde' : '#17323d';
  ctx.lineWidth = 34 * camera.zoom;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  tracePolyline(ctx, camera, riverPts);
  ctx.strokeStyle = light ? '#bfdbe8' : '#1e4251';
  ctx.lineWidth = 26 * camera.zoom;
  ctx.stroke();

  // --- roads (asphalt) ---
  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    const isClosed = closed.has(e.id);
    const isBridge = st === 'bridge';

    ctx.lineCap = 'round';
    if (isClosed) {
      ctx.strokeStyle = light ? '#d99c8f' : '#5a2430';
      ctx.lineWidth = 7 * z;
      ctx.setLineDash([10 * z, 8 * z]);
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      ctx.setLineDash([]);
      continue;
    }
    if (isBridge) {
      ctx.strokeStyle = '#e87a5d';
      ctx.lineWidth = 9 * z;
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      continue;
    }
    // normal road: dark asphalt + centre dashes
    ctx.strokeStyle = st === 'active' ? '#d99a3a' : (light ? '#8a93a0' : '#2c3648');
    ctx.lineWidth = (st === 'active' ? 8 : 6.5) * z;
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    ctx.strokeStyle = light ? '#f4f6f8' : '#10141b';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([8 * z, 8 * z]);
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    ctx.setLineDash([]);
    if (st === 'tree') {
      ctx.strokeStyle = '#5f7f6a';
      ctx.lineWidth = 4 * z;
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    }
  }

  // --- districts/towns: small building clusters ---
  for (const n of graph.getNodes()) {
    const p = P(camera, n.x, n.y);
    const st = nodeStatus(state, n.id);
    const ent = entities.nodes[n.id] || { name: n.id };
    const isAP = st === 'articulation';
    const active = st === 'current';
    const seed = n.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

    // a few houses around the station dot
    const houseCols = ['#7a6a4a', '#5c7a68', '#8a6a5a', '#5a6a8a', '#7a7a5a'];
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + seed * 0.13;
      const hx = p.x + Math.cos(ang) * 22 * z;
      const hy = p.y + Math.sin(ang) * 22 * z;
      const hs = 10 * z;
      // little house
      ctx.fillStyle = light ? houseCols[i] : '#22303c';
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
      // roof
      ctx.beginPath();
      ctx.moveTo(hx - hs / 2 - 2, hy - hs / 2);
      ctx.lineTo(hx, hy - hs / 2 - 5 * z);
      ctx.lineTo(hx + hs / 2 + 2, hy - hs / 2);
      ctx.closePath();
      ctx.fillStyle = isAP ? '#e87a5d' : light ? '#4a5a6a' : '#38495f';
      ctx.fill();
    }

    // station building
    const bw = 34 * z;
    const bh = 24 * z;
    rr(ctx, p.x - bw / 2, p.y - bh / 2, bw, bh, 5 * z);
    ctx.fillStyle = isAP ? '#e87a5d' : active ? '#e89e3b' : (light ? '#ffffff' : '#1a212e');
    ctx.fill();
    ctx.strokeStyle = isAP ? '#8a3d2c' : active ? '#c98a2e' : (light ? '#8a93a0' : '#3a4256');
    ctx.lineWidth = isAP ? 2.6 : 1.8;
    ctx.stroke();
    // door
    ctx.fillStyle = isAP ? '#ffffff' : (light ? '#8a93a0' : '#2a3343');
    ctx.fillRect(p.x - 4 * z, p.y + bh / 2 - 10 * z, 8 * z, 10 * z);

    // name plate below
    const tw = ctx.measureText(ent.name).width;
    const pw = (tw + 16) * z;
    rr(ctx, p.x - pw / 2, p.y + bh / 2 + 4 * z, pw, 16 * z, 3);
    ctx.fillStyle = light ? '#ffffff' : '#151a24';
    ctx.fill();
    ctx.strokeStyle = isAP ? '#e87a5d' : (light ? '#c9cfda' : '#2a3343');
    ctx.lineWidth = 1;
    ctx.stroke();
    label(ctx, ent.name, p.x, p.y + bh / 2 + 12 * z, { size: 9.5 * z, color: light ? '#1a1e26' : '#c9d1de', font: SANS });

    if (isAP) {
      chipLabel(ctx, 'CRITICAL HUB', p.x, p.y - bh / 2 - 12 * z, { size: 8.5 * z, color: '#fff', bg: '#b95a43', border: '#8a3d2c' });
    }
  }

  // bridge / closure chips drawn LAST so labels always win over roads/houses
  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    const isClosed = closed.has(e.id);
    const isBridge = st === 'bridge';
    if (isClosed) {
      chipLabel(ctx, '✕ CLOSED', (pa.x + pb.x) / 2, (pa.y + pb.y) / 2 - 12 * z, { size: 8.5 * z, color: '#fff', bg: '#b95a43', border: '#8a3d2c' });
    } else if (isBridge) {
      chipLabel(ctx, 'BRIDGE', (pa.x + pb.x) / 2, (pa.y + pb.y) / 2 - 14 * z, { size: 8.5 * z, color: '#fff', bg: '#b95a43', border: '#8a3d2c' });
    }
  }

  drawRevealOverlay(ctx, view);
}

// ============================================================================
// 10. DELIVERY LOGISTICS — warehouse + houses + truck
// ============================================================================
export function renderDelivery(ctx, view) {
  const { graph, camera, state, entities } = view;
  const z = zoomF(camera);
  const light = view.ui && view.ui.theme === 'light';
  ctx.fillStyle = light ? '#eef1f4' : '#0c111c';
  ctx.fillRect(0, 0, camera.width, camera.height);

  const tour = state && state.result && state.result.tour ? state.result.tour : (state && state.result && state.result.path ? state.result.path : []);
  const tourEdges = new Set();
  for (let i = 0; i < tour.length - 1; i++) {
    for (const e of graph.getEdgesBetween(tour[i], tour[i + 1])) tourEdges.add(e.id);
  }

  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    const onTour = tourEdges.has(e.id);
    ctx.lineCap = 'round';
    ctx.strokeStyle = onTour ? '#d8a53a' : st === 'active' ? '#e89e3b' : (light ? '#c3cad4' : '#2b3346');
    ctx.lineWidth = onTour ? 5 * z : 2 * z;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  for (const n of graph.getNodes()) {
    const p = P(camera, n.x, n.y);
    const st = nodeStatus(state, n.id);
    const ent = entities.nodes[n.id] || { name: n.id, kind: 'customer' };
    const onTour = tour.includes(n.id);

    if (ent.kind === 'warehouse') {
      rr(ctx, p.x - 24 * z, p.y - 22 * z, 48 * z, 44 * z, 6 * z);
      ctx.fillStyle = light ? '#ffffff' : '#2a2113';
      ctx.fill();
      ctx.strokeStyle = '#e89e3b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x - 24 * z, p.y - 22 * z);
      ctx.lineTo(p.x, p.y - 34 * z);
      ctx.lineTo(p.x + 24 * z, p.y - 22 * z);
      ctx.strokeStyle = '#e89e3b';
      ctx.stroke();
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(p.x - 16 * z, p.y + 6 * z, 9 * z, 10 * z);
      ctx.fillRect(p.x + 7 * z, p.y + 6 * z, 9 * z, 10 * z);
      label(ctx, 'WAREHOUSE', p.x, p.y + 38 * z, { size: 9.5 * z, color: '#e89e3b', font: SANS, bold: true });
    } else {
      const s = 16 * z;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s);
      ctx.lineTo(p.x - s, p.y);
      ctx.lineTo(p.x - s, p.y + s);
      ctx.lineTo(p.x + s, p.y + s);
      ctx.lineTo(p.x + s, p.y);
      ctx.closePath();
      ctx.fillStyle = onTour ? (light ? '#d7ecdd' : '#24412f') : (light ? '#ffffff' : '#1a212e');
      ctx.fill();
      ctx.strokeStyle = onTour ? '#3d7c52' : st === 'current' ? '#f7cd86' : (light ? '#c9cfda' : '#3a4256');
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = onTour ? '#3d7c52' : (light ? '#c9cfda' : '#3a4256');
      ctx.fillRect(p.x - 3 * z, p.y + s - 8 * z, 6 * z, 8 * z);
      label(ctx, ent.name, p.x, p.y + 32 * z, { size: 9.5 * z, color: onTour ? (light ? '#1a1e26' : '#d7dce6') : (light ? '#5b6472' : '#7c8598'), font: SANS });
    }
  }

  // distance labels drawn LAST so km numbers stay above houses/warehouse
  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    if (tourEdges.has(e.id)) continue;
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    label(ctx, `${e.weight} km`, (pa.x + pb.x) / 2, (pa.y + pb.y) / 2 - 7 * z, { size: 9.5 * z, color: light ? '#5b6472' : '#8a93a6' });
  }

  if (view.ui.world && tour.length > 1) {
    drawVehicle(ctx, view, tour, 'truck');
  }

  drawRevealOverlay(ctx, view);
}

// ============================================================================
// 11. STREET INSPECTION — city blocks + inspector
// ============================================================================
export function renderStreet(ctx, view) {
  const { graph, camera, state, entities } = view;
  const z = zoomF(camera);
  const light = view.ui && view.ui.theme === 'light';
  ctx.fillStyle = light ? '#eef1f4' : '#0c111c';
  ctx.fillRect(0, 0, camera.width, camera.height);

  for (let bx = -340; bx <= 340; bx += 200) {
    for (let by = -260; by <= 260; by += 160) {
      const p = P(camera, bx, by);
      rr(ctx, p.x - 70 * camera.zoom, p.y - 55 * camera.zoom, 140 * camera.zoom, 110 * camera.zoom, 6 * camera.zoom);
      ctx.fillStyle = light ? '#e2e7ee' : '#131a26';
      ctx.fill();
    }
  }

  const trail = state && state.result && state.result.trail ? state.result.trail : [];

  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    const used = st === 'tree' || st === 'path' || st === 'visited';
    ctx.lineCap = 'round';
    ctx.strokeStyle = used ? '#3d7c52' : st === 'active' ? '#e89e3b' : (light ? '#c3cad4' : '#2b3346');
    ctx.lineWidth = (used ? 6 : 4) * z;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    ctx.strokeStyle = used ? '#79b98f' : (light ? '#d4dae2' : '#39465f');
    ctx.lineWidth = 1;
    ctx.stroke();
    if (!used) {
      ctx.strokeStyle = light ? '#eef1f4' : '#0c111c';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([7 * z, 7 * z]);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  for (const n of graph.getNodes()) {
    const p = P(camera, n.x, n.y);
    const st = nodeStatus(state, n.id);
    const ent = entities.nodes[n.id] || { name: n.id };
    const degree = state.panel && state.panel.degree ? state.panel.degree[n.id] : null;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10 * z, 0, Math.PI * 2);
    ctx.fillStyle = st === 'current' ? '#e89e3b' : (light ? '#ffffff' : '#1a212e');
    ctx.fill();
    ctx.strokeStyle = st === 'current' ? '#f7cd86' : (light ? '#98a2b4' : '#3a4256');
    ctx.lineWidth = 1.8;
    ctx.stroke();
    label(ctx, ent.name, p.x, p.y + 22 * z, { size: 10 * z, color: light ? '#1a1e26' : '#c9d1de' });
    if (degree != null && degree % 2 === 1) label(ctx, `odd (${degree})`, p.x, p.y - 20 * z, { size: 9 * z, color: '#f2a184' });
  }

  if (view.ui.world && trail.length > 1) {
    drawVehicle(ctx, view, trail, 'truck');
  }

  drawRevealOverlay(ctx, view);
}

// ============================================================================
// 12. SOCIAL NETWORK — avatar cards + friendship waves
// ============================================================================
export function renderSocial(ctx, view) {
  const { graph, camera, state, entities } = view;
  const z = zoomF(camera);
  const light = view.ui && view.ui.theme === 'light';
  ctx.fillStyle = light ? '#eef1f4' : '#0c111c';
  ctx.fillRect(0, 0, camera.width, camera.height);

  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    ctx.strokeStyle = st === 'active' ? '#e89e3b' : (light ? '#dde2e9' : '#232a38');
    ctx.lineWidth = st === 'active' ? 2.2 : 1.2;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  for (const n of graph.getNodes()) {
    const p = P(camera, n.x, n.y);
    const st = nodeStatus(state, n.id);
    const ent = entities.nodes[n.id] || { name: n.id, color: '#4a78b8' };
    const r = 22 * z;

    if (st === 'discovered' || st === 'open') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 6 * z, 0, Math.PI * 2);
      ctx.strokeStyle = '#4a78b8';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = st === 'current' ? '#e89e3b' : st === 'visited' || st === 'settled' || st === 'closed' ? '#3d7c52' : ent.color;
    ctx.fill();
    ctx.strokeStyle = st === 'current' ? '#f7cd86' : (light ? 'rgba(0,0,0,0.15)' : '#0f1216');
    ctx.lineWidth = st === 'current' ? 2.5 : 1.4;
    ctx.stroke();
    label(ctx, (ent.initials || ent.name[0] || '?'), p.x, p.y, { size: 12 * z, color: '#ffffff', bold: true });

    label(ctx, ent.name, p.x, p.y + r + 12 * z, { size: 10.5 * z, color: light ? '#1a1e26' : '#e6e9ef', font: SANS, bold: st !== 'unvisited' });
    if (ent.field) label(ctx, ent.field, p.x, p.y + r + 26 * z, { size: 8.5 * z, color: light ? '#5b6472' : '#8a93a6', font: SANS });
  }

  // relationship labels drawn LAST so they always sit on top of the avatars
  for (const e of graph.getEdges()) {
    const relEnt = entities.edges && entities.edges[e.id];
    if (!relEnt || !relEnt.rel) continue;
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const mx = (pa.x + pb.x) / 2 + nx * 15 * z;
    const my = (pa.y + pb.y) / 2 + ny * 15 * z;
    chipLabel(ctx, relEnt.rel, mx, my, {
      size: 8.5 * z,
      color: light ? '#4a5568' : '#aeb9cb',
      bg: light ? 'rgba(255,255,255,0.88)' : 'rgba(12,17,28,0.8)',
      border: light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)',
    });
  }

  drawRevealOverlay(ctx, view);
}

// ============================================================================
// 13. WEB RANKING — browser windows with rank bars
// ============================================================================
export function renderWeb(ctx, view) {
  const { graph, camera, state, entities } = view;
  const z = zoomF(camera);
  const light = view.ui && view.ui.theme === 'light';
  ctx.fillStyle = light ? '#eef1f4' : '#0c111c';
  ctx.fillRect(0, 0, camera.width, camera.height);

  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    ctx.strokeStyle = st === 'active' ? '#e89e3b' : (light ? '#c9cfda' : '#2b3346');
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    const ang = Math.atan2(pb.y - pa.y, pb.x - pa.x);
    ctx.beginPath();
    ctx.moveTo(pb.x, pb.y);
    ctx.lineTo(pb.x - 7 * Math.cos(ang - 0.4), pb.y - 7 * Math.sin(ang - 0.4));
    ctx.lineTo(pb.x - 7 * Math.cos(ang + 0.4), pb.y - 7 * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  }

  const rank = (state.panel && state.panel.rank) || {};
  const maxRank = Math.max(0.0001, ...Object.values(rank));

  for (const n of graph.getNodes()) {
    const p = P(camera, n.x, n.y);
    const st = nodeStatus(state, n.id);
    const ent = entities.nodes[n.id] || { name: n.id, url: n.id };
    const w = 158 * z;
    const h = 86 * z;
    const r = rank[n.id] || 0;

    rr(ctx, p.x - w / 2, p.y - h / 2, w, h, 7 * z);
    ctx.fillStyle = light ? '#ffffff' : '#151a24';
    ctx.fill();
    ctx.strokeStyle = st === 'current' ? '#e89e3b' : (light ? '#c9cfda' : '#3a4256');
    ctx.lineWidth = st === 'current' ? 2 : 1.4;
    ctx.stroke();
    ctx.fillStyle = light ? '#e8ecf2' : '#1f2532';
    ctx.fillRect(p.x - w / 2, p.y - h / 2, w, 16 * z);
    ctx.fillStyle = '#e87a5d';
    ctx.beginPath();
    ctx.arc(p.x - w / 2 + 9 * z, p.y - h / 2 + 8 * z, 2.6 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0a03a';
    ctx.beginPath();
    ctx.arc(p.x - w / 2 + 16 * z, p.y - h / 2 + 8 * z, 2.6 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a9d66';
    ctx.beginPath();
    ctx.arc(p.x - w / 2 + 23 * z, p.y - h / 2 + 8 * z, 2.6 * z, 0, Math.PI * 2);
    ctx.fill();

    const pad = 10 * z;
    const valTxt = r.toFixed(3);
    ctx.font = `600 ${10 * z}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const valX = p.x + w / 2 - pad;
    const valY = p.y - h / 2 + 24 * z;
    ctx.fillStyle = light ? '#5b6472' : '#8a93a6';
    ctx.fillText(valTxt, valX + 0.6, valY + 0.6);
    ctx.fillStyle = '#4a78b8';
    ctx.fillText(valTxt, valX, valY);

    label(ctx, ent.name, p.x - pad / 2, p.y - h / 2 + 24 * z, { size: 12 * z, color: light ? '#1a1e26' : '#e6e9ef', font: SANS, bold: true, align: 'left' });
    label(ctx, ent.url || '', p.x - pad / 2, p.y + 6 * z, { size: 9 * z, color: light ? '#5b6472' : '#8a93a6', align: 'left' });

    const barW = w - 2 * pad;
    const barX = p.x - barW / 2;
    const barY = p.y + h / 2 - 14 * z;
    ctx.fillStyle = light ? '#e4e8ee' : '#232a38';
    ctx.fillRect(barX, barY, barW, 8 * z);
    ctx.fillStyle = '#4a78b8';
    ctx.fillRect(barX, barY, Math.max(2, barW * (r / maxRank)), 8 * z);
  }

  drawRevealOverlay(ctx, view);
}

// ============================================================================
// 14. AIRPORT NETWORK — flight radar map
// ============================================================================
export function renderAirport(ctx, view) {
  const { graph, camera, state, entities } = view;
  const z = zoomF(camera);
  const light = view.ui && view.ui.theme === 'light';
  ctx.fillStyle = light ? '#eef1f4' : '#0c111c';
  ctx.fillRect(0, 0, camera.width, camera.height);

  ctx.strokeStyle = light ? 'rgba(15,17,21,0.05)' : 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let gx = -600; gx <= 600; gx += 120) {
    const p = P(camera, gx, 0);
    ctx.beginPath();
    ctx.moveTo(p.x, 0);
    ctx.lineTo(p.x, camera.height);
    ctx.stroke();
  }
  for (let gy = -400; gy <= 400; gy += 120) {
    const p = P(camera, 0, gy);
    ctx.beginPath();
    ctx.moveTo(0, p.y);
    ctx.lineTo(camera.width, p.y);
    ctx.stroke();
  }

  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    const isRoute = st === 'path';
    const mx = (pa.x + pb.x) / 2;
    const my = (pa.y + pb.y) / 2;
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const arc = Math.min(40, Math.hypot(dx, dy) * 0.15);
    const cx = mx + (-dy / (Math.hypot(dx, dy) || 1)) * arc;
    const cy = my + (dx / (Math.hypot(dx, dy) || 1)) * arc;

    ctx.lineCap = 'round';
    ctx.strokeStyle = isRoute ? '#e89e3b' : st === 'active' ? '#c98a2e' : (light ? '#c3cad4' : '#2b3346');
    ctx.lineWidth = isRoute ? 3.5 * z : 2 * z;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.quadraticCurveTo(cx, cy, pb.x, pb.y);
    ctx.stroke();

    if (isRoute && view.ui.world) {
      const t = (performance.now() / 2000) % 1;
      const qx = pa.x * (1 - t) * (1 - t) + cx * 2 * (1 - t) * t + pb.x * t * t;
      const qy = pa.y * (1 - t) * (1 - t) + cy * 2 * (1 - t) * t + pb.y * t * t;
      ctx.beginPath();
      ctx.arc(qx, qy, 3.5 * z, 0, Math.PI * 2);
      ctx.fillStyle = '#e89e3b';
      ctx.fill();
    }
  }

  for (const n of graph.getNodes()) {
    const p = P(camera, n.x, n.y);
    const st = nodeStatus(state, n.id);
    const ent = entities.nodes[n.id] || { name: n.id, code: n.id };
    const isStart = state && state.start === n.id;
    const isTarget = state && state.target === n.id;

    rr(ctx, p.x - 7 * z, p.y - 7 * z, 14 * z, 14 * z, 2);
    ctx.fillStyle = st === 'current' ? '#e89e3b' : st === 'settled' || st === 'visited' || st === 'closed' ? '#3d7c52' : (light ? '#98a2b4' : '#3a4256');
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5 * z, 0, Math.PI * 2);
    ctx.fillStyle = light ? '#ffffff' : '#0c111c';
    ctx.fill();
    ctx.strokeStyle = st === 'current' ? '#f7cd86' : (light ? '#98a2b4' : '#3a4256');
    ctx.lineWidth = 1.4;
    ctx.stroke();

    label(ctx, ent.code || n.id, p.x, p.y + 16 * z, { size: 12 * z, color: light ? '#1a1e26' : '#e6e9ef', font: SANS, bold: true });
    label(ctx, ent.name || '', p.x, p.y + 29 * z, { size: 9 * z, color: light ? '#5b6472' : '#8a93a6' });

    if (isStart) drawPin(ctx, p.x, p.y - 20 * z, '#0e7490', 'A', camera);
    if (isTarget) drawPin(ctx, p.x, p.y - 20 * z, '#b45309', 'B', camera);
  }

  // distance labels drawn LAST so weights stay above airport markers/planes
  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const extra = state.edges && state.edges[e.id] ? state.edges[e.id].extra : '';
    if (extra) continue;
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    const mx = (pa.x + pb.x) / 2;
    const my = (pa.y + pb.y) / 2;
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const arc = Math.min(40, Math.hypot(dx, dy) * 0.15);
    const cx = mx + (-dy / (Math.hypot(dx, dy) || 1)) * arc;
    const cy = my + (dx / (Math.hypot(dx, dy) || 1)) * arc;
    label(ctx, `${e.weight}`, cx, cy - 8 * z, { size: 10 * z, color: st === 'path' ? '#f7cd86' : (light ? '#5b6472' : '#8a93a6') });
  }

  drawRevealOverlay(ctx, view);
}

// ============================================================================
// 15. COOKING ORDER — kitchen prep pipeline
// ============================================================================
export function renderCooking(ctx, view) {
  const { graph, camera, state, entities } = view;
  const cz = camera.zoom;
  const zs = Math.min(cz, 1.6);
  const light = view.ui && view.ui.theme === 'light';
  ctx.fillStyle = light ? '#eef1f4' : '#0c111c';
  ctx.fillRect(0, 0, camera.width, camera.height);

  const sem = {};
  for (const n of graph.getNodes()) sem[n.id] = 1;
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of graph.getEdges()) {
      if (sem[e.to] < sem[e.from] + 1) { sem[e.to] = sem[e.from] + 1; changed = true; }
    }
  }
  const maxSem = Math.max(1, ...Object.values(sem));
  const semNodes = {};
  for (const n of graph.getNodes()) (semNodes[sem[n.id]] = semNodes[sem[n.id]] || []).push(n);

  const WW = 900, WH = 520;
  const halfW = WW / 2, halfH = WH / 2;
  const colW = (WW - 120) / Math.max(1, maxSem);
  const pos = {};
  for (let s = 1; s <= maxSem; s++) {
    const nodes = (semNodes[s] || []).slice().sort((a, b) => a.y - b.y);
    const cx = -halfW + 60 + colW * (s - 1) + colW / 2;
    const span = WH - 150;
    nodes.forEach((n, i) => {
      pos[n.id] = { x: cx, y: -halfH + 75 + span * ((i + 0.5) / Math.max(1, nodes.length)) };
    });
  }
  for (let s = 1; s <= maxSem; s++) {
    const cx = -halfW + 60 + colW * (s - 1) + colW / 2;
    const p = P(camera, cx, -halfH + 34);
    label(ctx, `STEP ${s}`, p.x, p.y, { size: 11 * zs, color: light ? '#5b6472' : '#8a93a6', font: SANS, bold: true });
  }

  for (const e of graph.getEdges()) {
    const a = pos[e.from];
    const b = pos[e.to];
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x + 70, a.y);
    const pb = P(camera, b.x - 70, b.y);
    ctx.strokeStyle = st === 'cycle' ? '#e87a5d' : st === 'active' ? '#e89e3b' : (light ? '#c9cfda' : '#2b3346');
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    const mx = (pa.x + pb.x) / 2;
    ctx.bezierCurveTo(mx, pa.y, mx, pb.y, pb.x, pb.y);
    ctx.stroke();
  }

  const STATUS = {
    current: { label: 'DOING', color: '#e89e3b' },
    visited: { label: 'DONE', color: '#3d7c52' },
    settled: { label: 'DONE', color: '#3d7c52' },
    discovered: { label: 'READY', color: '#4a78b8' },
    open: { label: 'READY', color: '#4a78b8' },
    conflict: { label: 'BLOCKED', color: '#b95a43' },
  };

  for (const n of graph.getNodes()) {
    const wp = pos[n.id];
    const p = P(camera, wp.x, wp.y);
    const st = nodeStatus(state, n.id);
    const ent = entities.nodes[n.id] || { name: n.id, icon: '🍽️' };
    const meta = STATUS[st] || { label: 'WAITING', color: light ? '#8b95a5' : '#3a4256' };
    const w = 155 * cz;
    const h = 54 * cz;

    rr(ctx, p.x - w / 2, p.y - h / 2, w, h, 8 * zs);
    ctx.fillStyle = st === 'current' ? (light ? '#fff4e0' : '#2a2113') : (light ? '#ffffff' : '#151a24');
    ctx.fill();
    ctx.strokeStyle = meta.color;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    label(ctx, ent.icon || '', p.x - w / 2 + 20 * zs, p.y, { size: 15 * zs });
    label(ctx, ent.name, p.x + 6 * zs, p.y - 8 * zs, { size: 11 * zs, color: light ? '#1a1e26' : '#e6e9ef', font: SANS, bold: true, align: 'left' });
    label(ctx, meta.label, p.x + 6 * zs, p.y + 11 * zs, { size: 9 * zs, color: meta.color, align: 'left' });
  }

  drawRevealOverlay(ctx, view);
}

// ============================================================================
// 16. MOVIE RECOMMENDATIONS — poster wall
// ============================================================================
export function renderMovie(ctx, view) {
  const { graph, camera, state, entities } = view;
  const z = zoomF(camera);
  const light = view.ui && view.ui.theme === 'light';
  ctx.fillStyle = light ? '#eef1f4' : '#0c111c';
  ctx.fillRect(0, 0, camera.width, camera.height);

  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    ctx.strokeStyle = st === 'active' ? '#e89e3b' : (light ? '#8b95a5' : '#4a5568');
    ctx.lineWidth = st === 'active' ? 2 : 1.5;
    ctx.setLineDash(st === 'active' ? [] : [6, 4]);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const n of graph.getNodes()) {
    const p = P(camera, n.x, n.y);
    const st = nodeStatus(state, n.id);
    const ent = entities.nodes[n.id] || { name: n.id };
    const w = 74 * z;
    const h = 100 * z;
    const isStart = state && state.start === n.id;

    rr(ctx, p.x - w / 2, p.y - h / 2, w, h, 5 * z);
    const grad = ctx.createLinearGradient(p.x - w / 2, p.y - h / 2, p.x + w / 2, p.y + h / 2);
    if (st === 'visited' || st === 'settled' || st === 'closed') { grad.addColorStop(0, '#3d7c52'); grad.addColorStop(1, '#1d4a30'); }
    else if (st === 'discovered' || st === 'open') { grad.addColorStop(0, '#4a78b8'); grad.addColorStop(1, '#23406e'); }
    else { grad.addColorStop(0, ent.c1 || '#3a4256'); grad.addColorStop(1, ent.c2 || '#232a38'); }
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = st === 'current' ? '#e89e3b' : st !== 'unvisited' ? (light ? '#7d8a9c' : '#5b7fb0') : (light ? '#c9cfda' : '#2b3346');
    ctx.lineWidth = st === 'current' ? 3 : 1.4;
    ctx.stroke();

    const lines = wrapText(ctx, ent.name, w - 12 * z, `${10 * z}px ${FONT}`);
    lines.slice(0, 3).forEach((ln, i) => {
      label(ctx, ln, p.x, p.y - h / 2 + 16 * z + i * 13 * z, { size: 10 * z, color: '#ffffff', font: SANS, bold: true });
    });
    label(ctx, ent.year || '', p.x, p.y + h / 2 - 10 * z, { size: 9 * z, color: 'rgba(255,255,255,0.8)' });
    if (isStart) label(ctx, 'YOU WATCHED', p.x, p.y - h / 2 - 10 * z, { size: 8.5 * z, color: '#e89e3b', bold: true });
  }

  drawRevealOverlay(ctx, view);
}

function wrapText(ctx, text, maxW, font) {
  ctx.font = font;
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ============================================================================
// 17. POWER GRID — substation + pylons
// ============================================================================
export function renderPower(ctx, view) {
  const { graph, camera, state, entities } = view;
  const z = zoomF(camera);
  const light = view.ui && view.ui.theme === 'light';
  ctx.fillStyle = light ? '#eef1f4' : '#0c111c';
  ctx.fillRect(0, 0, camera.width, camera.height);

  // town colour palette (vivid, one per town)
  const TOWN_COLORS = ['#4a78b8', '#3d9b8c', '#7c5cd6', '#c23b6e', '#b06a4a', '#3d7c52', '#c9862e', '#5a9bd4'];
  const townColor = (id) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
    return TOWN_COLORS[h % TOWN_COLORS.length];
  };

  // ---- transmission lines: colours always distinct from the nodes ----
  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    const live = st === 'tree' || st === 'matched';
    const mx = (pa.x + pb.x) / 2;
    const my = (pa.y + pb.y) / 2 - 12 * z;
    ctx.lineCap = 'round';
    // live = gold, active = orange, rejected = red dashed, candidate = slate BLUE (never gray like pylons)
    ctx.strokeStyle = live ? '#e0a03a'
      : st === 'active' ? '#f09a2e'
      : st === 'rejected' ? '#e87a5d'
      : (light ? '#7c9fd8' : '#3f6fb0');
    ctx.lineWidth = (live ? 3.4 : st === 'rejected' ? 2.2 : 2.2) * z;
    if (st === 'rejected') ctx.setLineDash([8 * z, 5 * z]);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.quadraticCurveTo(mx, my, pb.x, pb.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ---- nodes ----
  for (const n of graph.getNodes()) {
    const p = P(camera, n.x, n.y);
    const st = nodeStatus(state, n.id);
    const ent = entities.nodes[n.id] || { name: n.id, kind: 'town' };
    const live = st === 'visited' || st === 'settled' || st === 'discovered' || st === 'current' || st === 'path';

    if (ent.kind === 'substation') {
      // power plant
      rr(ctx, p.x - 30 * z, p.y - 20 * z, 60 * z, 40 * z, 6 * z);
      ctx.fillStyle = light ? '#fff4e0' : '#2a2113';
      ctx.fill();
      ctx.strokeStyle = '#e0a03a';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      // chimney
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(p.x + 14 * z, p.y - 30 * z, 8 * z, 12 * z);
      label(ctx, '⚡', p.x - 8 * z, p.y - 1 * z, { size: 16 * z });
      label(ctx, 'SUBSTATION', p.x, p.y + 28 * z, { size: 9.5 * z, color: '#b45309', bold: true });
    } else {
      const col = townColor(n.id);
      // pylon (steel lattice, grey = structure, NOT an edge colour)
      ctx.strokeStyle = light ? '#9aa4b2' : '#4a5568';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 15 * z);
      ctx.lineTo(p.x - 9 * z, p.y);
      ctx.lineTo(p.x + 9 * z, p.y);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x - 9 * z, p.y);
      ctx.lineTo(p.x - 13 * z, p.y + 9 * z);
      ctx.moveTo(p.x + 9 * z, p.y);
      ctx.lineTo(p.x + 13 * z, p.y + 9 * z);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x - 15 * z, p.y - 5 * z);
      ctx.lineTo(p.x + 15 * z, p.y - 5 * z);
      ctx.stroke();

      // house coloured by town (vivid)
      const hs = 12 * z;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + 16 * z - hs);
      ctx.lineTo(p.x - hs, p.y + 16 * z);
      ctx.lineTo(p.x - hs, p.y + 16 * z + hs);
      ctx.lineTo(p.x + hs, p.y + 16 * z + hs);
      ctx.lineTo(p.x + hs, p.y + 16 * z);
      ctx.closePath();
      ctx.fillStyle = live ? col : (light ? '#c9cfda' : '#22303c');
      ctx.fill();
      ctx.strokeStyle = live ? '#0f1216' : (light ? '#98a2b4' : '#3a4256');
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // roof colour = town colour when live
      if (live) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + 16 * z - hs);
        ctx.lineTo(p.x - hs, p.y + 16 * z);
        ctx.lineTo(p.x + hs, p.y + 16 * z);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fill();
      }
      if (live) label(ctx, '●', p.x, p.y + 16 * z + hs + 4 * z, { size: 7 * z, color: col });
      label(ctx, ent.name, p.x, p.y + 44 * z, { size: 9.5 * z, color: light ? '#1a1e26' : '#c9d1de', font: SANS });
    }
  }

  // cost / skip chips drawn LAST so numbers always win over pylons/houses
  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const live = st === 'tree' || st === 'matched';
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    const mx = (pa.x + pb.x) / 2;
    const my = (pa.y + pb.y) / 2 - 12 * z;
    if (live || st === 'active') chipLabel(ctx, `$${e.weight}M`, mx, my - 6 * z, { size: 9.5 * z, color: live ? '#7a5a12' : '#5b6472', bg: light ? 'rgba(255,255,255,0.9)' : 'rgba(10,14,20,0.85)', border: live ? '#e0a03a' : 'rgba(150,150,150,0.5)' });
    if (st === 'rejected') chipLabel(ctx, 'SKIP', mx, my - 6 * z, { size: 8.5 * z, color: '#fff', bg: '#b95a43', border: '#8a3d2c' });
  }

  drawRevealOverlay(ctx, view);
}

// ============================================================================
// 18. MAZE ESCAPE — pac-man style BFS
// ============================================================================
export function renderMaze(ctx, view) {
  const { graph, camera, state, entities } = view;
  const z = zoomF(camera);
  const light = view.ui && view.ui.theme === 'light';
  const cell = 60;

  ctx.fillStyle = light ? '#e7ecef' : '#0a0e12';
  ctx.fillRect(0, 0, camera.width, camera.height);

  for (const n of graph.getNodes()) {
    const ent = entities.nodes[n.id] || {};
    const p = P(camera, n.x, n.y);
    const s = cell * camera.zoom;
    const st = nodeStatus(state, n.id);
    const isWall = ent.wall;
    if (isWall) {
      ctx.fillStyle = light ? '#a8b2c0' : '#2a3343';
      rr(ctx, p.x - s / 2, p.y - s / 2, s, s, 3 * z);
      ctx.fill();
      ctx.strokeStyle = light ? '#8b95a5' : '#1a2333';
      ctx.lineWidth = 1;
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = light ? '#f4f6f8' : '#141c28';
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);

    if (st === 'visited' || st === 'settled' || st === 'closed') {
      ctx.fillStyle = light ? 'rgba(61,124,82,0.25)' : 'rgba(74,124,89,0.35)';
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    } else if (st === 'discovered' || st === 'open') {
      ctx.fillStyle = light ? 'rgba(74,120,184,0.2)' : 'rgba(91,127,176,0.3)';
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    if (st === 'current') {
      ctx.strokeStyle = '#e89e3b';
      ctx.lineWidth = 3;
      ctx.strokeRect(p.x - s / 2 + 1, p.y - s / 2 + 1, s - 2, s - 2);
    }
    ctx.strokeStyle = light ? '#e0e4ea' : '#1a2333';
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x - s / 2, p.y - s / 2, s, s);
  }

  const path = (state && state.result && state.result.path) || [];
  if (path.length > 1) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#e89e3b';
    ctx.lineWidth = 7 * z;
    ctx.beginPath();
    path.forEach((id, i) => {
      const n = graph.getNode(id);
      if (!n) return;
      const p = P(camera, n.x, n.y);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }

  for (const n of graph.getNodes()) {
    const p = P(camera, n.x, n.y);
    if (state && state.start === n.id) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12 * z, 0, Math.PI * 2);
      ctx.fillStyle = '#e89e3b';
      ctx.fill();
      ctx.strokeStyle = '#0f1216';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#0f1216';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 12 * z, p.y - 5 * z);
      ctx.lineTo(p.x + 12 * z, p.y + 5 * z);
      ctx.closePath();
      ctx.fill();
    }
    if (state && state.target === n.id) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12 * z, 0, Math.PI * 2);
      ctx.fillStyle = '#4a9d66';
      ctx.fill();
      ctx.strokeStyle = '#0f1216';
      ctx.lineWidth = 2;
      ctx.stroke();
      label(ctx, '★', p.x, p.y, { size: 13 * z, color: '#ffffff', bold: true });
    }
  }

  drawRevealOverlay(ctx, view);
}

// ============================================================================
// 19. RADIO FREQUENCIES — tower coloring
// ============================================================================
export function renderTowers(ctx, view) {
  const { graph, camera, state, entities } = view;
  const z = zoomF(camera);
  const light = view.ui && view.ui.theme === 'light';
  ctx.fillStyle = light ? '#eef1f4' : '#0c111c';
  ctx.fillRect(0, 0, camera.width, camera.height);

  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    ctx.strokeStyle = st === 'conflict' ? '#e87a5d' : st === 'active' ? '#e89e3b' : (light ? '#8b95a5' : '#4a5568');
    ctx.lineWidth = st === 'conflict' ? 2.6 : 1.6;
    if (st === 'conflict') ctx.setLineDash([]);
    else ctx.setLineDash([7 * z, 5 * z]);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const freqColor = (extra) => {
    if (/C0/.test(extra)) return '#4a78b8';
    if (/C1/.test(extra)) return '#3d7c52';
    return null;
  };

  for (const n of graph.getNodes()) {
    const p = P(camera, n.x, n.y);
    const st = nodeStatus(state, n.id);
    const rec = state.nodes && state.nodes[n.id];
    const extra = rec ? rec.extra : '';
    const ent = entities.nodes[n.id] || { name: n.id };
    const fc = freqColor(extra);

    ctx.strokeStyle = light ? '#8b95a5' : '#3a4256';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 16 * z);
    ctx.lineTo(p.x, p.y - 14 * z);
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 14 * z);
    ctx.lineTo(p.x - 8 * z, p.y - 22 * z);
    ctx.moveTo(p.x, p.y - 14 * z);
    ctx.lineTo(p.x + 8 * z, p.y - 22 * z);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y - 24 * z, 4.5 * z, 0, Math.PI * 2);
    ctx.fillStyle = fc || (light ? '#a8b2c0' : '#3a4256');
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 11 * z, 0, Math.PI * 2);
    ctx.fillStyle = light ? '#ffffff' : '#1a212e';
    ctx.fill();
    ctx.strokeStyle = fc || (light ? '#c9cfda' : '#3a4256');
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, fc ? (extra.includes('C0') ? 'A' : 'B') : '?', p.x, p.y, { size: 10 * z, color: fc || (light ? '#5b6472' : '#8a93a6'), bold: true });
    label(ctx, ent.name, p.x, p.y + 26 * z, { size: 9.5 * z, color: light ? '#1a1e26' : '#c9d1de', font: SANS });
  }

  // interference warnings drawn LAST so they stay above the masts
  for (const e of graph.getEdges()) {
    const a = graph.getNode(e.from);
    const b = graph.getNode(e.to);
    if (!a || !b) continue;
    const st = edgeStatus(state, e.id);
    if (st !== 'conflict') continue;
    const pa = P(camera, a.x, a.y);
    const pb = P(camera, b.x, b.y);
    label(ctx, 'INTERFERENCE', (pa.x + pb.x) / 2, (pa.y + pb.y) / 2 - 10 * z, { size: 8.5 * z, color: '#e87a5d', bold: true });
  }

  drawRevealOverlay(ctx, view);
}

// ============================================================================
// dispatcher
// ============================================================================
const RENDERERS = {
  city: renderCity,
  fiber: renderFiber,
  network: renderNetwork,
  build: renderBuild,
  water: renderWater,
  game: renderGame,
  course: renderCourse,
  matching: renderMatching,
  critical: renderCritical,
  delivery: renderDelivery,
  street: renderStreet,
  social: renderSocial,
  web: renderWeb,
  airport: renderAirport,
  cooking: renderCooking,
  movie: renderMovie,
  power: renderPower,
  maze: renderMaze,
  towers: renderTowers,
};

export function renderWorld(ctx, view) {
  const fn = RENDERERS[view.renderer] || renderCity;
  fn(ctx, view);
}

function fmt(n) {
  if (n === Infinity || n === -Infinity) return '∞';
  const r = Math.round(n * 10) / 10;
  return Object.is(r, -0) ? '0' : String(r);
}
