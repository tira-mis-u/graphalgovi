import { TraceBuilder, fmt } from './common.js';

/**
 * TSP — Traveling Salesman Problem.
 *  • `tspExact`: branch-and-bound DFS over permutations (small graphs only).
 *  • `tspNearestNeighbor`: greedy heuristic + optional 2-opt improvement.
 *    Clearly labeled as approximate — it does NOT guarantee optimality.
 */
export function tspExact(graph, { start = null } = {}) {
  const s = start != null && graph.hasNode(String(start)) ? String(start) : graph.getNodes()[0]?.id;
  if (!s || !graph.hasNode(s)) throw new Error('TSP needs a valid start node.');

  const tb = new TraceBuilder({ algorithm: 'tsp-exact', graph, start: s });
  const st = tb.state;

  const V = graph.nodeCount;
  const best = { tour: null, cost: Infinity };
  const visited = new Set([s]);
  const path = [s];
  let explored = 0;
  let pruned = 0;

  const panel = () => ({
    path: [...path],
    bestTour: best.tour ? [...best.tour] : null,
    bestCost: best.cost === Infinity ? null : best.cost,
    explored,
    pruned,
  });

  st.nodes[s].status = 'current';
  st.panel = panel();
  tb.emit({ type: 'start', line: 1, message: `start the tour at ${s}` });

  function search(u, cost) {
    explored += 1;
    if (cost >= best.cost) {
      pruned += 1;
      st.panel = panel();
      tb.emit({ type: 'prune', line: 3, message: `prune: current cost ${fmt(cost)} ≥ best ${fmt(best.cost)}` });
      return;
    }
    if (path.length === V) {
      const back = graph.getNeighbors(u).find(({ node }) => node === s);
      if (back) {
        const total = cost + graph.getEdge(back.edge).weight;
        if (total < best.cost) {
          best.tour = [...path, s];
          best.cost = total;
          for (const id of path) st.nodes[id].status = 'path';
          st.panel = panel();
          tb.emit({ type: 'new-best', line: 4, message: `NEW BEST: ${best.tour.join(' → ')} = ${fmt(total)}` });
        }
      }
      return;
    }

    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (visited.has(v)) continue;
      visited.add(v);
      path.push(v);
      st.nodes[v].status = 'current';
      st.edges[edge].status = 'tree';
      st.panel = panel();
      tb.emit({ type: 'extend', node: v, line: 2, message: `visit ${v} — tour so far ${path.join(' → ')} (cost ${fmt(cost + graph.getEdge(edge).weight)})` });
      search(v, cost + graph.getEdge(edge).weight);
      path.pop();
      visited.delete(v);
      st.nodes[v].status = 'unvisited';
      st.edges[edge].status = 'idle';
      st.panel = panel();
      tb.emit({ type: 'backtrack', line: 5, message: `backtrack from ${v}` });
    }
  }

  search(s, 0);

  for (const id of best.tour || []) st.nodes[id].status = 'path';
  st.panel = panel();
  const result = {
    message: best.tour
      ? `Optimal tour: ${best.tour.join(' → ')} — total cost ${fmt(best.cost)}`
      : 'No complete tour exists.',
    tour: best.tour || [],
    cost: best.cost === Infinity ? null : best.cost,
    explored,
    pruned,
    optimal: true,
  };
  return tb.finalize(result);
}

export function tspNearestNeighbor(graph, { start = null, improve = true } = {}) {
  const s = start != null && graph.hasNode(String(start)) ? String(start) : graph.getNodes()[0]?.id;
  if (!s || !graph.hasNode(s)) throw new Error('TSP needs a valid start node.');

  const tb = new TraceBuilder({ algorithm: 'tsp-nn', graph, start: s });
  const st = tb.state;

  const unvisited = new Set(graph.getNodes().map((n) => n.id));
  const tour = [s];
  unvisited.delete(s);
  let cost = 0;

  const panel = () => ({ tour: [...tour], cost, unvisited: [...unvisited], improve: improve });

  st.nodes[s].status = 'current';
  st.panel = panel();
  tb.emit({ type: 'start', line: 1, message: `start at ${s}; repeatedly visit the NEAREST unvisited city` });

  let u = s;
  while (unvisited.size > 0) {
    let bestV = null;
    let bestW = Infinity;
    let bestE = null;
    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (!unvisited.has(v)) continue;
      const wt = graph.getEdge(edge).weight;
      if (wt < bestW) {
        bestW = wt;
        bestV = v;
        bestE = edge;
      }
    }
    if (!bestV) break; // disconnected — greedy gets stuck
    tour.push(bestV);
    unvisited.delete(bestV);
    cost += bestW;
    st.nodes[bestV].status = 'current';
    st.edges[bestE].status = 'tree';
    st.panel = panel();
    tb.emit({
      type: 'choose-nearest',
      node: bestV,
      line: 2,
      message: `from ${u} the nearest unvisited city is ${bestV} (${fmt(bestW)})`,
      why: 'The greedy rule always moves to the closest unvisited city — fast, but not guaranteed optimal.',
    });
    u = bestV;
  }

  // return to start
  const back = graph.getNeighbors(u).find(({ node }) => node === s);
  if (back) {
    cost += graph.getEdge(back.edge).weight;
    tour.push(s);
    st.panel = panel();
    tb.emit({ type: 'return', line: 2, message: `return to ${s} — total ${fmt(cost)}` });
  }

  // 2-opt improvement (heuristic)
  if (improve) {
    let improvedRound = true;
    while (improvedRound) {
      improvedRound = false;
      for (let i = 1; i < tour.length - 2; i++) {
        for (let j = i + 1; j < tour.length - 1; j++) {
          const a = tour[i - 1];
          const b = tour[i];
          const c = tour[j];
          const d = tour[j + 1];
          const wAB = edgeW(a, b);
          const wCD = edgeW(c, d);
          const wAC = edgeW(a, c);
          const wBD = edgeW(b, d);
          if (wAB != null && wCD != null && wAC != null && wBD != null && wAC + wBD < wAB + wCD) {
            // reverse segment
            let x = i;
            let y = j;
            while (x < y) {
              const t = tour[x];
              tour[x] = tour[y];
              tour[y] = t;
              x += 1;
              y -= 1;
            }
            cost = cost - (wAB + wCD) + (wAC + wBD);
            improvedRound = true;
            st.panel = panel();
            tb.emit({ type: 'two-opt', line: 3, message: `2-opt swap improved the tour to cost ${fmt(cost)}` });
          }
        }
      }
    }
  }

  for (const id of tour) st.nodes[id].status = 'path';
  st.panel = panel();
  const result = {
    message: `Heuristic tour: ${tour.join(' → ')} — total cost ${fmt(cost)} (approximate)`,
    tour,
    cost,
    optimal: false,
  };
  return tb.finalize(result);

  function edgeW(a, b) {
    for (const e of graph.getEdgesBetween(a, b)) return e.weight;
    return null;
  }
}
