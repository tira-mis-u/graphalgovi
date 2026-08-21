/**
 * Real-World controller helpers — bridge between the execution trace and the
 * domain layer. Pure functions, no DOM.
 */
import { fmt } from '../algorithms/_common.js';

/**
 * Normalize any execution state into the UNIVERSAL snapshot shape
 * (state.nodes[id].status, state.edges[id].status). Legacy BFS/DFS snapshots
 * are converted here so the real-world layer works uniformly.
 */
export function universalize(state, graph) {
  if (!state) return null;
  if (state.nodes && state.edges) return state;

  const nodes = {};
  const edges = {};
  for (const n of graph.getNodes()) nodes[n.id] = { status: 'unvisited', extra: '' };
  for (const e of graph.getEdges()) edges[e.id] = { status: 'idle', extra: '' };

  const discovered = state.discovered || [];
  const processed = state.processed || [];
  const finished = state.finished || [];

  for (const id of discovered) nodes[id] = nodes[id] || { status: 'unvisited', extra: '' };
  for (const id of processed) if (nodes[id]) nodes[id].status = 'visited';
  for (const id of finished) if (nodes[id]) nodes[id].status = 'visited';
  for (const id of discovered) {
    if (nodes[id] && nodes[id].status === 'unvisited') nodes[id].status = 'discovered';
  }
  if (state.currentNode && nodes[state.currentNode]) nodes[state.currentNode].status = 'current';
  if (state.backtrackNode && nodes[state.backtrackNode]) nodes[state.backtrackNode].status = 'backtrack';

  for (const eid of state.discoveredEdges || []) if (edges[eid]) edges[eid].status = 'tree';
  if (state.inspecting) {
    for (const e of graph.getEdges()) {
      if ((e.from === state.inspecting.from && e.to === state.inspecting.to) ||
          (!e.directed && e.from === state.inspecting.to && e.to === state.inspecting.from)) {
        edges[e.id].status = 'active';
      }
    }
  }

  const panel = {
    queue: state.queue ? [...state.queue] : null,
    stack: state.stack ? [...state.stack] : null,
    levels: state.levels ? { ...state.levels } : null,
  };

  return {
    ...state,
    algorithm: state.algorithm,
    start: state.start,
    target: state.target || null,
    nodes,
    edges,
    panel,
    complete: !!state.complete,
  };
}

/**
 * Build the narrative context handed to scenario.narrate().
 */
export function makeContext(scenario, state, trace, graph, entities) {
  const distOf = (id) => {
    const p = state.panel || {};
    if (p.dist && p.dist[id] != null) return p.dist[id];
    return null;
  };
  return {
    name: (id) => {
      if (!id) return '—';
      const ent = entities.nodes[id];
      return ent && ent.name ? ent.name : id;
    },
    dist: (id) => distOf(id),
    start: state.start,
    target: state.target,
    graph,
    entities,
  };
}

/** Best-effort narrative for the current step. */
export function getNarrative(scenario, state, trace) {
  if (!state || !trace) return null;
  const ev = trace.events[state.step - 1] || null;
  if (!ev || !scenario.narrate) return null;
  // build ctx lazily (scenario build is cached by caller via a provided context)
  return scenario._narrateWithCtx ? scenario._narrateWithCtx(ev) : null;
}

export { fmt };
