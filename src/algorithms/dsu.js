import { TraceBuilder } from './common.js';

/**
 * DSU / Union-Find — a dedicated visualization of the disjoint-set structure
 * (parent pointers, union by size, path compression) that powers Kruskal.
 *
 * The demo unions the graph's edges in insertion order unless `edgeIds` is
 * provided (Kruskal reuses this engine with its sorted order).
 */
export default function dsu(graph, { start = null, edgeIds = null } = {}) {
  const tb = new TraceBuilder({ algorithm: 'dsu', graph });
  const st = tb.state;

  const parent = {};
  const size = {};
  for (const n of graph.getNodes()) {
    parent[n.id] = n.id;
    size[n.id] = 1;
  }

  const panel = () => ({
    parent: { ...parent },
    size: { ...size },
    sets: componentSets(),
    lastFind: st.panel && st.panel.lastFind ? st.panel.lastFind : null,
    lastUnion: st.panel && st.panel.lastUnion ? st.panel.lastUnion : null,
  });

  function find(x) {
    let root = x;
    const path = [];
    while (parent[root] !== root) {
      path.push(root);
      root = parent[root];
    }
    // path compression
    for (const p of path) parent[p] = root;
    return root;
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
  tb.emit({ type: 'initialize', line: 1, message: 'every node is its own set: parent[x] = x' });

  const edges = edgeIds ? edgeIds.map((id) => graph.getEdge(id)).filter(Boolean) : graph.getEdges();

  for (const e of edges) {
    const ra = find(e.from);
    const rb = find(e.to);
    st.inspecting = { from: e.from, to: e.to };
    st.edges[e.id].status = 'active';
    st.panel = panel();
    tb.emit({ type: 'find', line: 2, message: `find(${e.from}) = ${ra}, find(${e.to}) = ${rb}` });

    if (ra === rb) {
      st.edges[e.id].status = 'rejected';
      st.panel = panel();
      tb.emit({
        type: 'same-component',
        line: 3,
        message: `${e.from} and ${e.to} already in the same component (${ra}) — would form a cycle`,
      });
    } else {
      // union by size
      if (size[ra] < size[rb]) {
        parent[ra] = rb;
        size[rb] += size[ra];
      } else {
        parent[rb] = ra;
        size[ra] += size[rb];
      }
      st.edges[e.id].status = 'tree';
      st.panel = panel();
      tb.emit({
        type: 'union',
        line: 4,
        message: `UNION(${e.from}, ${e.to}): link ${size[ra] >= size[rb] ? rb : ra} under ${size[ra] >= size[rb] ? ra : rb}`,
        why: 'Union by size keeps trees shallow by attaching the smaller set under the larger one.',
      });
    }
    st.inspecting = null;
    st.edges[e.id].status = st.edges[e.id].status === 'rejected' ? 'rejected' : 'tree';
  }

  st.panel = panel();
  const result = {
    message: `${componentSets().length} disjoint set(s) after processing.`,
    sets: componentSets(),
  };
  return tb.finalize(result);
}
