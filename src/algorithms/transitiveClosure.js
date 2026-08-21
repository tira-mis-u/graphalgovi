import { TraceBuilder } from './common.js';

/**
 * Transitive Closure — all-pairs reachability (Warshall's algorithm).
 * reach[i][j] |= reach[i][k] && reach[k][j], for each intermediate k.
 * Matrix cells are 1 (reachable) / 0 (not reachable).
 */
export default function transitiveClosure(graph, { start = null } = {}) {
  const tb = new TraceBuilder({ algorithm: 'transitive-closure', graph });
  const st = tb.state;

  const ids = graph.getNodes().map((n) => n.id);
  const n = ids.length;
  if (n === 0) throw new Error('Transitive closure: empty graph.');
  const idx = {};
  ids.forEach((id, i) => { idx[id] = i; });

  const reach = [];
  for (let i = 0; i < n; i++) {
    reach[i] = [];
    for (let j = 0; j < n; j++) reach[i][j] = i === j ? 1 : 0;
  }
  for (const e of graph.getEdges()) {
    if (idx[e.from] == null || idx[e.to] == null) continue;
    reach[idx[e.from]][idx[e.to]] = 1;
    if (!e.directed) reach[idx[e.to]][idx[e.from]] = 1;
  }

  let curK = null;
  const panel = () => ({
    ids: [...ids],
    matrix: reach.map((row) => [...row]),
    k: curK,
  });

  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: 'reach[i][j] = 1 if an edge i→j exists (diagonal = 1)' });

  for (let k = 0; k < n; k++) {
    curK = ids[k];
    st.panel = panel();
    tb.emit({ type: 'k-phase', line: 2, message: `allow ${curK} as an intermediate node` });
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (!reach[i][j] && reach[i][k] && reach[k][j]) {
          reach[i][j] = 1;
          st.panel = panel();
          tb.emit({
            type: 'update-cell',
            line: 3,
            message: `reach[${ids[i]}][${ids[j]}] = 1 via ${curK}`,
          });
        }
      }
    }
  }

  st.panel = panel();
  const result = {
    message: 'Reachability matrix computed.',
    matrix: reach.map((row) => [...row]),
    ids: [...ids],
  };
  return tb.finalize(result);
}
