import { TraceBuilder } from './_common.js';

/**
 * Kosaraju's Algorithm — Strongly Connected Components in two DFS passes:
 *   1. DFS on the original graph recording finish order.
 *   2. DFS on the transposed graph in reverse finish order.
 */
export default function kosaraju(graph, { start = null } = {}) {
  if (!graph.directed) {
    throw new Error('SCC requires a DIRECTED graph.');
  }
  const tb = new TraceBuilder({ algorithm: 'kosaraju', graph });
  const st = tb.state;

  const visited = new Set();
  const finishOrder = [];
  const components = [];

  // --- pass 1 ---
  function dfs1(u) {
    visited.add(u);
    st.nodes[u].status = 'current';
    st.panel = panel();
    tb.emit({ type: 'pass1-visit', line: 1, message: `PASS 1 — DFS visit ${u}` });
    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (!visited.has(v)) {
        st.edges[edge].status = 'tree';
        dfs1(v);
      }
    }
    finishOrder.push(u);
    st.nodes[u].status = 'visited';
    st.panel = panel();
    tb.emit({ type: 'pass1-finish', line: 1, message: `finish ${u} → finish order` });
  }

  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: 'PASS 1: DFS the original graph, record finish order' });
  for (const n of graph.getNodes()) if (!visited.has(n.id)) dfs1(n.id);

  // --- transpose ---
  const transposed = new Map();
  for (const n of graph.getNodes()) transposed.set(n.id, []);
  for (const e of graph.getEdges()) {
    transposed.get(e.to).push({ node: e.from, edge: e.id });
  }
  st.panel = panel();
  tb.emit({ type: 'transpose', line: 2, message: 'transpose the graph (reverse every edge)' });

  // --- pass 2 ---
  const seen2 = new Set();
  let compIndex = 0;

  for (let i = finishOrder.length - 1; i >= 0; i--) {
    const root = finishOrder[i];
    if (seen2.has(root)) continue;
    compIndex += 1;
    const comp = [];
    const stack = [root];
    seen2.add(root);
    while (stack.length) {
      const u = stack.pop();
      comp.push(u);
      st.nodes[u].status = 'current';
      st.nodes[u].extra = `SCC${compIndex}`;
      st.panel = panel();
      tb.emit({ type: 'pass2-visit', line: 3, message: `PASS 2 — collect SCC ${compIndex}: visit ${u}` });
      st.nodes[u].status = 'visited';
      for (const { node: v, edge } of transposed.get(u)) {
        if (!seen2.has(v)) {
          seen2.add(v);
          st.edges[edge].status = 'tree';
          stack.push(v);
        }
      }
    }
    components.push(comp);
    st.panel = panel();
    tb.emit({ type: 'component-found', line: 3, message: `SCC ${compIndex} = { ${comp.join(', ')} }` });
  }

  st.panel = panel();
  const result = {
    message: `${components.length} strongly connected component(s) found.`,
    components,
  };
  return tb.finalize(result);

  function panel() {
    return { finishOrder: [...finishOrder], components: components.map((c) => [...c]) };
  }
}
