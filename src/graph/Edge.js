/**
 * Edge — a connection between two nodes.
 *
 * For undirected edges traversal treats the relationship as bidirectional.
 * For directed edges `A → B` traversal is only allowed from A to B.
 */
export default class Edge {
  /**
   * @param {object} data
   * @param {string|number} data.id
   * @param {string|number} data.from
   * @param {string|number} data.to
   * @param {boolean} [data.directed]
   * @param {number} [data.weight]
   * @param {object} [data.metadata]
   */
  constructor({ id, from, to, directed = false, weight = 1, metadata = {} } = {}) {
    this.id = String(id);
    this.from = String(from);
    this.to = String(to);
    this.directed = !!directed;
    this.weight = Number.isFinite(weight) ? weight : 1;
    this.metadata = metadata || {};
  }

  /** True when this edge touches both node ids (undirected) or is an arc between them. */
  connects(a, b) {
    a = String(a);
    b = String(b);
    if (this.directed) {
      return this.from === a && this.to === b;
    }
    return (this.from === a && this.to === b) || (this.from === b && this.to === a);
  }

  /** The endpoint opposite to `node`, or null when `node` is not an endpoint. */
  other(node) {
    node = String(node);
    if (node === this.from) return this.to;
    if (node === this.to) return this.from;
    return null;
  }
}
