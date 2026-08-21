import { TraceBuilder } from './common.js';

/**
 * Connected Components — BFS over every unvisited node to enumerate the
 * connected components of an undirected graph. Works for directed graphs too
 * (weak components) by treating edges as undirected.
 */
export default function connectedComponents(graph, { start = null } = {}) {
  const tb = new TraceBuilder({ algorithm: 'connected-components', graph });
  const st = tb.state;
  const visited = new Set();
  const components = [];
  let index = 0;

  tb.emit({ type: 'initialize', line: 1, message: 'for each unvisited node: start a new component' });

  for (const root of graph.getNodes()) {
    if (visited.has(root.id)) continue;
    index += 1;
    const comp = [];
    const queue = [root.id];
    visited.add(root.id);
    st.nodes[root.id].status = 'current';
    st.nodes[root.id].extra = `C${index}`;
    st.panel = { components: components.map((c) => [...c]), current: [...comp], count: index, queue: [...queue] };
    tb.emit({ type: 'component-start', line: 2, message: `component ${index}: start BFS at ${root.id}` });

    while (queue.length > 0) {
      const u = queue.shift();
      comp.push(u);
      st.currentNode = u;
      st.panel = { components: components.map((c) => [...c]), current: [...comp], count: index, queue: [...queue] };
      tb.emit({ type: 'visit', line: 3, message: `visit ${u} (component ${index})` });

      for (const { node: v, edge } of graph.getNeighbors(u)) {
        if (!visited.has(v)) {
          visited.add(v);
          st.nodes[v].status = 'discovered';
          st.nodes[v].extra = `C${index}`;
          st.edges[edge].status = 'tree';
          queue.push(v);
          st.panel = { components: components.map((c) => [...c]), current: [...comp], count: index, queue: [...queue] };
          tb.emit({ type: 'discover', line: 4, message: `discover ${v} → component ${index}` });
        } else {
          st.inspecting = { from: u, to: v };
          st.edges[edge].status = 'seen';
          st.panel = { components: components.map((c) => [...c]), current: [...comp], count: index, queue: [...queue] };
          tb.emit({ type: 'inspect-edge', line: 4, message: `edge ${u}–${v}: ${v} already in component ${index}` });
          st.inspecting = null;
        }
      }
      st.nodes[u].status = 'visited';
    }
    for (const id of comp) {
      st.nodes[id].status = 'visited';
      st.nodes[id].extra = `C${index}`;
    }
    components.push(comp);
  }

  st.panel = { components, count: components.length };
  const result = {
    message: `${components.length} connected component(s)`,
    count: components.length,
    components,
    isolated: components.filter((c) => c.length === 1).map((c) => c[0]),
  };
  return tb.finalize(result);
}
