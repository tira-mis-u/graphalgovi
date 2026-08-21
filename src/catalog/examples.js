/**
 * Example / scenario catalog — reusable real-world datasets.
 *
 * Each example declares which algorithm(s) it supports, what the graph means,
 * and how it should be parameterized. Algorithms and examples are fully
 * independent: the same engine runs on any compatible example.
 */

// ---- shorthand helpers -----------------------------------------------------
const N = (id, x, y, part) => ({ id, label: id, x, y, metadata: part ? { part } : {} });
const E = (from, to, weight = 1, directed) => ({ from, to, weight, directed: !!directed });
const EX = (o) => ({
  id: o.id,
  title: o.title,
  algorithm: o.algorithm, // primary algorithm id (for the detail page)
  alsoFor: o.alsoFor || [], // other algorithms that can use this example
  problem: { heading: o.heading || o.title, text: o.text },
  nodeMeaning: o.nodeMeaning,
  edgeMeaning: o.edgeMeaning,
  weightMeaning: o.weightMeaning || '—',
  directed: o.directed || false,
  weighted: o.weighted || false,
  nodes: o.nodes,
  edges: o.edges,
  startNode: o.startNode,
  targetNode: o.targetNode,
  sourceNode: o.sourceNode,
  sinkNode: o.sinkNode,
  params: o.params || {},
  explanation: o.explanation || [],
  insight: o.insight || '',
  graphTheory: o.graphTheory || [],
});

// ---- shared "one graph, many questions" city graph --------------------------
export const CITY_NODES = [
  N('A', -360, 60), N('B', -120, 140), N('C', 120, 160), N('D', 360, 100),
  N('E', -240, -140), N('F', 0, -40), N('G', 240, -140), N('H', 60, 40),
];
export const CITY_EDGES = [
  E('A', 'B', 5), E('A', 'E', 4), E('B', 'C', 3), E('B', 'F', 7),
  E('C', 'D', 6), E('C', 'G', 8), E('D', 'G', 2), E('E', 'F', 3),
  E('F', 'G', 4), E('F', 'H', 2), E('H', 'C', 6), E('H', 'G', 5),
];

// ---- grid helper for pathfinding -------------------------------------------
// rows of strings: 'S' start, 'T' target, '.' open, '#' wall
export function gridGraph(rows, { directed = false, costs = {} } = {}) {
  const nodes = [];
  const edges = [];
  let start = null;
  let target = null;
  const cell = {};
  const H = rows.length;
  const W = Math.max(...rows.map((r) => r.length));
  const scale = 78;
  rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === '#') return;
      const id = `${r},${c}`;
      const x = (c - (W - 1) / 2) * scale;
      const y = (r - (H - 1) / 2) * scale;
      nodes.push(N(id, x, y));
      cell[id] = true;
      if (ch === 'S') start = id;
      if (ch === 'T') target = id;
    });
  });
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === '#') return;
      const id = `${r},${c}`;
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        const nid = `${nr},${nc}`;
        if (!cell[nid]) continue;
        const key = costs[`${id}->${nid}`] || 1;
        edges.push(E(id, nid, key, directed));
      }
    });
  });
  return { nodes, edges, start, target };
}

