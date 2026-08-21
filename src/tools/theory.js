/**
 * Theory Mode — concept definitions + a small graph-property explorer that
 * computes real properties of the current graph (no fake data).
 */

export const CONCEPTS = [
  { term: 'Graph', def: 'A set of vertices connected by edges.', example: 'A social network, a road map, a dependency tree.', related: ['bfs', 'dfs'] },
  { term: 'Vertex / Node', def: 'A fundamental unit of a graph.', example: 'A person, a router, a city.', related: ['bfs'] },
  { term: 'Edge', def: 'A connection between two vertices.', example: 'A friendship, a cable, a road.', related: ['bfs'] },
  { term: 'Directed Graph', def: 'Edges have a direction (u → v).', example: 'Hyperlinks, dependencies.', related: ['kahn', 'kosaraju'] },
  { term: 'Undirected Graph', def: 'Edges are bidirectional (u — v).', example: 'Friendships, cables.', related: ['kruskal', 'bridges'] },
  { term: 'Weighted Graph', def: 'Edges carry a numeric weight.', example: 'Distances, costs, capacities.', related: ['dijkstra', 'kruskal'] },
  { term: 'Degree', def: 'The number of edges incident to a vertex.', example: 'In-degree: incoming; out-degree: outgoing.', related: ['euler-circuit'] },
  { term: 'Path', def: 'A sequence of vertices where consecutive ones are joined by edges.', example: 'A → B → C.', related: ['dijkstra', 'astar'] },
  { term: 'Walk / Trail', def: 'A walk may repeat vertices; a trail never repeats edges.', example: 'Euler trails visit every edge once.', related: ['euler-path'] },
  { term: 'Cycle', def: 'A closed path that returns to its start.', example: 'A → B → C → A.', related: ['cycle-detection'] },
  { term: 'Connected Component', def: 'A maximal set of mutually reachable vertices.', example: 'Separate friend groups.', related: ['connected-components'] },
  { term: 'Tree', def: 'A connected acyclic graph (V−1 edges).', example: 'A file system.', related: ['dfs', 'prim'] },
  { term: 'Forest', def: 'A disjoint collection of trees.', example: 'Several disconnected trees.', related: ['connected-components'] },
  { term: 'Spanning Tree', def: 'A tree using all vertices of a graph.', example: 'A backbone network.', related: ['kruskal', 'prim'] },
  { term: 'Minimum Spanning Tree', def: 'A spanning tree of minimum total weight.', example: 'Cheapest fiber layout.', related: ['kruskal', 'prim'] },
  { term: 'Bipartite Graph', def: 'Vertices split into two sets; every edge crosses.', example: 'Students ↔ projects.', related: ['bipartite', 'bipartite-matching'] },
  { term: 'DAG', def: 'A Directed Acyclic Graph.', example: 'Prerequisites, build order.', related: ['kahn', 'dfs-topo'] },
  { term: 'Strongly Connected Component', def: 'A maximal set where every vertex reaches every other.', example: 'Mutually-linked pages.', related: ['kosaraju', 'tarjan'] },
  { term: 'Euler Path / Circuit', def: 'Visits every EDGE exactly once.', example: 'Street inspection.', related: ['euler-path', 'euler-circuit'] },
  { term: 'Hamiltonian Path / Cycle', def: 'Visits every VERTEX exactly once.', example: 'Round-trip city tours.', related: ['hamiltonian-path', 'tsp-exact'] },
  { term: 'Flow Network', def: 'Directed graph with capacities on edges.', example: 'Water pipes, bandwidth.', related: ['edmonds-karp', 'dinic'] },
  { term: 'Residual Graph', def: 'Remaining capacity + reverse edges.', example: 'How flow algorithms "undo".', related: ['ford-fulkerson'] },
  { term: 'Cut', def: 'A partition of vertices; capacity = sum of crossing edges.', example: 'Max-flow min-cut.', related: ['edmonds-karp'] },
  { term: 'Matching', def: 'A set of edges sharing no endpoints.', example: 'Job assignment.', related: ['bipartite-matching', 'hopcroft-karp'] },
];

