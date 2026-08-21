/**
 * Scenario 3 — DEPENDENCY GRAPH (directed graph with a deliberate cycle).
 * "Explore software module dependencies."
 */
export default {
  id: 'dependency',
  title: 'Dependency Graph',
  subtitle: 'Module dependencies',
  directed: true,
  editable: false,
  defaultStartNode: 'App',

  problem: {
    heading: 'What does this module pull in?',
    text: 'Explore software module dependencies: App needs Auth, Auth needs Database, Database needs Config — and somewhere a cycle hides.',
  },

  nodeDefinition: 'A software module.',
  edgeDefinition: 'A dependency — “module A depends on module B”.',
  graphType: 'Directed graph',

  dataset: {
    nodes: [
      { id: 'App', label: 'App', x: 0, y: 0 },
      { id: 'Auth', label: 'Auth', x: -200, y: -160 },
      { id: 'Logger', label: 'Logger', x: 0, y: -160 },
      { id: 'Cache', label: 'Cache', x: 200, y: -160 },
      { id: 'Database', label: 'Database', x: -300, y: -340 },
      { id: 'Utils', label: 'Utils', x: -70, y: -340 },
      { id: 'Config', label: 'Config', x: -450, y: -510 },
      { id: 'Email', label: 'Email', x: 410, y: -40 },
    ],
    edges: [
      { from: 'App', to: 'Auth' },
      { from: 'App', to: 'Logger' },
      { from: 'App', to: 'Cache' },
      { from: 'Auth', to: 'Database' },
      { from: 'Auth', to: 'Utils' },
      { from: 'Database', to: 'Config' },
      { from: 'Database', to: 'Cache' },
      { from: 'Config', to: 'Auth' }, // ← deliberate cycle: Auth → Database → Config → Auth
      { from: 'Logger', to: 'Utils' },
      { from: 'Email', to: 'Auth' },
    ],
  },

  graphTheory: [
    { term: 'NODE', def: 'A software module.' },
    { term: 'EDGE', def: 'A dependency — an arrow from “depends on” to “dependency”.', diagram: { kind: 'edge', directed: true } },
    { term: 'TYPE', def: 'Directed graph — dependencies have a direction.', diagram: { kind: 'path' } },
    { term: 'CYCLE', def: 'Auth → Database → Config → Auth is a dependency cycle.', diagram: { kind: 'cycle' } },
    { term: 'WHY DFS?', def: 'Follow dependency chains and inspect the traversal structure — back edges reveal cycles.' },
  ],

  bfsExplanation: [
    'BFS fans out from App: first all direct dependencies, then their dependencies, and so on.',
    'Each level is “how many dependency hops away” a module is from App.',
    'BFS still detects reachability, but the level structure is the story here.',
  ],

  dfsExplanation: [
    'DFS follows one dependency chain to its end before backtracking — App → Auth → Database → Config.',
    'When Config points back to Auth, DFS notices Auth is already on the call stack: that is a back edge, i.e. a dependency cycle.',
    'Cycle detection is a genuinely useful result — dependency cycles can break build tools.',
  ],

  result: {
    bfs: (r) => [
      `Visited ${r.visitedCount} of ${r.total} modules`,
      `Maximum dependency distance: ${r.maxDistance} hop(s)`,
      `Traversal order: ${r.order.join(' → ')}`,
      r.unreachable.length
        ? `Not reachable from App: ${r.unreachable.join(', ')}`
        : 'Every module is reachable from App.',
    ],
    dfs: (r) => [
      `Visited ${r.visitedCount} of ${r.total} modules`,
      `Cycle encountered: ${r.cycle ? 'yes — a back edge was detected' : 'no'}`,
      `Traversal order: ${r.order.join(' → ')}`,
      r.unreachable.length
        ? `Not reachable from App: ${r.unreachable.join(', ')}`
        : 'Every module is reachable from App.',
    ],
  },
};
