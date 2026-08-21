import Node from './Node.js';
import Edge from './Edge.js';

let nodeIdCounter = 1;
let edgeIdCounter = 1;

/**
 * Graph — the reusable graph data model.
 *
 * Knows NOTHING about canvas / DOM / mouse / animation. It is pure data.
 */
export default class Graph {
  /**
   * @param {object} [options]
   * @param {boolean} [options.directed=false]
   */
  constructor({ directed = false } = {}) {
    this.directed = !!directed;
    this._nodes = new Map();
    this._edges = new Map();
  }

  // ------------------------------------------------------------------ counts
  get nodeCount() {
    return this._nodes.size;
  }

  get edgeCount() {
    return this._edges.size;
  }

  /** True when any edge has a weight other than 1 (i.e. the graph is weighted). */
  get weighted() {
    for (const e of this._edges.values()) {
      if (e.weight !== 1) return true;
    }
    return false;
  }

  // ------------------------------------------------------------------- nodes
  /**
   * Add a node. Returns the created Node.
   */
  addNode(data = {}) {
    const id = data.id != null ? String(data.id) : `n${nodeIdCounter++}`;
    const node = new Node({
      id,
      label: data.label != null ? data.label : id,
      x: data.x,
      y: data.y,
      metadata: data.metadata,
    });
    this._nodes.set(node.id, node);
    return node;
  }

  /** Remove a node AND every edge connected to it. Returns true if removed. */
  removeNode(id) {
    id = String(id);
    if (!this._nodes.has(id)) return false;
    for (const edge of [...this._edges.values()]) {
      if (edge.from === id || edge.to === id) this._edges.delete(edge.id);
    }
    this._nodes.delete(id);
    return true;
  }

  getNode(id) {
    return this._nodes.get(String(id)) || null;
  }

  hasNode(id) {
    return this._nodes.has(String(id));
  }

  getNodes() {
    return [...this._nodes.values()];
  }

  // ------------------------------------------------------------------- edges
  /**
   * Add an edge. Throws if either endpoint does not exist.
   * Returns the created Edge.
   */
  addEdge(data = {}) {
    const from = String(data.from);
    const to = String(data.to);
    if (!this._nodes.has(from)) throw new Error(`addEdge: unknown node "${from}"`);
    if (!this._nodes.has(to)) throw new Error(`addEdge: unknown node "${to}"`);
    const id = data.id != null ? String(data.id) : `e${edgeIdCounter++}`;
    const directed = data.directed != null ? !!data.directed : this.directed;
    const edge = new Edge({ id, from, to, directed, weight: data.weight, metadata: data.metadata });
    this._edges.set(edge.id, edge);
    return edge;
  }

  removeEdge(id) {
    id = String(id);
    return this._edges.delete(id);
  }

  getEdge(id) {
    return this._edges.get(String(id)) || null;
  }

  hasEdge(id) {
    return this._edges.has(String(id));
  }

  getEdges() {
    return [...this._edges.values()];
  }

  /** All edges whose endpoints are exactly {a, b} (respecting direction). */
  getEdgesBetween(a, b) {
    a = String(a);
    b = String(b);
    const out = [];
    for (const e of this._edges.values()) {
      if (e.connects(a, b)) out.push(e);
    }
    return out;
  }

  /** True when an edge already connects a→b (or a—b for undirected). */
  hasEdgeBetween(a, b) {
    return this.getEdgesBetween(a, b).length > 0;
  }

  /** Edges touching `id` (both endpoints). */
  getIncidentEdges(id) {
    id = String(id);
    const out = [];
    for (const e of this._edges.values()) {
      if (e.from === id || e.to === id) out.push(e);
    }
    return out;
  }

  /**
   * Traversal-adjacent nodes of `id`, in deterministic (insertion) order.
   *
   * Directed:   only outgoing edges (u → v).
   * Undirected: both directions.
   *
   * Returns [{ node, edge }] — `node` is the neighbor id, `edge` the edge id.
   */
  getNeighbors(id) {
    id = String(id);
    const result = [];
    for (const edge of this._edges.values()) {
      if (edge.directed) {
        if (edge.from === id) result.push({ node: edge.to, edge: edge.id });
      } else {
        if (edge.from === id) result.push({ node: edge.to, edge: edge.id });
        else if (edge.to === id) result.push({ node: edge.from, edge: edge.id });
      }
    }
    return result;
  }

  // ------------------------------------------------------------------- misc
  clear() {
    this._nodes.clear();
    this._edges.clear();
  }

  /** Deep copy (positions preserved). */
  copy() {
    const g = new Graph({ directed: this.directed });
    for (const n of this._nodes.values()) {
      g.addNode({ id: n.id, label: n.label, x: n.x, y: n.y, metadata: { ...n.metadata } });
    }
    for (const e of this._edges.values()) {
      g.addEdge({ id: e.id, from: e.from, to: e.to, directed: e.directed, weight: e.weight, metadata: { ...e.metadata } });
    }
    return g;
  }
}
