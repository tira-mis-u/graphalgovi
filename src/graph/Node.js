/**
 * Node — a single vertex in the graph.
 *
 * `x` and `y` are VISUALIZATION positions only. Algorithm logic must never
 * depend on them.
 */
export default class Node {
  /**
   * @param {object} data
   * @param {string|number} data.id
   * @param {string} [data.label]
   * @param {number} [data.x]
   * @param {number} [data.y]
   * @param {object} [data.metadata]
   */
  constructor({ id, label, x = 0, y = 0, metadata = {} } = {}) {
    this.id = String(id);
    this.label = label != null ? String(label) : this.id;
    this.x = Number.isFinite(x) ? x : 0;
    this.y = Number.isFinite(y) ? y : 0;
    this.metadata = metadata || {};
  }
}
