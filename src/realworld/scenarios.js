/**
 * Real-World Scenarios — the domain layer of the product.
 *
 * Each scenario owns:
 *   - a real problem (headline + text)
 *   - a domain vocabulary (what nodes/edges/weights mean)
 *   - an underlying GRAPH built from domain data (the engine substrate)
 *   - domain entities (names, kinds, extra attributes) keyed by graph ids
 *   - a narrate() translation: execution event → plain-language domain action
 *   - metrics() derived from the REAL execution state
 *   - resultText() → practical real-world outcome
 *   - an honest data label (realistic-simulation | educational-model)
 *
 * Algorithms NEVER know about roads/buildings/pipes/etc. This file is a pure
 * presentation/adapter layer over the execution trace.
 */
import Graph from '../graph/Graph.js';
import { fmt } from '../algorithms/_common.js';

const DATA_LABELS = {
  'realistic-simulation': 'Realistic simulation',
  'educational-model': 'Educational model',
};

// ---------------------------------------------------------------- builders
function buildGraph(nodeSpecs, edgeSpecs, { directed = false } = {}) {
  const g = new Graph({ directed });
  for (const n of nodeSpecs) {
    g.addNode({ id: n.id, label: n.label || n.id, x: n.x, y: n.y, metadata: n.metadata || {} });
  }
  for (const e of edgeSpecs) {
    g.addEdge({ from: e.from, to: e.to, weight: e.weight == null ? 1 : e.weight, directed: e.directed != null ? e.directed : directed });
  }
  return g;
}


// Deterministically add `extra` nodes on the perimeter of the base set and
// link each to its two nearest base nodes (plus chain neighbours) so bigger
// complexity levels stay connected, non-random and reproducible.
function expandRing(baseNodes, baseEdges, extra, { radius = 470 } = {}) {
  const nodes = baseNodes.map((n) => ({ ...n }));
  const edges = baseEdges.map((e) => ({ ...e }));
  const ids = new Set(nodes.map((n) => n.id));
  let k = nodes.length;
  for (let i = 0; i < extra; i++) {
    const ang = (i / extra) * Math.PI * 2 - Math.PI / 2;
    const id = 'X' + (k++);
    nodes.push({ id, label: id, x: Math.round(Math.cos(ang) * radius), y: Math.round(Math.sin(ang) * radius), name: 'Block ' + id });
    ids.add(id);
    // link to 2 nearest base nodes
    const base = baseNodes.slice().sort((a, b) => Math.hypot(a.x - nodes[nodes.length - 1].x, a.y - nodes[nodes.length - 1].y) - Math.hypot(b.x - nodes[nodes.length - 1].x, b.y - nodes[nodes.length - 1].y));
    for (const nb of base.slice(0, 2)) {
      edges.push({ from: id, to: nb.id, weight: 5 + ((i + k) % 12) });
    }
  }
  // chain the extras together (ring)
  const extras = nodes.slice(baseNodes.length);
  for (let i = 0; i < extras.length; i++) {
    const a = extras[i];
    const b = extras[(i + 1) % extras.length];
    edges.push({ from: a.id, to: b.id, weight: 4 + ((i * 7) % 10) });
  }
  return { nodes, edges };
}

// ============================================================================
// 1. HÀ NỘI — CITY NAVIGATION
//    All 30 administrative units rendered as a REAL TILED MAP: a weighted
//    Voronoi partition (no overlaps, districts only touch along borders) with
//    sizes proportional to their actual area. The road graph is DERIVED from
//    the tiling, so roads only exist between districts that truly border.
// ============================================================================
const hn = (id, label, x, y, kind) => ({ id, label, x, y, kind });
const cityNodes = [
  // --- 12 urban districts (quận) ---
  hn('hoankiem', 'Hoàn Kiếm', 0, 0, 'quận'),
  hn('badinh', 'Ba Đình', -128, -74, 'quận'),
  hn('dongda', 'Đống Đa', -136, 78, 'quận'),
  hn('haibatrung', 'Hai Bà Trưng', 96, -38, 'quận'),
  hn('thanhxuan', 'Thanh Xuân', -112, 172, 'quận'),
  hn('hoangmai', 'Hoàng Mai', 92, 192, 'quận'),
  hn('caugiay', 'Cầu Giấy', -288, -46, 'quận'),
  hn('tayho', 'Tây Hồ', -36, -200, 'quận'),
  hn('namtuliem', 'Nam Từ Liêm', -380, 88, 'quận'),
  hn('bactuliem', 'Bắc Từ Liêm', -392, -150, 'quận'),
  hn('hadong', 'Hà Đông', -306, 244, 'quận'),
  hn('longbien', 'Long Biên', 246, -66, 'quận'),
  // --- 17 rural districts (huyện) + 1 district-level town (thị xã) ---
  hn('thanhtri', 'Thanh Trì', 64, 292, 'huyện'),
  hn('gialam', 'Gia Lâm', 362, -150, 'huyện'),
  hn('donganh', 'Đông Anh', 218, -292, 'huyện'),
  hn('socson', 'Sóc Sơn', 122, -432, 'huyện'),
  hn('melinh', 'Mê Linh', -228, -402, 'huyện'),
  hn('hoaiduc', 'Hoài Đức', -420, 38, 'huyện'),
  hn('danphuong', 'Đan Phượng', -352, -252, 'huyện'),
  hn('phuctho', 'Phúc Thọ', -462, -292, 'huyện'),
  hn('quocoai', 'Quốc Oai', -472, 162, 'huyện'),
  hn('thachthat', 'Thạch Thất', -545, 56, 'huyện'),
  hn('sontay', 'Sơn Tây', -640, -150, 'thị xã'),
  hn('bavi', 'Ba Vì', -760, -78, 'huyện'),
  hn('chuongmy', 'Chương Mỹ', -430, 308, 'huyện'),
  hn('thanhoai', 'Thanh Oai', -150, 348, 'huyện'),
  hn('thuongtin', 'Thường Tín', 158, 378, 'huyện'),
  hn('phuxuyen', 'Phú Xuyên', 190, 468, 'huyện'),
  hn('unghoa', 'Ứng Hòa', -55, 448, 'huyện'),
  hn('myduc', 'Mỹ Đức', -252, 498, 'huyện'),
];

// Approximate real areas (km²) — drive the relative district sizes on the map.
const HN_AREA = {
  hoankiem: 5.3, badinh: 9.2, dongda: 9.9, haibatrung: 10.1, thanhxuan: 9.1, hoangmai: 41, caugiay: 12,
  tayho: 24.4, namtuliem: 32.3, bactuliem: 43.3, hadong: 48.3, longbien: 60.4,
  thanhtri: 63.5, gialam: 116.6, donganh: 185.7, socson: 305.7, melinh: 141.6,
  hoaiduc: 84.9, danphuong: 76.7, phuctho: 117.5, quocoai: 151.2, thachthat: 202.5, sontay: 113.5, bavi: 421.9,
  chuongmy: 237.4, thanhoai: 124.5, thuongtin: 130.1, phuxuyen: 171.1, unghoa: 183.7, myduc: 199.2,
};

// Weighted Voronoi partition of a rectangle. Returns owner grid, shared-border
// segments, per-district cell lists and the adjacency derived from real
// cell-to-cell contact. Districts NEVER overlap — they only touch.
function buildDistrictMap(nodes, { minX = -980, maxX = 440, minY = -620, maxY = 660, cell = 8 } = {}) {
  const W = Math.ceil((maxX - minX) / cell);
  const H = Math.ceil((maxY - minY) / cell);
  const n = nodes.length;
  // Mild area scaling: big rural districts get more room than the urban core
  // but never dominate the rim — the exponent is deliberately small so the
  // whole map stays balanced and compact.
  const weights = nodes.map((nd) => Math.pow(HN_AREA[nd.id] || 40, 0.12));
  const owner = new Int16Array(W * H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const cx = minX + (i + 0.5) * cell;
      const cy = minY + (j + 0.5) * cell;
      let best = -1;
      let bestd = Infinity;
      for (let k = 0; k < n; k++) {
        const dx = cx - nodes[k].x;
        const dy = cy - nodes[k].y;
        const d = Math.hypot(dx, dy) / weights[k];
        if (d < bestd) { bestd = d; best = k; }
      }
      owner[j * W + i] = best;
    }
  }
  const borders = [];
  const cells = {};
  for (let k = 0; k < n; k++) cells[nodes[k].id] = [];
  const adj = new Set();
  const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const o = owner[j * W + i];
      cells[nodes[o].id].push(j * W + i);
      if (i + 1 < W) {
        const o2 = owner[j * W + i + 1];
        if (o2 !== o) {
          borders.push([minX + (i + 1) * cell, minY + j * cell, minX + (i + 1) * cell, minY + (j + 1) * cell]);
          adj.add(key(nodes[o].id, nodes[o2].id));
        }
      }
      if (j + 1 < H) {
        const o2 = owner[(j + 1) * W + i];
        if (o2 !== o) {
          borders.push([minX + i * cell, minY + (j + 1) * cell, minX + (i + 1) * cell, minY + (j + 1) * cell]);
          adj.add(key(nodes[o].id, nodes[o2].id));
        }
      }
    }
  }
  // centroid of each district (visual center of its tile region) — labels and
  // roads use these so they sit at the true center of each district.
  const centroids = {};
  for (const id in cells) {
    const arr = cells[id];
    let sx = 0;
    let sy = 0;
    for (const c of arr) {
      const i = c % W;
      const j = (c / W) | 0;
      sx += minX + (i + 0.5) * cell;
      sy += minY + (j + 0.5) * cell;
    }
    centroids[id] = { x: sx / arr.length, y: sy / arr.length };
  }

  return {
    owner: Array.from(owner), W, H, minX, maxX, minY, maxY, cell, borders,
    cells, // id -> [cell indices]
    adjacency: [...adj].map((p) => p.split('|')),
    nodeKinds: nodes.map((n) => n.kind),
    nodeIds: nodes.map((n) => n.id),
    centroids,
  };
}

// The Red River — runs along the EAST side of the city (Long Biên / Gia Lâm
// are on the far bank), drawn thin and faint.
const HANOI_RIVER = [
  [20, -500], [55, -400], [90, -300], [130, -210], [170, -140], [195, -70],
  [205, -10], [195, 70], [185, 150], [185, 230], [195, 310], [205, 390], [210, 490],
];
const HANOI_LAKES = [
  { x: 34, y: 6, rx: 18, ry: 12, label: 'Hồ Hoàn Kiếm' },
  { x: -46, y: -182, rx: 60, ry: 32, label: 'Hồ Tây' },
];

// ============================================================================
// 2. FIBER NETWORK
// ============================================================================
const fiberNodes = [
  { id: 'B1', x: -300, y: -180, name: 'Block A' }, { id: 'B2', x: -120, y: -220, name: 'Block B' },
  { id: 'B3', x: 60, y: -200, name: 'Block C' }, { id: 'B4', x: 240, y: -160, name: 'Block D' },
  { id: 'B5', x: 340, y: 0, name: 'Block E' }, { id: 'B6', x: 240, y: 160, name: 'Block F' },
  { id: 'B7', x: 60, y: 220, name: 'Block G' }, { id: 'B8', x: -140, y: 200, name: 'Block H' },
  { id: 'B9', x: -320, y: 120, name: 'Block I' }, { id: 'B10', x: -340, y: -40, name: 'Block J' },
  { id: 'B11', x: 20, y: 40, name: 'Block K' }, { id: 'B12', x: -140, y: -40, name: 'Block L' },
];
const fiberEdges = [
  { from: 'B1', to: 'B2', weight: 12 }, { from: 'B2', to: 'B3', weight: 9 }, { from: 'B3', to: 'B4', weight: 14 },
  { from: 'B4', to: 'B5', weight: 8 }, { from: 'B5', to: 'B6', weight: 11 }, { from: 'B6', to: 'B7', weight: 10 },
  { from: 'B7', to: 'B8', weight: 13 }, { from: 'B8', to: 'B9', weight: 7 }, { from: 'B9', to: 'B10', weight: 9 },
  { from: 'B10', to: 'B1', weight: 15 }, { from: 'B2', to: 'B12', weight: 6 }, { from: 'B12', to: 'B11', weight: 5 },
  { from: 'B11', to: 'B3', weight: 8 }, { from: 'B12', to: 'B9', weight: 12 }, { from: 'B11', to: 'B6', weight: 16 },
  { from: 'B4', to: 'B7', weight: 18 }, { from: 'B10', to: 'B8', weight: 14 },
];

