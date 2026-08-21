import { TraceBuilder } from './common.js';

/**
 * Euler Path / Circuit — visit every EDGE exactly once (Hierholzer's algorithm).
 *
 * Degree conditions (undirected):
 *   0 odd-degree vertices → Euler circuit exists
 *   2 odd-degree vertices → Euler path exists (start at one odd vertex)
 *   otherwise              → no Euler trail
 */
export default function euler(graph, { start = null, mode = 'auto' } = {}) {
  if (graph.directed) {
    throw new Error('Euler traversal (as implemented) targets UNDIRECTED graphs.');
  }
  const tb = new TraceBuilder({ algorithm: mode === 'circuit' ? 'euler-circuit' : 'euler-path', graph, start });
  const st = tb.state;

  // Degree parity.
  const degree = {};
  for (const n of graph.getNodes()) degree[n.id] = 0;
  for (const e of graph.getEdges()) {
    degree[e.from] += 1;
    degree[e.to] += 1;
  }
  const odd = graph.getNodes().filter((n) => degree[n.id] % 2 === 1).map((n) => n.id);
  for (const n of graph.getNodes()) st.nodes[n.id].extra = `deg=${degree[n.id]}`;

  const used = new Set();
  const trail = []; // reversed at the end
  let stack = [];

  const panel = () => ({
    degree: { ...degree },
    odd,
    trail: [...trail].reverse(),
    usedEdges: used.size,
    totalEdges: graph.edgeCount,
    stack: [...stack],
  });

  st.panel = panel();
  tb.emit({ type: 'check-degrees', line: 1, message: `odd-degree vertices: ${odd.length ? odd.join(', ') : 'none'}` });

  const circuitOk = odd.length === 0;
  const pathOk = odd.length === 2;
  const wantCircuit = mode === 'circuit';
  const possible = wantCircuit ? circuitOk : (circuitOk || pathOk);
  const begin = start != null && graph.hasNode(String(start))
    ? String(start)
    : (odd.length ? odd[0] : graph.getNodes()[0]?.id);

  if (!possible) {
    const result = {
      message: `No Euler ${wantCircuit ? 'circuit' : 'path'} exists — ${odd.length} odd-degree vertices (need ${wantCircuit ? 0 : '0 or 2'}).`,
      exists: false,
      trail: [],
      odd,
    };
    return tb.finalize(result);
  }

  // Hierholzer with an explicit stack.
  stack = [begin];

  st.nodes[begin].status = 'current';
  st.panel = panel();
  tb.emit({
    type: 'start',
    line: 2,
    message: `start the trail at ${begin}`,
    why: odd.length ? `${begin} is an odd-degree vertex — every Euler path must start at one.` : 'All degrees are even — a circuit can start anywhere.',
  });

  while (stack.length > 0) {
    const u = stack[stack.length - 1];
    const next = graph.getNeighbors(u).find(({ edge }) => !used.has(edge));
    if (next) {
      used.add(next.edge);
      st.edges[next.edge].status = 'tree';
      st.inspecting = { from: u, to: next.node };
      stack.push(next.node);
      st.nodes[next.node].status = 'current';
      st.panel = panel();
      tb.emit({ type: 'traverse', line: 3, message: `traverse edge ${u}–${next.node} (${used.size}/${graph.edgeCount} edges used)` });
      st.inspecting = null;
    } else {
      const v = stack.pop();
      trail.push(v);
      st.nodes[v].status = 'visited';
      st.panel = panel();
      tb.emit({ type: 'backtrack', line: 4, message: `${v} has no unused edges → add ${v} to the trail (pop stack)` });
    }
  }

  const finalTrail = trail.reverse();
  for (const id of finalTrail) st.nodes[id].status = 'path';
  st.panel = panel();
  const result = {
    message: `${wantCircuit ? 'Euler circuit' : 'Euler trail'}: ${finalTrail.join(' → ')}`,
    exists: true,
    trail: finalTrail,
    odd,
  };
  return tb.finalize(result);
}
