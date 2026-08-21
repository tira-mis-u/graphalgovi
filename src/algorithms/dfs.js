/**
 * DFS — a real, reusable Depth-First Search.
 *
 * Recursive implementation. The event stream exposes the actual recursion:
 * every call pushes onto the call stack (`recurse`) and every return pops
 * (`return`), so the visualization can show real recursion / backtracking.
 *
 * This module knows NOTHING about canvas / DOM / mouse / animation.
 *
 * Event stream:
 *   initialize          →  DFS(start)
 *   recurse(u)          →  call DFS(u)            (push stack)
 *   visit-node(u)       →  visited[u] ← true
 *   inspect-edge (u → v)
 *     ├─ unvisited → recurse(v) …
 *     └─ visited   → skip-visited (backEdge when v is ON the call stack)
 *   backtrack(u)        →  no unvisited neighbors
 *   return(u)           →  return from DFS(u)     (pop stack)
 *   complete
 *
 * @param {import('../graph/Graph.js').default} graph
 * @param {string|number} start
 * @param {{ onEvent?: (e:object)=>void }} [opts]
 */
export function dfs(graph, start, { onEvent = null } = {}) {
  start = String(start);
  if (!graph.hasNode(start)) {
    throw new Error(`DFS: start node "${start}" does not exist in the graph`);
  }

  const emit = onEvent || (() => {});

  const discovered = new Set();
  const inStack = new Set(); // nodes currently on the recursion stack
  const visitOrder = [];
  const finished = [];
  const stack = [];
  let maxDepth = 0;
  let cycleDetected = false;

  emit({
    type: 'initialize',
    algorithm: 'DFS',
    start,
    line: 1,
    message: `DFS(${start})`,
  });

  function visit(u, isTopLevel) {
    stack.push(u);
    inStack.add(u);
    maxDepth = Math.max(maxDepth, stack.length);

    emit({
      type: 'recurse',
      node: u,
      stack: [...stack],
      line: isTopLevel ? 1 : 5,
      message: `call DFS(${u})`,
    });

    discovered.add(u);
    visitOrder.push(u);

    emit({
      type: 'visit-node',
      node: u,
      line: 2,
      message: `visited[${u}] ← true`,
    });

    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (!discovered.has(v)) {
        emit({
          type: 'inspect-edge',
          from: u,
          to: v,
          edge,
          result: 'unvisited',
          line: 3,
          message: `inspect edge ${u} → ${v} · ${v} unvisited`,
        });
        visit(v, false);
      } else {
        const backEdge = inStack.has(v);
        if (backEdge) cycleDetected = true;
        emit({
          type: 'inspect-edge',
          from: u,
          to: v,
          edge,
          result: 'visited',
          line: 3,
          message: `inspect edge ${u} → ${v}`,
        });
        emit({
          type: 'skip-visited',
          from: u,
          to: v,
          edge,
          backEdge,
          line: 4,
          message: backEdge
            ? `${v} on call stack → back edge (cycle) → skip`
            : `${v} already visited → skip`,
        });
      }
    }

    emit({
      type: 'backtrack',
      node: u,
      line: 6,
      message: `${u}: no unvisited neighbors → backtrack`,
    });

    stack.pop();
    inStack.delete(u);
    finished.push(u);

    emit({
      type: 'return',
      node: u,
      stack: [...stack],
      line: 6,
      message: `return from DFS(${u})`,
    });
  }

  visit(start, true);

  emit({
    type: 'complete',
    line: 6,
    message: 'DFS complete',
  });

  return {
    algorithm: 'DFS',
    start,
    visitOrder,
    discoveredOrder: visitOrder,
    finished,
    maxDepth,
    cycleDetected,
  };
}

export default dfs;
