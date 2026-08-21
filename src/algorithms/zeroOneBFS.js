import { TraceBuilder, fmt } from './common.js';

/**
 * 0-1 BFS — shortest paths when every edge weight is 0 or 1.
 * Uses a double-ended queue: relaxations through a 0-cost edge push FRONT,
 * through a 1-cost edge push BACK. Correct without a full priority queue.
 */
export default function zeroOneBFS(graph, { start = null, target = null } = {}) {
  const s = start != null ? String(start) : graph.getNodes()[0]?.id;
  if (!s || !graph.hasNode(s)) throw new Error('0-1 BFS: a valid start node is required.');
  for (const e of graph.getEdges()) {
    if (e.weight !== 0 && e.weight !== 1) {
      throw new Error(`0-1 BFS requires edge weights of 0 or 1 (edge ${e.id} has weight ${e.weight}). Use Dijkstra for general weights.`);
    }
  }

  const tb = new TraceBuilder({ algorithm: '0-1-bfs', graph, start: s, target });
  const st = tb.state;

  const dist = {};
  const prev = {};
  const deque = [];
  const settled = new Set();
  const path = [];

  for (const n of graph.getNodes()) dist[n.id] = Infinity;
  dist[s] = 0;
  deque.push(s);
  st.nodes[s].status = 'discovered';
  st.nodes[s].extra = 'd=0';

  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: `dist[${s}] ← 0; push ${s} to the back of the deque` });

  while (deque.length > 0) {
    const u = deque.shift();
    if (settled.has(u)) continue;
    settled.add(u);
    st.currentNode = u;
    st.nodes[u].status = 'current';
    st.panel = panel();
    tb.emit({ type: 'pop-front', line: 2, message: `pop ${u} from the FRONT (dist ${fmt(dist[u])})` });
    st.nodes[u].status = 'settled';

    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (settled.has(v)) continue;
      const wt = graph.getEdge(edge).weight;
      const cand = dist[u] + wt;
      const old = dist[v];
      st.inspecting = { from: u, to: v };
      st.edges[edge].status = 'active';
      st.panel = panel();
      tb.emit({ type: 'inspect-edge', line: 3, message: `relax ${u} → ${v} (weight ${fmt(wt)}): ${fmt(cand)} vs ${fmt(old)}` });
      if (cand < old) {
        dist[v] = cand;
        prev[v] = u;
        st.nodes[v].status = 'discovered';
        st.nodes[v].extra = `d=${fmt(cand)}`;
        if (wt === 0) {
          deque.unshift(v);
          st.panel = panel();
          tb.emit({
            type: 'push-front',
            line: 4,
            message: `weight 0 → push ${v} to the FRONT`,
            why: 'A 0-cost edge does not increase distance, so its target must be processed before any node with a higher distance.',
          });
        } else {
          deque.push(v);
          st.panel = panel();
          tb.emit({ type: 'push-back', line: 5, message: `weight 1 → push ${v} to the BACK` });
        }
      } else {
        st.edges[edge].status = 'seen';
        st.panel = panel();
        tb.emit({ type: 'no-relax', line: 3, message: 'no update' });
      }
      st.inspecting = null;
    }
  }

  if (target != null && graph.hasNode(String(target)) && dist[String(target)] !== Infinity) {
    let cur = String(target);
    while (cur != null) {
      path.unshift(cur);
      cur = cur === s ? null : prev[cur];
    }
    for (const id of path) st.nodes[id].status = 'path';
  }

  st.panel = panel();
  const result = {
    message: target != null && graph.hasNode(String(target))
      ? (dist[String(target)] === Infinity ? `No path from ${s} to ${target}.` : `Shortest path ${s} → ${target}: ${path.join(' → ')} (cost ${fmt(dist[String(target)])})`)
      : `Distances from ${s} computed.`,
    dist,
    path,
    totalCost: target != null ? dist[String(target)] : null,
  };
  return tb.finalize(result);

  function panel() {
    return { deque: [...deque], dist: { ...dist }, path: [...path] };
  }
}
