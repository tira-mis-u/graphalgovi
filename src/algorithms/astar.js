import { TraceBuilder, fmt } from './_common.js';

/**
 * A* — heuristic-guided best-first search.
 *   f(n) = g(n) + h(n)
 *   g = cost from start, h = estimated cost to target, f = total estimate.
 *
 * Heuristic options: 'euclidean' | 'manhattan' | 'zero' (h = 0 → Dijkstra-like).
 */
export default function astar(graph, { start = null, target = null, heuristic = 'euclidean' } = {}) {
  if (start != null && !graph.hasNode(String(start))) throw new Error(`A*: start node "${start}" does not exist.`);
  if (target != null && !graph.hasNode(String(target))) throw new Error(`A*: target node "${target}" does not exist.`);
  const s = start != null ? String(start) : graph.getNodes()[0]?.id;
  const t = target != null ? String(target) : graph.getNodes()[graph.getNodes().length - 1]?.id;
  if (!s || !graph.hasNode(s) || !t || !graph.hasNode(t)) throw new Error('A* needs both a start and a target node.');

  for (const e of graph.getEdges()) {
    if (e.weight < 0) throw new Error('A* requires non-negative edge weights.');
  }

  const tb = new TraceBuilder({ algorithm: 'astar', graph, start: s, target: t });
  const st = tb.state;

  const hOf = makeHeuristic(graph, t, heuristic);
  const g = {};
  const h = {};
  const f = {};
  const cameFrom = {};
  const open = [];
  const closed = new Set();
  const path = [];

  for (const n of graph.getNodes()) {
    g[n.id] = Infinity;
    h[n.id] = hOf(n.id);
    f[n.id] = Infinity;
  }
  g[s] = 0;
  f[s] = h[s];
  open.push(s);

  st.nodes[s].status = 'open';
  st.nodes[s].extra = `f=${fmt(f[s])}`;
  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: `g[${s}] ← 0; h[${s}] = ${fmt(h[s])}; push start to OPEN` });

  while (open.length > 0) {
    // pick lowest f
    open.sort((a, b) => f[a] - f[b]);
    const u = open.shift();
    closed.add(u);
    st.currentNode = u;
    st.nodes[u].status = 'current';
    st.panel = panel();
    tb.emit({
      type: 'select-lowest-f',
      node: u,
      line: 2,
      message: `select ${u}: f = g + h = ${fmt(g[u])} + ${fmt(h[u])} = ${fmt(f[u])} (lowest f)`,
      why: `${u} has the smallest f(n) = g(n) + h(n) among nodes in the OPEN set.`,
    });
    st.nodes[u].status = 'closed';
    st.panel = panel();
    tb.emit({ type: 'close-node', line: 2, message: `move ${u} to CLOSED` });

    if (u === t) {
      break;
    }

    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (closed.has(v)) {
        st.inspecting = { from: u, to: v };
        st.edges[edge].status = 'seen';
        st.panel = panel();
        tb.emit({ type: 'inspect', from: u, to: v, line: 3, message: `${v} in CLOSED — skip` });
        st.inspecting = null;
        continue;
      }
      const wt = graph.getEdge(edge).weight;
      const gTent = g[u] + wt;
      const hV = h[v];
      const fV = gTent + hV;
      st.inspecting = { from: u, to: v };
      st.edges[edge].status = 'active';
      st.panel = panel();
      tb.emit({
        type: 'inspect-neighbor',
        from: u,
        to: v,
        line: 3,
        message: `${v}: g = ${fmt(g[u])} + ${fmt(wt)} = ${fmt(gTent)}, h = ${fmt(hV)}, f = ${fmt(fV)}`,
      });
      if (gTent < g[v]) {
        g[v] = gTent;
        f[v] = fV;
        cameFrom[v] = u;
        st.nodes[v].status = 'open';
        st.nodes[v].extra = `f=${fmt(fV)}`;
        if (!open.includes(v)) open.push(v);
        st.edges[edge].status = 'active';
        st.panel = panel();
        tb.emit({
          type: 'update-open-set',
          node: v,
          from: u,
          to: v,
          line: 4,
          message: `update ${v}: g=${fmt(gTent)}, h=${fmt(hV)}, f=${fmt(fV)} → OPEN`,
          why: `Better g-score found through ${u}.`,
        });
      } else {
        st.edges[edge].status = 'seen';
        st.panel = panel();
        tb.emit({ type: 'no-update', from: u, to: v, line: 4, message: `no improvement for ${v}` });
      }
      st.inspecting = null;
    }
  }

  // Reconstruct path.
  if (g[t] !== Infinity) {
    let cur = t;
    while (cur != null) {
      path.unshift(cur);
      cur = cameFrom[cur] == null ? null : cameFrom[cur];
    }
    for (const id of path) {
      st.nodes[id].status = 'path';
      st.nodes[id].extra = `g=${fmt(g[id])}`;
    }
    for (let i = 0; i < path.length - 1; i++) {
      for (const e of graph.getEdgesBetween(path[i], path[i + 1])) st.edges[e.id] = { status: 'path', extra: '' };
    }
  }

  st.panel = panel();
  const result = {
    message: g[t] === Infinity
      ? `No path from ${s} to ${t}.`
      : `Path ${path.join(' → ')}  (cost ${fmt(g[t])}) · explored ${closed.size} node(s)`,
    path,
    cost: g[t],
    explored: closed.size,
    heuristic,
  };
  return tb.finalize(result);

  function panel() {
    return {
      open: open.map((id) => ({ node: id, g: g[id], h: h[id], f: f[id] })).sort((a, b) => a.f - b.f),
      closed: [...closed],
      g: { ...g },
      h: { ...h },
      f: { ...f },
      path: [...path],
      cost: t != null ? g[t] : null,
      heuristic,
    };
  }
}

function makeHeuristic(graph, targetId, kind) {
  const target = graph.getNode(targetId);
  const tx = target ? target.x : 0;
  const ty = target ? target.y : 0;
  return (id) => {
    if (kind === 'zero') return 0;
    const n = graph.getNode(id);
    if (!n) return 0;
    const dx = n.x - tx;
    const dy = n.y - ty;
    if (kind === 'manhattan') return Math.abs(dx) + Math.abs(dy);
    return Math.sqrt(dx * dx + dy * dy); // euclidean
  };
}
