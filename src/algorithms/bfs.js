/**
 * BFS — a real, reusable Breadth-First Search.
 *
 * This module knows NOTHING about canvas / DOM / mouse / animation.
 * It operates purely on a `Graph` and reports what happens through an
 * `onEvent` callback, producing a complete execution trace.
 *
 * Event stream (each event carries `line` = pseudocode line, `message`):
 *   initialize  →  queue ← [start]
 *   enqueue(start)  →  visited[start] ← true · enqueue start
 *   dequeue(u)  →  u ← dequeue()        (u becomes CURRENT)
 *   inspect-edge (u → v)
 *     ├─ discover-node(v)  →  visited[v] ← true
 *     └─ enqueue(v)
 *   └─ (already seen)  skip-visited(u, v)
 *   finish-node(u)  →  neighbors done, loop continues
 *   complete
 *
 * @param {import('../graph/Graph.js').default} graph
 * @param {string|number} start
 * @param {{ onEvent?: (e:object)=>void }} [opts]
 * @returns {{algorithm:string, start:string, visitOrder:string[], discoveredOrder:string[],
 *            level:Record<string,number>, maxLevel:number, reachable:string[]}}
 */
export function bfs(graph, start, { onEvent = null } = {}) {
  start = String(start);
  if (!graph.hasNode(start)) {
    throw new Error(`BFS: start node "${start}" does not exist in the graph`);
  }

  const emit = onEvent || (() => {});

  const queue = [start];
  const discovered = new Set([start]);
  const discoveredOrder = [start];
  const visitOrder = [];
  const level = { [start]: 0 };

  emit({
    type: 'initialize',
    algorithm: 'BFS',
    start,
    line: 2,
    message: 'queue ← [start]',
    queue: [...queue],
  });

  emit({
    type: 'enqueue',
    node: start,
    queue: [...queue],
    level: 0,
    line: 3,
    message: `visited[${start}] ← true · enqueue ${start}`,
  });

  while (queue.length > 0) {
    const u = queue.shift();
    visitOrder.push(u);

    emit({
      type: 'dequeue',
      node: u,
      queue: [...queue],
      line: 5,
      message: `u ← dequeue() → ${u}`,
    });

    for (const { node: v, edge } of graph.getNeighbors(u)) {
      if (!discovered.has(v)) {
        emit({
          type: 'inspect-edge',
          from: u,
          to: v,
          edge,
          result: 'unvisited',
          line: 6,
          message: `inspect edge ${u} → ${v} · ${v} unvisited`,
        });

        discovered.add(v);
        discoveredOrder.push(v);
        level[v] = level[u] + 1;

        emit({
          type: 'discover-node',
          node: v,
          level: level[v],
          line: 8,
          message: `visited[${v}] ← true`,
        });

        queue.push(v);
        emit({
          type: 'enqueue',
          node: v,
          queue: [...queue],
          level: level[v],
          line: 9,
          message: `enqueue ${v}`,
        });
      } else {
        emit({
          type: 'inspect-edge',
          from: u,
          to: v,
          edge,
          result: 'visited',
          line: 6,
          message: `inspect edge ${u} → ${v}`,
        });
        emit({
          type: 'skip-visited',
          from: u,
          to: v,
          edge,
          line: 7,
          message: `${v} already visited → skip`,
        });
      }
    }

    if (queue.length > 0) {
      emit({
        type: 'finish-node',
        node: u,
        queue: [...queue],
        line: 4,
        message: `${u} finished · queue not empty → continue`,
      });
    }
  }

  emit({
    type: 'complete',
    line: 4,
    message: 'queue empty → BFS complete',
  });

  const maxLevel = Math.max(0, ...Object.values(level));

  return {
    algorithm: 'BFS',
    start,
    visitOrder,
    discoveredOrder,
    level,
    maxLevel,
    reachable: discoveredOrder,
  };
}

export default bfs;
