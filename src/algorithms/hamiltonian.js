import { TraceBuilder } from './common.js';

/**
 * Hamiltonian Path / Cycle — visit every VERTEX exactly once.
 * Exact backtracking search. This is deliberately exponential; the UI should
 * keep graphs small (≤ 12 vertices).
 */
export default function hamiltonian(graph, { start = null, mode = 'path' } = {}) {
  const s = start != null && graph.hasNode(String(start)) ? String(start) : graph.getNodes()[0]?.id;
  if (!s || !graph.hasNode(s)) throw new Error('Hamiltonian search needs a valid start node.');

  const tb = new TraceBuilder({ algorithm: mode === 'cycle' ? 'hamiltonian-cycle' : 'hamiltonian-path', graph, start: s });
  const st = tb.state;

  const V = graph.nodeCount;
  const visited = new Set([s]);
  const path = [s];
  let solution = null;
  let nodes = 0;

  const panel = () => ({
    path: [...path],
    depth: path.length,
    visitedCount: visited.size,
    solution: solution ? [...solution] : null,
  });

  st.nodes[s].status = 'current';
  st.panel = panel();
  tb.emit({ type: 'start', line: 1, message: `start the path at ${s}` });

  function search(u) {
    nodes += 1;
    if (solution) return true;

    if (path.length === V) {
      if (mode === 'cycle') {
        const back = graph.getNeighbors(u).some(({ node }) => node === s);
        if (back) {
          solution = [...path, s];
          for (const id of path) st.nodes[id].status = 'path';
          st.panel = panel();
          tb.emit({ type: 'solution-found', line: 5, message: `HAMILTONIAN CYCLE: ${solution.join(' → ')}` });
          return true;
        }
        st.panel = panel();
        tb.emit({ type: 'dead-end', line: 4, message: `path covers all vertices but ${u} → ${s} does not exist — no cycle` });
        return false;
      }
      solution = [...path];
      for (const id of path) st.nodes[id].status = 'path';
      st.panel = panel();
      tb.emit({ type: 'solution-found', line: 5, message: `HAMILTONIAN PATH: ${solution.join(' → ')}` });
      return true;
    }

    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (solution) return true;
      if (visited.has(v)) {
        st.inspecting = { from: u, to: v };
        st.edges[edge].status = 'seen';
        st.panel = panel();
        tb.emit({ type: 'skip', line: 3, message: `${v} already in the path — skip` });
        st.inspecting = null;
        continue;
      }
      visited.add(v);
      path.push(v);
      st.nodes[v].status = 'current';
      st.edges[edge].status = 'tree';
      st.panel = panel();
      tb.emit({ type: 'extend-path', line: 3, message: `extend path: ${path.join(' → ')}` });

      if (search(v)) return true;

      // backtrack
      path.pop();
      visited.delete(v);
      st.nodes[v].status = 'unvisited';
      st.edges[edge].status = 'idle';
      st.panel = panel();
      tb.emit({
        type: 'backtrack',
        line: 4,
        message: `dead end — backtrack from ${v} to ${path[path.length - 1]}`,
        why: 'No extension of this partial path leads to a Hamiltonian path, so the search unwinds and tries the next candidate.',
      });
    }
    return false;
  }

  search(s);

  st.panel = panel();
  const result = {
    message: solution
      ? `Found: ${solution.join(' → ')}`
      : `No Hamiltonian ${mode} exists for this graph.`,
    exists: !!solution,
    path: solution || [],
    nodesVisited: nodes,
  };
  return tb.finalize(result);
}
