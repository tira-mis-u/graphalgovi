import { TraceBuilder, fmt } from './_common.js';

/**
 * Kruskal — Minimum Spanning Tree using DSU / Union-Find.
 * Sort edges by weight, then accept each edge whose endpoints lie in different
 * components; reject edges that would create a cycle.
 */
export default function kruskal(graph, { start = null } = {}) {
  if (graph.directed) {
    throw new Error('Kruskal computes an MST for an UNDIRECTED graph (MST is not defined for directed edges). Use a directed-graph algorithm instead.');
  }
  const tb = new TraceBuilder({ algorithm: 'kruskal', graph });
  const st = tb.state;

  const parent = {};
  const size = {};
  for (const n of graph.getNodes()) {
    parent[n.id] = n.id;
    size[n.id] = 1;
  }

  function find(x) {
    let root = x;
    const path = [];
    while (parent[root] !== root) {
      path.push(root);
      root = parent[root];
    }
    for (const p of path) parent[p] = root;
    return root;
  }

  const sorted = graph.getEdges().slice().sort((a, b) => a.weight - b.weight);
  const accepted = [];
  const rejected = [];
  let mstCost = 0;

  const panel = () => ({
    sorted: sorted.map((e) => ({ from: e.from, to: e.to, weight: e.weight, state: edgeState(e.id) })),
    accepted: accepted.map((e) => ({ from: e.from, to: e.to, weight: e.weight })),
    rejected: rejected.map((e) => ({ from: e.from, to: e.to, weight: e.weight })),
    sets: componentSets(),
    mstCost,
  });

  function edgeState(id) {
    const s = st.edges[id] ? st.edges[id].status : 'idle';
    return s;
  }

  function componentSets() {
    const sets = new Map();
    for (const n of graph.getNodes()) {
      const r = find(n.id);
      if (!sets.has(r)) sets.set(r, []);
      sets.get(r).push(n.id);
    }
    return [...sets.values()].sort((a, b) => b.length - a.length);
  }

  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: 'sort edges by weight ascending; each node is its own component' });

  for (const e of sorted) {
    const ra = find(e.from);
    const rb = find(e.to);
    st.inspecting = { from: e.from, to: e.to };
    st.edges[e.id].status = 'active';
    st.panel = panel();
    tb.emit({ type: 'inspect-edge', from: e.from, to: e.to, weight: e.weight, line: 2, message: `inspect ${e.from}–${e.to} (weight ${fmt(e.weight)}) — smallest remaining` });

    if (ra === rb) {
      rejected.push(e);
      st.edges[e.id].status = 'rejected';
      st.panel = panel();
      tb.emit({
        type: 'reject-edge',
        from: e.from,
        to: e.to,
        weight: e.weight,
        line: 3,
        message: `REJECT ${e.from}–${e.to}: both in component ${ra}`,
        why: 'Both endpoints are already in the same connected component, so adding this edge would create a cycle.',
      });
    } else {
      if (size[ra] < size[rb]) {
        parent[ra] = rb;
        size[rb] += size[ra];
      } else {
        parent[rb] = ra;
        size[ra] += size[rb];
      }
      accepted.push(e);
      mstCost += e.weight;
      st.edges[e.id].status = 'tree';
      st.panel = panel();
      tb.emit({
        type: 'accept-edge',
        from: e.from,
        to: e.to,
        weight: e.weight,
        line: 4,
        message: `ACCEPT ${e.from}–${e.to} (weight ${fmt(e.weight)}) → union components`,
        why: 'The endpoints are in different components, so this is the cheapest way to connect them without a cycle.',
      });
    }
    st.inspecting = null;
  }

  st.panel = panel();
  const result = {
    message: `MST complete — ${accepted.length} edges, total cost ${fmt(mstCost)}.`,
    mstEdges: accepted.map((e) => e.id),
    mstCost,
    rejectedCount: rejected.length,
  };
  return tb.finalize(result);
}
