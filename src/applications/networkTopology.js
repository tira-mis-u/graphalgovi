/**
 * Scenario 4 — NETWORK TOPOLOGY (undirected).
 * "Starting from a router, which devices are reachable within N hops?"
 */
export default {
  id: 'network',
  title: 'Network Topology',
  subtitle: 'Router reachability',
  directed: false,
  editable: false,
  defaultStartNode: 'RouterA',

  problem: {
    heading: 'How far does the signal go?',
    text: 'Starting from Router A, find which devices are reachable within N network hops, and how many hops away each device is.',
  },

  nodeDefinition: 'A network device (router, server, computer, printer…).',
  edgeDefinition: 'A physical network connection.',
  graphType: 'Undirected graph',

  dataset: {
    nodes: [
      { id: 'RouterA', label: 'Router A', x: 0, y: 0 },
      { id: 'RouterB', label: 'Router B', x: -230, y: -150 },
      { id: 'RouterC', label: 'Router C', x: 230, y: -150 },
      { id: 'ServerA', label: 'Server A', x: -395, y: -320 },
      { id: 'ComputerB', label: 'Computer B', x: -95, y: -320 },
      { id: 'Switch', label: 'Switch', x: 240, y: -330 },
      { id: 'Printer', label: 'Printer', x: 60, y: -330 },
      { id: 'Laptop', label: 'Laptop', x: -95, y: -480 },
      { id: 'ServerB', label: 'Server B', x: 400, y: -480 },
    ],
    edges: [
      { from: 'RouterA', to: 'RouterB' },
      { from: 'RouterA', to: 'RouterC' },
      { from: 'RouterB', to: 'ServerA' },
      { from: 'RouterB', to: 'ComputerB' },
      { from: 'RouterC', to: 'Switch' },
      { from: 'RouterC', to: 'Printer' },
      { from: 'ComputerB', to: 'Laptop' },
      { from: 'Switch', to: 'ServerB' },
    ],
  },

  graphTheory: [
    { term: 'NODE', def: 'A network device.' },
    { term: 'EDGE', def: 'A network connection.', diagram: { kind: 'edge' } },
    { term: 'HOP', def: 'Crossing one edge = one hop.', diagram: { kind: 'star' } },
    { term: 'WHY BFS?', def: 'Explore devices by number of hops — BFS levels are hop counts.' },
  ],

  bfsExplanation: [
    'BFS expands hop by hop from Router A: 0 hops (the router itself), 1 hop (directly connected), 2 hops, and so on.',
    'Each BFS level is a hop distance — this is exactly how routing tables reason about reachability.',
    'The maximum level reached tells you how far the network extends from Router A.',
  ],

  dfsExplanation: [
    'DFS dives down one cable path until it hits a dead end, then backtracks to try the next device.',
    'Watch it explore Router B → Server A, unwind, then drop into Computer B → Laptop.',
    'DFS reaches every device too, but the order follows wiring paths rather than hop distance.',
  ],

  result: {
    bfs: (r) => [
      `Reachable devices: ${r.visitedCount} of ${r.total}`,
      `Maximum hop distance: ${r.maxDistance} hop(s)`,
      `Traversal order: ${r.order.join(' → ')}`,
      r.unreachable.length
        ? `Unreachable devices: ${r.unreachable.join(', ')}`
        : 'Every device is reachable from Router A.',
    ],
    dfs: (r) => [
      `Reachable devices: ${r.visitedCount} of ${r.total}`,
      `Maximum wiring depth explored: ${r.maxDistance} hop(s)`,
      `Traversal order: ${r.order.join(' → ')}`,
      r.unreachable.length
        ? `Unreachable devices: ${r.unreachable.join(', ')}`
        : 'Every device is reachable from Router A.',
    ],
  },
};
