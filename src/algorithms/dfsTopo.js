import { TraceBuilder } from './common.js';

/**
 * DFS-based Topological Sort — post-order DFS; the reversed finish order is a
 * valid topological order. A back edge reveals a cycle (order impossible).
 */
export default function dfsTopo(graph, { start = null } = {}) {
  if (!graph.directed) {
    throw new Error('Topological sort requires a DIRECTED graph.');
  }
  const tb = new TraceBuilder({ algorithm: 'dfs-topo', graph });
  const st = tb.state;

  const color = {};
  const finishOrder = [];
  const stack = [];
  let hasCycle = false;

  const panel = () => ({ color: { ...color }, stack: [...stack], order: [...finishOrder].reverse(), hasCycle });

  function dfs(u) {
    color[u] = 1;
    stack.push(u);
    st.nodes[u].status = 'current';
    st.nodes[u].extra = 'gray';
    st.panel = panel();
    tb.emit({ type: 'recurse', line: 2, message: `DFS(${u}) — mark GRAY` });

    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (hasCycle) return;
      st.inspecting = { from: u, to: v };
      if (color[v] === 1) {
        hasCycle = true;
        st.edges[edge].status = 'cycle';
        st.panel = panel();
        tb.emit({
          type: 'back-edge',
          from: u,
          to: v,
          line: 3,
          message: `CYCLE: ${u} → ${v} is a back edge (GRAY node on the stack)`,
        });
        return;
      } else if (color[v] === 2) {
        st.edges[edge].status = 'seen';
        st.panel = panel();
        tb.emit({ type: 'skip', line: 3, message: `${v} already finished — skip` });
      } else {
        st.edges[edge].status = 'tree';
        st.panel = panel();
        tb.emit({ type: 'inspect', line: 3, message: `${v} unvisited → recurse` });
        dfs(v);
      }
      st.inspecting = null;
    }

    color[u] = 2;
    stack.pop();
    finishOrder.push(u);
    st.nodes[u].status = 'visited';
    st.nodes[u].extra = 'black';
    st.panel = panel();
    tb.emit({ type: 'finish', line: 4, message: `finish ${u} → push to finish order` });
  }

  for (const n of graph.getNodes()) {
    if (hasCycle) break;
    if (!color[n.id]) dfs(n.id);
  }

  const order = [...finishOrder].reverse();
  st.panel = panel();
  const result = {
    message: hasCycle ? 'CYCLE DETECTED — no topological order exists.' : `Topological order: ${order.join(' → ')}`,
    order,
    hasCycle,
  };
  return tb.finalize(result);
}
