/**
 * Scenario 1 — SOCIAL NETWORK (undirected graph).
 * "Starting from An, find everyone reachable through friendship connections."
 */
export default {
  id: 'social',
  title: 'Social Network',
  subtitle: 'Friendship reachability',
  directed: false,
  editable: false,
  defaultStartNode: 'An',

  problem: {
    heading: 'Who can An reach?',
    text: 'Starting from An, find everyone reachable through friendship connections — and how many friendship hops away each person is.',
  },

  nodeDefinition: 'A person in the network.',
  edgeDefinition: 'A friendship between two people.',
  graphType: 'Undirected graph',

  dataset: {
    nodes: [
      { id: 'An', label: 'An', x: 0, y: 0 },
      { id: 'Binh', label: 'Bình', x: -250, y: -130 },
      { id: 'Chi', label: 'Chi', x: 30, y: -175 },
      { id: 'Tuan', label: 'Tuấn', x: 270, y: -115 },
      { id: 'Dung', label: 'Dũng', x: -385, y: -285 },
      { id: 'Lan', label: 'Lan', x: -150, y: -295 },
      { id: 'Mai', label: 'Mai', x: 40, y: -325 },
      { id: 'Phuc', label: 'Phúc', x: 205, y: -335 },
      { id: 'Khoa', label: 'Khoa', x: 395, y: -250 },
    ],
    edges: [
      { from: 'An', to: 'Binh' },
      { from: 'An', to: 'Chi' },
      { from: 'An', to: 'Tuan' },
      { from: 'Binh', to: 'Dung' },
      { from: 'Binh', to: 'Lan' },
      { from: 'Chi', to: 'Mai' },
      { from: 'Mai', to: 'Phuc' },
      { from: 'Tuan', to: 'Khoa' },
    ],
  },

  graphTheory: [
    { term: 'VERTEX / NODE', def: 'A person in the network.' },
    { term: 'EDGE', def: 'A friendship relationship.', diagram: { kind: 'edge' } },
    { term: 'GRAPH', def: 'The complete relationship structure.', diagram: { kind: 'star' } },
    { term: 'TYPE', def: 'Undirected graph — friendship works both ways.' },
    { term: 'WHY TRAVERSAL?', def: 'To systematically explore connected people.' },
  ],

  bfsExplanation: [
    'BFS explores the network in rings around An. First An herself, then all direct friends, then friends-of-friends, and so on.',
    'Each ring is a BFS level: people at level 1 are 1 friendship hop away, level 2 are 2 hops away, and so on.',
    'BFS is the natural choice when we care about distance — “how many connections away is this person?”',
  ],

  dfsExplanation: [
    'DFS picks one friendship branch and follows it all the way down before backtracking and trying the next branch.',
    'You can watch the call stack grow as DFS dives deeper — Bình → Dũng — and then unwind as it backtracks to explore the next friend.',
    'DFS finds everyone too, but the order jumps around the network instead of ring by ring.',
  ],

  result: {
    bfs: (r) => [
      `Reached ${r.visitedCount} of ${r.total} people`,
      `Maximum friendship distance: ${r.maxDistance} connection(s)`,
      `Traversal order: ${r.order.join(' → ')}`,
      r.unreachable.length
        ? `Not connected to An: ${r.unreachable.join(', ')}`
        : 'Everyone in the network is reachable from An.',
    ],
    dfs: (r) => [
      `Reached ${r.visitedCount} of ${r.total} people`,
      `Maximum depth explored: ${r.maxDistance} friendship(s) deep`,
      `Traversal order: ${r.order.join(' → ')}`,
      r.unreachable.length
        ? `Not connected to An: ${r.unreachable.join(', ')}`
        : 'Everyone in the network is reachable from An.',
    ],
  },
};
