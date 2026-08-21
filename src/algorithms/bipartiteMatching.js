import { TraceBuilder } from './_common.js';

/**
 * Bipartite Matching (Kuhn's augmenting-path algorithm).
 * Left nodes are matched to right nodes via alternating augmenting paths.
 * Left/right partition is read from node.metadata.part ('left' | 'right').
 */
export default function bipartiteMatching(graph, { start = null } = {}) {
  const tb = new TraceBuilder({ algorithm: 'bipartite-matching', graph });
  const st = tb.state;

  const left = graph.getNodes().filter((n) => n.metadata.part === 'left').map((n) => n.id);
  const right = graph.getNodes().filter((n) => n.metadata.part === 'right').map((n) => n.id);
  if (left.length === 0 || right.length === 0) {
    throw new Error('Bipartite matching needs a two-part graph: set node.metadata.part = "left" or "right".');
  }
  for (const id of left) st.nodes[id].extra = 'L';
  for (const id of right) st.nodes[id].extra = 'R';

  const matchR = {}; // right -> left
  const matchL = {}; // left -> right
  let chain = [];

  const panel = () => ({
    left: [...left],
    right: [...right],
    matching: Object.entries(matchL).map(([l, r]) => ({ left: l, right: r })),
    augmentingPath: chain.map((c) => ({ left: c.left, right: c.right })),
    currentLeft: st.currentNode,
  });

  function tryKuhn(u, visR) {
    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (!right.includes(v)) continue;
      if (visR.has(v)) continue;
      visR.add(v);
      st.inspecting = { from: u, to: v };
      st.edges[edge].status = 'active';
      if (!matchR[v]) {
        matchR[v] = u;
        matchL[u] = v;
        chain.push({ left: u, right: v });
        st.edges[edge].status = 'matched';
        st.panel = panel();
        tb.emit({ type: 'augment', from: u, to: v, line: 4, message: `augmenting path ends at ${v} → match ${u} — ${v}` });
        return true;
      }
      // v is matched to matchR[v]; try to rematch that left node
      const prevLeft = matchR[v];
      chain.push({ left: u, right: v });
      st.panel = panel();
      tb.emit({ type: 'inspect', from: u, to: v, line: 3, message: `${v} already matched to ${prevLeft} — try to rematch ${prevLeft}` });
      if (tryKuhn(prevLeft, visR)) {
        matchR[v] = u;
        matchL[u] = v;
        st.edges[edge].status = 'matched';
        st.panel = panel();
        tb.emit({ type: 'augment', from: u, to: v, line: 4, message: `reassign ${v} to ${u} → ${u} — ${v} matched` });
        return true;
      }
      chain.pop();
      st.edges[edge].status = 'idle';
      st.panel = panel();
      tb.emit({ type: 'fail', line: 3, message: `cannot rematch ${prevLeft} — try the next neighbor` });
      st.inspecting = null;
    }
    return false;
  }

  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: `try to match each LEFT node (${left.length}) to a RIGHT node` });

  for (const u of left) {
    chain = [];
    st.currentNode = u;
    st.nodes[u].status = 'current';
    st.panel = panel();
    tb.emit({ type: 'try-match', node: u, line: 2, message: `try to find an augmenting path for ${u}` });
    const ok = tryKuhn(u, new Set());
    st.nodes[u].status = ok ? 'visited' : 'unvisited';
    st.panel = panel();
    tb.emit({ type: ok ? 'matched' : 'unmatched', line: 5, message: ok ? `${u} matched` : `${u} could not be matched` });
  }

  for (const [l, r] of Object.entries(matchL)) {
    st.nodes[l].status = 'visited';
    st.nodes[r].status = 'visited';
    for (const e of graph.getEdgesBetween(l, r)) st.edges[e.id] = { status: 'matched', extra: '' };
  }

  st.panel = panel();
  const result = {
    message: `Maximum matching size: ${Object.keys(matchL).length}`,
    matching: Object.entries(matchL).map(([l, r]) => ({ left: l, right: r })),
    size: Object.keys(matchL).length,
  };
  return tb.finalize(result);
}
