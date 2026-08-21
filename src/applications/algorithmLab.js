/**
 * Scenario 5 — ALGORITHM LAB (fully editable playground).
 */
export default {
  id: 'lab',
  title: 'Algorithm Lab',
  subtitle: 'Build & test your own graph',
  directed: false,
  editable: true,
  defaultStartNode: 'A',

  problem: {
    heading: 'Your graph, your experiment',
    text: 'Add nodes and edges, move them around, choose a start node, then run BFS or DFS on the exact graph you built.',
  },

  nodeDefinition: 'Anything you want — a person, a module, a city, a state.',
  edgeDefinition: 'A connection you define — undirected or directed.',
  graphType: 'Editable graph (undirected or directed)',

  dataset: {
    nodes: [
      { id: 'A', label: 'A', x: 0, y: -70 },
      { id: 'B', label: 'B', x: -190, y: -210 },
      { id: 'C', label: 'C', x: 190, y: -210 },
      { id: 'D', label: 'D', x: -310, y: -370 },
      { id: 'E', label: 'E', x: 0, y: -370 },
    ],
    edges: [
      { from: 'A', to: 'B' },
      { from: 'A', to: 'C' },
      { from: 'B', to: 'D' },
      { from: 'C', to: 'E' },
      { from: 'D', to: 'E' },
    ],
  },

  graphTheory: [
    { term: 'NODE', def: 'Add a node anywhere on the canvas — give it any label.', diagram: { kind: 'edge' } },
    { term: 'EDGE', def: 'Connect two nodes. Toggle DIRECTED to make edges one-way.', diagram: { kind: 'edge', directed: true } },
    { term: 'TYPE', def: 'Your choice — undirected (A ─ B) or directed (A → B).' },
    { term: 'WHY TRAVERSAL?', def: 'Verify reachability, connectivity and order on the graph you designed.' },
  ],

  bfsExplanation: [
    'Run BFS on your own graph and watch the queue do the work — every enqueue and dequeue is real.',
    'Levels show how far each node is from your start node.',
    'Delete the start node mid-experiment and pick a new one — the graph updates instantly.',
  ],

  dfsExplanation: [
    'Run DFS on your own graph and watch the real call stack grow and shrink as it dives and backtracks.',
    'Add a directed cycle (A → B → C → A) and watch DFS detect the back edge.',
    'Modify edges between runs and see the traversal order change immediately.',
  ],

  result: {
    bfs: (r) => [
      `Visited nodes: ${r.visitedCount} of ${r.total}`,
      `Maximum distance from start: ${r.maxDistance}`,
      `Traversal order: ${r.order.join(' → ')}`,
      r.unreachable.length
        ? `Unreachable: ${r.unreachable.join(', ')}`
        : 'All nodes are reachable from the start.',
    ],
    dfs: (r) => [
      `Visited nodes: ${r.visitedCount} of ${r.total}`,
      `Maximum recursion depth: ${r.maxDistance}`,
      `Cycle detected: ${r.cycle ? 'yes' : 'no'}`,
      `Traversal order: ${r.order.join(' → ')}`,
      r.unreachable.length
        ? `Unreachable: ${r.unreachable.join(', ')}`
        : 'All nodes are reachable from the start.',
    ],
  },
};
