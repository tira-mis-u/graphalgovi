import { TraceBuilder, fmt } from './_common.js';

/**
 * Maximum Flow — Ford-Fulkerson (DFS augmenting paths) and Edmonds-Karp
 * (BFS augmenting paths). Both share the residual-graph augmenting framework;
 * they differ only in how the augmenting path is found.
 *
 * Reverse residual edges (v → u capacity += f) are the key concept.
 */
function augmentingFlow(graph, { source, sink, useBFS }) {
  const algorithm = useBFS ? 'edmonds-karp' : 'ford-fulkerson';
  if (!source || !sink || !graph.hasNode(source) || !graph.hasNode(sink)) {
    throw new Error('Max Flow requires a valid source and sink node.');
  }
  const tb = new TraceBuilder({ algorithm, graph, start: source, target: sink });
  const st = tb.state;

  // flow on original edges + residual capacities per ordered pair.
  const flow = {};
  const res = {};
  for (const e of graph.getEdges()) flow[e.id] = 0;

  const arcs = []; // directed arcs (u→v) with capacity
  for (const e of graph.getEdges()) {
    arcs.push({ from: e.from, to: e.to, edge: e.id, cap: e.weight });
    if (!e.directed) arcs.push({ from: e.to, to: e.from, edge: e.id, cap: e.weight });
  }
  function resCap(u, v) {
    let c = 0;
    for (const a of arcs) if (a.from === u && a.to === v) c += a.cap;
    for (const a of arcs) if (a.from === v && a.to === u) c -= 0;
    // simpler: compute on the fly from arcs + flow
    let total = 0;
    for (const a of arcs) {
      if (a.from === u && a.to === v) total += a.cap - flowAlong(a);
      else if (a.from === v && a.to === u) total += flowAlong(a);
    }
    return Math.max(0, total);
  }
  function flowAlong(a) {
    return flow[a.edge] || 0;
  }
  function flowOn(from, to) {
    let f = 0;
    for (const a of arcs) if (a.from === from && a.to === to) f += flowAlong(a);
    return f;
  }

  let totalFlow = 0;

  const panel = () => ({
    flows: graph.getEdges().map((e) => ({ id: e.id, from: e.from, to: e.to, flow: flow[e.id], cap: e.weight, directed: e.directed })),
    residual: residualList(),
    path: st.panel && st.panel.path ? st.panel.path : [],
    bottleneck: st.panel && st.panel.bottleneck != null ? st.panel.bottleneck : null,
    totalFlow,
  });

  function residualList() {
    const list = [];
    const seen = new Set();
    for (const a of arcs) {
      const fwd = a.cap - flowAlong(a);
      if (fwd > 0 && !seen.has(`${a.from}→${a.to}`)) {
        seen.add(`${a.from}→${a.to}`);
        list.push({ from: a.from, to: a.to, cap: fwd, kind: 'forward' });
      }
      const bwd = flowAlong(a);
      if (bwd > 0 && !seen.has(`${a.to}→${a.from}`)) {
        seen.add(`${a.to}→${a.from}`);
        list.push({ from: a.to, to: a.from, cap: bwd, kind: 'backward' });
      }
    }
    return list;
  }

  st.nodes[source].status = 'source';
  st.nodes[sink].status = 'sink';
  st.nodes[source].extra = 'SOURCE';
  st.nodes[sink].extra = 'SINK';
  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: `flow = 0 everywhere; source ${source}, sink ${sink}` });

  function findPath() {
    // BFS or DFS over residual arcs with cap > 0.
    const prevNode = {};
    const prevArc = {};
    const visited = new Set([source]);
    const stack = [source];
    const isQueue = useBFS;
    while (stack.length) {
      const u = isQueue ? stack.shift() : stack.pop();
      if (u === sink) break;
      for (const a of arcs) {
        if (a.from !== u) continue;
        const rc = a.cap - flowAlong(a);
        if (rc <= 0 || visited.has(a.to)) continue;
        // also allow reverse of a when flowAlong > 0:
        visited.add(a.to);
        prevNode[a.to] = u;
        prevArc[a.to] = { from: a.from, to: a.to, edge: a.edge, dir: 'forward' };
        stack.push(a.to);
      }
      // backward residual arcs
      for (const a of arcs) {
        if (a.to !== u) continue;
        const rb = flowAlong(a);
        if (rb <= 0 || visited.has(a.from)) continue;
        visited.add(a.from);
        prevNode[a.from] = u;
        prevArc[a.from] = { from: a.to, to: a.from, edge: a.edge, dir: 'backward' };
        stack.push(a.from);
      }
    }
    if (!visited.has(sink)) return null;
    const path = [];
    let cur = sink;
    while (cur !== source) {
      path.unshift(cur);
      cur = prevNode[cur];
    }
    path.unshift(source);
    // build arc sequence
    const seq = [];
    for (let i = 0; i < path.length - 1; i++) {
      seq.push(prevArc[path[i + 1]]);
    }
    return { nodes: path, arcs: seq };
  }

  while (true) {
    const p = findPath();
    if (!p) {
      st.panel = panel();
      tb.emit({ type: 'no-path', line: 3, message: 'no augmenting path remains in the residual graph — flow is maximum' });
      break;
    }

    st.panel = panel();
    tb.emit({
      type: 'augmenting-path',
      line: 2,
      message: `augmenting path: ${p.nodes.join(' → ')}`,
      why: useBFS
        ? 'BFS finds the augmenting path with the fewest edges — this makes Edmonds-Karp polynomial.'
        : 'DFS finds some augmenting path in the residual graph.',
    });

    let bottleneck = Infinity;
    for (const a of p.arcs) {
      const rc = a.dir === 'forward' ? (graph.getEdge(a.edge).weight - flowAlong(a)) : flowAlong(a);
      bottleneck = Math.min(bottleneck, rc);
    }
    st.panel = { ...panel(), path: p.nodes, bottleneck };
    tb.emit({ type: 'bottleneck', line: 3, message: `bottleneck of this path = ${fmt(bottleneck)}` });

    for (const a of p.arcs) {
      const e = graph.getEdge(a.edge);
      const along = flowOn(a.from, a.to);
      if (a.dir === 'forward') {
        flow[a.edge] += bottleneck;
      } else {
        flow[a.edge] -= bottleneck;
      }
      st.inspecting = { from: a.from, to: a.to };
      st.edges[a.edge].status = 'active';
      st.edges[a.edge].extra = `${fmt(flow[a.edge])}/${fmt(e.weight)}`;
      st.panel = { ...panel(), path: p.nodes, bottleneck };
      tb.emit({
        type: 'augment',
        line: 4,
        message: `${a.dir === 'forward' ? 'push' : 'cancel'} ${fmt(bottleneck)} on ${a.from} → ${a.to}: flow = ${fmt(flow[a.edge])}/${fmt(e.weight)}`,
        why: a.dir === 'backward'
          ? 'Reducing flow on a forward edge frees capacity in reverse — this is what makes earlier choices revocable.'
          : 'Augment the path by the bottleneck amount.',
      });
      st.inspecting = null;
      st.edges[a.edge].status = 'idle';
    }
    totalFlow += bottleneck;
    st.panel = panel();
    tb.emit({ type: 'flow-updated', line: 4, message: `total flow = ${fmt(totalFlow)}` });
  }

  for (const e of graph.getEdges()) {
    if (flow[e.id] > 0) st.edges[e.id].extra = `${fmt(flow[e.id])}/${fmt(e.weight)}`;
  }

  st.panel = panel();
  const result = {
    message: `MAX FLOW = ${fmt(totalFlow)}`,
    maxFlow: totalFlow,
    flow,
  };
  return tb.finalize(result);
}

export function fordFulkerson(graph, opts = {}) {
  return augmentingFlow(graph, { ...opts, useBFS: false });
}

export function edmondsKarp(graph, opts = {}) {
  return augmentingFlow(graph, { ...opts, useBFS: true });
}
