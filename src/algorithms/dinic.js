import { TraceBuilder, fmt } from './common.js';

/**
 * Dinic's Algorithm — maximum flow using level graphs and blocking flows.
 *   1. BFS builds a level graph from source.
 *   2. DFS pushes blocking flow along levels.
 * Repeat until the sink is unreachable.
 */
export default function dinic(graph, { source = null, sink = null } = {}) {
  if (!source || !sink || !graph.hasNode(source) || !graph.hasNode(sink)) {
    throw new Error('Dinic requires a valid source and sink node.');
  }
  const tb = new TraceBuilder({ algorithm: 'dinic', graph, start: source, target: sink });
  const st = tb.state;

  const flow = {};
  const arcs = [];
  for (const e of graph.getEdges()) {
    flow[e.id] = 0;
    arcs.push({ from: e.from, to: e.to, edge: e.id, cap: e.weight });
    if (!e.directed) arcs.push({ from: e.to, to: e.from, edge: e.id, cap: e.weight });
  }
  const level = {};
  let totalFlow = 0;
  let phase = 0;
  let ptr = {};

  const flowAlong = (a) => flow[a.edge] || 0;

  function resCap(a) {
    return a.cap - flowAlong(a);
  }

  const panel = () => ({
    level: { ...level },
    flows: graph.getEdges().map((e) => ({ id: e.id, from: e.from, to: e.to, flow: flow[e.id], cap: e.weight })),
    totalFlow,
    phase,
  });

  function bfsLevels() {
    for (const n of graph.getNodes()) level[n.id] = -1;
    const q = [source];
    level[source] = 0;
    while (q.length) {
      const u = q.shift();
      for (const a of arcs) {
        if (a.from !== u) continue;
        if (resCap(a) > 0 && level[a.to] === -1) {
          level[a.to] = level[u] + 1;
          q.push(a.to);
        }
      }
    }
    return level[sink] !== -1;
  }

  function sendFlow(u, pushed) {
    if (pushed === 0) return 0;
    if (u === sink) return pushed;
    for (; ptr[u] < arcs.length; ptr[u]++) {
      const a = arcs[ptr[u]];
      if (a.from !== u) continue;
      if (resCap(a) <= 0 || level[a.to] !== level[u] + 1) continue;
      const tr = sendFlow(a.to, Math.min(pushed, resCap(a)));
      if (tr === 0) continue;
      flow[a.edge] = (flow[a.edge] || 0) + tr;
      st.inspecting = { from: a.from, to: a.to };
      st.edges[a.edge].status = 'active';
      st.panel = panel();
      tb.emit({ type: 'push-flow', line: 4, message: `push ${fmt(tr)} on ${a.from} → ${a.to} (level ${level[a.from]} → ${level[a.to]})` });
      st.inspecting = null;
      return tr;
    }
    return 0;
  }

  st.nodes[source].status = 'source';
  st.nodes[sink].status = 'sink';
  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: `Dinic on ${source} → ${sink}` });

  while (bfsLevels()) {
    phase += 1;
    st.panel = panel();
    tb.emit({
      type: 'level-graph',
      line: 2,
      message: `PHASE ${phase}: BFS level graph built — sink at level ${level[sink]}`,
    });
    for (const n of graph.getNodes()) {
      if (level[n.id] >= 0) st.nodes[n.id].extra = `L${level[n.id]}`;
    }
    ptr = {};
    for (const n of graph.getNodes()) ptr[n.id] = 0;
    let f;
    while ((f = sendFlow(source, Infinity)) > 0) {
      totalFlow += f;
    }
    st.panel = panel();
    tb.emit({ type: 'blocking-flow', line: 3, message: `blocking flow pushed in phase ${phase} — total ${fmt(totalFlow)}` });
  }

  st.panel = panel();
  const result = {
    message: `MAX FLOW = ${fmt(totalFlow)} (${phase} phase(s))`,
    maxFlow: totalFlow,
    flow,
    phases: phase,
  };
  return tb.finalize(result);
}
