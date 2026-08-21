/**
 * AlgorithmRenderer — maps execution/interaction state to pure STYLE
 * descriptors (colors, radii, widths, labels). No canvas code.
 *
 * Handles BOTH the legacy BFS/DFS state shape and the universal snapshot
 * shape (state.nodes / state.edges) used by every other algorithm.
 */

export const NODE_RADIUS = 20;

export const COLORS = {
  bg: '#0f1115',
  grid: 'rgba(255,255,255,0.035)',
  unvisitedFill: '#161b26',
  unvisitedStroke: '#3a4256',
  discoveredFill: '#24344f',
  discoveredStroke: '#5b7fb0',
  visitedFill: '#4a7c59',
  visitedStroke: '#79b98f',
  currentFill: '#e89e3b',
  currentStroke: '#f7cd86',
  backtrackFill: '#e87a5d',
  backtrackStroke: '#f2a184',
  pathFill: '#1d3a44',
  pathStroke: '#55c4dd',
  sourceStroke: '#55c4dd',
  sinkFill: '#3b2326',
  sinkStroke: '#e87a5d',
  startRing: '#55c4dd',
  targetRing: '#8f7ae8',
  hover: '#f2f5fa',
  selected: '#ffffff',
  label: '#d7dce6',
  labelDim: '#7c8598',
  edge: '#2b3346',
  edgeTree: '#5f7f6a',
  edgeSeen: '#39465f',
  edgeActive: '#e89e3b',
  edgePath: '#55c4dd',
  edgeRejected: '#7a4b45',
  edgeCycle: '#e87a5d',
  edgeMatched: '#4a7c59',
};

/**
 * Push a theme's visualization palette into the shared COLORS object.
 * nodeStyle/edgeStyle read COLORS at call time, so the abstract graph view
 * re-themes without any other change.
 */
export function applyVizPalette(palette) {
  if (!palette) return;
  Object.assign(COLORS, palette);
}

const COMP_PALETTE = ['#4a7fb0', '#5fa05a', '#b07a4a', '#8f6fb0', '#4ab0a0', '#b0a04a', '#b05a7a', '#5aa08a'];

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const mix = f >= 0 ? 255 : 0; // f>0 → lighten toward white, f<0 → darken toward black
  const t = Math.abs(f);
  r = Math.round(r + (mix - r) * t);
  g = Math.round(g + (mix - g) * t);
  b = Math.round(b + (mix - b) * t);
  return `rgb(${r},${g},${b})`;
}

function groupStyle(extra, status) {
  let m;
  if ((m = /^C([01])$/.exec(extra))) {
    return { fill: m[1] === '0' ? '#24344f' : '#2b3d2e', stroke: m[1] === '0' ? '#5b7fb0' : '#79b98f', group: 'bipartite' };
  }
  if ((m = /^C(\d+)$/.exec(extra))) {
    const c = COMP_PALETTE[(parseInt(m[1], 10) - 1) % COMP_PALETTE.length];
    return { fill: shade(c, -0.72), stroke: c, group: 'component' };
  }
  if ((m = /^SCC(\d+)$/.exec(extra))) {
    const c = COMP_PALETTE[(parseInt(m[1], 10) - 1) % COMP_PALETTE.length];
    return { fill: shade(c, -0.72), stroke: c, group: 'component' };
  }
  if (extra === 'L') return { fill: '#24344f', stroke: '#5b7fb0', group: 'part' };
  if (extra === 'R') return { fill: '#2b3d2e', stroke: '#79b98f', group: 'part' };
  return null;
}

/** Universal (snapshot) node style. */
export function nodeStyleNew(state, nodeId, ui) {
  const rec = (state.nodes && state.nodes[nodeId]) || { status: 'unvisited', extra: '' };
  const status = rec.status;
  let fill = COLORS.unvisitedFill;
  let stroke = COLORS.unvisitedStroke;
  let strokeWidth = 1.5;
  let radius = NODE_RADIUS;

  switch (status) {
    case 'current':
      fill = COLORS.currentFill;
      stroke = COLORS.currentStroke;
      strokeWidth = 2.5;
      radius = NODE_RADIUS + 2;
      break;
    case 'backtrack':
      fill = COLORS.backtrackFill;
      stroke = COLORS.backtrackStroke;
      strokeWidth = 2;
      break;
    case 'discovered':
    case 'open':
      fill = COLORS.discoveredFill;
      stroke = COLORS.discoveredStroke;
      strokeWidth = 1.6;
      break;
    case 'visited':
    case 'settled':
    case 'closed':
      fill = COLORS.visitedFill;
      stroke = COLORS.visitedStroke;
      strokeWidth = 1.8;
      break;
    case 'path':
      fill = COLORS.pathFill;
      stroke = COLORS.pathStroke;
      strokeWidth = 2.4;
      break;
    case 'source':
      fill = COLORS.pathFill;
      stroke = COLORS.sourceStroke;
      strokeWidth = 2.4;
      break;
    case 'sink':
      fill = COLORS.sinkFill;
      stroke = COLORS.sinkStroke;
      strokeWidth = 2.4;
      break;
    case 'articulation':
    case 'conflict':
      fill = COLORS.sinkFill;
      stroke = COLORS.sinkStroke;
      strokeWidth = 2.2;
      break;
    default:
      break;
  }

  if (status !== 'current' && status !== 'backtrack') {
    const gs = groupStyle(rec.extra, status);
    if (gs) {
      fill = gs.fill;
      stroke = gs.stroke;
    }
  }

  const isHover = ui.hovered === nodeId;
  const isSelected = ui.selected === nodeId;
  const isStart = (state.start != null && state.start === nodeId) || ui.startNode === nodeId;
  const isTarget = state.target != null && state.target === nodeId;

  if (isHover && status !== 'current' && status !== 'backtrack') {
    stroke = COLORS.hover;
    strokeWidth = 2;
  }

  return { fill, stroke, strokeWidth, radius, status, extra: rec.extra || '', isHover, isSelected, isStart, isTarget };
}

