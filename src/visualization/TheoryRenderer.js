import { COLORS } from './AlgorithmRenderer.js';

/**
 * TheoryRenderer — renders the GRAPH THEORY panel for a scenario, including
 * mini-diagrams that share the same visual language as the main graph
 * (same node/edge colors, drawn as inline SVG).
 */

const NC = COLORS.unvisitedStroke;
const NF = COLORS.unvisitedFill;
const NS = COLORS.currentStroke;
const EC = COLORS.edge;
const EA = COLORS.edgeActive;
const TC = COLORS.label;

function node(cx, cy, r = 8, label = '', color = NF, stroke = NC) {
  const txt = label
    ? `<text x="${cx}" y="${cy + r + 12}" text-anchor="middle" fill="${TC}" font-size="10" font-family="'IBM Plex Mono', monospace">${label}</text>`
    : '';
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="${stroke}" stroke-width="1.4"/>${txt}`;
}

function line(x1, y1, x2, y2, color = EC, dashed = false) {
  const dash = dashed ? ' stroke-dasharray="3 3"' : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.6"${dash}/>`;
}

function arrow(x1, y1, x2, y2, color = EA) {
  return `${line(x1, y1, x2, y2, color)}${head(x1, y1, x2, y2, color)}`;
}

function head(x1, y1, x2, y2, color) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const h = 6;
  const s = 0.45;
  const px = x2;
  const py = y2;
  const p1 = `${px - h * Math.cos(ang - s)},${py - h * Math.sin(ang - s)}`;
  const p2 = `${px - h * Math.cos(ang + s)},${py - h * Math.sin(ang + s)}`;
  return `<polygon points="${px},${py} ${p1} ${p2}" fill="${color}"/>`;
}

const DIAGRAMS = {
  // A ───── B  (undirected)
  edge: (d) => `
    ${line(30, 26, 96, 26)}
    ${node(30, 26, 9, 'A')}
    ${node(96, 26, 9, 'B')}
  `,

  // A ─────→ B (directed)
  'edge-directed': (d) => `
    ${arrow(30, 26, 96, 26)}
    ${node(30, 26, 9, 'A')}
    ${node(96, 26, 9, 'B')}
  `,

  // star (centre with 3 satellites)
  star: () => `
    ${line(63, 30, 20, 12)}
    ${line(63, 30, 20, 48)}
    ${line(63, 30, 106, 48)}
    ${node(63, 30, 9, 'An', NS, NS)}
    ${node(20, 12, 7, 'Bình')}
    ${node(20, 48, 7, 'Chi')}
    ${node(106, 48, 7, 'Tuấn')}
  `,

  // Folder ├─ File └─ Folder (hierarchy)
  tree: () => `
    ${line(30, 26, 60, 26)}
    ${line(60, 26, 60, 12)}
    ${line(60, 12, 96, 12)}
    ${line(60, 26, 60, 44)}
    ${line(60, 44, 96, 44)}
    ${node(30, 26, 9, 'Folder', NS, NS)}
    ${node(96, 12, 7, 'File')}
    ${node(96, 44, 7, 'Folder')}
  `,

  // deeper tree: Project → src → algorithms
  tree2: () => `
    ${line(24, 30, 48, 30)}
    ${line(48, 30, 48, 16)}
    ${line(48, 16, 78, 16)}
    ${line(48, 30, 48, 46)}
    ${line(48, 46, 78, 46)}
    ${line(78, 16, 78, 8)}
    ${line(78, 8, 108, 8)}
    ${node(24, 30, 8, 'Project', NS, NS)}
    ${node(78, 16, 6, 'src')}
    ${node(108, 8, 6, 'algorithms')}
    ${node(78, 46, 6, 'assets')}
  `,

  // A → B → C (directed path)
  path: () => `
    ${arrow(26, 26, 60, 26)}
    ${arrow(66, 26, 100, 26)}
    ${node(26, 26, 9, 'A')}
    ${node(63, 26, 9, 'B')}
    ${node(100, 26, 9, 'C')}
  `,

  // A → B → C → A (cycle)
  cycle: () => {
    const c1 = [63, 16];
    const c2 = [22, 52];
    const c3 = [104, 52];
    return `
      ${arrow(c1[0], c1[1], c2[0], c2[1])}
      ${arrow(c2[0], c2[1], c3[0], c3[1])}
      ${arrow(c3[0], c3[1], c1[0], c1[1])}
      ${node(c1[0], c1[1], 9, 'A')}
      ${node(c2[0], c2[1], 9, 'B')}
      ${node(c3[0], c3[1], 9, 'C')}
    `;
  },
};

function diagramSVG(spec) {
  const kind = spec.directed ? 'edge-directed' : spec.kind;
  const inner = DIAGRAMS[kind] ? DIAGRAMS[kind](spec) : DIAGRAMS.edge(spec);
  return `<svg class="mini-diagram" width="128" height="66" viewBox="0 0 128 66" aria-hidden="true">${inner}</svg>`;
}

/**
 * @param {object} scenario
 * @returns {string} HTML
 */
export function renderGraphTheory(scenario) {
  const items = (scenario.graphTheory || [])
    .map((it) => {
      const diagram = it.diagram ? diagramSVG(it.diagram) : '';
      return `
        <div class="theory-item">
          <div class="theory-head">
            <span class="theory-term">${it.term}</span>
          </div>
          ${diagram}
          <p class="theory-def">${it.def}</p>
        </div>`;
    })
    .join('');
  return items;
}
