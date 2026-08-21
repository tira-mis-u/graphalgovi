import { TraceBuilder } from './_common.js';

/**
 * Cycle Detection — detects a cycle and shows the exact edge that creates it.
 *  • Undirected graph → DFS with parent tracking.
 *  • Directed graph   → 3-color DFS; a gray neighbour is a back edge = cycle.
 */
export default function cycleDetection(graph, { start = null } = {}) {
  if (graph.directed) return cycleDirected(graph, { start });
  return cycleUndirected(graph, { start });
}

function cycleUndirected(graph, { start = null } = {}) {
  const tb = new TraceBuilder({ algorithm: 'cycle-detection', graph, start });
  const st = tb.state;
  const visited = new Set();
  const parent = {};
  const cycleEdges = [];
  let found = false;

  tb.emit({ type: 'initialize', line: 1, message: 'DFS with parent tracking (undirected)' });

  function dfs(u, p) {
    visited.add(u);
    parent[u] = p;
    st.nodes[u].status = 'current';
    st.panel = panel();
    tb.emit({ type: 'visit', line: 2, message: `visit ${u}${p ? ` (parent ${p})` : ''}` });
    st.nodes[u].status = 'visited';

    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (found) return;
      st.inspecting = { from: u, to: v };
      if (!visited.has(v)) {
        st.edges[edge].status = 'tree';
        st.panel = panel();
        tb.emit({ type: 'inspect-edge', line: 3, message: `inspect ${u} → ${v} (unvisited)` });
        dfs(v, u);
      } else if (v !== p) {
        // cycle!
        found = true;
        cycleEdges.push(edge);
        st.edges[edge].status = 'cycle';
        st.panel = panel();
        tb.emit({
          type: 'back-edge',
          line: 4,
          message: `CYCLE: edge ${u} – ${v} (${v} already visited and is not the parent)`,
          why: `In an undirected DFS tree, a non-parent visited neighbour means the edge closes a cycle.`,
        });
        return;
      } else {
        st.edges[edge].status = 'seen';
        st.panel = panel();
        tb.emit({ type: 'skip-edge', line: 3, message: `skip ${u} – ${v} (parent edge)` });
      }
      st.inspecting = null;
    }
  }

  for (const n of graph.getNodes()) {
    if (found) break;
    if (!visited.has(n.id)) dfs(n.id, null);
  }

  st.panel = panel();
  const result = {
    message: found ? 'CYCLE DETECTED' : 'No cycle found — this graph is acyclic (a forest/tree).',
    hasCycle: found,
    cycleEdges,
  };
  return tb.finalize(result);

  function panel() {
    return { visited: [...visited], parent: { ...parent }, cycleEdges: [...cycleEdges], hasCycle: found };
  }
}

function cycleDirected(graph, { start = null } = {}) {
  const tb = new TraceBuilder({ algorithm: 'cycle-detection', graph, start });
  const st = tb.state;
  const color = {}; // 0 white, 1 gray, 2 black
  const cycleEdges = [];
  let found = false;

  tb.emit({ type: 'initialize', line: 1, message: 'DFS with 3-color marking (directed)' });

  function dfs(u) {
    color[u] = 1; // gray — on the recursion stack
    st.nodes[u].status = 'current';
    st.nodes[u].extra = 'gray';
    st.panel = panel();
    tb.emit({ type: 'visit', line: 2, message: `visit ${u} → GRAY (on stack)` });

    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (found) return;
      st.inspecting = { from: u, to: v };
      if (color[v] === 1) {
        found = true;
        cycleEdges.push(edge);
        st.edges[edge].status = 'cycle';
        st.panel = panel();
        tb.emit({
          type: 'back-edge',
          line: 3,
          message: `CYCLE: ${u} → ${v} points to a GRAY node (still on the stack)`,
          why: 'A directed edge to a node currently on the recursion stack is a back edge, which closes a cycle.',
        });
        return;
      } else if (color[v] === 2) {
        st.edges[edge].status = 'seen';
        st.panel = panel();
        tb.emit({ type: 'skip-edge', line: 3, message: `skip ${u} → ${v} (already finished — cross/forward edge)` });
      } else {
        st.edges[edge].status = 'tree';
        st.panel = panel();
        tb.emit({ type: 'inspect-edge', line: 3, message: `inspect ${u} → ${v} (unvisited)` });
        dfs(v);
      }
      st.inspecting = null;
    }

    color[u] = 2; // black
    st.nodes[u].status = 'visited';
    st.nodes[u].extra = 'black';
    st.panel = panel();
    tb.emit({ type: 'finish', line: 5, message: `finish ${u} → BLACK` });
  }

  for (const n of graph.getNodes()) {
    if (found) break;
    if (!color[n.id]) dfs(n.id);
  }

  st.panel = panel();
  const result = {
    message: found ? 'CYCLE DETECTED (directed)' : 'No directed cycle — this graph is a DAG.',
    hasCycle: found,
    cycleEdges,
  };
  return tb.finalize(result);

  function panel() {
    return { color: { ...color }, cycleEdges: [...cycleEdges], hasCycle: found };
  }
}
