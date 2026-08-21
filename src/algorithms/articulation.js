import { TraceBuilder } from './common.js';

/**
 * Articulation Points — vertices whose removal increases the number of
 * connected components. DFS low-link conditions:
 *   root:  ≥ 2 tree children
 *   others: low[v] ≥ tin[u]
 */
export default function articulation(graph, { start = null } = {}) {
  if (graph.directed) {
    throw new Error('Articulation-point detection (as implemented) targets UNDIRECTED graphs.');
  }
  const tb = new TraceBuilder({ algorithm: 'articulation', graph });
  const st = tb.state;

  const tin = {};
  const low = {};
  const visited = new Set();
  const aps = new Set();
  let timer = 0;

  const panel = () => ({
    tin: { ...tin },
    low: { ...low },
    aps: [...aps],
  });

  function dfs(u, parent, isRoot) {
    visited.add(u);
    tin[u] = low[u] = ++timer;
    let children = 0;
    st.nodes[u].status = 'current';
    st.nodes[u].extra = `t=${tin[u]} l=${low[u]}`;
    st.panel = panel();
    tb.emit({ type: 'visit', line: 2, message: `visit ${u}: tin = low = ${tin[u]}` });

    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (v === parent) continue;
      st.inspecting = { from: u, to: v };
      if (!visited.has(v)) {
        children += 1;
        st.edges[edge].status = 'tree';
        st.panel = panel();
        tb.emit({ type: 'tree-edge', line: 3, message: `${u} → ${v} unvisited — recurse` });
        dfs(v, u, false);
        low[u] = Math.min(low[u], low[v]);
        st.panel = panel();
        tb.emit({ type: 'update-low', line: 4, message: `low[${u}] = min(${low[u]}, low[${v}]) = ${low[u]}` });

        if (isRoot && children > 1) {
          aps.add(u);
          st.nodes[u].status = 'articulation';
          st.panel = panel();
          tb.emit({
            type: 'ap-found',
            node: u,
            line: 5,
            message: `ARTICULATION POINT: ${u} (root with ${children} tree children)`,
            why: 'The DFS root is an articulation point when it has more than one tree child — removing it separates those subtrees.',
          });
        } else if (!isRoot && low[v] >= tin[u]) {
          aps.add(u);
          st.nodes[u].status = 'articulation';
          st.panel = panel();
          tb.emit({
            type: 'ap-found',
            node: u,
            line: 5,
            message: `ARTICULATION POINT: ${u} (low[${v}] = ${low[v]} ≥ tin[${u}] = ${tin[u]})`,
            why: `${v}'s subtree has no back edge above ${u}, so removing ${u} disconnects it.`,
          });
        } else {
          st.edges[edge].status = 'seen';
        }
      } else {
        low[u] = Math.min(low[u], tin[v]);
        st.edges[edge].status = 'cycle';
        st.panel = panel();
        tb.emit({ type: 'back-edge', line: 4, message: `back edge ${u}–${v}: low[${u}] = min(low[${u}], tin[${v}]) = ${low[u]}` });
      }
      st.inspecting = null;
    }
    st.nodes[u].status = aps.has(u) ? 'articulation' : 'visited';
    st.panel = panel();
    tb.emit({ type: 'finish', line: 2, message: `finish ${u}: low = ${low[u]}` });
  }

  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: 'DFS with discovery time and low-link values' });

  for (const n of graph.getNodes()) {
    if (!visited.has(n.id)) dfs(n.id, null, true);
  }

  st.panel = panel();
  const result = {
    message: aps.size
      ? `${aps.size} articulation point(s): ${[...aps].join(', ')}`
      : 'No articulation points — the graph is 2-vertex-connected.',
    articulationPoints: [...aps],
  };
  return tb.finalize(result);
}