// ============================================================================
export const EXAMPLES = [
  // ------------------------- BFS -------------------------------------------
  EX({
    id: 'bfs-social', algorithm: 'bfs', title: 'Social Network', heading: 'Who can An reach?',
    text: 'Starting from An, find everyone reachable through friendships and how many hops away they are.',
    nodeMeaning: 'A person.', edgeMeaning: 'A friendship.', graphTheory: [
      { term: 'VERTEX', def: 'A person.' }, { term: 'EDGE', def: 'Friendship.', diagram: { kind: 'edge' } },
      { term: 'TYPE', def: 'Undirected graph.' }, { term: 'WHY BFS?', def: 'Levels = friendship distance.' },
    ],
    nodes: [
      N('An', 0, 0), N('Binh', -250, -130), N('Chi', 30, -175), N('Tuan', 270, -115),
      N('Dung', -385, -285), N('Lan', -150, -295), N('Mai', 40, -325), N('Phuc', 205, -335), N('Khoa', 395, -250),
    ],
    edges: [E('An', 'Binh'), E('An', 'Chi'), E('An', 'Tuan'), E('Binh', 'Dung'), E('Binh', 'Lan'), E('Chi', 'Mai'), E('Mai', 'Phuc'), E('Tuan', 'Khoa')],
    startNode: 'An',
    explanation: ['BFS explores in rings: An, then direct friends, then friends-of-friends.', 'Each ring is a level — level k means k hops from An.'],
    insight: 'BFS finds everyone and their hop distance from the start.',
  }),
  EX({
    id: 'bfs-network', algorithm: 'bfs', title: 'Router Reachability', heading: 'How far does the signal go?',
    text: 'Starting from Router A, which devices are reachable within N hops?',
    nodeMeaning: 'A network device.', edgeMeaning: 'A connection.', graphTheory: [
      { term: 'NODE', def: 'Device.' }, { term: 'EDGE', def: 'Link.', diagram: { kind: 'star' } },
      { term: 'WHY BFS?', def: 'BFS levels are hop counts.' },
    ],
    nodes: [
      N('RouterA', 0, 0), N('RouterB', -230, -150), N('RouterC', 230, -150), N('ServerA', -395, -320),
      N('ComputerB', -95, -320), N('Switch', 240, -330), N('Printer', 60, -330), N('Laptop', -95, -480), N('ServerB', 400, -480),
    ],
    edges: [E('RouterA', 'RouterB'), E('RouterA', 'RouterC'), E('RouterB', 'ServerA'), E('RouterB', 'ComputerB'), E('RouterC', 'Switch'), E('RouterC', 'Printer'), E('ComputerB', 'Laptop'), E('Switch', 'ServerB')],
    startNode: 'RouterA',
    explanation: ['BFS expands hop by hop from the router.', 'The maximum level reached is the network diameter from Router A.'],
    insight: 'BFS answers "reachable within N hops" naturally.',
  }),
  EX({
    id: 'bfs-grid', algorithm: 'bfs', title: 'Grid Pathfinding', heading: 'Shortest path on a grid',
    text: 'BFS on an unweighted grid finds the fewest-step path around walls.',
    nodeMeaning: 'A tile.', edgeMeaning: 'A step.', graphTheory: [
      { term: 'NODE', def: 'Tile.' }, { term: 'EDGE', def: 'One step between tiles.' },
      { term: 'WHY BFS?', def: 'Uniform step cost ⇒ BFS finds fewest steps.' },
    ],
    ...gridGraph(['S.......', '..#..#..', '..#..#..', '....#.T.']),
    startNode: '0,0', targetNode: '3,7', weighted: false,
    explanation: ['Every step costs 1, so BFS is optimal here.', 'Compare with Dijkstra/A* on the same grid.'],
    insight: 'BFS = Dijkstra when all weights are 1.',
  }),

  // ------------------------- DFS -------------------------------------------
  EX({
    id: 'dfs-filesystem', algorithm: 'dfs', title: 'File System', heading: 'Explore every file & folder',
    text: 'Explore a project tree from the root folder down to each file.',
    nodeMeaning: 'A file or folder.', edgeMeaning: 'Containment.', graphTheory: [
      { term: 'NODE', def: 'File / folder.' }, { term: 'EDGE', def: 'Contains.', diagram: { kind: 'tree' } },
      { term: 'WHY DFS?', def: 'Recursion matches directory structure.' },
    ],
    nodes: [
      N('Project', 0, 0), N('src', -200, -160), N('assets', 220, -160), N('README', 30, 200),
      N('algorithms', -300, -350), N('main.js', -90, -350), N('bfs.js', -410, -520), N('dfs.js', -190, -520),
      N('logo.svg', 130, -350), N('graph.png', 330, -350),
    ],
    edges: [E('Project', 'src'), E('Project', 'assets'), E('Project', 'README'), E('src', 'algorithms'), E('src', 'main.js'), E('algorithms', 'bfs.js'), E('algorithms', 'dfs.js'), E('assets', 'logo.svg'), E('assets', 'graph.png')],
    startNode: 'Project',
    explanation: ['DFS dives into src → algorithms → bfs.js, then returns and tries dfs.js.', 'This is exactly how a recursive directory walk works.'],
    insight: 'DFS finishes a whole subtree before moving sideways.',
  }),
  EX({
    id: 'dfs-dependency', algorithm: 'dfs', title: 'Module Dependencies', heading: 'Follow dependency chains',
    text: 'DFS follows a dependency chain to its end before backtracking.',
    nodeMeaning: 'A module.', edgeMeaning: 'Depends on.', directed: true, graphTheory: [
      { term: 'NODE', def: 'Module.' }, { term: 'EDGE', def: 'Dependency.', diagram: { kind: 'edge', directed: true } },
      { term: 'WHY DFS?', def: 'Chains reveal back edges (cycles).' },
    ],
    nodes: [N('App', 0, 0), N('Auth', -200, -160), N('Logger', 0, -160), N('Cache', 200, -160), N('Database', -300, -340), N('Utils', -70, -340), N('Config', -450, -510), N('Email', 410, -40)],
    edges: [E('App', 'Auth', 1, true), E('App', 'Logger', 1, true), E('App', 'Cache', 1, true), E('Auth', 'Database', 1, true), E('Auth', 'Utils', 1, true), E('Database', 'Config', 1, true), E('Database', 'Cache', 1, true), E('Config', 'Auth', 1, true), E('Logger', 'Utils', 1, true), E('Email', 'Auth', 1, true)],
    startNode: 'App',
    explanation: ['DFS descends App → Auth → Database → Config and finds Config → Auth, a back edge (cycle).', 'Watch the call stack grow and unwind.'],
    insight: 'DFS reveals traversal structure and cycles.',
  }),

  // ------------------------- connected components ---------------------------
  EX({
    id: 'cc-groups', algorithm: 'connected-components', title: 'Isolated Groups', heading: 'Find isolated groups',
    text: 'A network has drifted apart. Which devices can still talk to each other?',
    nodeMeaning: 'A device.', edgeMeaning: 'A live link.', graphTheory: [
      { term: 'COMPONENT', def: 'A maximal set of mutually reachable nodes.' },
      { term: 'WHY?', def: 'Identify disconnected groups.' },
    ],
    nodes: [N('A', -300, 0), N('B', -180, 0), N('C', -240, 120), N('D', 60, 0), N('E', 180, 0), N('F', 300, 120), N('G', 0, -200)],
    edges: [E('A', 'B'), E('B', 'C'), E('C', 'A'), E('D', 'E'), E('E', 'F')],
    startNode: 'A',
    explanation: ['Three components exist: {A,B,C}, {D,E,F}, and isolated {G}.', 'Each unvisited node starts a new component.'],
    insight: 'Connected components partition the graph.',
  }),

  // ------------------------- cycle detection --------------------------------
  EX({
    id: 'cycle-undirected', algorithm: 'cycle-detection', title: 'Undirected Cycle', heading: 'Is this graph acyclic?',
    text: 'Detect a cycle in an undirected network (e.g., a redundant link).',
    nodeMeaning: 'A node.', edgeMeaning: 'A connection.', graphTheory: [
      { term: 'CYCLE', def: 'A path that returns to its start.', diagram: { kind: 'cycle' } },
      { term: 'WHY?', def: 'Cycles mean redundancy — or bugs.' },
    ],
    nodes: [N('A', -200, 0), N('B', 0, -120), N('C', 200, 0), N('D', 0, 120)],
    edges: [E('A', 'B'), E('B', 'C'), E('C', 'D'), E('D', 'A'), E('A', 'C')],
    startNode: 'A',
    explanation: ['DFS tracks the parent; a visited non-parent neighbour closes a cycle.', 'Here A–C is the closing edge.'],
    insight: 'Undirected cycle = visited non-parent neighbour.',
  }),
  EX({
    id: 'cycle-directed', algorithm: 'cycle-detection', title: 'Directed Cycle', heading: 'Does a dependency cycle exist?',
    text: 'Detect a cycle in a directed dependency graph (a DAG check).',
    nodeMeaning: 'A task/module.', edgeMeaning: 'Depends on.', directed: true, graphTheory: [
      { term: 'DAG', def: 'Directed Acyclic Graph.', diagram: { kind: 'path' } },
      { term: 'WHY?', def: 'A cycle makes a build order impossible.' },
    ],
    nodes: [N('A', 0, -120), N('B', -160, 60), N('C', 160, 60), N('D', 0, 200)],
    edges: [E('A', 'B', 1, true), E('B', 'D', 1, true), E('A', 'C', 1, true), E('C', 'D', 1, true), E('D', 'A', 1, true)],
    startNode: 'A',
    explanation: ['3-color DFS: GRAY = on stack. D → A hits a GRAY node = back edge = cycle.'],
    insight: 'Directed cycle = back edge to a GRAY node.',
  }),

  // ------------------------- bipartite --------------------------------------
  EX({
    id: 'bip-students', algorithm: 'bipartite', title: 'Students & Projects', heading: 'Can we split into two groups?',
    text: 'Students and projects — every edge joins the two groups.',
    nodeMeaning: 'A person or a project.', edgeMeaning: 'An assignment.', graphTheory: [
      { term: 'BIPARTITE', def: 'Two independent sets; every edge crosses.' },
      { term: 'WHY?', def: 'Basis for matching algorithms.' },
    ],
    nodes: [N('S1', -300, -140), N('S2', -300, 40), N('S3', -300, 200), N('P1', 300, -140), N('P2', 300, 40), N('P3', 300, 200)],
    edges: [E('S1', 'P1'), E('S1', 'P2'), E('S2', 'P1'), E('S2', 'P3'), E('S3', 'P2'), E('S3', 'P3')],
    startNode: 'S1',
    explanation: ['BFS 2-colors the graph; alternating colors never conflict.', 'Edges only join different colors → bipartite.'],
    insight: 'Bipartite ⇔ no odd cycle.',
  }),
  EX({
    id: 'bip-odd', algorithm: 'bipartite', title: 'Odd Cycle', heading: 'Why this graph cannot be split',
    text: 'A triangle forces a color conflict.',
    nodeMeaning: 'A node.', edgeMeaning: 'A relation.', graphTheory: [
      { term: 'ODD CYCLE', def: 'Makes 2-coloring impossible.', diagram: { kind: 'cycle' } },
    ],
    nodes: [N('A', -160, 80), N('B', 160, 80), N('C', 0, -120), N('D', 0, 180)],
    edges: [E('A', 'B'), E('B', 'C'), E('C', 'A'), E('A', 'D')],
    startNode: 'A',
    explanation: ['A–B–C form a triangle: an odd cycle.', 'Coloring fails when two same-colored neighbours meet.'],
    insight: 'The odd cycle is the obstruction.',
  }),

  // ------------------------- dijkstra ---------------------------------------
  EX({
    id: 'dij-city', algorithm: 'dijkstra', title: 'City Navigation', heading: 'Fastest route across town',
    text: 'Find the shortest travel distance from A to H through city roads.',
    nodeMeaning: 'An intersection.', edgeMeaning: 'A road.', weightMeaning: 'Travel distance (km).',
    directed: false, weighted: true, graphTheory: [
      { term: 'NODE', def: 'Intersection.' }, { term: 'EDGE', def: 'Road.', diagram: { kind: 'edge' } },
      { term: 'WHY DIJKSTRA?', def: 'Non-negative distances → settle nearest first.' },
    ],
    nodes: CITY_NODES, edges: CITY_EDGES, startNode: 'A', targetNode: 'D',
    explanation: ['Dijkstra repeatedly settles the closest unsettled node.', 'The distance table and priority queue show exactly how the frontier grows.'],
    insight: 'Dijkstra = "always expand the closest node first".',
  }),
  EX({
    id: 'dij-routing', algorithm: 'dijkstra', title: 'Network Routing', heading: 'Lowest-latency route',
    text: 'Route a packet from R1 to R6 minimizing total latency.',
    nodeMeaning: 'A router.', edgeMeaning: 'A link.', weightMeaning: 'Latency (ms).',
    directed: true, weighted: true, graphTheory: [
      { term: 'NODE', def: 'Router.' }, { term: 'EDGE', def: 'Link.', diagram: { kind: 'edge', directed: true } },
      { term: 'WHY DIJKSTRA?', def: 'Link-state routing uses shortest paths.' },
    ],
    nodes: [N('R1', -340, -60), N('R2', -120, 80), N('R3', 60, 140), N('R4', 240, 40), N('R5', -60, -160), N('R6', 360, -60)],
    edges: [E('R1', 'R2', 4, true), E('R1', 'R5', 2, true), E('R2', 'R3', 1, true), E('R5', 'R2', 3, true), E('R3', 'R4', 5, true), E('R5', 'R6', 9, true), E('R4', 'R6', 2, true)],
    startNode: 'R1', targetNode: 'R6',
    explanation: ['Weights are latencies; Dijkstra finds the minimum-latency path.', 'Arrows show that links are directional.'],
    insight: 'Routing tables are built from shortest paths.',
  }),
  EX({
    id: 'dij-logistics', algorithm: 'dijkstra', title: 'Delivery Logistics', heading: 'Cheapest delivery route',
    text: 'Move a package from the warehouse to the customer at minimum cost.',
    nodeMeaning: 'A warehouse / location.', edgeMeaning: 'A route.', weightMeaning: 'Travel cost.',
    directed: false, weighted: true, graphTheory: [
      { term: 'NODE', def: 'Location.' }, { term: 'EDGE', def: 'Route.' },
    ],
    nodes: [N('WH', -320, 0), N('L1', -120, 120), N('L2', -120, -120), N('L3', 120, 120), N('L4', 120, -120), N('CUST', 340, 0)],
    edges: [E('WH', 'L1', 6), E('WH', 'L2', 4), E('L1', 'L3', 2), E('L2', 'L4', 3), E('L1', 'L2', 2), E('L3', 'CUST', 3), E('L4', 'CUST', 5), E('L3', 'L4', 1)],
    startNode: 'WH', targetNode: 'CUST',
    explanation: ['Costs are non-negative, so Dijkstra applies.', 'The final path is the cheapest route.'],
    insight: 'Same engine, different story: roads, links, or routes.',
  }),

  // ------------------------- A* ---------------------------------------------
  EX({
    id: 'astar-game', algorithm: 'astar', title: 'Game Pathfinding', heading: 'Reach the target around walls',
    text: 'A* finds a path through a grid, guided by a heuristic.',
    nodeMeaning: 'A tile.', edgeMeaning: 'A move.', weightMeaning: 'Movement cost.',
    directed: false, weighted: false, params: { heuristic: 'manhattan' },
    graphTheory: [
      { term: 'NODE', def: 'Tile.' }, { term: 'EDGE', def: 'Move.' },
      { term: 'WHY A*?', def: 'f = g + h guides search toward the target.' },
    ],
    ...gridGraph(['S...#...', '.#.#....', '.#.#.#..', '.....#.T']),
    startNode: '0,0', targetNode: '3,7', weighted: true,
    explanation: ['g = cost so far, h = Manhattan estimate to the target, f = g + h.', 'A* always expands the lowest f — so it heads toward the target.'],
    insight: 'A good heuristic makes A* explore far fewer tiles than BFS/Dijkstra.',
  }),
  EX({
    id: 'astar-robot', algorithm: 'astar', title: 'Robot Navigation', heading: 'Move a robot through a room',
    text: 'A robot navigates around obstacles to its charging dock.',
    nodeMeaning: 'A position.', edgeMeaning: 'A valid move.', weightMeaning: 'Movement cost.',
    directed: false, weighted: false, params: { heuristic: 'euclidean' },
    graphTheory: [
      { term: 'NODE', def: 'Position.' }, { term: 'EDGE', def: 'Valid movement.' },
    ],
    ...gridGraph(['S....#..', '.###.#..', '...#.#..', '.#...T..']),
    startNode: '0,0', targetNode: '3,7', weighted: true,
    explanation: ['Euclidean distance is an admissible heuristic for straight-line moves.', 'A* still visits many tiles, but fewer than blind search.'],
    insight: 'Heuristics encode problem knowledge.',
  }),

  // ------------------------- bellman-ford -----------------------------------
  EX({
    id: 'bf-negative', algorithm: 'bellman-ford', title: 'Negative Edges', heading: 'When costs can be negative',
    text: 'Some routes have negative cost (refunds, arbitrage). Dijkstra fails; Bellman-Ford handles it.',
    nodeMeaning: 'A state.', edgeMeaning: 'A transition.', weightMeaning: 'Cost (can be negative).',
    directed: true, weighted: true, graphTheory: [
      { term: 'NEGATIVE EDGE', def: 'Dijkstra cannot handle these.', diagram: { kind: 'edge', directed: true } },
      { term: 'WHY BF?', def: 'Relaxes every edge |V|−1 times.' },
    ],
    nodes: [N('A', -240, 0), N('B', 0, -140), N('C', 240, 0), N('D', 0, 140)],
    edges: [E('A', 'B', 4, true), E('B', 'C', -6, true), E('A', 'C', 3, true), E('A', 'D', 5, true), E('D', 'C', 2, true)],
    startNode: 'A',
    explanation: ['dist[C] starts at 3 via A→C, but A→B→C = 4 − 6 = −2 is better.', 'Bellman-Ford keeps relaxing until distances stabilize.'],
    insight: 'Bellman-Ford is the safe choice when negative weights may exist.',
  }),
  EX({
    id: 'bf-negcycle', algorithm: 'bellman-ford', title: 'Negative Cycle', heading: 'Detecting an impossible case',
    text: 'A negative cycle means "shortest path" is undefined — you can loop forever and keep decreasing cost.',
    nodeMeaning: 'A currency / state.', edgeMeaning: 'An exchange / transition.', weightMeaning: 'Cost.',
    directed: true, weighted: true, graphTheory: [
      { term: 'NEGATIVE CYCLE', def: 'Total cycle weight < 0.', diagram: { kind: 'cycle' } },
    ],
    nodes: [N('A', 0, -120), N('B', -160, 60), N('C', 160, 60)],
    edges: [E('A', 'B', 1, true), E('B', 'C', -2, true), E('C', 'A', -5, true)],
    startNode: 'A',
    explanation: ['After |V|−1 passes an edge can still relax → negative cycle.', 'The offending edge is highlighted.'],
    insight: 'Negative cycles make shortest paths undefined.',
  }),

  // ------------------------- floyd-warshall ---------------------------------
  EX({
    id: 'fw-network', algorithm: 'floyd-warshall', title: 'All-Pairs Distances', heading: 'Every pair, one matrix',
    text: 'Compute the shortest distance between every pair of nodes at once.',
    nodeMeaning: 'A node.', edgeMeaning: 'A directed link.', weightMeaning: 'Distance.',
    directed: true, weighted: true, graphTheory: [
      { term: 'ALL-PAIRS', def: 'One matrix of all distances.' },
      { term: 'WHY FW?', def: 'Simple O(V³) — fine for dense small graphs.' },
    ],
    nodes: [N('A', -260, -100), N('B', -60, -100), N('C', 140, -100), N('D', -160, 140), N('E', 40, 140)],
    edges: [E('A', 'B', 3, true), E('B', 'C', 4, true), E('A', 'C', 10, true), E('A', 'D', 6, true), E('D', 'E', 2, true), E('E', 'C', 3, true), E('B', 'D', 2, true)],
    startNode: 'A', targetNode: 'C',
    explanation: ['Each k allows node k as an intermediate.', 'dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]).'],
    insight: 'Use Floyd-Warshall when you need many pairs, not one.',
  }),

  // ------------------------- 0-1 BFS ----------------------------------------
  EX({
    id: '01-teleport', algorithm: 'zero-one-bfs', title: 'Free Shortcuts', heading: '0-cost shortcuts',
    text: 'Some edges are free (0), some cost 1. A deque replaces the priority queue.',
    nodeMeaning: 'A state.', edgeMeaning: 'A move.', weightMeaning: '0 = free, 1 = one step.',
    directed: false, weighted: true, graphTheory: [
      { term: '0-1 WEIGHTS', def: 'Special case: deque is enough.' },
      { term: 'WHY?', def: 'Faster than general Dijkstra.' },
    ],
    nodes: [N('A', -300, 0), N('B', -100, -120), N('C', 100, -120), N('D', 300, 0), N('E', 0, 140)],
    edges: [E('A', 'B', 1), E('B', 'C', 0), E('C', 'D', 0), E('A', 'E', 1), E('E', 'D', 0)],
    startNode: 'A', targetNode: 'D',
    explanation: ['0-cost edges push FRONT (process immediately); 1-cost edges push BACK.', 'This keeps the deque sorted by distance.'],
    insight: '0-1 BFS = Dijkstra specialized to two weight values.',
  }),

  // ------------------------- MST (kruskal / prim) ---------------------------
  EX({
    id: 'mst-fiber', algorithm: 'kruskal', alsoFor: ['prim'], title: 'Fiber Network Design', heading: 'Cheapest way to connect every building',
    text: 'Connect all buildings with fiber at minimum total installation cost.',
    nodeMeaning: 'A building.', edgeMeaning: 'A possible cable run.', weightMeaning: 'Installation cost.',
    directed: false, weighted: true, graphTheory: [
      { term: 'MST', def: 'Minimum total weight, no cycles.' },
      { term: 'WHY KRUSKAL?', def: 'Process edges in ascending cost order.' },
    ],
    nodes: CITY_NODES, edges: CITY_EDGES, startNode: 'A',
    explanation: ['Sort edges by cost and keep adding the cheapest ones that do not create a cycle.', 'Rejected edges would close a cycle.'],
    insight: 'MST connects everything at minimum total cost.',
  }),
  EX({
    id: 'mst-grid', algorithm: 'prim', alsoFor: ['kruskal'], title: 'Electrical Grid', heading: 'Grow the grid from a substation',
    text: 'Start at a substation and expand the cheapest possible connections.',
    nodeMeaning: 'A substation.', edgeMeaning: 'A possible line.', weightMeaning: 'Construction cost.',
    directed: false, weighted: true, graphTheory: [
      { term: 'MST', def: 'Minimum total weight, no cycles.' },
      { term: 'WHY PRIM?', def: 'Grow one tree from a start vertex.' },
    ],
    nodes: CITY_NODES, edges: CITY_EDGES, startNode: 'A',
    explanation: ['Prim grows a single tree, always adding the cheapest edge crossing the cut.', 'The FRONTIER panel shows the cut edges.'],
    insight: 'Kruskal sorts globally; Prim grows locally from a root.',
  }),

  // ------------------------- DSU --------------------------------------------
  EX({
    id: 'dsu-demo', algorithm: 'dsu', title: 'Union-Find Demo', heading: 'Track groups with Union-Find',
    text: 'See how parent pointers, union-by-size and path compression merge sets.',
    nodeMeaning: 'An element.', edgeMeaning: 'A union operation.', graphTheory: [
      { term: 'DSU', def: 'Nearly O(1) set operations.' },
      { term: 'WHY?', def: 'Powers Kruskal and connectivity.' },
    ],
    nodes: [N('A', -260, -80), N('B', -120, -80), N('C', 20, -80), N('D', 160, -80), N('E', -200, 100), N('F', 40, 100)],
    edges: [E('A', 'B'), E('B', 'C'), E('C', 'D'), E('E', 'F'), E('B', 'E')],
    startNode: 'A',
    explanation: ['Each edge is a UNION: merge the two sets.', 'Same-component edges are skipped (would form a cycle).'],
    insight: 'DSU is the workhorse behind Kruskal.',
  }),

  // ------------------------- topological sort -------------------------------
  EX({
    id: 'topo-courses', algorithm: 'kahn', alsoFor: ['dfs-topo'], title: 'Course Prerequisites', heading: 'In what order can I take these courses?',
    text: 'Each course requires some others to be finished first.',
    nodeMeaning: 'A course.', edgeMeaning: 'Must be taken before.', directed: true, graphTheory: [
      { term: 'DAG', def: 'Prerequisites form a DAG.', diagram: { kind: 'path' } },
      { term: 'WHY KAHN?', def: 'Remove zero in-degree nodes iteratively.' },
    ],
    nodes: [N('Math', -300, -100), N('Prog', -300, 100), N('DS', 0, -140), N('Algo', 0, 40), N('DB', 0, 200), N('Web', 300, 40)],
    edges: [E('Math', 'DS', 1, true), E('Math', 'Algo', 1, true), E('Prog', 'DS', 1, true), E('Prog', 'Web', 1, true), E('DS', 'Algo', 1, true), E('Algo', 'Web', 1, true), E('DB', 'Web', 1, true)],
    startNode: 'Math',
    explanation: ['Courses with no prerequisites enter the queue first.', 'Removing them unlocks their dependents.'],
    insight: 'The queue order is a valid study plan.',
  }),
  EX({
    id: 'topo-build', algorithm: 'kahn', alsoFor: ['dfs-topo'], title: 'Build System', heading: 'Compilation order',
    text: 'Compile source files in dependency order.',
    nodeMeaning: 'A build target.', edgeMeaning: 'Must build first.', directed: true, graphTheory: [
      { term: 'TOPOLOGICAL ORDER', def: 'Every edge points forward.' },
    ],
    nodes: [N('util', -300, 0), N('core', -100, 120), N('api', -100, -120), N('app', 120, 0), N('test', 320, 0)],
    edges: [E('util', 'core', 1, true), E('util', 'api', 1, true), E('core', 'app', 1, true), E('api', 'app', 1, true), E('app', 'test', 1, true)],
    startNode: 'util',
    explanation: ['The build order respects every dependency edge.', 'A cycle would make this impossible.'],
    insight: 'Build systems are topological sorts in disguise.',
  }),

  // ------------------------- SCC --------------------------------------------
  EX({
    id: 'scc-web', algorithm: 'kosaraju', alsoFor: ['tarjan'], title: 'Web Link Analysis', heading: 'Mutually-linked page groups',
    text: 'Pages linking to each other form strongly connected groups.',
    nodeMeaning: 'A web page.', edgeMeaning: 'A hyperlink.', directed: true, graphTheory: [
      { term: 'SCC', def: 'Maximal mutually-reachable set.', diagram: { kind: 'cycle' } },
      { term: 'WHY?', def: 'Find dense communities.' },
    ],
    nodes: [N('P1', -300, -80), N('P2', -100, -160), N('P3', -300, -200), N('P4', 120, -60), N('P5', 300, -120), N('P6', 120, -220)],
    edges: [E('P1', 'P2', 1, true), E('P2', 'P3', 1, true), E('P3', 'P1', 1, true), E('P2', 'P4', 1, true), E('P4', 'P5', 1, true), E('P5', 'P6', 1, true), E('P6', 'P4', 1, true)],
    startNode: 'P1',
    explanation: ['Two SCCs: {P1,P2,P3} and {P4,P5,P6}.', 'Kosaraju: one DFS, transpose, another DFS.'],
    insight: 'SCCs collapse the graph into a DAG.',
  }),
  EX({
    id: 'scc-modules', algorithm: 'tarjan', alsoFor: ['kosaraju'], title: 'Module Cycles', heading: 'Which modules cycle together?',
    text: 'Find groups of modules that all depend on each other.',
    nodeMeaning: 'A module.', edgeMeaning: 'Depends on.', directed: true, graphTheory: [
      { term: 'SCC', def: 'Maximal mutually-reachable set.' },
      { term: 'WHY TARJAN?', def: 'Single DFS with low-link values.' },
    ],
    nodes: [N('A', -300, -80), N('B', -100, -160), N('C', -300, -200), N('D', 120, -60), N('E', 300, -120), N('F', 120, -220)],
    edges: [E('A', 'B', 1, true), E('B', 'C', 1, true), E('C', 'A', 1, true), E('B', 'D', 1, true), E('D', 'E', 1, true), E('E', 'F', 1, true), E('F', 'D', 1, true)],
    startNode: 'A',
    explanation: ['Watch index and low-link values update as the DFS unfolds.', 'When low[u] == index[u], an SCC pops off the stack.'],
    insight: 'Tarjan finds all SCCs in one pass.',
  }),

  // ------------------------- bridges / articulation -------------------------
  EX({
    id: 'bridge-network', algorithm: 'bridges', title: 'Network Reliability', heading: 'Which links are critical?',
    text: 'If one cable breaks, which failures split the network in two?',
    nodeMeaning: 'A router.', edgeMeaning: 'A cable.', graphTheory: [
      { term: 'BRIDGE', def: 'Removing it disconnects the graph.' },
      { term: 'WHY?', def: 'Identify single points of failure.' },
    ],
    nodes: [N('R1', -320, -40), N('R2', -160, 100), N('R3', 0, -40), N('R4', 160, 100), N('R5', 320, -40), N('R6', 0, 180)],
    edges: [E('R1', 'R2'), E('R2', 'R3'), E('R3', 'R4'), E('R4', 'R5'), E('R1', 'R3'), E('R3', 'R5'), E('R3', 'R6')],
    startNode: 'R1',
    explanation: ['Edges like R3–R6 are bridges: no alternate path exists.', 'low[child] > tin[parent] marks a bridge.'],
    insight: 'Bridges are the single points of failure in a network.',
  }),
  EX({
    id: 'ap-transport', algorithm: 'articulation', title: 'Transportation Hubs', heading: 'Which stations are critical?',
    text: 'Which stations, if closed, would cut the network into pieces?',
    nodeMeaning: 'A station.', edgeMeaning: 'A route.', graphTheory: [
      { term: 'ARTICULATION POINT', def: 'Removing it increases component count.' },
      { term: 'WHY?', def: 'Critical infrastructure planning.' },
    ],
    nodes: [N('S1', -320, -40), N('S2', -160, 100), N('S3', 0, -40), N('S4', 160, 100), N('S5', 320, -40), N('S6', 0, 180)],
    edges: [E('S1', 'S2'), E('S2', 'S3'), E('S3', 'S4'), E('S4', 'S5'), E('S1', 'S3'), E('S3', 'S5'), E('S3', 'S6')],
    startNode: 'S1',
    explanation: ['S3 is an articulation point: removing it splits the network.', 'Root with >1 children, or low[v] ≥ tin[u].'],
    insight: 'Articulation points are the critical vertices.',
  }),

  // ------------------------- euler ------------------------------------------
  EX({
    id: 'euler-circuit', algorithm: 'euler-circuit', title: 'Street Inspection', heading: 'Cover every street once',
    text: 'Can a snowplow cover every street exactly once and return home?',
    nodeMeaning: 'An intersection.', edgeMeaning: 'A street.', graphTheory: [
      { term: 'EULER CIRCUIT', def: 'Every edge once, returns to start.', diagram: { kind: 'cycle' } },
      { term: 'CONDITION', def: 'All vertices have even degree.' },
    ],
    nodes: [N('A', -200, -80), N('B', 0, -160), N('C', 200, -80), N('D', 0, 80), N('E', -200, 180), N('F', 200, 180)],
    edges: [E('A', 'B'), E('B', 'C'), E('C', 'D'), E('D', 'A'), E('A', 'E'), E('E', 'F'), E('F', 'D'), E('D', 'C'), E('C', 'B'), E('B', 'A')],
    startNode: 'A',
    explanation: ['Every node has even degree, so an Euler circuit exists.', 'Hierholzer walks edges and backtracks to splice subtours.'],
    insight: 'Euler = every EDGE exactly once (not every vertex!).',
  }),
  EX({
    id: 'euler-path', algorithm: 'euler-path', title: 'Delivery Route', heading: 'One pass, no return needed',
    text: 'A mail route covers every segment once; starting and ending at different points.',
    nodeMeaning: 'An intersection.', edgeMeaning: 'A delivery segment.', graphTheory: [
      { term: 'EULER PATH', def: 'Every edge once, ends elsewhere.', diagram: { kind: 'path' } },
      { term: 'CONDITION', def: 'Exactly 0 or 2 odd-degree vertices.' },
    ],
    nodes: [N('A', -300, -60), N('B', -100, 60), N('C', 100, -60), N('D', 300, 60), N('E', -100, -180), N('F', 100, 180)],
    edges: [E('A', 'B'), E('B', 'C'), E('C', 'D'), E('A', 'E'), E('E', 'B'), E('C', 'F'), E('F', 'D'), E('B', 'F')],
    startNode: 'A',
    explanation: ['A and D have odd degree (3), so the trail must start and end there.', 'The trail visits every edge exactly once.'],
    insight: 'Exactly two odd vertices → Euler path.',
  }),

  // ------------------------- hamiltonian / tsp ------------------------------
  EX({
    id: 'ham-cycle', algorithm: 'hamiltonian-cycle', alsoFor: ['hamiltonian-path'], title: 'Route Planning', heading: 'Visit every city exactly once',
    text: 'Visit each city exactly once and return home — can it be done?',
    nodeMeaning: 'A city.', edgeMeaning: 'A road.', graphTheory: [
      { term: 'HAMILTONIAN CYCLE', def: 'Every VERTEX once, back to start.', diagram: { kind: 'cycle' } },
      { term: 'WARNING', def: 'Exact search is exponential.' },
    ],
    nodes: [N('A', 0, -200), N('B', 200, -100), N('C', 150, 100), N('D', -150, 100), N('E', -200, -100)],
    edges: [E('A', 'B'), E('B', 'C'), E('C', 'D'), E('D', 'E'), E('E', 'A'), E('A', 'C'), E('B', 'D')],
    startNode: 'A',
    explanation: ['Backtracking tries paths and unwinds when stuck.', 'The search tree shows the combinatorial explosion.'],
    insight: 'Hamiltonian = every VERTEX exactly once (contrast with Euler).',
  }),
  EX({
    id: 'tsp-5', algorithm: 'tsp-exact', title: 'TSP — Exact (5 cities)', heading: 'The shortest closed tour',
    text: 'Visit all 5 cities exactly once, return, and minimize total distance.',
    nodeMeaning: 'A city.', edgeMeaning: 'A road.', weightMeaning: 'Distance.',
    directed: false, weighted: true, graphTheory: [
      { term: 'TSP', def: 'Hamiltonian cycle of minimum cost.', diagram: { kind: 'cycle' } },
      { term: 'WARNING', def: 'Exact TSP is NP-hard — exponential.' },
    ],
    nodes: [N('A', 0, -220), N('B', 220, -80), N('C', 140, 160), N('D', -140, 160), N('E', -220, -80)],
    edges: [E('A', 'B', 4), E('B', 'C', 3), E('C', 'D', 5), E('D', 'E', 3), E('E', 'A', 6), E('A', 'C', 8), E('A', 'D', 7), E('B', 'D', 6), E('B', 'E', 5), E('C', 'E', 4)],
    startNode: 'A',
    explanation: ['Branch-and-bound prunes tours once they exceed the best found.', 'The optimal tour and its cost are shown.'],
    insight: 'Exact TSP explodes: (n−1)!/2 tours for n cities.',
  }),
  EX({
    id: 'tsp-8', algorithm: 'tsp-nn', title: 'TSP — Heuristic (8 cities)', heading: 'A quick, approximate tour',
    text: 'Nearest-neighbor + 2-opt gives a fast approximate tour for larger instances.',
    nodeMeaning: 'A city.', edgeMeaning: 'A road.', weightMeaning: 'Distance.',
    directed: false, weighted: true, graphTheory: [
      { term: 'HEURISTIC', def: 'Fast but NOT guaranteed optimal.', diagram: { kind: 'cycle' } },
      { term: 'WHY?', def: 'Exact TSP is impractical at scale.' },
    ],
    nodes: [N('A', -300, -200), N('B', 0, -260), N('C', 300, -200), N('D', 380, 60), N('E', 140, 200), N('F', -140, 220), N('G', -340, 80), N('H', -80, 0)],
    edges: [E('A', 'B', 6), E('B', 'C', 6), E('C', 'D', 8), E('D', 'E', 7), E('E', 'F', 6), E('F', 'G', 7), E('G', 'A', 5), E('A', 'H', 4), E('H', 'B', 5), E('H', 'E', 9), E('F', 'H', 8), E('G', 'H', 6), E('A', 'C', 9), E('C', 'E', 9), E('D', 'F', 9), E('B', 'D', 9)],
    startNode: 'A',
    explanation: ['Nearest-neighbor greedily moves to the closest unvisited city.', '2-opt then removes crossing pairs to improve the tour.', 'Result is approximate — not optimal.'],
    insight: 'Heuristics trade optimality for speed.',
  }),

  // ------------------------- flow -------------------------------------------
  EX({
    id: 'flow-pipeline', algorithm: 'edmonds-karp', title: 'Water Pipeline', heading: 'Maximum water throughput',
    text: 'How much water can flow from the reservoir to the city per minute?',
    nodeMeaning: 'A junction.', edgeMeaning: 'A pipe.', weightMeaning: 'Capacity.',
    directed: true, weighted: true, graphTheory: [
      { term: 'FLOW NETWORK', def: 'Source → sink with capacities.' },
      { term: 'WHY EK?', def: 'BFS augmenting paths = polynomial.' },
    ],
    nodes: [N('S', -300, 0), N('A', -100, -120), N('B', -100, 120), N('C', 100, -120), N('D', 100, 120), N('T', 300, 0)],
    edges: [E('S', 'A', 10, true), E('S', 'B', 5, true), E('A', 'B', 5, true), E('A', 'C', 5, true), E('B', 'D', 10, true), E('C', 'D', 10, true), E('C', 'T', 10, true), E('D', 'T', 5, true)],
    sourceNode: 'S', sinkNode: 'T',
    explanation: ['Edges show flow/capacity as the algorithm augments.', 'Reverse residual edges let earlier decisions be undone.'],
    insight: 'Max flow = min cut; here the bottleneck caps throughput.',
  }),
  EX({
    id: 'flow-bandwidth', algorithm: 'ford-fulkerson', title: 'Network Bandwidth', heading: 'Max data rate between sites',
    text: 'What is the maximum sustained bandwidth between two data centers?',
    nodeMeaning: 'A router.', edgeMeaning: 'A link.', weightMeaning: 'Bandwidth (Gbps).',
    directed: true, weighted: true, graphTheory: [
      { term: 'FLOW NETWORK', def: 'Source → sink with capacities.' },
      { term: 'WHY FF?', def: 'Classic augmenting-path framework.' },
    ],
    nodes: [N('S', -300, 0), N('A', -120, -100), N('B', -120, 100), N('C', 120, -100), N('D', 120, 100), N('T', 300, 0)],
    edges: [E('S', 'A', 16, true), E('S', 'B', 13, true), E('A', 'B', 4, true), E('A', 'C', 12, true), E('B', 'D', 14, true), E('C', 'D', 9, true), E('C', 'T', 20, true), E('D', 'T', 4, true)],
    sourceNode: 'S', sinkNode: 'T',
    explanation: ['The augmenting path and its bottleneck are highlighted each round.', 'Total flow converges to the max-flow value.'],
    insight: 'Max flow models bandwidth, water, traffic, supply.',
  }),
  EX({
    id: 'flow-dinic', algorithm: 'dinic', title: 'Supply Chain', heading: 'Maximum shipment capacity',
    text: 'Dinic solves the same problem with level graphs — faster on big networks.',
    nodeMeaning: 'A facility.', edgeMeaning: 'A shipment lane.', weightMeaning: 'Capacity.',
    directed: true, weighted: true, graphTheory: [
      { term: 'LEVEL GRAPH', def: 'BFS layers; DFS pushes blocking flow.' },
      { term: 'WHY DINIC?', def: 'Fewer phases than single-path methods.' },
    ],
    nodes: [N('S', -300, 0), N('A', -100, -120), N('B', -100, 120), N('C', 100, -120), N('D', 100, 120), N('T', 300, 0)],
    edges: [E('S', 'A', 10, true), E('S', 'B', 10, true), E('A', 'C', 8, true), E('B', 'D', 8, true), E('A', 'B', 4, true), E('C', 'T', 10, true), E('D', 'T', 10, true), E('C', 'D', 2, true)],
    sourceNode: 'S', sinkNode: 'T',
    explanation: ['Each phase: BFS builds levels, DFS pushes blocking flow.', 'Watch phases repeat until the sink is unreachable.'],
    insight: 'Dinic is one of the fastest practical max-flow algorithms.',
  }),

  // ------------------------- matching ---------------------------------------
  EX({
    id: 'match-jobs', algorithm: 'bipartite-matching', alsoFor: ['hopcroft-karp'], title: 'Job Assignment', heading: 'Match candidates to jobs',
    text: 'Assign as many candidates as possible to jobs they can do (one job each).',
    nodeMeaning: 'A candidate (left) / job (right).', edgeMeaning: 'Candidate can do the job.', graphTheory: [
      { term: 'MATCHING', def: 'No vertex used twice.' },
      { term: 'WHY?', def: 'Augmenting paths increase the matching.' },
    ],
    nodes: [N('A', -300, -160, 'left'), N('B', -300, 0, 'left'), N('C', -300, 160, 'left'), N('X', 300, -160, 'right'), N('Y', 300, 0, 'right'), N('Z', 300, 160, 'right')],
    edges: [E('A', 'X'), E('A', 'Y'), E('B', 'X'), E('B', 'Z'), E('C', 'Y'), E('C', 'Z')],
    explanation: ['Kuhn finds an augmenting path to increase the matching.', 'Watch a matched pair get reassigned to free up a job.'],
    insight: 'Maximum matching = assignment problem without weights.',
  }),
  EX({
    id: 'match-hopcroft', algorithm: 'hopcroft-karp', alsoFor: ['bipartite-matching'], title: 'Large-scale Matching', heading: 'Matching in layers',
    text: 'Hopcroft-Karp finds several shortest augmenting paths per phase.',
    nodeMeaning: 'A left/right vertex.', edgeMeaning: 'A possible pair.', graphTheory: [
      { term: 'BFS + DFS PHASES', def: 'Layer then augment.' },
      { term: 'WHY HK?', def: 'Faster than Kuhn on large graphs.' },
    ],
    nodes: [N('A', -300, -160, 'left'), N('B', -300, 0, 'left'), N('C', -300, 160, 'left'), N('X', 300, -160, 'right'), N('Y', 300, 0, 'right'), N('Z', 300, 160, 'right')],
    edges: [E('A', 'X'), E('A', 'Y'), E('B', 'X'), E('B', 'Z'), E('C', 'Y'), E('C', 'Z')],
    explanation: ['BFS layers the left nodes, DFS augments along the layers.', 'Multiple disjoint augmenting paths per phase.'],
    insight: 'Hopcroft-Karp is the industrial-strength bipartite matcher.',
  }),

  // ------------------------- pagerank / closure -----------------------------
  EX({
    id: 'pr-web', algorithm: 'pagerank', title: 'Web Link Graph', heading: 'Which page is most important?',
    text: 'Pages link to each other; rank them by link structure.',
    nodeMeaning: 'A web page.', edgeMeaning: 'A hyperlink.', directed: true, graphTheory: [
      { term: 'PAGERANK', def: 'Iterative link-based ranking.', diagram: { kind: 'edge', directed: true } },
      { term: 'NOTE', def: 'A teaching model, not the modern search stack.' },
    ],
    nodes: [N('A', -200, 0), N('B', 0, -160), N('C', 200, 0), N('D', 0, 160)],
    edges: [E('A', 'B', 1, true), E('B', 'C', 1, true), E('C', 'A', 1, true), E('A', 'D', 1, true), E('D', 'C', 1, true), E('C', 'D', 1, true)],
    startNode: 'A',
    explanation: ['Each iteration, pages pass (1−d)+d·rank/outdeg to their links.', 'Ranks converge; the top page emerges.'],
    insight: 'Rank flows along links, reinforcing important pages.',
  }),
  EX({
    id: 'tc-reach', algorithm: 'transitive-closure', title: 'Reachability Matrix', heading: 'Who can reach whom?',
    text: 'Compute whether a path exists between every ordered pair.',
    nodeMeaning: 'An entity.', edgeMeaning: 'A direct relation.', directed: true, graphTheory: [
      { term: 'TRANSITIVE CLOSURE', def: 'All-pairs reachability.' },
      { term: 'WHY?', def: 'Permissions, dependency reachability.' },
    ],
    nodes: [N('A', -260, -80), N('B', -60, -80), N('C', 140, -80), N('D', -160, 120), N('E', 60, 120)],
    edges: [E('A', 'B', 1, true), E('B', 'C', 1, true), E('A', 'D', 1, true), E('D', 'E', 1, true), E('E', 'C', 1, true)],
    startNode: 'A',
    explanation: ['reach[i][j] |= reach[i][k] && reach[k][j] for each intermediate k.', 'The 0/1 matrix updates live.'],
    insight: 'Reachability underpins dependency and permission analysis.',
  }),
];

export function getExample(id) {
  return EXAMPLES.find((e) => e.id === id) || null;
}

export function examplesFor(algorithmId) {
  return EXAMPLES.filter((e) => e.algorithm === algorithmId || e.alsoFor.includes(algorithmId));
}