// ============================================================================
// 3. NETWORK ROUTING
// ============================================================================
const netNodes = [
  { id: 'S1', x: -340, y: 0, name: 'Server A', kind: 'server' },
  { id: 'R1', x: -200, y: -100, name: 'Router C1', kind: 'router' },
  { id: 'R2', x: -80, y: 40, name: 'Router C2', kind: 'router' },
  { id: 'R3', x: 80, y: -120, name: 'Router C3', kind: 'router' },
  { id: 'R4', x: 220, y: 60, name: 'Router C4', kind: 'router' },
  { id: 'DB', x: 360, y: -120, name: 'Database-01', kind: 'server' },
  { id: 'API', x: 360, y: 160, name: 'API-01', kind: 'server' },
  { id: 'CDN', x: -120, y: 200, name: 'CDN Edge', kind: 'server' },
];
const netEdges = [
  { from: 'S1', to: 'R1', weight: 4 }, { from: 'R1', to: 'R2', weight: 3 }, { from: 'R1', to: 'R3', weight: 7 },
  { from: 'R2', to: 'R4', weight: 5 }, { from: 'R3', to: 'R4', weight: 2 }, { from: 'R2', to: 'CDN', weight: 4 },
  { from: 'R4', to: 'DB', weight: 6 }, { from: 'R4', to: 'API', weight: 3 }, { from: 'CDN', to: 'API', weight: 8 },
  { from: 'R3', to: 'DB', weight: 9 },
];

// ============================================================================
// 4. SOFTWARE BUILD SYSTEM
// ============================================================================
const buildNodes = [
  { id: 'Frontend', x: 300, y: -160, name: 'Frontend' },
  { id: 'API', x: 120, y: -60, name: 'API Gateway' },
  { id: 'Auth', x: -60, y: -140, name: 'Auth' },
  { id: 'Database', x: -220, y: -60, name: 'Database' },
  { id: 'Payments', x: 60, y: 60, name: 'Payments' },
  { id: 'Orders', x: -120, y: 60, name: 'Orders' },
  { id: 'Search', x: 240, y: 60, name: 'Search' },
  { id: 'Logging', x: -300, y: 60, name: 'Logging' },
];
const buildEdges = [
  { from: 'Frontend', to: 'API', directed: true }, { from: 'API', to: 'Auth', directed: true },
  { from: 'Auth', to: 'Database', directed: true }, { from: 'API', to: 'Payments', directed: true },
  { from: 'Payments', to: 'Orders', directed: true }, { from: 'Orders', to: 'Database', directed: true },
  { from: 'API', to: 'Search', directed: true }, { from: 'Search', to: 'Database', directed: true },
  { from: 'Logging', to: 'Database', directed: true }, { from: 'Payments', to: 'Logging', directed: true },
];

// ============================================================================
// 5. DELIVERY LOGISTICS
// ============================================================================
const deliveryNodes = [
  { id: 'WH', x: -320, y: -60, name: 'Warehouse', kind: 'warehouse' },
  { id: 'C1', x: -140, y: -200, name: 'Customer 1', kind: 'customer' },
  { id: 'C2', x: 60, y: -220, name: 'Customer 2', kind: 'customer' },
  { id: 'C3', x: 240, y: -140, name: 'Customer 3', kind: 'customer' },
  { id: 'C4', x: 320, y: 60, name: 'Customer 4', kind: 'customer' },
  { id: 'C5', x: 200, y: 200, name: 'Customer 5', kind: 'customer' },
  { id: 'C6', x: -40, y: 180, name: 'Customer 6', kind: 'customer' },
  { id: 'C7', x: -260, y: 160, name: 'Customer 7', kind: 'customer' },
];
const deliveryEdges = [
  { from: 'WH', to: 'C1', weight: 6 }, { from: 'WH', to: 'C7', weight: 9 }, { from: 'C1', to: 'C2', weight: 5 },
  { from: 'C2', to: 'C3', weight: 6 }, { from: 'C3', to: 'C4', weight: 7 }, { from: 'C4', to: 'C5', weight: 5 },
  { from: 'C5', to: 'C6', weight: 6 }, { from: 'C6', to: 'C7', weight: 5 }, { from: 'WH', to: 'C6', weight: 8 },
  { from: 'C1', to: 'C6', weight: 7 }, { from: 'C2', to: 'C6', weight: 8 }, { from: 'C3', to: 'C5', weight: 8 },
  { from: 'C4', to: 'WH', weight: 10 }, { from: 'C7', to: 'C5', weight: 7 },
];

// ============================================================================
// 6. WATER NETWORK
// ============================================================================
const waterNodes = [
  { id: 'RES', x: -360, y: -120, name: 'Reservoir', kind: 'reservoir' },
  { id: 'J1', x: -160, y: -120, name: 'Junction A', kind: 'junction' },
  { id: 'J2', x: -160, y: 40, name: 'Junction B', kind: 'junction' },
  { id: 'J3', x: 40, y: -120, name: 'Junction C', kind: 'junction' },
  { id: 'TANK', x: 40, y: 40, name: 'Water Tank', kind: 'tank' },
  { id: 'CITY', x: 260, y: 0, name: 'City Supply', kind: 'tank' },
  { id: 'FARM', x: 40, y: 200, name: 'Farm Supply', kind: 'tank' },
];
const waterEdges = [
  { from: 'RES', to: 'J1', weight: 100, directed: true }, { from: 'J1', to: 'J2', weight: 60, directed: true },
  { from: 'J1', to: 'J3', weight: 70, directed: true }, { from: 'J2', to: 'TANK', weight: 50, directed: true },
  { from: 'J3', to: 'TANK', weight: 40, directed: true }, { from: 'TANK', to: 'CITY', weight: 80, directed: true },
  { from: 'J2', to: 'CITY', weight: 30, directed: true }, { from: 'J3', to: 'FARM', weight: 35, directed: true },
  { from: 'CITY', to: 'FARM', weight: 20, directed: true },
];

// ============================================================================
// 7. GAME PATHFINDING (terrain grid)
// ============================================================================
const GAME_ROWS = [
  'Sr....#.',
  '.r~...#.',
  '..~.#...',
  '....#m.T',
];
const TERRAIN_COST = { '.': 1, 'r': 1, '~': 4, 'm': 3 };
const TERRAIN_NAME = { '.': 'grass', 'r': 'road', '~': 'water', 'm': 'mud' };

function gameGrid() {
  const nodes = [];
  const edges = [];
  const cell = {};
  let start = null;
  let target = null;
  const scale = 90;
  const H = GAME_ROWS.length;
  const W = Math.max(...GAME_ROWS.map((r) => r.length));
  GAME_ROWS.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === '#') return;
      const id = `${r},${c}`;
      nodes.push({ id, x: (c - (W - 1) / 2) * scale, y: (r - (H - 1) / 2) * scale, name: `${r},${c}`, kind: 'tile', terrain: ch === 'S' ? '.' : ch === 'T' ? '.' : ch });
      cell[id] = true;
      if (ch === 'S') start = id;
      if (ch === 'T') target = id;
    });
  });
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  GAME_ROWS.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === '#') return;
      const id = `${r},${c}`;
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        const nid = `${nr},${nc}`;
        if (!cell[nid]) continue;
        const t = GAME_ROWS[nr][nc] === 'S' || GAME_ROWS[nr][nc] === 'T' ? '.' : GAME_ROWS[nr][nc];
        edges.push({ from: id, to: nid, weight: TERRAIN_COST[t] || 1 });
      }
    });
  });
  return { nodes, edges, start, target };
}

// ============================================================================
// 8. COURSE PLANNING
// ============================================================================
const courseNodes = [
  { id: 'Calc1', x: -360, y: -100, name: 'Calculus I' },
  { id: 'LinAlg', x: -360, y: 60, name: 'Linear Algebra' },
  { id: 'Calc2', x: -180, y: -140, name: 'Calculus II' },
  { id: 'DS', x: -180, y: 20, name: 'Data Structures' },
  { id: 'Algo', x: 20, y: -60, name: 'Algorithms' },
  { id: 'DB', x: 20, y: 120, name: 'Databases' },
  { id: 'ML', x: 220, y: -40, name: 'Machine Learning' },
  { id: 'AI', x: 360, y: 40, name: 'Advanced AI' },
  { id: 'OS', x: 220, y: 160, name: 'Operating Systems' },
];
const courseEdges = [
  { from: 'Calc1', to: 'Calc2', directed: true }, { from: 'Calc2', to: 'ML', directed: true },
  { from: 'LinAlg', to: 'ML', directed: true }, { from: 'Calc1', to: 'DS', directed: true },
  { from: 'DS', to: 'Algo', directed: true }, { from: 'Algo', to: 'ML', directed: true },
  { from: 'Algo', to: 'AI', directed: true }, { from: 'DS', to: 'DB', directed: true },
  { from: 'DS', to: 'OS', directed: true }, { from: 'ML', to: 'AI', directed: true },
];

// ============================================================================
// 9. JOB MATCHING
// ============================================================================
const candidateNodes = [
  { id: 'LT', x: -300, y: -220, name: 'Linus Torvalds', kind: 'candidate', skills: 'C · Linux · 35y' },
  { id: 'MR', x: -300, y: -60, name: 'MrBeast', kind: 'candidate', skills: 'YouTube · 200M subs' },
  { id: 'SA', x: -300, y: 100, name: 'Sam Altman', kind: 'candidate', skills: 'AI · startups' },
  { id: 'GR', x: -300, y: 240, name: 'Greta Thunberg', kind: 'candidate', skills: 'Climate · advocacy' },
];
const jobNodes = [
  { id: 'JKE', x: 300, y: -220, name: 'Kernel Engineer', kind: 'job', req: 'C · Linux' },
  { id: 'JHD', x: 300, y: -60, name: 'Head of Content', kind: 'job', req: 'YouTube' },
  { id: 'JAI', x: 300, y: 100, name: 'AI Lab Director', kind: 'job', req: 'AI · Python' },
  { id: 'JCL', x: 300, y: 240, name: 'Climate Advisor', kind: 'job', req: 'Climate · Policy' },
];
const matchingEdges = [
  { from: 'LT', to: 'JKE' }, { from: 'MR', to: 'JHD' }, { from: 'MR', to: 'JAI' },
  { from: 'SA', to: 'JAI' }, { from: 'SA', to: 'JHD' }, { from: 'GR', to: 'JCL' }, { from: 'GR', to: 'JHD' },
];

