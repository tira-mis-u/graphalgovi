import { TraceBuilder, fmt } from './common.js';

/**
 * PageRank — iterative graph-based ranking.
 *   rank[v] = (1−d)/N + d · Σ_{u→v} rank[u]/outdeg(u)
 * A graph-based ranking demo, NOT the full modern search-engine mechanism.
 */
export default function pageRank(graph, { start = null, damping = 0.85, maxIter = 40 } = {}) {
  const tb = new TraceBuilder({ algorithm: 'pagerank', graph });
  const st = tb.state;

  const N = graph.nodeCount;
  if (N === 0) throw new Error('PageRank: empty graph.');
  const rank = {};
  const outdeg = {};
  for (const n of graph.getNodes()) {
    rank[n.id] = 1 / N;
    outdeg[n.id] = graph.getNeighbors(n.id).length;
  }

  const panel = () => ({ rank: { ...rank }, iteration: iterNo, outdeg: { ...outdeg } });
  let iterNo = 0;

  st.panel = panel();
  tb.emit({ type: 'initialize', line: 1, message: `rank = 1/${N} for every page; damping d = ${damping}` });

  for (let it = 1; it <= maxIter; it++) {
    iterNo = it;
    const next = {};
    for (const n of graph.getNodes()) next[n.id] = (1 - damping) / N;

    // transfer rank along edges
    for (const n of graph.getNodes()) {
      const d = outdeg[n.id];
      if (d === 0) {
        // dangling page: distribute uniformly (simplified)
        for (const m of graph.getNodes()) next[m.id] += damping * rank[n.id] / N;
        continue;
      }
      for (const { node: v } of graph.getNeighbors(n.id)) {
        next[v] += damping * rank[n.id] / d;
      }
    }

    let maxDiff = 0;
    for (const n of graph.getNodes()) {
      const diff = Math.abs(next[n.id] - rank[n.id]);
      maxDiff = Math.max(maxDiff, diff);
      rank[n.id] = next[n.id];
      st.nodes[n.id].extra = fmt(rank[n.id]);
    }
    st.panel = panel();
    tb.emit({ type: 'iteration', line: 3, message: `iteration ${it}: ranks updated (max change ${fmt(maxDiff)})` });

    if (maxDiff < 1e-6) {
      st.panel = panel();
      tb.emit({ type: 'converge', line: 4, message: `converged after ${it} iterations` });
      break;
    }
  }

  const sorted = graph.getNodes().map((n) => ({ node: n.id, rank: rank[n.id] })).sort((a, b) => b.rank - a.rank);
  for (const n of graph.getNodes()) st.nodes[n.id].extra = fmt(rank[n.id]);

  st.panel = panel();
  const result = {
    message: `Top page: ${sorted[0] ? sorted[0].node : '—'} (rank ${sorted[0] ? fmt(sorted[0].rank) : ''})`,
    ranks: { ...rank },
    sorted,
    iterations: iterNo,
  };
  return tb.finalize(result);
}
