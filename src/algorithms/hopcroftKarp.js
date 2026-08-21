import { TraceBuilder } from './common.js';

/**
 * Hopcroft-Karp — maximum bipartite matching in phases:
 *   BFS builds layers of left nodes by augmenting-path length,
 *   DFS then augments along those layers, finding several disjoint
 *   shortest augmenting paths per phase.
 */
export default function hopcroftKarp(graph, { start = null } = {}) {
  const tb = new TraceBuilder({ algorithm: 'hopcroft-karp', graph });
  const st = tb.state;

  const left = graph.getNodes().filter((n) => n.metadata.part === 'left').map((n) => n.id);
  const right = graph.getNodes().filter((n) => n.metadata.part === 'right').map((n) => n.id);
  if (left.length === 0 || right.length === 0) {
    throw new Error('Hopcroft-Karp needs a two-part graph (node.metadata.part).');
  }
  for (const id of left) st.nodes[id].extra = 'L';
  for (const id of right) st.nodes[id].extra = 'R';

  const matchL = {}; // left -> right
  const matchR = {}; // right -> left
  const dist = {};
  let phase = 0;

  const panel = () => ({
    matching: Object.entries(matchL).map(([l, r]) => ({ left: l, right: r })),
    dist: { ...dist },
    phase,
  });

  function bfs() {
    const q = [];
    for (const u of left) {
      if (!matchL[u]) {
        dist[u] = 0;
        q.push(u);
      } else {
        dist[u] = -1;
      }
    }
    let found = false;
    while (q.length) {
      const u = q.shift();
      for (const { node: v } of graph.getNeighbors(u)) {
        if (!right.includes(v)) continue;
        const next = matchR[v];
        if (next == null) {
          found = true;
        } else if (dist[next] === -1) {
          dist[next] = dist[u] + 1;
          q.push(next);
        }
      }
    }
    return found;
  }

  function dfs(u) {
    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (!right.includes(v)) continue;
      const next = matchR[v];
      st.inspecting = { from: u, to: v };
      if (next == null || (dist[next] === dist[u] + 1 && dfs(next))) {
        matchR[v] = u;
        matchL[u] = v;
        st.edges[edge].status = 'matched';
        st.panel = panel();
        tb.emit({ type: 'augment', line: 4, message: `augment along layered path: match ${u} — ${v}` });
        st.inspecting = null;
        return true;
      }
      st.inspecting = null;
    }
    dist[u] = -1;
    return false;
  }

  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: 'Hopcroft-Karp: BFS phases + DFS augmentation' });

  while (true) {
    if (!bfs()) break;
    phase += 1;
    st.panel = panel();
    tb.emit({ type: 'bfs-phase', line: 2, message: `BFS PHASE ${phase}: layered graph built (levels of left nodes)` });
    let matched = 0;
    for (const u of left) {
      if (!matchL[u] && dfs(u)) matched += 1;
    }
    st.panel = panel();
    tb.emit({ type: 'dfs-phase', line: 3, message: `DFS PHASE ${phase}: ${matched} augmenting path(s) applied` });
  }

  for (const [l, r] of Object.entries(matchL)) {
    st.nodes[l].status = 'visited';
    st.nodes[r].status = 'visited';
    for (const e of graph.getEdgesBetween(l, r)) st.edges[e.id] = { status: 'matched', extra: '' };
  }

  st.panel = panel();
  const result = {
    message: `Maximum matching size: ${Object.keys(matchL).length} (${phase} phase(s))`,
    matching: Object.entries(matchL).map(([l, r]) => ({ left: l, right: r })),
    size: Object.keys(matchL).length,
    phases: phase,
  };
  return tb.finalize(result);
}
