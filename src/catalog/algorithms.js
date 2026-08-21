/**
 * Algorithm registry — metadata-driven catalog.
 *
 * Every algorithm declares: id, name, category, difficulty, description,
 * dataStructure, graph requirements (for compatibility validation), complexity,
 * pseudocode lines, suitability, related algorithms, legend, and a `build`
 * function that produces a universal trace { events, snapshots, result, error }.
 *
 * The UI never hard-codes compatibility: it reads `requirements`.
 */
import { buildTrace, legacySnapshots, makeState } from '../execution/ExecutionTrace.js';
import { examplesFor } from './examples.js';

import connectedComponents from '../algorithms/connectedComponents.js';
import cycleDetection from '../algorithms/cycleDetection.js';
import bipartite from '../algorithms/bipartite.js';
import dijkstra from '../algorithms/dijkstra.js';
import astar from '../algorithms/astar.js';
import bellmanFord from '../algorithms/bellmanFord.js';
import floydWarshall from '../algorithms/floydWarshall.js';
import zeroOneBFS from '../algorithms/zeroOneBFS.js';
import dsu from '../algorithms/dsu.js';
import kruskal from '../algorithms/kruskal.js';
import prim from '../algorithms/prim.js';
import kahn from '../algorithms/kahn.js';
import dfsTopo from '../algorithms/dfsTopo.js';
import kosaraju from '../algorithms/kosaraju.js';
import tarjan from '../algorithms/tarjan.js';
import bridges from '../algorithms/bridges.js';
import articulation from '../algorithms/articulation.js';
import euler from '../algorithms/euler.js';
import hamiltonian from '../algorithms/hamiltonian.js';
import { tspExact, tspNearestNeighbor } from '../algorithms/tsp.js';
import { fordFulkerson, edmondsKarp } from '../algorithms/maxFlow.js';
import dinic from '../algorithms/dinic.js';
import bipartiteMatching from '../algorithms/bipartiteMatching.js';
import hopcroftKarp from '../algorithms/hopcroftKarp.js';
import pageRank from '../algorithms/pageRank.js';
import transitiveClosure from '../algorithms/transitiveClosure.js';

// ---------------------------------------------------------------- helpers
/** Wrap a new-style `run(graph, params)` so errors become a valid trace. */
function wrap(id, run) {
  return (graph, params) => {
    const p = params || {};
    try {
      return run(graph, p);
    } catch (err) {
      return {
        algorithm: id,
        start: p.start != null ? String(p.start) : null,
        target: p.target != null ? String(p.target) : null,
        events: [],
        snapshots: [makeState(id, graph, { start: p.start, target: p.target })],
        result: null,
        error: err,
      };
    }
  };
}

/** Legacy BFS/DFS build (keeps the original laboratory intact). */
function legacyBuild(id) {
  return (graph, params) => {
    const p = params || {};
    const start = p.start != null ? String(p.start) : (graph.getNodes()[0] ? graph.getNodes()[0].id : null);
    if (!start || !graph.hasNode(start)) {
      return {
        algorithm: id,
        start: null,
        target: null,
        events: [],
        snapshots: [makeState(id, graph)],
        result: null,
        error: new Error('A valid start node is required (it may have been deleted).'),
      };
    }
    const t = buildTrace(id, graph, start);
    return {
      algorithm: t.algorithm, // 'BFS' / 'DFS'
      start,
      target: null,
      events: t.events,
      snapshots: legacySnapshots(t),
      result: t.summary,
      error: t.error,
    };
  };
}

// ---------------------------------------------------------------- palette
const C = {
  amber: '#e89e3b', green: '#4a7c59', red: '#e87a5d', cyan: '#55c4dd', blue: '#5b7fb0',
  gray: '#2b3346', dim: '#3a4256',
};