/** Legacy BFS/DFS node style (unchanged behavior). */
export function nodeStyleLegacy(state, nodeId, ui) {
  const isBFS = state.algorithm === 'BFS';
  const isCurrent = state.currentNode === nodeId;
  const isBacktrack = state.backtrackNode === nodeId;
  let fill = COLORS.unvisitedFill;
  let stroke = COLORS.unvisitedStroke;
  let strokeWidth = 1.5;
  let radius = NODE_RADIUS;
  let status = 'unvisited';

  if (isBacktrack) {
    status = 'backtrack';
    fill = COLORS.backtrackFill;
    stroke = COLORS.backtrackStroke;
    strokeWidth = 2;
  } else if (isCurrent) {
    status = 'current';
    fill = COLORS.currentFill;
    stroke = COLORS.currentStroke;
    strokeWidth = 2.5;
    radius = NODE_RADIUS + 2;
  } else if (isBFS) {
    if (state.processed.includes(nodeId)) {
      status = 'visited';
      fill = COLORS.visitedFill;
      stroke = COLORS.visitedStroke;
    } else if (state.discovered.includes(nodeId)) {
      status = 'discovered';
      fill = COLORS.discoveredFill;
      stroke = COLORS.discoveredStroke;
    }
  } else if (state.discovered.includes(nodeId)) {
    status = 'visited';
    fill = COLORS.visitedFill;
    stroke = COLORS.visitedStroke;
  }

  const isHover = ui.hovered === nodeId;
  const isSelected = ui.selected === nodeId;
  const isStart = ui.startNode === nodeId;

  if (isHover && status !== 'current' && status !== 'backtrack') {
    stroke = COLORS.hover;
    strokeWidth = 2;
  }

  return { fill, stroke, strokeWidth, radius, status, extra: '', isHover, isSelected, isStart, isTarget: false };
}

export function nodeStyle(state, nodeId, ui) {
  if (state && state.nodes) return nodeStyleNew(state, nodeId, ui);
  return nodeStyleLegacy(state, nodeId, ui);
}

/** Universal (snapshot) edge style. */
export function edgeStyleNew(state, edgeId) {
  const rec = (state.edges && state.edges[edgeId]) || { status: 'idle', extra: '' };
  const status = rec.status;
  switch (status) {
    case 'active':
      return { color: COLORS.edgeActive, width: 2.6, status, extra: rec.extra || '', dashed: false };
    case 'path':
      return { color: COLORS.edgePath, width: 2.6, status, extra: rec.extra || '', dashed: false };
    case 'tree':
    case 'matched':
      return { color: status === 'matched' ? COLORS.edgeMatched : COLORS.edgeTree, width: status === 'matched' ? 2.2 : 1.9, status, extra: rec.extra || '', dashed: false };
    case 'rejected':
      return { color: COLORS.edgeRejected, width: 1.6, status, extra: rec.extra || '', dashed: true };
    case 'cycle':
    case 'bridge':
    case 'conflict':
      return { color: COLORS.edgeCycle, width: status === 'bridge' ? 2.8 : 2.2, status, extra: rec.extra || '', dashed: false };
    case 'seen':
      return { color: COLORS.edgeSeen, width: 1.5, status, extra: rec.extra || '', dashed: false };
    default:
      return { color: COLORS.edge, width: 1.4, status: 'idle', extra: rec.extra || '', dashed: false };
  }
}

/** Legacy edge style (BFS/DFS). */
export function edgeStyleLegacy(state, edge, graph) {
  const active = state.inspecting || state.lastEdge;
  if (active && ((active.from === edge.from && active.to === edge.to) ||
      (!edge.directed && active.from === edge.to && active.to === edge.from))) {
    return { color: COLORS.edgeActive, width: 2.6, status: 'active', extra: '', dashed: false };
  }
  if (state.discoveredEdges.includes(edge.id)) {
    return { color: COLORS.edgeTree, width: 1.9, status: 'tree', extra: '', dashed: false };
  }
  const aSeen = state.discovered.includes(edge.from);
  const bSeen = state.discovered.includes(edge.to);
  if (aSeen && bSeen) return { color: COLORS.edgeSeen, width: 1.5, status: 'seen', extra: '', dashed: false };
  return { color: COLORS.edge, width: 1.4, status: 'idle', extra: '', dashed: false };
}

export function edgeStyle(state, edge, graph) {
  if (state && state.edges) return edgeStyleNew(state, edge.id);
  return edgeStyleLegacy(state, edge, graph);
}