// ============================================================================
// 10. CRITICAL INFRASTRUCTURE
// ============================================================================
const criticalNodes = [
  { id: 'N1', x: -320, y: -40, name: 'North Station', kind: 'station' },
  { id: 'N2', x: -160, y: 100, name: 'Central Hub', kind: 'station' },
  { id: 'N3', x: 0, y: -40, name: 'East Station', kind: 'station' },
  { id: 'N4', x: 160, y: 100, name: 'West Station', kind: 'station' },
  { id: 'N5', x: 320, y: -40, name: 'South Station', kind: 'station' },
  { id: 'N6', x: 0, y: 200, name: 'Hill Line', kind: 'station' },
  { id: 'N7', x: -320, y: 200, name: 'Riverside', kind: 'station' },
];
const criticalEdges = [
  { from: 'N1', to: 'N2' }, { from: 'N2', to: 'N3' }, { from: 'N3', to: 'N4' }, { from: 'N4', to: 'N5' },
  { from: 'N1', to: 'N3' }, { from: 'N3', to: 'N5' }, { from: 'N3', to: 'N6' }, { from: 'N2', to: 'N6' },
  { from: 'N1', to: 'N7' },
];

// ============================================================================
// 11. STREET INSPECTION (Euler)
// ============================================================================
const streetNodes = [
  { id: 'K1', x: -280, y: -80, name: 'K1' }, { id: 'K2', x: 0, y: -160, name: 'K2' },
  { id: 'K3', x: 280, y: -80, name: 'K3' }, { id: 'K4', x: 0, y: 80, name: 'K4' },
  { id: 'K5', x: -280, y: 200, name: 'K5' }, { id: 'K6', x: 280, y: 200, name: 'K6' },
  { id: 'K7', x: 0, y: 280, name: 'K7' },
];
// Figure-eight layout: two cycles sharing K4 → every intersection has even
// degree, so an Euler circuit exists (and therefore an Euler path too).
const streetEdges = [
  { from: 'K1', to: 'K2' }, { from: 'K2', to: 'K3' }, { from: 'K3', to: 'K4' }, { from: 'K4', to: 'K1' },
  { from: 'K4', to: 'K5' }, { from: 'K5', to: 'K6' }, { from: 'K6', to: 'K7' }, { from: 'K7', to: 'K4' },
];

// 12 người nổi tiếng Việt Nam — đa lĩnh vực (streamer, gamer, youtuber, rapper, ca sĩ, producer)
const socialPeople = [
  // [id, name, field, initials, x, y, color]
  ['Mixi',      'Độ Mixi',           'Streamer · Gamer',     'MX',   0,   0, '#e89e3b'],
  ['Viruss',    'ViruSs',             'Streamer · MC',        'VS', -300, -160, '#4a78b8'],
  ['Misthy',    'MisThy',             'Streamer',             'MT', -130, -250, '#c23b6e'],
  ['Cris',      'Cris Devil Gamer',   'Gamer · YouTuber',     'CD',  130, -260, '#7c5cd6'],
  ['PewPew',    'PewPew',             'YouTuber · Streamer',  'PP',  300, -160, '#3d9b8c'],
  ['Den',       'Đen Vâu',            'Rapper',               'ĐV',  300,   90, '#b06a4a'],
  ['KieuTrinh', 'Kiều Trinh',         'Streamer',             'KT', -340, -330, '#c23b6e'],
  ['JustaTee',  'JustaTee',           'Rapper · Producer',    'JT',  120,  260, '#4a78b8'],
  ['LinhCao',   'Linh Cáo',           'Ca sĩ',                'LC',  380,  240, '#3d9b8c'],
  ['Binz',      'Binz',               'Rapper',               'BZ', -230,  410, '#7c5cd6'],
  ['Touliver',  'Touliver',           'Nhà sản xuất',         'TL',   10,  410, '#b06a4a'],
  ['Soobin',    'Soobin Hoàng Sơn',   'Ca sĩ',                'SB',  260,  410, '#4a78b8'],
];
const socialEdges = [
  // [from, to, relationship]
  ['Mixi', 'Viruss', 'bạn thân'],
  ['Mixi', 'Misthy', 'bạn thân'],
  ['Mixi', 'Cris', 'bạn thân'],
  ['Mixi', 'PewPew', 'bạn thân'],
  ['Mixi', 'Den', 'collab MV'],
  ['Misthy', 'KieuTrinh', 'bạn thân'],
  ['Den', 'JustaTee', 'producer'],
  ['Den', 'LinhCao', 'hợp tác'],
  ['JustaTee', 'Binz', 'SpaceSpeakers'],
  ['JustaTee', 'Touliver', 'SpaceSpeakers'],
  ['JustaTee', 'Soobin', 'SpaceSpeakers'],
  ['Binz', 'Touliver', 'SpaceSpeakers'],
];

// ============================================================================
// SCENARIO REGISTRY
// ============================================================================
function scenario({ id, domain, icon, title, dataLabel, problemHeading, problemText, algorithms, defaultAlgorithm, whyGraph, build, narrate, metrics, resultText, renderer, params = {}, levels = ['Realistic'] }) {
  return { id, domain, icon, title, dataLabel, dataLabelText: DATA_LABELS[dataLabel], problem: { heading: problemHeading, text: problemText }, algorithms, defaultAlgorithm, whyGraph, build, narrate, metrics, resultText, renderer, params, levels };
}