// ---------------------------------------------------------------- registry
export const ALGORITHMS = [
  {
    id: 'bfs', name: 'BFS', fullName: 'Breadth-First Search', category: 'Traversal', difficulty: 'Beginner',
    description: 'Explore a graph level by level using a queue.',
    dataStructure: 'Queue (FIFO)',
    requirements: { directed: 'any', weighted: 'any', negativeWeights: 'na', requiresStart: true, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(V + E)', spaceComplexity: 'O(V)', complexityNote: 'Each vertex and edge is processed once.',
    useCases: ['Reachability', 'Unweighted shortest path', 'Level / hop analysis'],
    limitations: ['No edge weights', 'Explores broadly (not target-directed)'],
    pseudocode: [
      'BFS(start)',
      '  queue ← [start]',
      '  visited[start] ← true',
      '  while queue is not empty:',
      '    u ← dequeue()',
      '    for each v adjacent to u:',
      '      if v is not visited:',
      '        visited[v] ← true',
      '        enqueue(v)',
    ],
    suitability: { good: ['Unweighted shortest path', 'Finding all nodes within k hops'], bad: ['Weighted shortest path (use Dijkstra)', 'Target-directed search (use A*)'] },
    related: ['dfs', 'dijkstra', 'connected-components', 'bipartite'],
    keywords: ['shortest path', 'reachable', 'level', 'hop', 'queue'],
    panelKind: 'queue',
    legend: [
      { color: C.amber, label: 'Current (dequeued)' }, { color: C.blue, label: 'Discovered (in queue)' },
      { color: C.green, label: 'Processed' }, { color: C.cyan, label: 'Start' },
    ],
    build: legacyBuild('bfs'),
  },
  {
    id: 'dfs', name: 'DFS', fullName: 'Depth-First Search', category: 'Traversal', difficulty: 'Beginner',
    description: 'Explore one branch to its end, then backtrack — recursion / stack.',
    dataStructure: 'Call Stack (LIFO)',
    requirements: { directed: 'any', weighted: 'any', negativeWeights: 'na', requiresStart: true, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(V + E)', spaceComplexity: 'O(V)', complexityNote: 'Recursion depth ≤ V.',
    useCases: ['Deep exploration', 'Cycle / back-edge detection', 'Foundation of many algorithms'],
    limitations: ['No shortest-path guarantee', 'Deep recursion on large graphs'],
    pseudocode: [
      'DFS(u)',
      '  visited[u] ← true',
      '  for each v adjacent to u:',
      '    if v is not visited:',
      '      DFS(v)',
      '  ← return (pop call stack)',
    ],
    suitability: { good: ['Deep exploration', 'Building blocks for SCC/bridges/topological sort'], bad: ['Shortest path (use BFS)', 'Avoid deep recursion on huge graphs'] },
    related: ['bfs', 'kahn', 'kosaraju', 'bridges', 'cycle-detection', 'dfs-topo'],
    keywords: ['deep', 'recursion', 'stack', 'backtracking'],
    panelKind: 'stack',
    legend: [
      { color: C.amber, label: 'Current' }, { color: C.green, label: 'Visited' },
      { color: C.red, label: 'Backtracking' }, { color: C.cyan, label: 'Start' },
    ],
    build: legacyBuild('dfs'),
  },
  {
    id: 'connected-components', name: 'Connected Components', category: 'Connectivity', difficulty: 'Beginner',
    description: 'Find the maximal groups of mutually reachable nodes.',
    dataStructure: 'Queue / visited set',
    requirements: { directed: 'any', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(V + E)', spaceComplexity: 'O(V)',
    useCases: ['Find isolated groups', 'Cluster analysis', 'Network partitioning'],
    limitations: ['Undirected notion for directed graphs (weak components)'],
    pseudocode: ['for each unvisited node:', '  start a new component', '  BFS: visit u', '  for each neighbor v: if unvisited → discover into the component'],
    suitability: { good: ['Grouping connected nodes', 'Counting clusters'], bad: ['Directed strong connectivity (use SCC)'] },
    related: ['bfs', 'dfs', 'kosaraju', 'kruskal'],
    keywords: ['reachable', 'groups', 'cluster', 'partition'],
    panelKind: 'components',
    legend: [{ color: C.blue, label: 'Component member' }, { color: C.amber, label: 'Current' }],
    build: wrap('connected-components', connectedComponents),
  },
  {
    id: 'cycle-detection', name: 'Cycle Detection', category: 'Connectivity', difficulty: 'Beginner',
    description: 'Detect whether a graph contains a cycle and show the exact closing edge.',
    dataStructure: 'DFS (parent tracking / 3-color)',
    requirements: { directed: 'any', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(V + E)', spaceComplexity: 'O(V)',
    useCases: ['DAG validation', 'Deadlock detection', 'Redundancy analysis'],
    limitations: ['Only detects existence + one closing edge'],
    pseudocode: [
      'DFS(u):',
      '  mark u visited',
      '  for each neighbor v of u:',
      '    if v visited (and not parent / is GRAY) → CYCLE',
      '  mark u finished',
    ],
    suitability: { good: ['Checking if a dependency graph is a DAG', 'Finding redundant links'], bad: ['Enumerating ALL cycles (hard)'] },
    related: ['dfs', 'kahn', 'kosaraju', 'bipartite'],
    keywords: ['cycle', 'dag', 'deadlock', 'loop'],
    panelKind: 'cycle',
    legend: [{ color: C.red, label: 'Cycle edge' }, { color: C.green, label: 'Tree edge' }, { color: C.amber, label: 'Current' }],
    build: wrap('cycle-detection', cycleDetection),
  },
  {
    id: 'bipartite', name: 'Bipartite Detection', category: 'Connectivity', difficulty: 'Beginner',
    description: 'Two-color the graph; succeeds iff no odd cycle exists.',
    dataStructure: 'Queue + color labels',
    requirements: { directed: 'any', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(V + E)', spaceComplexity: 'O(V)',
    useCases: ['Two-group modeling', 'Prerequisite for matching', 'Odd-cycle detection'],
    limitations: ['Checks 2-colorability only'],
    pseudocode: [
      'color[start] ← 0; BFS',
      'for each node u:',
      '  for each neighbor v:',
      '    if color[v] == color[u] → NOT bipartite',
      '    else color[v] ← 1 − color[u]',
    ],
    suitability: { good: ['Modeling two-sided relationships', 'Before running matching'], bad: ['When more than two groups are needed'] },
    related: ['bfs', 'bipartite-matching', 'cycle-detection'],
    keywords: ['two groups', 'coloring', 'odd cycle', 'matching'],
    panelKind: 'bipartite',
    legend: [{ color: C.blue, label: 'Color 0' }, { color: C.green, label: 'Color 1' }, { color: C.red, label: 'Conflict' }],
    build: wrap('bipartite', bipartite),
  },

  // ---------------------------------------------------------- shortest path
  {
    id: 'dijkstra', name: 'Dijkstra', fullName: "Dijkstra's Algorithm", category: 'Shortest Path', difficulty: 'Intermediate',
    description: 'Single-source shortest paths with non-negative weights.',
    dataStructure: 'Priority queue + distance table',
    requirements: { directed: 'any', weighted: 'any', negativeWeights: 'no', requiresStart: true, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O((V + E) log V)', spaceComplexity: 'O(V)', complexityNote: 'With a binary heap. With an array-based PQ it is O(V²).',
    useCases: ['Navigation', 'Routing', 'Logistics'],
    limitations: ['Cannot handle negative weights'],
    pseudocode: [
      'dist[start] ← 0; push (start, 0)',
      'while PQ not empty:',
      '  u ← extract-min()',
      '  for each edge (u → v):',
      '    if dist[u] + w < dist[v]:',
      '      dist[v] ← dist[u] + w; prev[v] ← u',
    ],
    suitability: { good: ['Non-negative weights', 'Single-source shortest path'], bad: ['Negative weights (use Bellman-Ford)', 'Heuristic available (use A*)'] },
    related: ['astar', 'bellman-ford', 'floyd-warshall', 'zero-one-bfs', 'bfs'],
    keywords: ['shortest path', 'weighted', 'navigation', 'routing', 'distance'],
    panelKind: 'dijkstra',
    legend: [
      { color: C.amber, label: 'Current (settling)' }, { color: C.green, label: 'Settled' },
      { color: C.blue, label: 'In priority queue' }, { color: C.cyan, label: 'Final path' },
    ],
    build: wrap('dijkstra', dijkstra),
  },
  {
    id: 'astar', name: 'A*', fullName: 'A* Search', category: 'Shortest Path', difficulty: 'Intermediate',
    description: 'Heuristic-guided search: f(n) = g(n) + h(n).',
    dataStructure: 'Open set (priority) + closed set',
    requirements: { directed: 'any', weighted: 'any', negativeWeights: 'no', requiresStart: true, requiresTarget: true, requiresSourceSink: false, bipartite: false, minNodes: 2, maxNodes: Infinity },
    complexity: 'O(E) worst case', spaceComplexity: 'O(V)', complexityNote: 'Practical speed depends entirely on the heuristic quality.',
    useCases: ['Game pathfinding', 'Robot navigation', 'Map routing'],
    limitations: ['Needs a good heuristic', 'Not always faster than Dijkstra'],
    pseudocode: [
      'g[start] ← 0; push start to OPEN',
      'u ← node in OPEN with smallest f = g + h',
      'move u to CLOSED',
      'for each neighbor v of u:',
      '  g′ ← g[u] + w(u,v)',
      '  if g′ < g[v]: update g, f; push v to OPEN',
    ],
    suitability: { good: ['Target-directed search', 'A useful admissible heuristic'], bad: ['Poor / unavailable heuristic (use Dijkstra)', 'Negative weights'] },
    related: ['dijkstra', 'bellman-ford', 'bfs'],
    keywords: ['heuristic', 'pathfinding', 'game', 'robot', 'g h f'],
    panelKind: 'astar',
    legend: [
      { color: C.amber, label: 'Current (lowest f)' }, { color: C.blue, label: 'OPEN' },
      { color: C.green, label: 'CLOSED' }, { color: C.cyan, label: 'Path' },
    ],
    build: wrap('astar', astar),
  },
  {
    id: 'bellman-ford', name: 'Bellman-Ford', category: 'Shortest Path', difficulty: 'Intermediate',
    description: 'Shortest paths that tolerate negative weights and detect negative cycles.',
    dataStructure: 'Distance table + relaxation passes',
    requirements: { directed: 'any', weighted: 'any', negativeWeights: 'ok', requiresStart: true, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(V · E)', spaceComplexity: 'O(V)', complexityNote: 'Slower than Dijkstra but handles negatives.',
    useCases: ['Negative costs', 'Arbitrage detection', 'Constraint systems'],
    limitations: ['Slower than Dijkstra', 'Undefined if a negative cycle is reachable'],
    pseudocode: [
      'dist[start] ← 0, others ∞',
      'repeat |V|−1 times:',
      '  relax every edge (u,v):',
      '    dist[v] ← min(dist[v], dist[u] + w)',
      'if any edge still relaxes → NEGATIVE CYCLE',
    ],
    suitability: { good: ['Negative edge weights', 'Negative-cycle detection'], bad: ['All-non-negative weights (use Dijkstra)', 'Needs a guaranteed-safe result if a cycle exists'] },
    related: ['dijkstra', 'floyd-warshall', 'astar'],
    keywords: ['negative', 'cycle', 'relaxation', 'shortest path'],
    panelKind: 'bellman',
    legend: [
      { color: C.amber, label: 'Edge being relaxed' }, { color: C.blue, label: 'Updated distance' },
      { color: C.red, label: 'Negative cycle edge' },
    ],
    build: wrap('bellman-ford', bellmanFord),
  },
  {
    id: 'floyd-warshall', name: 'Floyd-Warshall', category: 'Shortest Path', difficulty: 'Intermediate',
    description: 'All-pairs shortest paths via dynamic programming.',
    dataStructure: 'Distance matrix',
    requirements: { directed: 'any', weighted: 'any', negativeWeights: 'ok', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: 12 },
    complexity: 'O(V³)', spaceComplexity: 'O(V²)', complexityNote: 'Great for dense graphs / many queries.',
    useCases: ['All-pairs distances', 'Small dense graphs', 'Transitive closure basis'],
    limitations: ['O(V³) — impractical for large graphs'],
    pseudocode: [
      'dist[i][j] ← edge weight (∞ if none, 0 on diagonal)',
      'for each k:',
      '  for each i, j:',
      '    dist[i][j] ← min(dist[i][j], dist[i][k] + dist[k][j])',
    ],
    suitability: { good: ['Many source-target pairs', 'Dense graphs'], bad: ['Single pair on a huge graph (use Dijkstra)'] },
    related: ['dijkstra', 'bellman-ford', 'transitive-closure'],
    keywords: ['all pairs', 'matrix', 'shortest path'],
    panelKind: 'matrix',
    legend: [{ color: C.amber, label: 'Updated cell' }, { color: C.cyan, label: 'Matrix' }],
    build: wrap('floyd-warshall', floydWarshall),
  },
  {
    id: 'zero-one-bfs', name: '0-1 BFS', category: 'Shortest Path', difficulty: 'Intermediate',
    description: 'Shortest paths when every edge weight is 0 or 1, using a deque.',
    dataStructure: 'Deque',
    requirements: { directed: 'any', weighted: 'zeroone', negativeWeights: 'na', requiresStart: true, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(V + E)', spaceComplexity: 'O(V)', complexityNote: 'Only valid for 0/1 weights.',
    useCases: ['Free / cheap shortcuts', 'Grid with teleports', 'Specialized shortest paths'],
    limitations: ['Only weights 0 or 1'],
    pseudocode: [
      'dist[start] ← 0; push start to deque',
      'u ← pop FRONT',
      'for each edge (u,v):',
      '  if w = 0 → push v to FRONT',
      '  if w = 1 → push v to BACK',
    ],
    suitability: { good: ['0/1 weights', 'Faster than general Dijkstra'], bad: ['General weights (use Dijkstra)'] },
    related: ['dijkstra', 'bfs'],
    keywords: ['deque', '0 1', 'shortest path', 'teleport'],
    panelKind: 'zeroone',
    legend: [{ color: C.amber, label: 'Current' }, { color: C.cyan, label: 'Path' }, { color: C.blue, label: 'In deque' }],
    build: wrap('zero-one-bfs', zeroOneBFS),
  },

  // ---------------------------------------------------------- MST
  {
    id: 'kruskal', name: 'Kruskal', fullName: "Kruskal's Algorithm", category: 'Minimum Spanning Tree', difficulty: 'Intermediate',
    description: 'MST by processing edges in ascending weight order with Union-Find.',
    dataStructure: 'Sorted edges + DSU',
    requirements: { directed: 'undirected', weighted: 'any', negativeWeights: 'ok', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(E log E)', spaceComplexity: 'O(V + E)', complexityNote: 'Dominated by sorting; DSU is near-constant per operation.',
    useCases: ['Fiber / grid / road design', 'Clustering', 'Cheapest connectivity'],
    limitations: ['Undirected only', 'Does not minimize paths (only total cost)'],
    pseudocode: [
      'sort edges by weight ascending',
      'for each edge (u,v) in order:',
      '  if find(u) == find(v) → REJECT (cycle)',
      '  else ACCEPT; union(u, v)',
    ],
    suitability: { good: ['Undirected weighted graph', 'Edge-centric processing', 'Sparse graphs'], bad: ['Directed graph MST (not defined)', 'Path optimization (use Dijkstra)'] },
    related: ['prim', 'dsu'],
    keywords: ['mst', 'connect cheaply', 'network design', 'spanning tree'],
    panelKind: 'kruskal',
    legend: [{ color: C.green, label: 'Accepted MST edge' }, { color: C.red, label: 'Rejected edge' }, { color: C.amber, label: 'Inspecting' }],
    build: wrap('kruskal', kruskal),
  },
  {
    id: 'prim', name: 'Prim', fullName: "Prim's Algorithm", category: 'Minimum Spanning Tree', difficulty: 'Intermediate',
    description: 'MST grown from one vertex by repeatedly adding the cheapest crossing edge.',
    dataStructure: 'Frontier / priority queue',
    requirements: { directed: 'undirected', weighted: 'any', negativeWeights: 'ok', requiresStart: true, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(E log V)', spaceComplexity: 'O(V + E)', complexityNote: 'With a binary heap.',
    useCases: ['Electrical grids', 'Network expansion', 'Cheapest connectivity'],
    limitations: ['Undirected only', 'Needs a start vertex'],
    pseudocode: [
      'start with any vertex in the MST',
      'add all crossing edges to the FRONTIER',
      'pick the minimum crossing edge',
      'add its new vertex to the MST; repeat',
    ],
    suitability: { good: ['Dense graphs', 'Growing from a root'], bad: ['Directed graphs', 'Edge-by-edge global view (use Kruskal)'] },
    related: ['kruskal', 'dsu', 'dijkstra'],
    keywords: ['mst', 'frontier', 'cut', 'connect cheaply'],
    panelKind: 'prim',
    legend: [{ color: C.green, label: 'MST edge' }, { color: C.amber, label: 'Frontier / min edge' }, { color: C.blue, label: 'Cut' }],
    build: wrap('prim', prim),
  },
  {
    id: 'dsu', name: 'Union-Find (DSU)', category: 'Minimum Spanning Tree', difficulty: 'Beginner',
    description: 'Disjoint-set structure: find, union by size, path compression.',
    dataStructure: 'Parent pointers',
    requirements: { directed: 'undirected', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(α(V)) amortized', spaceComplexity: 'O(V)', complexityNote: 'Inverse Ackermann — effectively constant.',
    useCases: ['Kruskal', 'Dynamic connectivity', 'Equivalence classes'],
    limitations: ['No deletions (standard DSU)'],
    pseudocode: [
      'parent[x] ← x for every x',
      'find(x): follow parent pointers (path compression)',
      'if same root → same component',
      'union: link the smaller set under the larger',
    ],
    suitability: { good: ['Kruskal', 'Grouping queries'], bad: ['Need to split sets (use other structures)'] },
    related: ['kruskal', 'connected-components'],
    keywords: ['union find', 'dsu', 'disjoint', 'set'],
    panelKind: 'dsu',
    legend: [{ color: C.green, label: 'Unioned' }, { color: C.red, label: 'Same component (skip)' }, { color: C.amber, label: 'Inspecting' }],
    build: wrap('dsu', dsu),
  },

  // ---------------------------------------------------------- DAG
  {
    id: 'kahn', name: 'Topological Sort (Kahn)', category: 'DAG / Dependency', difficulty: 'Intermediate',
    description: 'Order a DAG by repeatedly removing zero in-degree nodes.',
    dataStructure: 'In-degree table + queue',
    requirements: { directed: 'directed', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(V + E)', spaceComplexity: 'O(V)',
    useCases: ['Build order', 'Course prerequisites', 'Task scheduling'],
    limitations: ['Directed only', 'Fails (cycle) if not a DAG'],
    pseudocode: [
      'compute in-degrees; enqueue zeros',
      'while queue not empty:',
      '  u ← dequeue; append to order',
      '  for each edge (u → v): in-degree[v] −= 1',
      '  if in-degree[v] = 0: enqueue v',
    ],
    suitability: { good: ['Dependency ordering', 'Cycle detection'], bad: ['Undirected graphs', 'Priority ordering (add priorities)'] },
    related: ['dfs-topo', 'cycle-detection', 'dfs'],
    keywords: ['order', 'dependency', 'build', 'schedule', 'dag'],
    panelKind: 'kahn',
    legend: [{ color: C.amber, label: 'Processing' }, { color: C.green, label: 'Ordered' }, { color: C.red, label: 'Cycle (remaining)' }],
    build: wrap('kahn', kahn),
  },
  {
    id: 'dfs-topo', name: 'Topological Sort (DFS)', category: 'DAG / Dependency', difficulty: 'Intermediate',
    description: 'Topological order from reversed DFS finish order.',
    dataStructure: 'Recursion stack',
    requirements: { directed: 'directed', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(V + E)', spaceComplexity: 'O(V)',
    useCases: ['Build order', 'Compilation order', 'DAG analysis'],
    limitations: ['Directed only', 'Recursion depth on long chains'],
    pseudocode: [
      'for each unvisited node: DFS(u)',
      'DFS(u): mark GRAY',
      '  for each edge (u → v):',
      '    if GRAY → cycle; if unvisited → DFS(v)',
      '  mark BLACK; push u to finish order',
    ],
    suitability: { good: ['Ordering with a natural DFS', 'Cycle detection'], bad: ['Undirected graphs'] },
    related: ['kahn', 'dfs', 'cycle-detection'],
    keywords: ['order', 'dependency', 'dag', 'compile'],
    panelKind: 'dfsTopo',
    legend: [{ color: C.amber, label: 'On stack (gray)' }, { color: C.green, label: 'Finished (black)' }, { color: C.red, label: 'Cycle edge' }],
    build: wrap('dfs-topo', dfsTopo),
  },

  // ---------------------------------------------------------- SCC
  {
    id: 'kosaraju', name: 'SCC (Kosaraju)', category: 'Strongly Connected Components', difficulty: 'Advanced',
    description: 'Two-pass DFS (original + transpose) to find SCCs.',
    dataStructure: 'Finish order + transposed graph',
    requirements: { directed: 'directed', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(V + E)', spaceComplexity: 'O(V + E)',
    useCases: ['Web communities', 'Module cycles', 'Condensation graphs'],
    limitations: ['Directed only', 'Two passes + transpose memory'],
    pseudocode: [
      'DFS original graph → finish order',
      'transpose the graph',
      'DFS transposed in reverse finish order',
      'each DFS tree = one SCC',
    ],
    suitability: { good: ['Directed graphs', 'Teaching two-pass technique'], bad: ['Undirected (use connected components)', 'Single-pass (use Tarjan)'] },
    related: ['tarjan', 'dfs', 'cycle-detection'],
    keywords: ['scc', 'strongly connected', 'community', 'cycle group'],
    panelKind: 'scc',
    legend: [{ color: C.amber, label: 'Current' }, { color: C.green, label: 'SCC member' }],
    build: wrap('kosaraju', kosaraju),
  },
  {
    id: 'tarjan', name: 'SCC (Tarjan)', category: 'Strongly Connected Components', difficulty: 'Advanced',
    description: 'Single DFS with discovery index and low-link values.',
    dataStructure: 'DFS stack + low-link',
    requirements: { directed: 'directed', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(V + E)', spaceComplexity: 'O(V)',
    useCases: ['Module cycles', 'Compiler analysis', 'Community detection'],
    limitations: ['Directed only', 'Low-link logic is subtle'],
    pseudocode: [
      'strongconnect(u):',
      '  index[u] = low[u] = ++t; push u',
      '  for each edge (u → v):',
      '    if unvisited: recurse; low[u] = min(low[u], low[v])',
      '    else if v on stack: low[u] = min(low[u], index[v])',
      '  if low[u] == index[u]: pop SCC',
    ],
    suitability: { good: ['Single-pass SCC', 'Directed graphs'], bad: ['Undirected graphs'] },
    related: ['kosaraju', 'bridges', 'articulation', 'dfs'],
    keywords: ['scc', 'tarjan', 'low link', 'strongly connected'],
    panelKind: 'scc',
    legend: [{ color: C.amber, label: 'Current' }, { color: C.green, label: 'SCC member' }, { color: C.red, label: 'Back edge' }],
    build: wrap('tarjan', tarjan),
  },

  // ---------------------------------------------------------- bridges / AP
  {
    id: 'bridges', name: 'Bridges', category: 'Connectivity', difficulty: 'Advanced',
    description: 'Edges whose removal disconnects the graph (low-link DFS).',
    dataStructure: 'tin / low arrays',
    requirements: { directed: 'undirected', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(V + E)', spaceComplexity: 'O(V)',
    useCases: ['Network reliability', 'Critical links', 'Infrastructure analysis'],
    limitations: ['Undirected only'],
    pseudocode: [
      'DFS(u, parent):',
      '  tin[u] = low[u] = ++t',
      '  for each neighbor v:',
      '    if unvisited: recurse; low[u] = min(low[u], low[v])',
      '    if low[v] > tin[u] → (u,v) is a BRIDGE',
    ],
    suitability: { good: ['Finding single points of failure'], bad: ['Directed graphs'] },
    related: ['articulation', 'dfs', 'tarjan'],
    keywords: ['bridge', 'critical', 'failure', 'reliability'],
    panelKind: 'lowlink',
    legend: [{ color: C.red, label: 'Bridge' }, { color: C.green, label: 'Tree edge' }, { color: C.amber, label: 'Current' }],
    build: wrap('bridges', bridges),
  },
  {
    id: 'articulation', name: 'Articulation Points', category: 'Connectivity', difficulty: 'Advanced',
    description: 'Vertices whose removal increases the number of components.',
    dataStructure: 'tin / low arrays',
    requirements: { directed: 'undirected', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(V + E)', spaceComplexity: 'O(V)',
    useCases: ['Critical hubs', 'Transportation planning', 'Network robustness'],
    limitations: ['Undirected only'],
    pseudocode: [
      'DFS(u, parent):',
      '  tin[u] = low[u] = ++t; children = 0',
      '  for each neighbor v:',
      '    if unvisited: children++; recurse; low[u] = min(low[u], low[v])',
      '    if (root and children > 1) or low[v] ≥ tin[u] → u is an ARTICULATION POINT',
    ],
    suitability: { good: ['Critical infrastructure analysis'], bad: ['Directed graphs'] },
    related: ['bridges', 'dfs', 'tarjan'],
    keywords: ['articulation', 'critical', 'hub', 'cut vertex'],
    panelKind: 'lowlink',
    legend: [{ color: C.red, label: 'Articulation point' }, { color: C.green, label: 'Visited' }, { color: C.amber, label: 'Current' }],
    build: wrap('articulation', articulation),
  },

  // ---------------------------------------------------------- euler / hamilton
  {
    id: 'euler-circuit', name: 'Euler Circuit', category: 'Euler / Hamiltonian', difficulty: 'Intermediate',
    description: 'Traverse every EDGE exactly once and return to the start.',
    dataStructure: 'Stack + remaining-edge tracking',
    requirements: { directed: 'undirected', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(V + E)', spaceComplexity: 'O(E)',
    useCases: ['Street sweeping', 'Snow plowing', 'Postman routes'],
    limitations: ['Requires all even degrees (circuit)'],
    pseudocode: [
      'check degrees: all must be EVEN for a circuit',
      'start anywhere',
      'follow unused edges (stack)',
      'when stuck → backtrack, record the trail',
    ],
    suitability: { good: ['Covering every edge once', 'Return to start'], bad: ['Visit every VERTEX once (that is Hamiltonian!)'] },
    related: ['euler-path', 'hamiltonian-cycle'],
    keywords: ['euler', 'edges', 'street', 'route', 'trail'],
    panelKind: 'euler',
    legend: [{ color: C.green, label: 'Edge used' }, { color: C.cyan, label: 'Trail' }, { color: C.amber, label: 'Current' }],
    build: wrap('euler-circuit', (g, p) => euler(g, { ...p, mode: 'circuit' })),
  },
  {
    id: 'euler-path', name: 'Euler Path', category: 'Euler / Hamiltonian', difficulty: 'Intermediate',
    description: 'Traverse every EDGE exactly once (may end elsewhere).',
    dataStructure: 'Stack + remaining-edge tracking',
    requirements: { directed: 'undirected', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(V + E)', spaceComplexity: 'O(E)',
    useCases: ['Mail delivery', 'Inspection routes'],
    limitations: ['Requires exactly 0 or 2 odd-degree vertices'],
    pseudocode: [
      'check degrees: exactly 0 or 2 ODD vertices',
      'start at an odd vertex (any if all even)',
      'follow unused edges (stack)',
      'when stuck → backtrack, record the trail',
    ],
    suitability: { good: ['Covering every edge once', 'One-way inspection'], bad: ['Visit every VERTEX once (Hamiltonian!)'] },
    related: ['euler-circuit', 'hamiltonian-path'],
    keywords: ['euler', 'path', 'edges', 'delivery'],
    panelKind: 'euler',
    legend: [{ color: C.green, label: 'Edge used' }, { color: C.cyan, label: 'Trail' }, { color: C.amber, label: 'Current' }],
    build: wrap('euler-path', (g, p) => euler(g, { ...p, mode: 'path' })),
  },
  {
    id: 'hamiltonian-path', name: 'Hamiltonian Path', category: 'Euler / Hamiltonian', difficulty: 'Advanced',
    description: 'Visit every VERTEX exactly once — exact backtracking.',
    dataStructure: 'Backtracking search tree',
    requirements: { directed: 'any', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: 12 },
    complexity: 'Exponential (worst case)', spaceComplexity: 'O(V)', complexityNote: 'Exact Hamiltonian search is NP-complete.',
    useCases: ['Route planning (small)', 'Teaching combinatorial explosion'],
    limitations: ['Explodes beyond ~12 vertices'],
    pseudocode: [
      'path ← [start]',
      'if path covers all vertices → SOLUTION',
      'for each unvisited neighbor: extend the path',
      'if dead end → BACKTRACK',
      'solution found (or none exists)',
    ],
    suitability: { good: ['Small exact search', 'Educational backtracking'], bad: ['Large graphs (exact search is exponential)'] },
    related: ['hamiltonian-cycle', 'tsp-exact', 'dfs'],
    keywords: ['hamiltonian', 'vertices', 'route', 'backtracking', 'exponential'],
    panelKind: 'hamilton',
    legend: [{ color: C.cyan, label: 'Current path' }, { color: C.red, label: 'Backtrack' }, { color: C.green, label: 'Solution' }],
    build: wrap('hamiltonian-path', (g, p) => hamiltonian(g, { ...p, mode: 'path' })),
  },
  {
    id: 'hamiltonian-cycle', name: 'Hamiltonian Cycle', category: 'Euler / Hamiltonian', difficulty: 'Advanced',
    description: 'Visit every VERTEX exactly once and return — exact backtracking.',
    dataStructure: 'Backtracking search tree',
    requirements: { directed: 'any', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: 12 },
    complexity: 'Exponential (worst case)', spaceComplexity: 'O(V)',
    useCases: ['Round trips', 'TSP foundation'],
    limitations: ['Explodes beyond ~12 vertices'],
    pseudocode: [
      'path ← [start]',
      'if path covers all vertices AND last→start exists → CYCLE',
      'for each unvisited neighbor: extend the path',
      'if dead end → BACKTRACK',
      'solution found (or none exists)',
    ],
    suitability: { good: ['Small exact round trips'], bad: ['Large graphs'] },
    related: ['hamiltonian-path', 'tsp-exact', 'euler-circuit'],
    keywords: ['hamiltonian', 'cycle', 'vertices', 'tour'],
    panelKind: 'hamilton',
    legend: [{ color: C.cyan, label: 'Current path' }, { color: C.red, label: 'Backtrack' }, { color: C.green, label: 'Solution' }],
    build: wrap('hamiltonian-cycle', (g, p) => hamiltonian(g, { ...p, mode: 'cycle' })),
  },
  {
    id: 'tsp-exact', name: 'TSP — Exact', category: 'Euler / Hamiltonian', difficulty: 'Advanced',
    description: 'Minimum-cost Hamiltonian cycle via branch-and-bound (small graphs).',
    dataStructure: 'Branch-and-bound search',
    requirements: { directed: 'any', weighted: 'weighted', negativeWeights: 'no', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 2, maxNodes: 9 },
    complexity: 'O((V−1)!) worst case', spaceComplexity: 'O(V)', complexityNote: 'Exact TSP is NP-hard — combinatorial explosion.',
    useCases: ['Small routing problems', 'Teaching NP-hardness'],
    limitations: ['Impractical beyond ~9 cities exact'],
    pseudocode: [
      'tour ← [start]',
      'extend the tour to the next unvisited city',
      'prune if cost ≥ best found',
      'record new best complete tour',
      'backtrack and try other orderings',
    ],
    suitability: { good: ['Tiny exact tours'], bad: ['Large instances (use heuristics)'] },
    related: ['hamiltonian-cycle', 'tsp-nn'],
    keywords: ['tsp', 'salesman', 'tour', 'optimization', 'np-hard'],
    panelKind: 'tsp',
    legend: [{ color: C.cyan, label: 'Best tour' }, { color: C.amber, label: 'Current' }, { color: C.red, label: 'Pruned' }],
    build: wrap('tsp-exact', tspExact),
  },
  {
    id: 'tsp-nn', name: 'TSP — Nearest Neighbor (heuristic)', category: 'Euler / Hamiltonian', difficulty: 'Advanced',
    description: 'Greedy nearest-neighbor tour + 2-opt improvement. Approximate.',
    dataStructure: 'Greedy tour + 2-opt',
    requirements: { directed: 'any', weighted: 'weighted', negativeWeights: 'no', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 2, maxNodes: 40 },
    complexity: 'O(V²)', spaceComplexity: 'O(V)', complexityNote: 'Heuristic — no optimality guarantee.',
    useCases: ['Large routing problems', 'Fast approximate tours'],
    limitations: ['NOT guaranteed optimal'],
    pseudocode: [
      'start at a city',
      'repeatedly visit the NEAREST unvisited city (greedy)',
      'return to start',
      '2-opt: uncross pairs to improve (heuristic)',
    ],
    suitability: { good: ['Fast approximate tours', 'Large instances'], bad: ['When optimality is required (use exact, small n)'] },
    related: ['tsp-exact', 'hamiltonian-cycle'],
    keywords: ['tsp', 'heuristic', 'nearest neighbor', '2-opt', 'approximate'],
    panelKind: 'tsp',
    legend: [{ color: C.cyan, label: 'Tour' }, { color: C.amber, label: 'Current city' }],
    build: wrap('tsp-nn', tspNearestNeighbor),
  },

  // ---------------------------------------------------------- flow
  {
    id: 'ford-fulkerson', name: 'Ford-Fulkerson', category: 'Maximum Flow', difficulty: 'Advanced',
    description: 'Augmenting-path max flow (DFS-based path search).',
    dataStructure: 'Residual graph',
    requirements: { directed: 'any', weighted: 'weighted', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: true, bipartite: false, minNodes: 2, maxNodes: Infinity },
    complexity: 'O(E · maxFlow)', spaceComplexity: 'O(V + E)', complexityNote: 'Not polynomial if capacities are irrational; Edmonds-Karp fixes this.',
    useCases: ['Water / bandwidth / supply modeling', 'Teaching residual graphs'],
    limitations: ['Can be slow without BFS path choice'],
    pseudocode: [
      'flow ← 0',
      'find an augmenting path in the residual graph',
      'bottleneck ← min residual capacity on the path',
      'augment flow; update forward + reverse residuals',
      'repeat until no path remains',
    ],
    suitability: { good: ['Teaching augmenting paths', 'Small integer capacities'], bad: ['Large graphs (use Edmonds-Karp / Dinic)'] },
    related: ['edmonds-karp', 'dinic'],
    keywords: ['flow', 'capacity', 'pipeline', 'bandwidth', 'max flow'],
    panelKind: 'flow',
    legend: [{ color: C.amber, label: 'Augmenting path' }, { color: C.cyan, label: 'Source' }, { color: C.red, label: 'Sink' }],
    build: wrap('ford-fulkerson', fordFulkerson),
  },
  {
    id: 'edmonds-karp', name: 'Edmonds-Karp', category: 'Maximum Flow', difficulty: 'Advanced',
    description: 'Ford-Fulkerson with BFS shortest augmenting paths — polynomial.',
    dataStructure: 'Residual graph + BFS',
    requirements: { directed: 'any', weighted: 'weighted', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: true, bipartite: false, minNodes: 2, maxNodes: Infinity },
    complexity: 'O(V · E²)', spaceComplexity: 'O(V + E)',
    useCases: ['Network bandwidth', 'Water pipelines', 'Traffic throughput'],
    limitations: ['Slower than Dinic on large networks'],
    pseudocode: [
      'flow ← 0',
      'BFS: find a shortest augmenting path',
      'bottleneck ← min residual capacity on the path',
      'augment flow; update forward + reverse residuals',
      'repeat until no path remains',
    ],
    suitability: { good: ['Deterministic polynomial max flow'], bad: ['Very large networks (use Dinic)'] },
    related: ['ford-fulkerson', 'dinic'],
    keywords: ['flow', 'capacity', 'edmonds karp', 'max flow'],
    panelKind: 'flow',
    legend: [{ color: C.amber, label: 'Augmenting path' }, { color: C.cyan, label: 'Source' }, { color: C.red, label: 'Sink' }],
    build: wrap('edmonds-karp', edmondsKarp),
  },
  {
    id: 'dinic', name: 'Dinic', fullName: "Dinic's Algorithm", category: 'Maximum Flow', difficulty: 'Advanced',
    description: 'Max flow using level graphs and blocking flows.',
    dataStructure: 'Level graph + DFS blocking flow',
    requirements: { directed: 'any', weighted: 'weighted', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: true, bipartite: false, minNodes: 2, maxNodes: Infinity },
    complexity: 'O(V² E) general', spaceComplexity: 'O(V + E)', complexityNote: 'O(E√V) on unit-capacity networks — very fast in practice.',
    useCases: ['Large flow networks', 'Competitive programming'],
    limitations: ['More complex to implement'],
    pseudocode: [
      'flow ← 0',
      'BFS: build the level graph (stop if sink unreachable)',
      'DFS: push blocking flow along levels',
      'repeat',
    ],
    suitability: { good: ['Large networks', 'Unit capacities'], bad: ['Teaching basics (start with Edmonds-Karp)'] },
    related: ['edmonds-karp', 'ford-fulkerson'],
    keywords: ['dinic', 'flow', 'level graph', 'blocking flow'],
    panelKind: 'flow',
    legend: [{ color: C.amber, label: 'Pushing flow' }, { color: C.cyan, label: 'Source' }, { color: C.red, label: 'Sink' }],
    build: wrap('dinic', dinic),
  },

  // ---------------------------------------------------------- matching
  {
    id: 'bipartite-matching', name: 'Bipartite Matching', category: 'Matching', difficulty: 'Advanced',
    description: 'Maximum matching via Kuhn augmenting paths.',
    dataStructure: 'Alternating paths',
    requirements: { directed: 'any', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: true, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(V · E)', spaceComplexity: 'O(V)',
    useCases: ['Job assignment', 'Course allocation', 'Recommendation pairing'],
    limitations: ['Needs a two-part graph'],
    pseudocode: [
      'for each left node u:',
      '  try to find an augmenting path',
      '  follow alternating matched/unmatched edges',
      '  flip the path → matching size + 1',
    ],
    suitability: { good: ['Two-sided assignment'], bad: ['Non-bipartite graphs'] },
    related: ['hopcroft-karp', 'bipartite'],
    keywords: ['matching', 'assignment', 'augmenting path', 'bipartite'],
    panelKind: 'matching',
    legend: [{ color: C.green, label: 'Matched edge' }, { color: C.amber, label: 'Augmenting' }, { color: C.blue, label: 'Left / Right' }],
    build: wrap('bipartite-matching', bipartiteMatching),
  },
  {
    id: 'hopcroft-karp', name: 'Hopcroft-Karp', category: 'Matching', difficulty: 'Advanced',
    description: 'Maximum bipartite matching in BFS+DFS phases.',
    dataStructure: 'Layered graph',
    requirements: { directed: 'any', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: true, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(E√V)', spaceComplexity: 'O(V)',
    useCases: ['Large-scale assignment', 'Bipartite matching at scale'],
    limitations: ['Bipartite graphs only'],
    pseudocode: [
      'repeat:',
      '  BFS: layer left nodes by augmenting-path length',
      '  DFS: augment along the layers',
      'until no augmenting path exists',
    ],
    suitability: { good: ['Large bipartite graphs'], bad: ['Small graphs (Kuhn is simpler)'] },
    related: ['bipartite-matching', 'bipartite'],
    keywords: ['hopcroft karp', 'matching', 'layered', 'assignment'],
    panelKind: 'matching',
    legend: [{ color: C.green, label: 'Matched edge' }, { color: C.amber, label: 'Augmenting' }],
    build: wrap('hopcroft-karp', hopcroftKarp),
  },

  // ---------------------------------------------------------- applications
  {
    id: 'pagerank', name: 'PageRank', category: 'Ranking / Reachability', difficulty: 'Advanced',
    description: 'Iterative link-based ranking of nodes.',
    dataStructure: 'Rank vector',
    requirements: { directed: 'any', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: Infinity },
    complexity: 'O(iterations · E)', spaceComplexity: 'O(V)',
    useCases: ['Web ranking (conceptually)', 'Influence analysis', 'Recommendation'],
    limitations: ['A teaching model — not the modern search stack'],
    pseudocode: [
      'rank[v] ← 1/N',
      'repeat:',
      '  rank[v] ← (1−d)/N + d · Σ rank[u]/outdeg(u)',
      'until convergence',
    ],
    suitability: { good: ['Link-based importance'], bad: ['Claiming it is how modern search engines work'] },
    related: ['transitive-closure', 'bfs'],
    keywords: ['pagerank', 'ranking', 'web', 'influence'],
    panelKind: 'pagerank',
    legend: [{ color: C.amber, label: 'High rank' }, { color: C.blue, label: 'Low rank' }],
    build: wrap('pagerank', pageRank),
  },
  {
    id: 'transitive-closure', name: 'Transitive Closure', category: 'Ranking / Reachability', difficulty: 'Advanced',
    description: 'All-pairs reachability (Warshall) — who can reach whom?',
    dataStructure: 'Reachability matrix',
    requirements: { directed: 'any', weighted: 'any', negativeWeights: 'na', requiresStart: false, requiresTarget: false, requiresSourceSink: false, bipartite: false, minNodes: 1, maxNodes: 12 },
    complexity: 'O(V³)', spaceComplexity: 'O(V²)',
    useCases: ['Dependency reachability', 'Permissions', 'Directed networks'],
    limitations: ['O(V³) — small graphs only'],
    pseudocode: [
      'reach[i][j] ← 1 if edge (or i == j)',
      'for each k:',
      '  reach[i][j] |= reach[i][k] && reach[k][j]',
    ],
    suitability: { good: ['Reachability analysis', 'Permission propagation'], bad: ['Need actual paths (use BFS/DFS)'] },
    related: ['floyd-warshall', 'pagerank', 'bfs'],
    keywords: ['reachability', 'closure', 'matrix', 'permissions'],
    panelKind: 'matrix01',
    legend: [{ color: C.amber, label: 'Updated cell' }],
    build: wrap('transitive-closure', transitiveClosure),
  },
];

// ---------------------------------------------------------------- lookup
const byId = new Map(ALGORITHMS.map((a) => [a.id, a]));

export function getAlgorithm(id) {
  return byId.get(id) || null;
}

export const CATEGORIES = [...new Set(ALGORITHMS.map((a) => a.category))];

export const ROADMAP = [
  { level: 'LEVEL 1 — FUNDAMENTALS', ids: ['bfs', 'dfs'] },
  { level: 'LEVEL 2 — PATHS', ids: ['dijkstra', 'astar', 'bellman-ford'] },
  { level: 'LEVEL 3 — STRUCTURE', ids: ['connected-components', 'cycle-detection', 'kahn', 'bipartite'] },
  { level: 'LEVEL 4 — MST', ids: ['kruskal', 'prim', 'dsu'] },
  { level: 'LEVEL 5 — ADVANCED STRUCTURE', ids: ['kosaraju', 'bridges', 'articulation'] },
  { level: 'LEVEL 6 — OPTIMIZATION', ids: ['edmonds-karp', 'dinic', 'bipartite-matching', 'hamiltonian-cycle', 'tsp-exact'] },
];

// ------------------------------------------------------ compatibility logic
export function validate(algorithm, graph, params = {}) {
  const req = algorithm.requirements;
  const problems = [];

  if (req.requiresStart && !params.start) problems.push('A start node is required.');
  if (req.requiresTarget && !params.target) problems.push('A target node is required.');
  if (req.requiresSourceSink && (!params.source || !params.sink)) problems.push('A source and a sink node are required.');
  if (graph.nodeCount < req.minNodes) problems.push(`Needs at least ${req.minNodes} node(s).`);
  if (graph.nodeCount > req.maxNodes) problems.push(`This exact algorithm grows exponentially — keep graphs ≤ ${req.maxNodes} vertices.`);

  if (req.directed === 'undirected' && graph.directed) problems.push('Requires an UNDIRECTED graph.');
  if (req.directed === 'directed' && !graph.directed) problems.push('Requires a DIRECTED graph.');

  const neg = graph.getEdges().some((e) => e.weight < 0);
  if (req.negativeWeights === 'no' && neg) problems.push('This algorithm requires NON-NEGATIVE edge weights.');
  if (req.weighted === 'zeroone' && graph.getEdges().some((e) => e.weight !== 0 && e.weight !== 1)) {
    problems.push('This algorithm requires edge weights of only 0 or 1.');
  }
  if (req.bipartite && graph.getEdges().length > 0) {
    const hasLeft = graph.getNodes().some((n) => n.metadata.part === 'left');
    const hasRight = graph.getNodes().some((n) => n.metadata.part === 'right');
    if (!hasLeft || !hasRight) problems.push('Requires a two-part (bipartite) graph: left and right nodes.');
  }

  return problems;
}

export function compatible(algorithm, graph, params = {}) {
  return validate(algorithm, graph, params).length === 0;
}

// ------------------------------------------------------ "I need to…" metadata
export const NEEDS = [
  { need: 'Find shortest path', ids: ['dijkstra', 'astar', 'bellman-ford', 'floyd-warshall', 'zero-one-bfs', 'bfs'], why: 'Shortest-path algorithms minimize cost or hops between nodes.' },
  { need: 'Connect everything cheaply', ids: ['kruskal', 'prim'], why: 'This is a Minimum Spanning Tree problem.' },
  { need: 'Find dependency order', ids: ['kahn', 'dfs-topo'], why: 'Topological sort orders a DAG so every dependency comes first.' },
  { need: 'Detect cycles', ids: ['cycle-detection', 'dfs', 'bellman-ford'], why: 'Cycle detection finds back edges (and negative cycles for Bellman-Ford).' },
  { need: 'Find critical infrastructure', ids: ['bridges', 'articulation'], why: 'Bridges and articulation points are the single points of failure.' },
  { need: 'Visit every edge', ids: ['euler-circuit', 'euler-path'], why: 'Euler trails cover every edge exactly once.' },
  { need: 'Visit every vertex', ids: ['hamiltonian-path', 'hamiltonian-cycle', 'tsp-exact', 'tsp-nn'], why: 'Hamiltonian paths/cycles visit every vertex exactly once (TSP minimizes cost).' },
  { need: 'Maximize network capacity', ids: ['edmonds-karp', 'dinic', 'ford-fulkerson'], why: 'Maximum-flow algorithms find the largest source→sink throughput.' },
  { need: 'Match two groups', ids: ['bipartite-matching', 'hopcroft-karp', 'bipartite'], why: 'Bipartite matching pairs two disjoint sets optimally.' },
  { need: 'Find reachable nodes', ids: ['bfs', 'dfs', 'connected-components', 'transitive-closure'], why: 'Traversal and reachability algorithms discover what is connected.' },
  { need: 'Find strongly connected groups', ids: ['kosaraju', 'tarjan'], why: 'SCC algorithms find mutually-reachable groups in directed graphs.' },
  { need: 'Rank by link structure', ids: ['pagerank'], why: 'PageRank assigns importance from link structure.' },
];

export function searchAlgorithms(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALGORITHMS.filter((a) => {
    const hay = [a.name, a.fullName, a.category, a.description, ...a.useCases, ...a.keywords].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

export function recommend(needText) {
  const q = needText.trim().toLowerCase();
  const found = NEEDS.find((n) => n.need.toLowerCase() === q || n.need.toLowerCase().includes(q) || q.includes(n.need.toLowerCase()));
  return found || null;
}
