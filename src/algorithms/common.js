/**
 * Shared helpers for algorithm modules. Contains NO algorithm logic and NO
 * UI knowledge — just small utilities reused across implementations.
 */
import { TraceBuilder } from '../execution/ExecutionTrace.js';

export { TraceBuilder };

export const INF = Infinity;

/** Human-friendly number formatting (Infinity → ∞). */
export function fmt(n) {
  if (n === Infinity || n === -Infinity) return '∞';
  if (Number.isInteger(n)) return String(n);
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
}

/** Edge weight by edge id. */
export function w(graph, edgeId) {
  const e = graph.getEdge(edgeId);
  return e ? e.weight : 1;
}

/** First node id (used as a sane default start). */
export function firstNode(graph) {
  const ns = graph.getNodes();
  return ns.length ? ns[0].id : null;
}

/** Require a start node, defaulting to the first node of the graph. */
export function requireStart(graph, start) {
  const s = start != null ? String(start) : firstNode(graph);
  if (!s || !graph.hasNode(s)) {
    throw new Error('A valid start node is required (it may have been deleted).');
  }
  return s;
}

/** Check that all edge weights are non-negative (for Dijkstra). */
export function assertNonNegative(graph) {
  for (const e of graph.getEdges()) {
    if (e.weight < 0) {
      throw new Error(`Negative edge weight ${e.weight} on edge ${e.id} — not allowed here.`);
    }
  }
}

/** Ordered node ids (insertion order). */
export function nodeIds(graph) {
  return graph.getNodes().map((n) => n.id);
}