export const SCENARIOS = [

  scenario({
    id: 'city-navigation', domain: 'Navigation', icon: 'fa-map-location-dot', title: 'City Navigation',
    dataLabel: 'realistic-simulation',
    levels: ['Easy', 'Realistic', 'Complex'],
    problemHeading: 'Find the fastest route across Hà Nội',
    problemText: 'A driver needs to get from one district to another. Roads only connect districts that actually border each other — which route is shortest?',
    algorithms: ['dijkstra', 'astar', 'bfs', 'bellman-ford'], defaultAlgorithm: 'dijkstra',
    whyGraph: {
      vertices: 'The 30 districts of Hà Nội (12 quận · 17 huyện · 1 thị xã)',
      edges: 'A road link exists only between districts that share a border',
      weights: 'Estimated road distance in km',
      whyAlgorithm: 'Dijkstra finds the minimum-distance route and every distance is non-negative. A* can reach the destination faster by steering toward it with a straight-line estimate.',
    },
    build(level = 'Realistic') {
      const useNodes = level === 'Easy' ? cityNodes.filter((n) => n.kind === 'quận') : cityNodes;
      const map = buildDistrictMap(useNodes, { minX: -800, maxX: 405, minY: -470, maxY: 545 });
      // Roads exist only between districts that truly border each other.
      const edges = map.adjacency.map(([a, b]) => {
        const A = useNodes.find((n) => n.id === a);
        const B = useNodes.find((n) => n.id === b);
        const km = Math.max(2, Math.min(14, Math.round(Math.hypot(A.x - B.x, A.y - B.y) / 45)));
        return { from: a, to: b, weight: km };
      });
      const graph = buildGraph(useNodes, edges);
      const entities = {
        nodes: Object.fromEntries(useNodes.map((n) => [n.id, { name: n.label, kind: n.kind }])),
        edges: {},
        map,
        river: level === 'Easy' ? null : HANOI_RIVER,
        lakes: level === 'Easy' ? null : HANOI_LAKES,
        start: 'hoankiem', target: level === 'Easy' ? 'hadong' : 'bavi',
        // Complex: a couple of roads can be closed / congested (dynamic event).
        breakable: level === 'Complex',
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      const n = ctx.name;
      switch (ev.type) {
        case 'initialize': return { headline: 'Navigation started', detail: `The navigator begins at ${n(ctx.start)} and expands along roads to neighbouring districts, always moving to the closest unsettled district.` };
        case 'extract-min': return { headline: `Vehicle reaches ${n(ev.node)}`, detail: `${n(ev.node)} now has its final shortest distance from the origin (${fmt(ctx.dist(ev.node))} km).` };
        case 'inspect-edge': return { headline: `Checking the road from ${n(ev.from)}`, detail: `The road to ${n(ev.to)} — a district that borders ${n(ev.from)} — is evaluated as a candidate extension of the route.` };
        case 'relax-edge': return { headline: 'A shorter route is found', detail: `Via ${n(ev.from)}, reaching ${n(ev.to)} now costs ${fmt(ctx.dist(ev.to))} km — better than the previous estimate. The route is updated.` };
        case 'no-relax': return { headline: 'Road evaluated, no improvement', detail: `The road to ${n(ev.to)} does not beat the best route already known. It is skipped.` };
        case 'settle': return { headline: `Route to ${n(ev.node)} locked in`, detail: `${n(ev.node)} is settled: its shortest distance is final. The frontier moves to the next-closest district.` };
        case 'complete': return { headline: 'Route found', detail: 'The shortest route has been determined. Switch to Graph Theory to see the distance table and priority queue behind it.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      const dist = r.totalCost != null ? r.totalCost : null;
      const path = r.path || [];
      const settled = r.settledCount ?? (state.panel && state.panel.settled ? state.panel.settled.length : 0);
      const km = dist != null ? `${fmt(dist)} km` : '—';
      const minutes = dist != null ? `${Math.round(dist / 30 * 60)} min` : '—';
      return [
        { label: 'Distance', value: km },
        { label: 'Est. travel time', value: minutes },
        { label: 'Districts settled', value: String(settled) },
        { label: 'Route length', value: path.length ? `${path.length - 1} roads` : '—' },
      ];
    },
    resultText(r) {
      if (!r || r.path == null) return ['No route found between the selected districts.'];
      return [
        `Shortest route: ${r.path.join(' → ')}`,
        `Total distance: ${fmt(r.totalCost)} km (≈ ${Math.round(r.totalCost / 30 * 60)} min by car)`,
        `${r.settledCount} districts were settled before the route was confirmed.`,
      ];
    },
    renderer: 'city',
  }),

  scenario({
    id: 'fiber-network', domain: 'Infrastructure', icon: '🌐', title: 'Fiber Network Design',
    dataLabel: 'realistic-simulation',
    levels: ['Easy', 'Realistic', 'Complex'],
    problemHeading: 'Connect 12 buildings at minimum cable cost',
    problemText: 'You are designing a fiber network for 12 city blocks. Connect every building while minimizing total construction cost.',
    algorithms: ['kruskal', 'prim'], defaultAlgorithm: 'kruskal',
    whyGraph: {
      vertices: 'Buildings',
      edges: 'Possible underground cable routes',
      weights: 'Construction cost ($k)',
      whyAlgorithm: 'This is a Minimum Spanning Tree: connect all buildings with no redundant loops at minimum total cost. Kruskal processes the cheapest safe cables first.',
    },
    build(level = 'Realistic') {
      const extra = level === 'Easy' ? -4 : level === 'Complex' ? 4 : 0;
      let nodes = fiberNodes;
      let edges = fiberEdges;
      if (extra > 0) {
        const ex = expandRing(fiberNodes, fiberEdges, extra);
        nodes = ex.nodes; edges = ex.edges;
      } else if (extra < 0) {
        // Easy: drop the last 4 buildings + their edges
        const keep = new Set(fiberNodes.slice(0, 8).map((n) => n.id));
        nodes = fiberNodes.filter((n) => keep.has(n.id));
        edges = fiberEdges.filter((e) => keep.has(e.from) && keep.has(e.to));
      }
      const graph = buildGraph(nodes, edges);
      const entities = {
        nodes: Object.fromEntries(nodes.map((n) => [n.id, { name: n.name, kind: 'building' }])),
        edges: {},
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      const n = ctx.name;
      switch (ev.type) {
        case 'initialize': return { headline: 'Planning the fiber network', detail: 'Candidate cable routes are sorted by construction cost. Each building starts as its own disconnected block.' };
        case 'inspect-edge': return { headline: 'Evaluating a candidate cable', detail: `Cable route ${n(ev.from)} – ${n(ev.to)} ($${fmt(ev.weight)}k) is the cheapest remaining candidate.` };
        case 'accept-edge': return { headline: `Installing cable: ${n(ev.from)} ⇄ ${n(ev.to)}`, detail: 'The two buildings are in different network groups, so this cable safely extends the network without creating a redundant loop.' };
        case 'reject-edge': return { headline: `Skipping cable: ${n(ev.from)} ⇄ ${n(ev.to)}`, detail: 'These buildings are already connected through the existing network. Adding this cable would create a redundant loop and wasted cost.' };
        case 'complete': return { headline: 'Network complete', detail: 'Every building is connected at minimum total cost. See the accepted/rejected cable summary on the right.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      return [
        { label: 'Installation cost', value: r.mstCost != null ? `$${fmt(r.mstCost)}k` : '—' },
        { label: 'Cables installed', value: r.mstEdges ? String(r.mstEdges.length) : '—' },
        { label: 'Buildings connected', value: `${state ? Object.keys(state.nodes).length : 12} / 12` },
        { label: 'Redundant links skipped', value: r.rejectedCount != null ? String(r.rejectedCount) : '—' },
      ];
    },
    resultText(r) {
      return [
        `Network complete: ${r.mstEdges.length} cables installed.`,
        `Total installation cost: $${fmt(r.mstCost)}k`,
        `${r.rejectedCount} candidate cables were skipped (would create redundant loops).`,
      ];
    },
    renderer: 'fiber',
  }),

  scenario({
    id: 'network-routing', domain: 'Networking', icon: '📡', title: 'Network Routing',
    dataLabel: 'realistic-simulation',
    levels: ['Easy', 'Realistic', 'Complex'],
    problemHeading: 'Route traffic between servers with lowest latency',
    problemText: 'Send traffic from Server A to API-01. Each link has a latency (ms). Find the lowest-latency path.',
    algorithms: ['dijkstra', 'bellman-ford', 'edmonds-karp', 'dinic'], defaultAlgorithm: 'dijkstra',
    whyGraph: {
      vertices: 'Routers and servers',
      edges: 'Network links',
      weights: 'Latency (ms) — or capacity for flow problems',
      whyAlgorithm: 'Dijkstra finds the minimum-latency route. Max Flow answers a different question: how much total bandwidth can move between two endpoints.',
    },
    build(level = 'Realistic') {
      let nodes = netNodes;
      let edges = netEdges;
      if (level === 'Easy') {
        nodes = netNodes.filter((n) => ['S1', 'R1', 'R2', 'R4', 'API'].includes(n.id));
        edges = netEdges.filter((e) => ['S1', 'R1', 'R2', 'R4', 'API'].includes(e.from) && ['S1', 'R1', 'R2', 'R4', 'API'].includes(e.to));
      } else if (level === 'Complex') {
        const ex = expandRing(netNodes, netEdges, 4, { radius: 430 });
        nodes = ex.nodes.map((n) => ({ ...n, kind: n.kind || 'router' }));
        edges = ex.edges;
      }
      const graph = buildGraph(nodes, edges, { directed: false });
      const entities = {
        nodes: Object.fromEntries(nodes.map((n) => [n.id, { name: n.name, kind: n.kind || 'router' }])),
        edges: {},
        start: 'S1', target: 'API', source: 'S1', sink: 'API',
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      const n = ctx.name;
      switch (ev.type) {
        case 'initialize': return { headline: 'Packet routing started', detail: `Routing from ${n('S1')} to ${n('API')}. Latency values on each link guide the search.` };
        case 'extract-min': return { headline: `Link-state settled: ${n(ev.node)}`, detail: `${n(ev.node)} now has its final lowest latency (${fmt(ctx.dist(ev.node))} ms).` };
        case 'relax-edge': return { headline: 'Better latency path found', detail: `Reaching ${n(ev.to)} via ${n(ev.from)} lowers its latency to ${fmt(ctx.dist(ev.to))} ms.` };
        case 'augmenting-path': return { headline: 'Augmenting path found', detail: `A route from source to sink with spare capacity was found: ${ev.message.split(':')[1] || ''}` };
        case 'augment': return { headline: 'Bandwidth pushed', detail: 'Additional flow is pushed along the path; residual capacities are updated.' };
        case 'complete': return { headline: 'Routing complete', detail: 'The final route (or max flow) is ready. Note: physical link latency is never negative — negative weights appear only in abstract models.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      if (r.maxFlow != null) {
        return [
          { label: 'Max bandwidth', value: `${fmt(r.maxFlow)} Gbps` },
          { label: 'Links', value: String(state ? Object.keys(state.edges).length : 0) },
        ];
      }
      const dist = r.totalCost != null ? r.totalCost : null;
      return [
        { label: 'Latency', value: dist != null ? `${fmt(dist)} ms` : '—' },
        { label: 'Route', value: (r.path || []).join(' → ') || '—' },
        { label: 'Routers settled', value: r.settledCount != null ? String(r.settledCount) : '—' },
      ];
    },
    resultText(r) {
      if (r.maxFlow != null) return [`Maximum throughput: ${fmt(r.maxFlow)} Gbps`, 'The bottleneck link determines the total capacity.'];
      return [`Lowest-latency route: ${(r.path || []).join(' → ')}`, `Latency: ${fmt(r.totalCost)} ms`];
    },
    renderer: 'network',
  }),

  scenario({
    id: 'software-build', domain: 'Software Systems', icon: '💻', title: 'Software Build System',
    dataLabel: 'educational-model',
    levels: ['Easy', 'Realistic', 'Complex'],
    problemHeading: 'Determine a valid build order for 8 modules',
    problemText: 'Each module depends on others. In what order should the build pipeline compile them?',
    algorithms: ['kahn', 'dfs-topo', 'kosaraju', 'cycle-detection'], defaultAlgorithm: 'kahn',
    whyGraph: {
      vertices: 'Software modules',
      edges: '"depends on" (build this first)',
      weights: '—',
      whyAlgorithm: 'Topological sort produces a valid dependency order. A cycle (circular dependency) makes a build order impossible.',
    },
    build(level = 'Realistic') {
      let nodes = buildNodes;
      let edges = buildEdges;
      if (level === 'Easy') {
        const keep = new Set(['Frontend', 'API', 'Auth', 'Database']);
        nodes = buildNodes.filter((n) => keep.has(n.id));
        edges = buildEdges.filter((e) => keep.has(e.from) && keep.has(e.to));
      } else if (level === 'Complex') {
        nodes = [
          ...buildNodes,
          { id: 'Analytics', label: 'Analytics', x: -360, y: -220, name: 'Analytics' },
          { id: 'Gateway', label: 'Gateway', x: 360, y: -240, name: 'Gateway' },
          { id: 'Cache', label: 'Cache', x: 0, y: -280, name: 'Cache' },
          { id: 'Queue', label: 'Queue', x: 180, y: 200, name: 'Queue' },
        ];
        edges = [
          ...buildEdges,
          { from: 'Frontend', to: 'Gateway', directed: true }, { from: 'Gateway', to: 'API', directed: true },
          { from: 'Analytics', to: 'Database', directed: true }, { from: 'Analytics', to: 'Cache', directed: true },
          { from: 'Cache', to: 'Database', directed: true }, { from: 'Search', to: 'Queue', directed: true },
          { from: 'Queue', to: 'Database', directed: true }, { from: 'Payments', to: 'Queue', directed: true },
        ];
      }
      const graph = buildGraph(nodes, edges, { directed: true });
      const entities = {
        nodes: Object.fromEntries(nodes.map((n) => [n.id, { name: n.name, kind: 'module' }])),
        edges: {},
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      const n = ctx.name;
      switch (ev.type) {
        case 'initialize': return { headline: 'Build pipeline initialized', detail: 'Modules with no pending dependencies are queued for building first.' };
        case 'dequeue': return { headline: `BUILDING: ${n(ev.node)}`, detail: `${n(ev.node)} has all dependencies resolved and enters the build stage.` };
        case 'decrement': return { headline: `Dependency resolved for ${n(ev.to)}`, detail: `${n(ev.to)} loses one pending dependency.` };
        case 'enqueue': return { headline: `${n(ev.node)} is READY`, detail: `All dependencies of ${n(ev.node)} are built — it joins the queue.` };
        case 'back-edge': return { headline: 'BUILD BLOCKED — circular dependency', detail: `A dependency cycle was found (${n(ev.from)} → ${n(ev.to)} → …). No valid build order exists until the cycle is broken.` };
        case 'component-found': return { headline: `Dependency cluster found`, detail: `Modules that all depend on each other form one strongly connected group: ${ev.message.split('=')[1] || ''}` };
        case 'complete': return { headline: 'Build complete', detail: 'Every module has been built in dependency order — or a cycle was detected. See the build order on the right.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      if (r.components) {
        return [
          { label: 'Dependency clusters', value: String(r.components.length) },
          { label: 'Modules', value: String(state ? Object.keys(state.nodes).length : 8) },
        ];
      }
      if (r.hasCycle) return [{ label: 'Status', value: 'BLOCKED' }, { label: 'Circular dependency', value: 'detected' }];
      const order = r.order || [];
      const built = Math.min(order.length, state ? state.step : 0);
      return [
        { label: 'Modules built', value: `${order.length} / 8` },
        { label: 'Build order', value: order.join(' → ') || '—' },
        { label: 'Status', value: 'COMPLETE' },
      ];
    },
    resultText(r) {
      if (r.components) return [`${r.components.length} strongly connected module group(s) found.`, 'Each group is a set of modules that all depend on each other.'];
      if (r.hasCycle) return ['BUILD FAILED', 'A circular dependency exists — the build order is undefined.'];
      return [`Build order: ${r.order.join(' → ')}`, 'All 8 modules compiled successfully.'];
    },
    renderer: 'build',
  }),

  scenario({
    id: 'delivery-logistics', domain: 'Logistics', icon: '📦', title: 'Delivery Logistics',
    dataLabel: 'realistic-simulation',
    levels: ['Easy', 'Realistic', 'Complex'],
    problemHeading: 'Deliver to every customer at minimum cost',
    problemText: 'A truck leaves the warehouse. Visit every customer exactly once and return — or find the cheapest single route.',
    algorithms: ['dijkstra', 'astar', 'tsp-nn', 'tsp-exact', 'edmonds-karp', 'kruskal'], defaultAlgorithm: 'tsp-nn',
    whyGraph: {
      vertices: 'Warehouse and customer locations',
      edges: 'Roads',
      weights: 'Travel distance (km)',
      whyAlgorithm: 'Visiting every location exactly once is the Traveling Salesman Problem. Exact search explodes combinatorially — real fleets use heuristics (nearest-neighbor, 2-opt).',
    },
    build(level = 'Realistic') {
      let nodes = deliveryNodes;
      let edges = deliveryEdges;
      if (level === 'Easy') {
        const keep = new Set(['WH', 'C1', 'C2', 'C3', 'C4']);
        nodes = deliveryNodes.filter((n) => keep.has(n.id));
        edges = deliveryEdges.filter((e) => keep.has(e.from) && keep.has(e.to));
      } else if (level === 'Complex') {
        // 12 stops: more customers in a wider ring
        nodes = [
          ...deliveryNodes,
          { id: 'C8', label: 'C8', x: -140, y: -320, name: 'Customer 8', kind: 'customer' },
          { id: 'C9', label: 'C9', x: 120, y: -340, name: 'Customer 9', kind: 'customer' },
          { id: 'C10', label: 'C10', x: 420, y: -60, name: 'Customer 10', kind: 'customer' },
          { id: 'C11', label: 'C11', x: -420, y: -20, name: 'Customer 11', kind: 'customer' },
        ];
        edges = [
          ...deliveryEdges,
          { from: 'C1', to: 'C8', weight: 4 }, { from: 'C8', to: 'C9', weight: 5 }, { from: 'C9', to: 'C2', weight: 4 },
          { from: 'C3', to: 'C10', weight: 6 }, { from: 'C4', to: 'C10', weight: 5 },
          { from: 'WH', to: 'C11', weight: 7 }, { from: 'C11', to: 'C7', weight: 6 }, { from: 'C11', to: 'C1', weight: 5 },
        ];
      }
      const graph = buildGraph(nodes, edges);
      const entities = {
        nodes: Object.fromEntries(nodes.map((n) => [n.id, { name: n.name, kind: n.kind }])),
        edges: {},
        start: 'WH',
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      const n = ctx.name;
      switch (ev.type) {
        case 'initialize': return { headline: 'Truck departs from the warehouse', detail: 'The delivery plan starts at the warehouse.' };
        case 'choose-nearest': return { headline: `Truck heads to ${n(ev.node ?? ctx.lastTo)}`, detail: 'The nearest unvisited customer is chosen (greedy rule — fast but not guaranteed optimal).' };
        case 'extend': return { headline: `Route extended to ${n(ev.node)}`, detail: 'The truck moves to the next unvisited customer on its tour.' };
        case 'new-best': return { headline: 'New best tour recorded', detail: 'A cheaper complete tour was found; the branch-and-bound search keeps the best.' };
        case 'backtrack': return { headline: 'Dead end — backtracking', detail: 'This partial route cannot improve the best tour, so the search unwinds.' };
        case 'two-opt': return { headline: '2-opt improvement', detail: 'Two crossing route segments were swapped, shortening the tour.' };
        case 'complete': return { headline: 'Delivery complete', detail: 'The final route (or network) is shown. Heuristic tours are approximate, not optimal.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      if (r.maxFlow != null) return [{ label: 'Max throughput', value: String(r.maxFlow) }, { label: 'Result', value: 'flow' }];
      if (r.mstCost != null) return [{ label: 'Network cost', value: `$${fmt(r.mstCost)}k` }, { label: 'Cables', value: String(r.mstEdges.length) }];
      if (r.tour) return [
        { label: 'Tour cost', value: `${fmt(r.cost)} km` },
        { label: 'Stops', value: String(r.tour.length - 1) },
        { label: 'Method', value: r.optimal ? 'exact (optimal)' : 'heuristic (approx.)' },
      ];
      return [
        { label: 'Distance', value: r.totalCost != null ? `${fmt(r.totalCost)} km` : '—' },
        { label: 'Route', value: (r.path || []).join(' → ') || '—' },
      ];
    },
    resultText(r) {
      if (r.maxFlow != null) return [`Maximum delivery throughput: ${fmt(r.maxFlow)}`, 'The busiest road caps the total flow.'];
      if (r.mstCost != null) return [`Cheapest delivery network: $${fmt(r.mstCost)}k`, 'Connects the warehouse and all customers with minimum total road cost.'];
      if (r.tour) return [
        `Tour: ${r.tour.join(' → ')}`,
        `Total distance: ${fmt(r.cost)} km`,
        r.optimal ? 'Found by exact search (guaranteed optimal).' : 'Found by nearest-neighbor + 2-opt (heuristic — NOT guaranteed optimal). Real fleets use such heuristics because exact TSP is exponential.',
      ];
      return [`Shortest route: ${(r.path || []).join(' → ')}`, `Distance: ${fmt(r.totalCost)} km`];
    },
    renderer: 'delivery',
  }),

  scenario({
    id: 'water-network', domain: 'Infrastructure', icon: '🌊', title: 'Water Pipeline Network',
    dataLabel: 'educational-model',
    levels: ['Easy', 'Realistic', 'Complex'],
    problemHeading: 'Maximize water flow from reservoir to city',
    problemText: 'Pipes have capacities (L/s). How much water can flow from the reservoir to the city — and where is the bottleneck?',
    algorithms: ['edmonds-karp', 'dinic', 'ford-fulkerson', 'bridges'], defaultAlgorithm: 'edmonds-karp',
    whyGraph: {
      vertices: 'Reservoir, junctions, tanks',
      edges: 'Pipes',
      weights: 'Capacity (L/s)',
      whyAlgorithm: 'Maximum flow computes the greatest throughput from source to sink. The reverse-residual idea lets the algorithm "undo" earlier water routing decisions.',
    },
    build(level = 'Realistic') {
      let nodes = waterNodes;
      let edges = waterEdges;
      if (level === 'Easy') {
        nodes = waterNodes.filter((n) => ['RES', 'J1', 'TANK', 'CITY'].includes(n.id));
        edges = waterEdges.filter((e) => ['RES', 'J1', 'TANK', 'CITY'].includes(e.from) && ['RES', 'J1', 'TANK', 'CITY'].includes(e.to));
      } else if (level === 'Complex') {
        // add parallel junctions + more demand
        nodes = [
          ...waterNodes,
          { id: 'J4', label: 'J4', x: -160, y: -60, name: 'Junction D', kind: 'junction' },
          { id: 'J5', label: 'J5', x: 40, y: -180, name: 'Junction E', kind: 'junction' },
          { id: 'IND', label: 'IND', x: 260, y: 180, name: 'Industrial Zone', kind: 'tank' },
        ];
        edges = [
          ...waterEdges,
          { from: 'J1', to: 'J4', weight: 45, directed: true },
          { from: 'J4', to: 'TANK', weight: 40, directed: true },
          { from: 'J4', to: 'J3', weight: 30, directed: true },
          { from: 'RES', to: 'J5', weight: 90, directed: true },
          { from: 'J5', to: 'J3', weight: 35, directed: true },
          { from: 'TANK', to: 'IND', weight: 60, directed: true },
          { from: 'IND', to: 'CITY', weight: 25, directed: true },
        ];
      }
      const graph = buildGraph(nodes, edges, { directed: true });
      const entities = {
        nodes: Object.fromEntries(nodes.map((n) => [n.id, { name: n.name, kind: n.kind }])),
        edges: Object.fromEntries(edges.map((e) => [idFor(graph, e.from, e.to), { name: `${e.from} → ${e.to} pipe` }])),
        source: 'RES', sink: 'CITY',
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      switch (ev.type) {
        case 'initialize': return { headline: 'Pumps start', detail: 'Water begins at the reservoir. Every pipe starts empty; capacities are fixed.' };
        case 'augmenting-path': return { headline: 'An open pipe route is found', detail: 'A path from reservoir to city with spare capacity is located.' };
        case 'bottleneck': return { headline: 'Bottleneck identified', detail: `The narrowest pipe on this route limits the push to ${fmt(ev.message.match(/= (\S+)/)?.[1] ?? '?')} L/s.` };
        case 'augment': return { headline: 'Water flow increased', detail: 'Additional water is routed through the pipes; their used capacity rises.' };
        case 'no-path': return { headline: 'No more capacity', detail: 'No route with spare capacity remains — the network has reached maximum flow.' };
        case 'complete': return { headline: 'Maximum flow reached', detail: 'The total flow and the bottleneck pipes are shown. This is also where the min-cut lies.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      if (r.bridges) return [{ label: 'Critical pipes', value: String(r.bridges.length) }, { label: 'Result', value: 'bridge analysis' }];
      const flow = r.maxFlow != null ? r.maxFlow : (state.panel && state.panel.totalFlow != null ? state.panel.totalFlow : null);
      return [
        { label: 'Total flow', value: flow != null ? `${fmt(flow)} L/s` : '—' },
        { label: 'Pipes', value: String(state ? Object.keys(state.edges).length : 9) },
        { label: 'Utilization', value: flow != null ? `${Math.round((flow / 120) * 100)}%` : '—' },
      ];
    },
    resultText(r) {
      if (r.bridges) return [`${r.bridges.length} pipe(s) are critical`, 'Removing one would disconnect part of the network.'];
      return [`Total flow: ${fmt(r.maxFlow)} L/s`, 'The bottleneck pipes determine this maximum (max-flow = min-cut).'];
    },
    renderer: 'water',
  }),

  scenario({
    id: 'game-pathfinding', domain: 'Games', icon: '🎮', title: 'Game Pathfinding',
    dataLabel: 'educational-model',
    problemHeading: 'Move the character to the goal through terrain',
    problemText: 'Grass costs 1, roads 1, mud 3, water 4 per step. Walls block movement. Find the cheapest path.',
    algorithms: ['astar', 'bfs', 'dijkstra'], defaultAlgorithm: 'astar',
    params: { heuristic: 'manhattan' },
    whyGraph: {
      vertices: 'Tiles',
      edges: 'Possible moves between adjacent tiles',
      weights: 'Terrain movement cost',
      whyAlgorithm: 'A* uses the straight-line distance to the goal as a heuristic, so it explores far fewer tiles than BFS or Dijkstra.',
    },
    build() {
      const g = gameGrid();
      const graph = buildGraph(g.nodes, g.edges);
      const entities = {
        nodes: Object.fromEntries(g.nodes.map((n) => [n.id, { name: n.name, kind: 'tile', terrain: n.terrain }])),
        edges: {},
        start: g.start, target: g.target,
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      switch (ev.type) {
        case 'initialize': return { headline: 'Character starts moving', detail: 'The character begins at S. Terrain costs make the map a weighted graph.' };
        case 'select-lowest-f': return { headline: 'Character evaluates the best tile', detail: `Tile ${ev.node} has the lowest f = g + h, so the character moves there.` };
        case 'inspect-neighbor': return { headline: 'Neighboring tile checked', detail: 'The character looks at an adjacent tile and computes its g, h and f scores.' };
        case 'update-open-set': return { headline: 'Tile added to the frontier', detail: 'A better g-score was found for a neighboring tile — it is queued for exploration.' };
        case 'complete': return { headline: 'Path found', detail: 'The character reached the goal. Turn on the g/h/f overlay to inspect the scores.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      const cost = r.cost != null ? r.cost : (r.totalCost != null ? r.totalCost : null);
      return [
        { label: 'Path cost', value: cost != null ? fmt(cost) : '—' },
        { label: 'Tiles explored', value: r.explored != null ? String(r.explored) : '—' },
        { label: 'Heuristic', value: r.heuristic || 'manhattan' },
      ];
    },
    resultText(r) {
      return [
        `Path: ${(r.path || []).join(' → ')}`,
        `Cost: ${fmt(r.cost)} movement points · ${r.explored} tiles explored`,
        r.heuristic === 'zero' ? 'h=0 makes A* behave like Dijkstra (uninformed).' : 'The heuristic guided the search toward the goal, exploring fewer tiles than blind search.',
      ];
    },
    renderer: 'game',
  }),

  scenario({
    id: 'course-planning', domain: 'Education', icon: '🎓', title: 'Course Planning',
    dataLabel: 'educational-model',
    problemHeading: 'What order should I take these courses?',
    problemText: 'Courses have prerequisites. Find a valid semester-by-semester study order — or detect an impossible cycle.',
    algorithms: ['kahn', 'dfs-topo', 'cycle-detection'], defaultAlgorithm: 'kahn',
    whyGraph: {
      vertices: 'Courses',
      edges: '"must be taken before"',
      weights: '—',
      whyAlgorithm: 'A valid course order is a topological sort of the prerequisite DAG. A cycle means no valid order exists.',
    },
    build() {
      const graph = buildGraph(courseNodes, courseEdges, { directed: true });
      const entities = {
        nodes: Object.fromEntries(courseNodes.map((n) => [n.id, { name: n.name, kind: 'course' }])),
        edges: {},
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      const n = ctx.name;
      switch (ev.type) {
        case 'initialize': return { headline: 'Planning your semesters', detail: 'Courses with no prerequisites can be taken first.' };
        case 'dequeue': return { headline: `Unlocked: ${n(ev.node)}`, detail: `All prerequisites of ${n(ev.node)} are done — it is added to your plan.` };
        case 'decrement': return { headline: `Prerequisite cleared for ${n(ev.to)}`, detail: `${n(ev.to)} has one fewer prerequisite remaining.` };
        case 'back-edge': return { headline: 'NO VALID COURSE ORDER', detail: 'A prerequisite cycle was detected — no ordering satisfies all requirements.' };
        case 'complete': return { headline: 'Course plan complete', detail: 'A semester-by-semester order is shown on the canvas.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      if (r.hasCycle) return [{ label: 'Status', value: 'IMPOSSIBLE' }, { label: 'Reason', value: 'prerequisite cycle' }];
      const order = r.order || [];
      return [
        { label: 'Courses planned', value: `${order.length} / 9` },
        { label: 'Semesters', value: String(maxSemester(order, courseNodes, courseEdges)) },
      ];
    },
    resultText(r) {
      if (r.hasCycle) return ['NO VALID COURSE ORDER', 'A prerequisite cycle exists — the plan is impossible.'];
      return [`Study order: ${r.order.join(' → ')}`, `${maxSemester(r.order, courseNodes, courseEdges)} semesters total.`];
    },
    renderer: 'course',
  }),

  scenario({
    id: 'job-matching', domain: 'Operations', icon: '🤝', title: 'Job Assignment',
    dataLabel: 'educational-model',
    problemHeading: 'Match candidates to jobs they can do',
    problemText: 'Each candidate can do some of the jobs. Maximize the number of assignments (one job per person).',
    algorithms: ['bipartite-matching', 'hopcroft-karp'], defaultAlgorithm: 'bipartite-matching',
    whyGraph: {
      vertices: 'Candidates (left) and jobs (right)',
      edges: '"candidate is qualified for this job"',
      weights: '—',
      whyAlgorithm: 'This is a bipartite matching problem: find the largest set of non-conflicting assignments via augmenting paths.',
    },
    build() {
      const nodes = [...candidateNodes, ...jobNodes].map((n) => ({
        id: n.id, x: n.x, y: n.y, name: n.name, kind: n.kind,
        metadata: { part: n.kind === 'candidate' ? 'left' : 'right' },
        skills: n.skills, req: n.req,
      }));
      const graph = buildGraph(nodes, matchingEdges);
      const entities = {
        nodes: Object.fromEntries(nodes.map((n) => [n.id, { name: n.name, kind: n.kind, skills: n.skills, req: n.req }])),
        edges: {},
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      const n = ctx.name;
      switch (ev.type) {
        case 'initialize': return { headline: 'Matching process begins', detail: 'The system tries to assign each candidate to a job they are qualified for.' };
        case 'try-match': return { headline: `Finding a job for ${n(ev.node)}`, detail: 'The system looks for an open job — or tries to free one up by reassigning.' };
        case 'inspect': return { headline: 'Job occupied — trying to reassign', detail: `${n(ev.to)} is already assigned. The system checks whether its current holder can move to another job.` };
        case 'augment': return { headline: 'Assignment made', detail: 'An augmenting path was found — one more candidate is now assigned.' };
        case 'fail': return { headline: 'This reassignment did not work', detail: 'The system backtracks and tries the candidate\'s next option.' };
        case 'complete': return { headline: 'Matching complete', detail: 'The maximum number of assignments has been reached.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      return [
        { label: 'Assignments', value: `${r.size != null ? r.size : 0} / 4` },
        { label: 'Candidates', value: '4' },
        { label: 'Jobs', value: '4' },
      ];
    },
    resultText(r) {
      return [`${r.size} of 4 candidates assigned.`, r.size === 4 ? 'Perfect matching — everyone is placed.' : 'This is the maximum possible matching.'];
    },
    renderer: 'matching',
  }),

  scenario({
    id: 'critical-infrastructure', domain: 'Infrastructure', icon: '🏗️', title: 'Critical Infrastructure',
    dataLabel: 'educational-model',
    problemHeading: 'Which road or station is a single point of failure?',
    problemText: 'If one road closes or one station shuts down, which failures would split the network into disconnected parts?',
    algorithms: ['bridges', 'articulation', 'connected-components'], defaultAlgorithm: 'bridges',
    whyGraph: {
      vertices: 'Stations',
      edges: 'Roads / lines',
      weights: '—',
      whyAlgorithm: 'Bridges are roads whose removal disconnects the network. Articulation points are stations whose removal does the same.',
    },
    build() {
      const graph = buildGraph(criticalNodes, criticalEdges);
      const entities = {
        nodes: Object.fromEntries(criticalNodes.map((n) => [n.id, { name: n.name, kind: n.kind }])),
        edges: {},
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      const n = ctx.name;
      switch (ev.type) {
        case 'initialize': return { headline: 'Scanning the network', detail: 'A DFS walks the network computing discovery times and low-link values.' };
        case 'bridge-found': return { headline: `CRITICAL ROAD: ${n(ev.from)} ⇄ ${n(ev.to)}`, detail: 'Closing this road would disconnect a whole region from the rest of the network.' };
        case 'ap-found': return { headline: `CRITICAL STATION: ${n(ev.node)}`, detail: 'Shutting down this station would split the network into separate, unreachable parts.' };
        case 'back-edge': return { headline: 'Alternate route found', detail: 'A back edge provides a redundant path — that area is protected from a single failure.' };
        case 'complete': return { headline: 'Analysis complete', detail: 'Critical roads and stations are highlighted. Use CLOSE ROAD to simulate a failure yourself.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      if (r.components) return [{ label: 'Regions', value: String(r.count ?? r.components.length) }, { label: 'Result', value: 'connected regions' }];
      const found = r.bridges || r.articulationPoints || [];
      return [
        { label: 'Critical items', value: String(found.length) },
        { label: 'Type', value: r.bridges ? 'roads' : 'stations' },
        { label: 'Stations', value: String(state ? Object.keys(state.nodes).length : 7) },
      ];
    },
    resultText(r) {
      if (r.components) return [`${r.count ?? r.components.length} separate region(s)`, 'Regions cannot reach each other through the current network.'];
      if (r.bridges) return r.bridges.length ? [`${r.bridges.length} critical road(s) identified.`, 'Closing any of them disconnects the network.'] : ['No bridges — the network is 2-edge-connected.'];
      return r.articulationPoints.length ? [`Critical station(s): ${r.articulationPoints.join(', ')}`, 'Closing one splits the network.'] : ['No articulation points — the network is 2-vertex-connected.'];
    },
    renderer: 'critical',
  }),

  scenario({
    id: 'street-inspection', domain: 'Logistics', icon: '🚛', title: 'Street Inspection',
    dataLabel: 'educational-model',
    problemHeading: 'Cover every street exactly once',
    problemText: 'A road inspector must drive every street exactly once. Is it possible, and what is the route?',
    algorithms: ['euler-circuit', 'euler-path'], defaultAlgorithm: 'euler-circuit',
    whyGraph: {
      vertices: 'Intersections',
      edges: 'Streets',
      weights: '—',
      whyAlgorithm: 'An Euler circuit exists when every intersection has even degree. The inspector then covers each street exactly once and returns to the depot.',
    },
    build() {
      const graph = buildGraph(streetNodes, streetEdges);
      const entities = {
        nodes: Object.fromEntries(streetNodes.map((n) => [n.id, { name: n.name, kind: 'intersection' }])),
        edges: {},
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      switch (ev.type) {
        case 'check-degrees': return { headline: 'Checking intersections', detail: 'The number of streets meeting at each intersection decides whether a full inspection is possible.' };
        case 'start': return { headline: 'Inspector departs', detail: 'The inspection starts where the degree conditions dictate.' };
        case 'traverse': return { headline: 'Inspecting a street', detail: 'The inspector drives the next unused street.' };
        case 'backtrack': return { headline: 'Dead end — splicing the route', detail: 'No unused street remains here, so the inspector backtracks and records the tour.' };
        case 'complete': return { headline: 'Inspection complete', detail: 'Every street has been covered exactly once.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      return [
        { label: 'Feasible?', value: r.exists ? 'YES' : 'NO' },
        { label: 'Streets covered', value: r.exists ? String(r.trail.length - 1) : '—' },
        { label: 'Odd intersections', value: String((r.odd || []).length) },
      ];
    },
    resultText(r) {
      if (!r.exists) return ['No Euler route exists.', `${r.odd.length} intersections have odd degree (need 0 or 2).`];
      return [`Inspection route: ${r.trail.join(' → ')}`, 'Every street is covered exactly once.'];
    },
    renderer: 'street',
  }),

  scenario({
    id: 'social-network', domain: 'Social', icon: 'fa-people-group', title: 'Social Network',
    dataLabel: 'educational-model',
    problemHeading: 'Who can Độ Mixi reach through friends?',
    problemText: 'A friendship network of Vietnamese celebrities — streamers, rappers, singers, YouTubers, gamers. Starting from Độ Mixi, find everyone reachable and how many friendship hops away each person is.',
    algorithms: ['bfs', 'dfs'], defaultAlgorithm: 'bfs',
    whyGraph: {
      vertices: 'Người nổi tiếng',
      edges: 'Mối quan hệ thật (bạn thân, cùng label, hợp tác)',
      weights: '—',
      whyAlgorithm: 'BFS expands in waves — level 1 = direct friends, level 2 = friends of friends. That is exactly "degrees of separation".',
    },
    build() {
      const nodes = socialPeople.map(([id, name, field, initials, x, y, color]) => ({ id, label: name, x, y, name, field, color }));
      const edges = socialEdges.map(([from, to, rel]) => ({ from, to, weight: 1, rel }));
      const graph = buildGraph(nodes, edges);
      const entities = {
        nodes: Object.fromEntries(socialPeople.map(([id, name, field, initials, , , color]) => [id, { name, field, initials, color }])),
        edges: Object.fromEntries(edges.map((e) => [idFor(graph, e.from, e.to), { rel: e.rel }])),
        start: 'Mixi',
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      const n = ctx.name;
      const rel = (edgeId) => {
        const e = ctx.entities && ctx.entities.edges && ctx.entities.edges[edgeId];
        return e && e.rel ? e.rel : 'bạn bè';
      };
      switch (ev.type) {
        case 'initialize': return { headline: 'Starting from Độ Mixi', detail: 'BFS expands in friendship waves — level 1 = direct friends, level 2 = friends of friends.' };
        case 'dequeue': return { headline: `Processing ${n(ev.node)}`, detail: `${n(ev.node)} is handled — their friends are checked next.` };
        case 'inspect-edge': return { headline: `${n(ev.from)} — ${n(ev.to)}`, detail: `Relationship: ${rel(ev.edge)}.` };
        case 'discover-node': return { headline: `Found ${n(ev.node)}`, detail: `${n(ev.node)} is a new person discovered ${ev.level} hops away.` };
        case 'complete': return { headline: 'Everyone reachable found', detail: 'BFS reveals the degrees of separation from Độ Mixi.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      const reach = r.discoveredOrder || r.visitOrder || [];
      return [
        { label: 'People reached', value: `${reach.length} / 12` },
        { label: 'Max distance', value: r.maxLevel != null ? `${r.maxLevel} hops` : '—' },
        { label: 'Result', value: 'BFS levels' },
      ];
    },
    resultText(r) {
      const nameOf = (id) => {
        const p = socialPeople.find(([pid]) => pid === id);
        return p ? p[1] : id;
      };
      const order = r.discoveredOrder || r.visitOrder || [];
      return [`Reached ${order.length} of 12 people.`, `Maximum friendship distance: ${r.maxLevel} hops.`, `Order: ${order.map(nameOf).join(' → ')}`];
    },
    renderer: 'social',
  }),

  scenario({
    id: 'web-ranking', domain: 'Web', icon: 'fa-globe', title: 'Web Ranking (PageRank)',
    dataLabel: 'educational-model',
    problemHeading: 'Which page is the most important?',
    problemText: 'Pages link to each other. Rank them by link structure — the idea behind PageRank.',
    algorithms: ['pagerank'], defaultAlgorithm: 'pagerank',
    whyGraph: {
      vertices: 'Web pages',
      edges: 'Hyperlinks (page → linked page)',
      weights: '—',
      whyAlgorithm: 'PageRank spreads importance along links iteratively. Pages with many incoming links from important pages rank highest.',
    },
    build() {
      const sites = [
        ['News', -260, -160, 'news.example'], ['Blog', -260, 120, 'blog.example'], ['Wiki', 0, -220, 'wiki.example'],
        ['Shop', 260, -160, 'shop.example'], ['Social', 260, 120, 'social.example'], ['Search', 0, 220, 'search.example'],
      ];
      const nodes = sites.map(([name, x, y, url]) => ({ id: name, label: name, x, y, name, url }));
      const edges = [
        ['News', 'Wiki'], ['Blog', 'Wiki'], ['Wiki', 'Search'], ['Shop', 'Search'], ['Social', 'Search'],
        ['Search', 'News'], ['Search', 'Shop'], ['Wiki', 'Blog'], ['News', 'Social'], ['Shop', 'Blog'],
      ].map(([a, b]) => ({ from: a, to: b, weight: 1, directed: true }));
      const graph = buildGraph(nodes, edges, { directed: true });
      const entities = {
        nodes: Object.fromEntries(nodes.map((n) => [n.id, { name: n.name, url: n.url }])),
        edges: {},
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      switch (ev.type) {
        case 'initialize': return { headline: 'Rank starts equal', detail: 'Every page begins with the same rank; importance will flow along links.' };
        case 'iteration': return { headline: 'Rank redistributed', detail: 'Each page passes a share of its rank to the pages it links to.' };
        case 'converge': return { headline: 'Ranks converged', detail: 'The ranking has stabilized — link structure now determines importance.' };
        case 'complete': return { headline: 'Ranking ready', detail: 'The bar lengths show the final importance of each page.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      const sorted = r.sorted || [];
      return [
        { label: 'Top page', value: sorted[0] ? sorted[0].node : '—' },
        { label: 'Iterations', value: String(r.iterations != null ? r.iterations : 0) },
      ];
    },
    resultText(r) {
      const top = (r.sorted || [])[0];
      return [`Top page: ${top ? top.node : '—'} (rank ${top ? top.rank.toFixed(3) : ''})`, 'A teaching model — not the full modern search-engine stack.'];
    },
    renderer: 'web',
  }),

  scenario({
    id: 'airport-network', domain: 'Transport', icon: 'fa-plane', title: 'Airport Connections',
    dataLabel: 'realistic-simulation',
    problemHeading: 'Fly from Hà Nội to Cần Thơ — fewest stops?',
    problemText: 'Airports are linked by routes with distances (km). Find the route with the shortest total distance.',
    algorithms: ['dijkstra', 'astar', 'bfs'], defaultAlgorithm: 'dijkstra',
    whyGraph: {
      vertices: 'Airports (IATA codes)',
      edges: 'Flight routes',
      weights: 'Distance (km)',
      whyAlgorithm: 'Dijkstra finds the minimum total flying distance. A* steers toward the destination using straight-line distance.',
    },
    build() {
      const ap = [
        ['HAN', 'Hà Nội', -260, -260], ['VDO', 'Vân Đồn', -60, -360], ['HPH', 'Hải Phòng', 80, -330],
        ['VII', 'Vinh', -300, -60], ['DAD', 'Đà Nẵng', 20, -40], ['UIH', 'Quy Nhơn', 120, 80],
        ['BMV', 'Buôn Ma Thuột', -160, 140], ['CXR', 'Nha Trang', 60, 180], ['PQC', 'Phú Quốc', -280, 300],
        ['SGN', 'TP. Hồ Chí Minh', 120, 320], ['VCA', 'Cần Thơ', -60, 360],
      ];
      const nodes = ap.map(([code, name, x, y]) => ({ id: code, label: code, x, y, name, code }));
      const edges = [
        ['HAN', 'VDO', 120], ['HAN', 'HPH', 100], ['HAN', 'VII', 300], ['HAN', 'DAD', 620],
        ['VDO', 'HPH', 90], ['VII', 'DAD', 370], ['DAD', 'UIH', 280], ['DAD', 'BMV', 380],
        ['UIH', 'CXR', 210], ['UIH', 'BMV', 260], ['CXR', 'SGN', 320], ['BMV', 'SGN', 310],
        ['SGN', 'PQC', 300], ['SGN', 'VCA', 170], ['PQC', 'VCA', 130], ['DAD', 'SGN', 850],
      ].map(([a, b, w]) => ({ from: a, to: b, weight: w }));
      const graph = buildGraph(nodes, edges);
      const entities = {
        nodes: Object.fromEntries(nodes.map((n) => [n.id, { name: n.name, code: n.code }])),
        edges: {},
        start: 'HAN', target: 'VCA',
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      switch (ev.type) {
        case 'initialize': return { headline: 'Boarding at Hà Nội', detail: 'The route planner expands from HAN along flight corridors.' };
        case 'extract-min': return { headline: `Reached ${ctx.name(ev.node)} (${ev.node})`, detail: `${ev.node} has its final shortest distance now.` };
        case 'relax-edge': return { headline: 'Better route found', detail: `Reaching ${ctx.name(ev.to)} via ${ev.from} shortens the total flying distance.` };
        case 'complete': return { headline: 'Route found', detail: 'The shortest route (by distance) is highlighted.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      return [
        { label: 'Distance', value: r.totalCost != null ? `${fmt(r.totalCost)} km` : '—' },
        { label: 'Stops', value: r.path ? String(Math.max(0, r.path.length - 2)) : '—' },
        { label: 'Route', value: (r.path || []).join(' → ') || '—' },
      ];
    },
    resultText(r) {
      return [`Route: ${(r.path || []).join(' → ')}`, `Total distance: ${fmt(r.totalCost)} km (${Math.max(0, r.path.length - 2)} stop(s))`];
    },
    renderer: 'airport',
  }),

  scenario({
    id: 'cooking-order', domain: 'Life', icon: 'fa-utensils', title: 'Cooking Order',
    dataLabel: 'educational-model',
    problemHeading: 'In what order should I cook this meal?',
    problemText: 'Some steps must happen before others (chop before stir-fry). Find a valid cooking order.',
    algorithms: ['kahn', 'dfs-topo', 'cycle-detection'], defaultAlgorithm: 'kahn',
    whyGraph: {
      vertices: 'Cooking steps',
      edges: '"must finish before"',
      weights: '—',
      whyAlgorithm: 'A valid cooking order is a topological sort of the step dependencies.',
    },
    build() {
      const steps = [
        ['Wash rice', -380, -200, '🍚'], ['Cook rice', -380, -60, '🍚'], ['Chop onions', -120, -200, '🧅'],
        ['Chop garlic', -120, -60, '🧄'], ['Marinate meat', 140, -200, '🥩'], ['Stir-fry', 140, -60, '🍳'],
        ['Boil water', 380, -200, '💧'], ['Plate & serve', 380, -60, '🍽️'],
      ];
      const nodes = steps.map(([name, x, y, icon]) => ({ id: name, label: name, x, y, name, icon }));
      const edges = [
        ['Wash rice', 'Cook rice'], ['Chop onions', 'Stir-fry'], ['Chop garlic', 'Stir-fry'],
        ['Marinate meat', 'Stir-fry'], ['Cook rice', 'Plate & serve'], ['Stir-fry', 'Plate & serve'],
        ['Boil water', 'Cook rice'],
      ].map(([a, b]) => ({ from: a, to: b, weight: 1, directed: true }));
      const graph = buildGraph(nodes, edges, { directed: true });
      const entities = {
        nodes: Object.fromEntries(nodes.map((n) => [n.id, { name: n.name, icon: n.icon }])),
        edges: {},
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      const n = ctx.name;
      switch (ev.type) {
        case 'initialize': return { headline: 'Prep starts', detail: 'Steps with no prerequisites can begin first.' };
        case 'dequeue': return { headline: `Doing: ${n(ev.node)}`, detail: 'This step is added to the cooking order.' };
        case 'decrement': return { headline: `${n(ev.to)} unlocked`, detail: 'One prerequisite finished — the next step becomes possible.' };
        case 'complete': return { headline: 'Meal planned', detail: 'A valid step-by-step cooking order is ready.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      if (r.hasCycle) return [{ label: 'Status', value: 'IMPOSSIBLE' }, { label: 'Reason', value: 'cycle' }];
      return [
        { label: 'Steps planned', value: `${(r.order || []).length} / 8` },
        { label: 'Order', value: (r.order || []).join(' → ') || '—' },
      ];
    },
    resultText(r) {
      if (r.hasCycle) return ['NO VALID ORDER', 'A cycle in the steps makes the recipe impossible.'];
      return [`Cooking order: ${r.order.join(' → ')}`, 'Every dependency respected.'];
    },
    renderer: 'cooking',
  }),

  scenario({
    id: 'movie-recommendations', domain: 'AI', icon: 'fa-clapperboard', title: 'Movie Recommendations',
    dataLabel: 'educational-model',
    problemHeading: 'What should I watch next?',
    problemText: 'Movies are linked when the same people watch both. Starting from a film you liked, BFS finds related films — the idea behind "because you watched".',
    algorithms: ['bfs', 'dfs'], defaultAlgorithm: 'bfs',
    whyGraph: {
      vertices: 'Movies (posters)',
      edges: 'Watched by the same people',
      weights: '—',
      whyAlgorithm: 'BFS explores the similarity graph in rings: directly related films, then films two steps away, and so on.',
    },
    build() {
      const M = [
        ['Inception', '2010', '#1f4a6e', '#14293c'], ['Interstellar', '2014', '#274b6e', '#172b40'],
        ['Tenet', '2020', '#274b6e', '#172b40'], ['The Matrix', '1999', '#1c5c2e', '#0f3320'],
        ['Dune', '2021', '#6e4a1f', '#3c2a14'], ['Oppenheimer', '2023', '#5c1f1f', '#2e1212'],
        ['Blade Runner 2049', '2017', '#1f4a6e', '#14293c'], ['Arrival', '2016', '#2c5c3e', '#173425'],
      ];
      const nodes = M.map(([name, year, c1, c2], i) => {
        const ang = (i / M.length) * Math.PI * 2 - Math.PI / 2;
        return { id: name, label: name, x: Math.round(340 * Math.cos(ang)), y: Math.round(250 * Math.sin(ang)), name, year, c1, c2 };
      });
      const edges = [
        ['Inception', 'Interstellar'], ['Inception', 'Tenet'], ['Interstellar', 'Oppenheimer'], ['Tenet', 'Dune'],
        ['The Matrix', 'Blade Runner 2049'], ['The Matrix', 'Inception'], ['Dune', 'Blade Runner 2049'],
        ['Dune', 'Arrival'], ['Oppenheimer', 'Arrival'], ['Interstellar', 'Arrival'],
      ].map(([a, b]) => ({ from: a, to: b, weight: 1 }));
      const graph = buildGraph(nodes, edges);
      const entities = {
        nodes: Object.fromEntries(nodes.map((n) => [n.id, { name: n.name, year: n.year, c1: n.c1, c2: n.c2 }])),
        edges: {},
        start: 'Inception',
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      const n = ctx.name;
      switch (ev.type) {
        case 'initialize': return { headline: 'Starting from a film you liked', detail: 'BFS will expand through films watched by the same people.' };
        case 'dequeue': return { headline: `Exploring ${n(ev.node)}`, detail: 'Its related films are checked next.' };
        case 'discover-node': return { headline: `Suggested: ${n(ev.node)}`, detail: 'A related film found at this distance.' };
        case 'complete': return { headline: 'Recommendations ready', detail: 'The rings show how closely each film is related to your starting film.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      return [
        { label: 'Related films', value: `${(r.discoveredOrder || r.visitOrder || []).length - 1} / 7` },
        { label: 'Max relation depth', value: r.maxLevel != null ? `${r.maxLevel} links` : '—' },
      ];
    },
    resultText(r) {
      const order = (r.discoveredOrder || r.visitOrder || []).slice(1);
      return [`Because you watched Inception:`, ...order.map((m) => `• ${m}`)];
    },
    renderer: 'movie',
  }),

  scenario({
    id: 'power-grid', domain: 'Infrastructure', icon: 'fa-bolt', title: 'Power Grid Design',
    dataLabel: 'realistic-simulation',
    problemHeading: 'Connect every town to the grid at minimum cost',
    problemText: 'Design a transmission network from the substation to 8 towns, minimizing total construction cost.',
    algorithms: ['kruskal', 'prim'], defaultAlgorithm: 'kruskal',
    whyGraph: {
      vertices: 'Substation + towns',
      edges: 'Possible transmission lines',
      weights: 'Construction cost ($M)',
      whyAlgorithm: 'This is a Minimum Spanning Tree: connect everyone at minimum total cost with no redundant lines.',
    },
    build() {
      const nodes = [
        { id: 'SUB', label: 'SUB', x: 0, y: 0, name: 'Substation', kind: 'substation' },
        { id: 'T1', label: 'T1', x: -240, y: -160, name: 'Greenfield', kind: 'town' },
        { id: 'T2', label: 'T2', x: 60, y: -240, name: 'Riverside', kind: 'town' },
        { id: 'T3', label: 'T3', x: 280, y: -120, name: 'Hilltop', kind: 'town' },
        { id: 'T4', label: 'T4', x: 300, y: 120, name: 'Eastvale', kind: 'town' },
        { id: 'T5', label: 'T5', x: 120, y: 260, name: 'Southgate', kind: 'town' },
        { id: 'T6', label: 'T6', x: -180, y: 240, name: 'Westfield', kind: 'town' },
        { id: 'T7', label: 'T7', x: -320, y: 60, name: 'Northwood', kind: 'town' },
        { id: 'T8', label: 'T8', x: -80, y: 40, name: 'Midtown', kind: 'town' },
      ];
      const edges = [
        { from: 'SUB', to: 'T1', weight: 8 }, { from: 'SUB', to: 'T2', weight: 9 }, { from: 'SUB', to: 'T3', weight: 11 },
        { from: 'SUB', to: 'T7', weight: 7 }, { from: 'SUB', to: 'T8', weight: 5 },
        { from: 'T1', to: 'T7', weight: 6 }, { from: 'T1', to: 'T8', weight: 7 }, { from: 'T2', to: 'T8', weight: 6 },
        { from: 'T2', to: 'T3', weight: 10 }, { from: 'T3', to: 'T4', weight: 8 }, { from: 'T4', to: 'T5', weight: 9 },
        { from: 'T5', to: 'T6', weight: 7 }, { from: 'T6', to: 'T7', weight: 10 }, { from: 'T6', to: 'T8', weight: 9 },
        { from: 'T4', to: 'T8', weight: 12 },
      ];
      const graph = buildGraph(nodes, edges);
      const entities = {
        nodes: Object.fromEntries(nodes.map((n) => [n.id, { name: n.name, kind: n.kind }])),
        edges: {},
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      const n = ctx.name;
      switch (ev.type) {
        case 'initialize': return { headline: 'Planning the grid', detail: 'Candidate lines are ranked by cost; each town starts disconnected.' };
        case 'inspect-edge': return { headline: 'Evaluating a line', detail: `Line ${n(ev.from)} – ${n(ev.to)} ($${fmt(ev.weight)}M) is the cheapest remaining candidate.` };
        case 'accept-edge': return { headline: `Energizing: ${n(ev.from)} ⇄ ${n(ev.to)}`, detail: 'The two areas are in different grid segments, so this line safely connects them.' };
        case 'reject-edge': return { headline: `Skipping line: ${n(ev.from)} ⇄ ${n(ev.to)}`, detail: 'Already connected through the grid — a redundant line would be wasted cost.' };
        case 'complete': return { headline: 'Grid complete', detail: 'Every town is energized at minimum total cost.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      return [
        { label: 'Total cost', value: r.mstCost != null ? `$${fmt(r.mstCost)}M` : '—' },
        { label: 'Lines built', value: r.mstEdges ? String(r.mstEdges.length) : '—' },
        { label: 'Redundant skipped', value: r.rejectedCount != null ? String(r.rejectedCount) : '—' },
      ];
    },
    resultText(r) {
      return [`Grid complete: ${r.mstEdges.length} transmission lines.`, `Total cost: $${fmt(r.mstCost)}M`, `${r.rejectedCount} redundant lines skipped.`];
    },
    renderer: 'power',
  }),

  scenario({
    id: 'maze-escape', domain: 'Games', icon: 'fa-ghost', title: 'Maze Escape',
    dataLabel: 'educational-model',
    problemHeading: 'Find the shortest way out of the maze',
    problemText: 'A classic BFS demo: every corridor step costs 1, so BFS finds the fewest-steps escape route.',
    algorithms: ['bfs', 'dfs'], defaultAlgorithm: 'bfs',
    whyGraph: {
      vertices: 'Corridor cells',
      edges: 'Adjacent open cells',
      weights: '1 per step',
      whyAlgorithm: 'BFS is optimal for unweighted grids — the first time it reaches the exit is the shortest path.',
    },
    build() {
      const MAZE = ['S.#...#..', '.#.#.#.#.', '.#...#...', '.###.#.#.', '...#.#...', '.#.#.###.', '.#...#...', '.###.#.#.', '.....T...'];
      const nodes = [];
      const walls = [];
      const edges = [];
      const cell = {};
      let start = null;
      let target = null;
      const scale = 62;
      const H = MAZE.length;
      const W = Math.max(...MAZE.map((r) => r.length));
      MAZE.forEach((row, r) => {
        [...row].forEach((ch, c) => {
          const x = (c - (W - 1) / 2) * scale;
          const y = (r - (H - 1) / 2) * scale;
          if (ch === '#') { walls.push({ x, y }); return; }
          const id = `${r},${c}`;
          nodes.push({ id, label: id, x, y });
          cell[id] = true;
          if (ch === 'S') start = id;
          if (ch === 'T') target = id;
        });
      });
      const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      MAZE.forEach((row, r) => {
        [...row].forEach((ch, c) => {
          if (ch === '#') return;
          const id = `${r},${c}`;
          for (const [dr, dc] of dirs) {
            const nid = `${r + dr},${c + dc}`;
            if (cell[nid]) edges.push({ from: id, to: nid, weight: 1 });
          }
        });
      });
      const graph = buildGraph(nodes, edges);
      const entities = {
        nodes: Object.fromEntries(nodes.map((n) => [n.id, { name: n.id, wall: false }])),
        walls,
        edges: {},
        start,
        target,
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      switch (ev.type) {
        case 'initialize': return { headline: 'BFS starts at the entrance', detail: 'The wavefront expands one step at a time in every direction.' };
        case 'dequeue': return { headline: 'Wavefront reaches a corridor', detail: 'This cell is explored; its neighbours are queued.' };
        case 'discover-node': return { headline: 'New corridor discovered', detail: 'A neighbouring cell is added to the frontier.' };
        case 'complete': return { headline: 'Escape route found', detail: 'BFS guarantees this is the shortest path (fewest steps).' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      return [
        { label: 'Steps to exit', value: r.maxLevel != null ? String(r.maxLevel) : '—' },
        { label: 'Cells explored', value: String((r.discoveredOrder || r.visitOrder || []).length) },
      ];
    },
    resultText(r) {
      return [`Shortest escape route: ${(r.visitOrder || []).join(' → ')}`, `${r.maxLevel} steps to the exit.`];
    },
    renderer: 'maze',
  }),

  scenario({
    id: 'radio-frequencies', domain: 'Telecom', icon: 'fa-tower-broadcast', title: 'Radio Frequencies',
    dataLabel: 'educational-model',
    problemHeading: 'Assign 2 frequencies so neighbours never clash',
    problemText: 'Neighbouring towers must use different frequencies. Is 2 enough — i.e., is the interference graph bipartite?',
    algorithms: ['bipartite', 'cycle-detection'], defaultAlgorithm: 'bipartite',
    whyGraph: {
      vertices: 'Radio towers',
      edges: 'Too close — would interfere',
      weights: '—',
      whyAlgorithm: '2-coloring a graph is exactly bipartite detection. If it succeeds, two frequencies suffice; an odd cycle means it is impossible.',
    },
    build() {
      // Two tower clusters; interference only between the two clusters,
      // which makes the graph bipartite by construction.
      const ys = [-260, -120, 20, 160, 300];
      const L = ys.map((y, i) => ({ id: 'L' + i, label: 'L' + i, x: -330, y, name: 'Tower L' + i }));
      const R = ys.map((y, i) => ({ id: 'R' + i, label: 'R' + i, x: 330, y, name: 'Tower R' + i }));
      const nodes = [...L, ...R];
      const edges = [];
      for (let i = 0; i < 5; i++) {
        edges.push({ from: 'L' + i, to: 'R' + i, weight: 1 });
        if (i + 1 < 5) { edges.push({ from: 'L' + i, to: 'R' + (i + 1), weight: 1 }); edges.push({ from: 'R' + i, to: 'L' + (i + 1), weight: 1 }); }
      }
      const graph = buildGraph(nodes, edges);
      const entities = {
        nodes: Object.fromEntries(nodes.map((n) => [n.id, { name: n.name }])),
        edges: {},
      };
      return { graph, entities };
    },
    narrate(ev, ctx) {
      switch (ev.type) {
        case 'initialize': return { headline: 'Assigning frequencies', detail: 'Tower A1 gets frequency A; its neighbours must use B.' };
        case 'color': return { headline: `Tower ${ev.node} → frequency ${ev.message.match(/← (\d)/)?.[1]}`, detail: 'Assigned the opposite frequency of its already-coloured neighbour.' };
        case 'conflict': return { headline: 'INTERFERENCE!', detail: 'Two neighbouring towers would share a frequency — an odd cycle means 2 frequencies are not enough.' };
        case 'complete': return { headline: 'Assignment done', detail: 'Each tower shows its frequency (A or B); conflicts are highlighted red.' };
        default: return null;
      }
    },
    metrics(state, trace) {
      const r = trace.result || {};
      return [
        { label: 'Feasible with 2?', value: r.isBipartite ? 'YES' : 'NO' },
        { label: 'Towers', value: '10' },
      ];
    },
    resultText(r) {
      return r.isBipartite
        ? ['2 frequencies are enough — the interference graph is bipartite.', 'Each tower got frequency A or B.']
        : ['NOT possible with 2 frequencies.', 'An odd interference cycle forces at least 3 frequencies.'];
    },
    renderer: 'towers',
  }),
];
export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id) || null;
}

export function scenariosForAlgorithm(algorithmId) {
  return SCENARIOS.filter((s) => s.algorithms.includes(algorithmId));
}

// helper: resolve an edge id from endpoint node ids
function idFor(graph, from, to) {
  for (const e of graph.getEdges()) {
    if (e.from === from && e.to === to) return e.id;
  }
  return null;
}

// helper: longest-path semester assignment for course planning
function maxSemester(order, nodes, edges) {
  const sem = {};
  const idx = {};
  order.forEach((id, i) => { idx[id] = i; });
  for (const n of nodes) sem[n.id] = 1;
  for (const e of edges) {
    sem[e.to] = Math.max(sem[e.to], (sem[e.from] || 1) + 1);
  }
  return Math.max(1, ...Object.values(sem));
}
