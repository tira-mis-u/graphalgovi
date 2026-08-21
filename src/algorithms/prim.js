import { TraceBuilder, fmt } from './_common.js';

/**
 * Prim — Minimum Spanning Tree grown from a start vertex.
 * Repeatedly adds the minimum-weight edge crossing the cut between the
 * current MST and the rest of the graph.
 */
export default function prim(graph, { start = null } = {}) {
  if (graph.directed) {
    throw new Error('Prim computes an MST for an UNDIRECTED graph.');
  }
  const s = start != null ? String(start) : graph.getNodes()[0]?.id;
  if (!s || !graph.hasNode(s)) throw new Error('Prim: a valid start node is required.');

  const tb = new TraceBuilder({ algorithm: 'prim', graph, start: s });
  const st = tb.state;

  const inMST = new Set([s]);
  const mstEdges = [];
  const frontier = [];
  let cost = 0;

  function addFrontier(u) {
    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (inMST.has(v)) continue;
      const wt = graph.getEdge(edge).weight;
      const existing = frontier.find((f) => f.to === v);
      if (existing) {
        if (wt < existing.weight) {
          existing.weight = wt;
          existing.edge = edge;
          existing.from = u;
        }
      } else {
        frontier.push({ from: u, to: v, edge, weight: wt });
      }
    }
  }

  const panel = () => ({
    mst: mstEdges.map((e) => ({ from: e.from, to: e.to, weight: e.weight })),
    frontier: frontier.slice().sort((a, b) => a.weight - b.weight),
    inMST: [...inMST],
    cost,
  });

  st.nodes[s].status = 'current';
  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: `start the MST at ${s}` });
  addFrontier(s);
  st.panel = panel();
  tb.emit({ type: 'push-frontier', line: 2, message: `add edges crossing the cut to the FRONTIER` });

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.weight - b.weight);
    const best = frontier.shift();
    if (inMST.has(best.to)) {
      st.inspecting = { from: best.from, to: best.to };
      st.edges[best.edge].status = 'seen';
      st.panel = panel();
      tb.emit({ type: 'skip', line: 3, message: `skip ${best.from}–${best.to}: ${best.to} already in MST` });
      st.inspecting = null;
      continue;
    }
    st.inspecting = { from: best.from, to: best.to };
    st.edges[best.edge].status = 'active';
    st.panel = panel();
    tb.emit({ type: 'inspect-cut', from: best.from, to: best.to, weight: best.weight, line: 3, message: `min crossing edge: ${best.from}–${best.to} (weight ${fmt(best.weight)})` });

    inMST.add(best.to);
    mstEdges.push(best);
    cost += best.weight;
    st.nodes[best.to].status = 'discovered';
    st.edges[best.edge].status = 'tree';
    st.panel = panel();
    tb.emit({
      type: 'accept-edge',
      from: best.from,
      to: best.to,
      weight: best.weight,
      line: 4,
      message: `ADD ${best.from}–${best.to} (weight ${fmt(best.weight)}) to the MST`,
      why: 'It is the cheapest edge crossing the cut, so it is safe to add without creating a cycle.',
    });
    st.inspecting = null;
    addFrontier(best.to);
    st.panel = panel();
    tb.emit({ type: 'push-frontier', line: 2, message: 'update frontier with new crossing edges' });
  }

  for (const id of inMST) st.nodes[id].status = 'visited';
  st.panel = panel();
  const result = {
    message: `MST complete — ${mstEdges.length} edges, total cost ${fmt(cost)}.`,
    mstEdges: mstEdges.map((e) => e.edge),
    cost,
  };
  return tb.finalize(result);
}
