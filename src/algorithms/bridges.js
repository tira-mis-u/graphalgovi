import { TraceBuilder } from './common.js';

/**
 * Bridges — edges whose removal disconnects the graph.
 * DFS with discovery time (tin) and low-link (low).
 * Condition: low[v] > tin[u]  ⇒  edge (u,v) is a bridge.
 */
export default function bridges(graph, { start = null } = {}) {
  if (graph.directed) {
    throw new Error('Bridge-finding (as implemented) targets UNDIRECTED graphs.');
  }
  const tb = new TraceBuilder({ algorithm: 'bridges', graph });
  const st = tb.state;

  const tin = {};
  const low = {};
  const visited = new Set();
  const bridgeEdges = [];
  let timer = 0;

  const panel = () => ({
    tin: { ...tin },
    low: { ...low },
    bridges: [...bridgeEdges],
  });

  function dfs(u, parentEdge) {
    visited.add(u);
    tin[u] = low[u] = ++timer;
    st.nodes[u].status = 'current';
    st.nodes[u].extra = `t=${tin[u]} l=${low[u]}`;
    st.panel = panel();
    tb.emit({ type: 'visit', line: 2, message: `visit ${u}: tin = low = ${tin[u]}` });

    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (edge === parentEdge) continue;
      st.inspecting = { from: u, to: v };
      if (!visited.has(v)) {
        st.edges[edge].status = 'tree';
        st.panel = panel();
        tb.emit({ type: 'tree-edge', line: 3, message: `${u} → ${v} unvisited — recurse` });
        dfs(v, edge);
        low[u] = Math.min(low[u], low[v]);
        st.panel = panel();
        tb.emit({ type: 'update-low', line: 4, message: `low[${u}] = min(${low[u]}, low[${v}]) = ${low[u]}` });

        if (low[v] > tin[u]) {
          bridgeEdges.push(edge);
          st.edges[edge].status = 'bridge';
          st.panel = panel();
          tb.emit({
            type: 'bridge-found',
            from: u,
            to: v,
            line: 5,
            message: `BRIDGE: ${u}–${v}  (low[${v}] = ${low[v]} > tin[${u}] = ${tin[u]})`,
            why: `Removing ${u}–${v} would disconnect ${v}'s subtree: no back edge reaches above ${u}.`,
          });
        } else {
          st.edges[edge].status = 'seen';
          st.panel = panel();
          tb.emit({ type: 'no-bridge', line: 5, message: `${u}–${v}: low[${v}] ≤ tin[${u}] → not a bridge` });
        }
      } else {
        // back edge
        low[u] = Math.min(low[u], tin[v]);
        st.edges[edge].status = 'cycle';
        st.panel = panel();
        tb.emit({ type: 'back-edge', line: 4, message: `back edge ${u}–${v}: low[${u}] = min(low[${u}], tin[${v}]) = ${low[u]}` });
      }
      st.inspecting = null;
    }
    st.nodes[u].status = 'visited';
    st.panel = panel();
    tb.emit({ type: 'finish', line: 2, message: `finish ${u}: low = ${low[u]}` });
  }

  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: 'DFS with discovery time and low-link values' });

  for (const n of graph.getNodes()) {
    if (!visited.has(n.id)) dfs(n.id, null);
  }

  st.panel = panel();
  const result = {
    message: bridgeEdges.length
      ? `${bridgeEdges.length} bridge(s) found.`
      : 'No bridges — the graph is 2-edge-connected.',
    bridges: bridgeEdges,
  };
  return tb.finalize(result);
}
