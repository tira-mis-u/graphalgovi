import { TraceBuilder } from './common.js';

/**
 * Bipartite Detection — BFS two-coloring.
 * Colors each node 0/1; if an edge joins two same-colored nodes the graph is
 * not bipartite (an odd cycle exists) and the conflicting edge is shown.
 */
export default function bipartite(graph, { start = null } = {}) {
  const tb = new TraceBuilder({ algorithm: 'bipartite', graph, start });
  const st = tb.state;
  const color = {};
  const partitions = [[], []];
  let conflictEdge = null;

  tb.emit({ type: 'initialize', line: 1, message: 'color[start] ← 0; BFS with two colors' });

  function bfs(root) {
    const queue = [root];
    color[root] = 0;
    st.nodes[root].status = 'discovered';
    st.nodes[root].extra = 'C0';

    while (queue.length > 0) {
      const u = queue.shift();
      st.currentNode = u;
      st.panel = panel();
      tb.emit({ type: 'process', line: 3, message: `process ${u} (color ${color[u]})` });

      for (const { node: v, edge } of graph.getNeighbors(u)) {
        if (conflictEdge) return;
        st.inspecting = { from: u, to: v };
        if (color[v] == null) {
          color[v] = 1 - color[u];
          st.nodes[v].status = 'discovered';
          st.nodes[v].extra = `C${color[v]}`;
          st.edges[edge].status = 'tree';
          queue.push(v);
          st.panel = panel();
          tb.emit({ type: 'color', line: 5, message: `color ${v} ← ${color[v]} (opposite of ${u})` });
        } else if (color[v] === color[u]) {
          conflictEdge = edge;
          st.edges[edge].status = 'conflict';
          st.panel = panel();
          tb.emit({
            type: 'conflict',
            line: 4,
            message: `CONFLICT: ${u} (${color[u]}) — ${v} (${color[v]}) same color → NOT bipartite`,
            why: 'Two adjacent vertices share a color, which means the graph contains an odd cycle.',
          });
          return;
        } else {
          st.edges[edge].status = 'seen';
          st.panel = panel();
          tb.emit({ type: 'skip', line: 4, message: `${u}–${v}: colors differ — fine` });
        }
        st.inspecting = null;
      }
    }
  }

  for (const n of graph.getNodes()) {
    if (conflictEdge) break;
    if (color[n.id] == null) bfs(n.id);
  }

  for (const id in color) partitions[color[id]].push(id);

  st.panel = panel();
  const result = {
    message: conflictEdge
      ? 'NOT BIPARTITE — an odd cycle was found.'
      : 'BIPARTITE — the graph can be split into two independent sets.',
    isBipartite: !conflictEdge,
    partitions,
    conflictEdge,
  };
  return tb.finalize(result);

  function panel() {
    return {
      color: { ...color },
      partitions: partitions.map((p) => [...p]),
      conflictEdge,
    };
  }
}
