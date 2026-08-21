import { TraceBuilder, fmt } from './_common.js';

/**
 * Bellman-Ford — single-source shortest paths that also handles NEGATIVE
 * edge weights, and detects negative cycles.
 * Runs |V|−1 relaxation passes over every edge, then one extra pass for
 * negative-cycle detection.
 */
export default function bellmanFord(graph, { start = null } = {}) {
  const s = start != null ? String(start) : graph.getNodes()[0]?.id;
  if (!s || !graph.hasNode(s)) throw new Error('Bellman-Ford: a valid start node is required.');

  const tb = new TraceBuilder({ algorithm: 'bellman-ford', graph, start: s });
  const st = tb.state;

  const dist = {};
  const prev = {};
  for (const n of graph.getNodes()) dist[n.id] = Infinity;
  dist[s] = 0;
  st.nodes[s].extra = 'd=0';

  const V = graph.nodeCount;
  const edges = graph.getEdges();

  let currentPass = 0;
  let negCycle = false;
  let negCycleEdges = [];

  const panel = () => ({
    pass: currentPass,
    dist: { ...dist },
    prev: { ...prev },
    negCycle,
    negCycleEdges: [...negCycleEdges],
  });

  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: `dist[${s}] ← 0, all others ∞. Up to ${V - 1} passes.` });

  for (let pass = 1; pass <= V - 1; pass++) {
    currentPass = pass;
    let changed = false;
    st.panel = panel();
    tb.emit({ type: 'pass-start', line: 2, message: `— PASS ${pass} / ${V - 1} — relax every edge` });

    for (const e of edges) {
      const wt = e.weight;
      const dirs = e.directed ? [[e.from, e.to]] : [[e.from, e.to], [e.to, e.from]];

      for (const [a, b] of dirs) {
        const cand = dist[a] + wt;
        const old = dist[b];
        st.inspecting = { from: a, to: b };
        if (cand < old) {
          dist[b] = cand;
          prev[b] = a;
          changed = true;
          st.currentNode = b;
          st.nodes[b].status = 'discovered';
          st.nodes[b].extra = `d=${fmt(cand)}`;
          st.edges[e.id].status = 'active';
          st.panel = panel();
          tb.emit({
            type: 'relax-edge',
            line: 3,
            message: `relax ${a} → ${b}: dist[${a}] + ${fmt(wt)} = ${fmt(cand)} < ${fmt(old)} → dist[${b}] = ${fmt(cand)}`,
          });
        } else {
          st.edges[e.id].status = 'seen';
          st.panel = panel();
          tb.emit({ type: 'no-relax', line: 3, message: `relax ${a} → ${b}: no change` });
        }
        st.inspecting = null;
      }
    }

    st.panel = panel();
    tb.emit({ type: 'pass-end', line: 2, message: changed ? `pass ${pass}: distances improved — continue` : `pass ${pass}: no changes — early stop` });
    if (!changed) break;
  }

  // Negative-cycle check: one more pass.
  for (const e of edges) {
    if (dist[e.from] !== Infinity && dist[e.from] + e.weight < dist[e.to]) {
      negCycle = true;
      negCycleEdges.push(e.id);
      st.edges[e.id].status = 'cycle';
    }
  }
  if (negCycle) {
    st.panel = panel();
    tb.emit({
      type: 'negative-cycle',
      line: 4,
      message: 'NEGATIVE CYCLE DETECTED — an edge can still be relaxed after all passes',
      why: 'If any edge can still be relaxed after |V|−1 passes, a negative-weight cycle is reachable and shortest paths are undefined.',
    });
  }

  st.panel = panel();
  const result = {
    message: negCycle
      ? 'NEGATIVE CYCLE DETECTED — shortest paths are undefined.'
      : `Distances from ${s} computed.`,
    dist,
    prev,
    hasNegativeCycle: negCycle,
    negCycleEdges,
  };
  return tb.finalize(result);
}
