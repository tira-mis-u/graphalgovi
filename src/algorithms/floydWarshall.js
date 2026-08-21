import { TraceBuilder, fmt } from './common.js';

/**
 * Floyd-Warshall — all-pairs shortest paths (dynamic programming).
 * dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]) for each k.
 * Emits a matrix update event for every improvement.
 */
export default function floydWarshall(graph, { start = null, target = null } = {}) {
  const tb = new TraceBuilder({ algorithm: 'floyd-warshall', graph });
  const st = tb.state;

  const ids = graph.getNodes().map((n) => n.id);
  const n = ids.length;
  if (n === 0) throw new Error('Floyd-Warshall: the graph is empty.');

  // Initialize distance matrix.
  const idx = {};
  ids.forEach((id, i) => { idx[id] = i; });
  const dist = [];
  for (let i = 0; i < n; i++) {
    dist[i] = [];
    for (let j = 0; j < n; j++) dist[i][j] = i === j ? 0 : Infinity;
  }
  for (const e of graph.getEdges()) {
    const i = idx[e.from];
    const j = idx[e.to];
    if (i == null || j == null) continue;
    if (e.weight < dist[i][j]) dist[i][j] = e.weight;
    if (!e.directed && e.weight < dist[j][i]) dist[j][i] = e.weight;
  }

  let curK = null;
  let curI = null;
  let curJ = null;
  let lastUpdated = false;

  const panel = () => ({
    ids: [...ids],
    matrix: dist.map((row) => [...row]),
    k: curK,
    i: curI,
    j: curJ,
    lastUpdated,
  });

  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: 'initialize dist[i][j] from edge weights (0 on diagonal, ∞ otherwise)' });

  for (let k = 0; k < n; k++) {
    curK = ids[k];
    st.panel = panel();
    tb.emit({ type: 'k-phase', line: 2, message: `k = ${curK}: allow ${curK} as an intermediate vertex` });

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] === Infinity || dist[k][j] === Infinity) continue;
        const via = dist[i][k] + dist[k][j];
        if (via < dist[i][j]) {
          const old = dist[i][j];
          curI = ids[i];
          curJ = ids[j];
          lastUpdated = true;
          dist[i][j] = via;
          st.panel = panel();
          tb.emit({
            type: 'update-cell',
            line: 3,
            message: `dist[${ids[i]}][${ids[j]}]: ${fmt(old)} → ${fmt(dist[i][k])} + ${fmt(dist[k][j])} = ${fmt(via)} via ${curK}`,
          });
        }
      }
    }
    lastUpdated = false;
  }

  // Negative cycle: any dist[i][i] < 0.
  let hasNegCycle = false;
  for (let i = 0; i < n; i++) if (dist[i][i] < 0) hasNegCycle = true;

  st.panel = panel();
  const result = {
    message: hasNegCycle ? 'NEGATIVE CYCLE DETECTED (dist[i][i] < 0).' : `All-pairs shortest paths computed (${n}×${n} matrix).`,
    matrix: dist.map((row) => [...row]),
    ids: [...ids],
    hasNegCycle,
  };
  return tb.finalize(result);
}
