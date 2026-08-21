import { TraceBuilder, fmt } from './_common.js';

/**
 * Dijkstra — single-source shortest paths with non-negative weights.
 * Maintains a distance table, predecessor map and a priority queue; emits
 * extract-min / relax events and reconstructs the final path to the target.
 */
export default function dijkstra(graph, { start = null, target = null } = {}) {
  if (start != null && !graph.hasNode(String(start))) {
    throw new Error(`Dijkstra: start node "${start}" does not exist.`);
  }
  for (const e of graph.getEdges()) {
    if (e.weight < 0) {
      throw new Error(`Dijkstra requires non-negative edge weights (edge ${e.id} has weight ${e.weight}). Use Bellman-Ford for negative weights.`);
    }
  }
  const s = start != null ? String(start) : graph.getNodes()[0]?.id;
  if (!s || !graph.hasNode(s)) throw new Error('Dijkstra: a valid start node is required.');

  const tb = new TraceBuilder({ algorithm: 'dijkstra', graph, start: s, target });
  const st = tb.state;

  const dist = {};
  const prev = {};
  const settled = new Set();
  const path = [];
  const pq = [];

  for (const n of graph.getNodes()) dist[n.id] = Infinity;
  dist[s] = 0;
  pq.push({ node: s, dist: 0 });
  st.nodes[s].status = 'discovered';
  st.nodes[s].extra = 'd=0';
  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: `dist[${s}] ← 0; push (${s}, 0)` });

  while (pq.length > 0) {
    pq.sort((a, b) => a.dist - b.dist);
    const { node: u } = pq.shift();
    if (settled.has(u)) continue;
    settled.add(u);
    st.currentNode = u;
    st.nodes[u].status = 'current';
    st.panel = panel();
    tb.emit({
      type: 'extract-min',
      node: u,
      line: 2,
      message: `extract-min → ${u} (dist ${fmt(dist[u])})`,
      why: `${u} has the smallest tentative distance among unsettled nodes, so its distance is final.`,
    });
    st.nodes[u].status = 'settled';
    st.panel = panel();
    tb.emit({ type: 'settle', node: u, line: 2, message: `settle ${u} — dist[${u}] = ${fmt(dist[u])} is final` });

    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (settled.has(v)) {
        st.inspecting = { from: u, to: v };
        st.edges[edge].status = 'seen';
        st.panel = panel();
        tb.emit({ type: 'inspect-edge', from: u, to: v, line: 3, message: `${v} already settled — skip` });
        st.inspecting = null;
        continue;
      }
      const wt = graph.getEdge(edge).weight;
      const cand = dist[u] + wt;
      const old = dist[v];
      st.inspecting = { from: u, to: v };
      st.edges[edge].status = 'active';
      st.panel = panel();
      tb.emit({
        type: 'inspect-edge',
        from: u,
        to: v,
        line: 3,
        message: `relax ${u} → ${v}: dist[${u}] + ${fmt(wt)} = ${fmt(cand)}  vs  dist[${v}] = ${fmt(old)}`,
      });
      if (cand < old) {
        dist[v] = cand;
        prev[v] = u;
        st.nodes[v].status = 'discovered';
        st.nodes[v].extra = `d=${fmt(cand)}`;
        pq.push({ node: v, dist: cand });
        st.edges[edge].status = 'active';
        st.panel = panel();
        tb.emit({
          type: 'relax-edge',
          from: u,
          to: v,
          line: 4,
          message: `UPDATE dist[${v}] = ${fmt(cand)}, previous[${v}] = ${u}`,
          why: `${fmt(cand)} < ${fmt(old)} — a shorter route to ${v} was found through ${u}.`,
        });
      } else {
        st.edges[edge].status = 'seen';
        st.panel = panel();
        tb.emit({ type: 'no-relax', from: u, to: v, line: 4, message: `no update: ${fmt(cand)} ≥ ${fmt(old)}` });
      }
      st.inspecting = null;
    }
    st.nodes[u].status = 'settled';
    st.panel = panel();
  }

  // Reconstruct the shortest path to the target.
  if (target != null && graph.hasNode(String(target))) {
    const t = String(target);
    if (dist[t] !== Infinity) {
      let cur = t;
      while (cur != null) {
        path.unshift(cur);
        cur = cur === s ? null : prev[cur];
      }
      for (const id of path) {
        st.nodes[id].status = 'path';
        st.nodes[id].extra = `d=${fmt(dist[id])}`;
      }
      for (let i = 0; i < path.length - 1; i++) {
        for (const e of graph.getEdgesBetween(path[i], path[i + 1])) st.edges[e.id] = { status: 'path', extra: '' };
      }
    }
  }

  st.panel = panel();
  const unreachable = graph.getNodes().filter((n) => dist[n.id] === Infinity).map((n) => n.id);
  const result = {
    message: target != null && graph.hasNode(String(target))
      ? (dist[String(target)] === Infinity
        ? `No path from ${s} to ${target}.`
        : `Shortest path ${s} → ${target}: ${path.join(' → ')}  (total ${fmt(dist[String(target)])})`)
      : `Distances from ${s} computed.`,
    dist,
    prev,
    path,
    totalCost: target != null ? dist[String(target)] : null,
    settledCount: settled.size,
    unreachable,
  };
  return tb.finalize(result);

  function panel() {
    return {
      pq: pq.slice().sort((a, b) => a.dist - b.dist),
      dist: { ...dist },
      prev: { ...prev },
      settled: [...settled],
      path: [...path],
      totalCost: target != null ? dist[String(target)] : null,
    };
  }
}
