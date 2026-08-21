import { TraceBuilder } from './_common.js';

/**
 * Tarjan's SCC — single DFS pass using discovery index and low-link values.
 * When low[u] === index[u], u is the root of an SCC; pop it from the stack.
 */
export default function tarjan(graph, { start = null } = {}) {
  if (!graph.directed) {
    throw new Error('SCC requires a DIRECTED graph.');
  }
  const tb = new TraceBuilder({ algorithm: 'tarjan', graph });
  const st = tb.state;

  const index = {};
  const low = {};
  const onStack = new Set();
  const stack = [];
  const components = [];
  let counter = 0;

  const panel = () => ({
    index: { ...index },
    low: { ...low },
    stack: [...stack],
    components: components.map((c) => [...c]),
  });

  function strongconnect(u) {
    counter += 1;
    index[u] = counter;
    low[u] = counter;
    stack.push(u);
    onStack.add(u);
    st.nodes[u].status = 'current';
    st.nodes[u].extra = `idx=${counter}`;
    st.panel = panel();
    tb.emit({ type: 'discover', line: 2, message: `discover ${u}: index = low = ${counter}, push to stack` });

    for (const { node: v, edge } of graph.getNeighbors(u)) {
      st.inspecting = { from: u, to: v };
      if (index[v] == null) {
        st.edges[edge].status = 'tree';
        st.panel = panel();
        tb.emit({ type: 'tree-edge', line: 3, message: `${u} → ${v} unvisited — recurse` });
        strongconnect(v);
        low[u] = Math.min(low[u], low[v]);
        st.panel = panel();
        tb.emit({ type: 'update-low', line: 4, message: `low[${u}] = min(${low[u]}, low[${v}])` });
      } else if (onStack.has(v)) {
        st.edges[edge].status = 'cycle';
        low[u] = Math.min(low[u], index[v]);
        st.panel = panel();
        tb.emit({ type: 'back-edge', line: 3, message: `${u} → ${v} on the stack → low[${u}] = min(low[${u}], index[${v}]) = ${low[u]}` });
      } else {
        st.edges[edge].status = 'seen';
        st.panel = panel();
        tb.emit({ type: 'cross-edge', line: 3, message: `${u} → ${v} already in another SCC — ignore` });
      }
      st.inspecting = null;
    }

    if (low[u] === index[u]) {
      const comp = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        comp.push(w);
      } while (w !== u);
      components.push(comp);
      st.panel = panel();
      tb.emit({ type: 'scc-found', line: 5, message: `low[${u}] == index[${u}] → pop SCC { ${comp.join(', ')} }` });
    }
    st.nodes[u].status = 'visited';
  }

  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: 'single DFS with index / low-link tracking' });

  for (const n of graph.getNodes()) {
    if (index[n.id] == null) strongconnect(n.id);
  }

  // color components
  components.forEach((comp, ci) => {
    for (const id of comp) st.nodes[id].extra = `SCC${ci + 1}`;
  });

  st.panel = panel();
  const result = {
    message: `${components.length} strongly connected component(s) found.`,
    components,
  };
  return tb.finalize(result);
}