// ------------------------------------------------------- graph explorer
export function analyzeGraph(graph) {
  const nodes = graph.getNodes();
  const n = nodes.length;
  const out = [];

  const degrees = {};
  for (const nd of nodes) degrees[nd.id] = 0;
  for (const e of graph.getEdges()) {
    degrees[e.from] = (degrees[e.from] || 0) + 1;
    degrees[e.to] = (degrees[e.to] || 0) + 1;
  }
  out.push({ label: 'Vertices', value: String(n) });
  out.push({ label: 'Edges', value: String(graph.edgeCount) });
  out.push({ label: 'Directed', value: graph.directed ? 'yes' : 'no' });
  out.push({ label: 'Weighted', value: graph.weighted ? 'yes' : 'no' });
  out.push({ label: 'Max degree', value: String(Math.max(0, ...Object.values(degrees))) });

  // connected components (undirected reachability)
  const seen = new Set();
  let comps = 0;
  for (const nd of nodes) {
    if (seen.has(nd.id)) continue;
    comps++;
    const q = [nd.id];
    seen.add(nd.id);
    while (q.length) {
      const u = q.shift();
      for (const { node: v } of graph.getNeighbors(u)) {
        if (!seen.has(v)) {
          seen.add(v);
          q.push(v);
        }
      }
    }
  }
  out.push({ label: 'Components', value: String(comps) });
  out.push({ label: 'Connected?', value: comps <= 1 ? 'yes' : 'no' });

  // cycle (undirected)
  out.push({ label: 'Has cycle?', value: hasCycleUndirected(graph) ? 'yes' : 'no' });

  // bipartite
  const bip = isBipartite(graph);
  out.push({ label: 'Bipartite?', value: bip ? 'yes' : 'no' });

  // DAG (directed only)
  if (graph.directed) {
    out.push({ label: 'DAG?', value: isDAG(graph) ? 'yes' : 'no' });
  }

  // eulerian (undirected)
  if (!graph.directed) {
    const odd = nodes.filter((nd) => degrees[nd.id] % 2 === 1).length;
    out.push({ label: 'Eulerian?', value: odd === 0 ? 'circuit' : odd === 2 ? 'path only' : 'no' });
  }

  // hamiltonian (small undirected only)
  if (n <= 10 && !graph.directed) {
    out.push({ label: 'Hamiltonian path?', value: hasHamiltonianPath(graph) ? 'yes' : 'no' });
  }

  return out;
}

function hasCycleUndirected(graph) {
  const visited = new Set();
  const dfs = (u, parent) => {
    visited.add(u);
    for (const { node: v } of graph.getNeighbors(u)) {
      if (v === parent) continue;
      if (visited.has(v)) return true;
      if (dfs(v, u)) return true;
    }
    return false;
  };
  for (const nd of graph.getNodes()) {
    if (!visited.has(nd.id) && dfs(nd.id, null)) return true;
  }
  return false;
}

function isBipartite(graph) {
  const color = {};
  for (const nd of graph.getNodes()) {
    if (color[nd.id] != null) continue;
    const q = [nd.id];
    color[nd.id] = 0;
    while (q.length) {
      const u = q.shift();
      for (const { node: v } of graph.getNeighbors(u)) {
        if (color[v] == null) {
          color[v] = 1 - color[u];
          q.push(v);
        } else if (color[v] === color[u]) return false;
      }
    }
  }
  return true;
}

function isDAG(graph) {
  const color = {};
  const dfs = (u) => {
    color[u] = 1;
    for (const { node: v } of graph.getNeighbors(u)) {
      if (color[v] === 1) return true;
      if (color[v] == null && dfs(v)) return true;
    }
    color[u] = 2;
    return false;
  };
  for (const nd of graph.getNodes()) {
    if (color[nd.id] == null && dfs(nd.id)) return false;
  }
  return true;
}

function hasHamiltonianPath(graph) {
  const ids = graph.getNodes().map((n) => n.id);
  const n = ids.length;
  const visited = new Set();
  const dfs = (u, depth) => {
    if (depth === n) return true;
    for (const { node: v } of graph.getNeighbors(u)) {
      if (visited.has(v)) continue;
      visited.add(v);
      if (dfs(v, depth + 1)) return true;
      visited.delete(v);
    }
    return false;
  };
  for (const id of ids) {
    visited.clear();
    visited.add(id);
    if (dfs(id, 1)) return true;
  }
  return false;
}
