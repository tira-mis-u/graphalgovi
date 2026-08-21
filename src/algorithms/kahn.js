import { TraceBuilder } from './common.js';

/**
 * Kahn's Algorithm — topological order via in-degree elimination.
 * Works on directed acyclic graphs; if nodes remain with in-degree > 0 at the
 * end, the graph contains a cycle.
 */
export default function kahn(graph, { start = null } = {}) {
  if (!graph.directed) {
    throw new Error('Topological sort requires a DIRECTED graph (edges must have an order).');
  }
  const tb = new TraceBuilder({ algorithm: 'kahn', graph });
  const st = tb.state;

  const indegree = {};
  for (const n of graph.getNodes()) indegree[n.id] = 0;
  for (const e of graph.getEdges()) {
    if (indegree[e.to] != null) indegree[e.to] += 1;
  }

  const queue = [];
  for (const n of graph.getNodes()) {
    if (indegree[n.id] === 0) {
      queue.push(n.id);
      st.nodes[n.id].extra = 'in=0';
    } else {
      st.nodes[n.id].extra = `in=${indegree[n.id]}`;
    }
  }

  const order = [];

  const panel = () => ({ indegree: { ...indegree }, queue: [...queue], order: [...order] });

  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: 'compute in-degrees; enqueue all nodes with in-degree 0' });

  while (queue.length > 0) {
    const u = queue.shift();
    order.push(u);
    st.currentNode = u;
    st.nodes[u].status = 'current';
    st.panel = panel();
    tb.emit({ type: 'dequeue', node: u, line: 3, message: `remove ${u} (in-degree 0) → append to order` });

    for (const { node: v, edge } of graph.getNeighbors(u)) {
      indegree[v] -= 1;
      st.nodes[v].extra = `in=${indegree[v]}`;
      st.inspecting = { from: u, to: v };
      st.edges[edge].status = 'active';
      st.panel = panel();
      tb.emit({ type: 'decrement', from: u, to: v, line: 4, message: `remove edge ${u} → ${v}: in-degree[${v}] → ${indegree[v]}` });
      if (indegree[v] === 0) {
        queue.push(v);
        st.panel = panel();
        tb.emit({ type: 'enqueue', node: v, line: 5, message: `in-degree[${v}] = 0 → enqueue ${v}` });
      }
      st.inspecting = null;
    }
    st.nodes[u].status = 'visited';
    st.panel = panel();
  }

  const remaining = graph.getNodes().filter((n) => indegree[n.id] > 0).map((n) => n.id);
  const hasCycle = remaining.length > 0;
  if (hasCycle) {
    for (const id of remaining) st.nodes[id].status = 'conflict';
  } else {
    for (const id of order) st.nodes[id].status = 'visited';
  }

  st.panel = panel();
  const result = {
    message: hasCycle
      ? 'CYCLE DETECTED — a topological order is impossible.'
      : `Build order: ${order.join(' → ')}`,
    order,
    hasCycle,
    remaining,
  };
  return tb.finalize(result);
}
