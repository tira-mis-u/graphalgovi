/**
 * Graph Generator — seeded, reproducible random graphs plus structured
 * layouts (grid, tree, DAG). Used by GENERATE GRAPH and BENCHMARK.
 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function circleLayout(n) {
  const nodes = [];
  const R = 320;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
    nodes.push({ id: `N${i}`, label: `N${i}`, x: Math.round(R * Math.cos(ang)), y: Math.round(R * Math.sin(ang)) });
  }
  return nodes;
}

/**
 * @param {object} opts
 * @param {'random'|'grid'|'tree'|'dag'} opts.type
 * @param {number} opts.n number of nodes
 * @param {number} opts.density edge probability (random only)
 * @param {boolean} opts.weighted
 * @param {boolean} opts.directed
 * @param {number} opts.wMin
 * @param {number} opts.wMax
 * @param {number} opts.seed
 */
export function generateGraph(opts = {}) {
  const type = opts.type || 'random';
  const n = Math.max(2, Math.min(30, opts.n || 8));
  const density = Math.max(0.05, Math.min(1, opts.density != null ? opts.density : 0.25));
  const weighted = !!opts.weighted;
  const directed = !!opts.directed;
  const wMin = opts.wMin != null ? opts.wMin : 1;
  const wMax = opts.wMax != null ? opts.wMax : 9;
  const seed = opts.seed != null ? opts.seed : 12345;
  const rand = mulberry32(seed);

  const W = () => weighted ? (wMin + Math.floor(rand() * (wMax - wMin + 1))) : 1;

  let nodes;
  const edges = [];
  const add = (from, to) => edges.push({ from, to, weight: W(), directed });

  if (type === 'grid') {
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    nodes = [];
    const scale = 90;
    let k = 0;
    for (let r = 0; r < rows && k < n; r++) {
      for (let c = 0; c < cols && k < n; c++) {
        nodes.push({ id: `N${k}`, label: `N${k}`, x: (c - (cols - 1) / 2) * scale, y: (r - (rows - 1) / 2) * scale });
        k++;
      }
    }
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const right = i + 1;
      if (c + 1 < cols && right < n) add(`N${i}`, `N${right}`);
      const down = i + cols;
      if (down < n) add(`N${i}`, `N${down}`);
    }
  } else if (type === 'tree') {
    nodes = circleLayout(n);
    for (let i = 1; i < n; i++) {
      const parent = Math.floor(rand() * i);
      add(`N${i}`, `N${parent}`);
    }
  } else if (type === 'dag') {
    // layered layout: edges only point "down"
    nodes = circleLayout(n);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (rand() < density * 1.4) add(`N${i}`, `N${j}`);
      }
      // ensure connectivity-ish
      if (i + 1 < n && !edges.some((e) => e.from === `N${i}` && e.to === `N${i + 1}`) && rand() < 0.8) {
        add(`N${i}`, `N${i + 1}`);
      }
    }
  } else {
    // random
    nodes = circleLayout(n);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (rand() < density) add(`N${i}`, `N${j}`);
      }
    }
    // guarantee at least one edge if possible
    if (edges.length === 0 && n > 1) add('N0', 'N1');
  }

  return { nodes, edges, directed, weighted, seed, type };
}

export { mulberry32 };
