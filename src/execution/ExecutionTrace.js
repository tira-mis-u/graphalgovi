/**
 * ExecutionTrace — the universal replayable record of one algorithm run.
 *
 * Two supported styles coexist:
 *   • Legacy (BFS / DFS): events are replayed through `applyEvent` into a
 *     cumulative state (see below).
 *   • Universal: algorithms emit events AND a full internal-state snapshot
 *     per step via `TraceBuilder`. `snapshots[i]` = state after i events.
 *
 * The ExecutionController simply indexes into `snapshots`, which makes
 * STEP / STEP BACK / seek trivial and uniform across every algorithm.
 */
import { bfs } from '../algorithms/bfs.js';
import { dfs } from '../algorithms/dfs.js';

// ---------------------------------------------------------------- deep copy
export function cloneState(s) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(s);
    } catch {
      /* fall through */
    }
  }
  return JSON.parse(JSON.stringify(s));
}

// ---------------------------------------------------- universal state factory
/**
 * Create the universal internal-state object used by all new algorithms.
 * Algorithms mutate `nodes[id].status`, `edges[id].status`, `panel`, etc.,
 * then emit events; each emit clones the current state into the trace.
 */
export function makeState(algorithm, graph, { start = null, target = null } = {}) {
  const nodes = {};
  for (const n of graph.getNodes()) nodes[n.id] = { status: 'unvisited', extra: '' };
  const edges = {};
  for (const e of graph.getEdges()) edges[e.id] = { status: 'idle', extra: '' };
  return {
    algorithm,
    start,
    target,
    step: 0,
    total: 0,
    complete: false,
    nodes,
    edges,
    currentNode: null,
    inspecting: null, // { from, to }
    message: '',
    why: '',
    panel: {},
    result: null,
  };
}

// ------------------------------------------------------------- TraceBuilder
export class TraceBuilder {
  constructor({ algorithm, graph, start = null, target = null }) {
    this.algorithm = algorithm;
    this.graph = graph;
    this.start = start;
    this.target = target;
    this.events = [];
    this.snapshots = [];
    this.result = null;
    this.error = null;
    this.state = makeState(algorithm, graph, { start, target });
    this.snapshots.push(cloneState(this.state)); // index 0 = initial state
  }

  get step() {
    return this.events.length;
  }

  /** Record an event and snapshot the CURRENT state after applying it. */
  emit({ type, line = 0, message = '', why = '', ...rest }) {
    this.state.step = this.events.length + 1;
    this.state.message = message;
    this.state.why = why;
    const event = { type, line, message, why, step: this.state.step, ...rest };
    this.events.push(event);
    this.snapshots.push(cloneState(this.state));
    return event;
  }

  /** Finish: mark complete, attach result, emit a final event, return trace. */
  finalize(result) {
    this.result = result;
    this.state.complete = true;
    this.state.result = result;
    this.state.total = this.events.length;
    this.emit({
      type: 'complete',
      line: this._lastLine,
      message: result && result.message ? result.message : 'done',
      why: '',
    });
    const total = this.events.length;
    for (const s of this.snapshots) s.total = total;
    return this.toTrace();
  }

  toTrace() {
    return {
      algorithm: this.algorithm,
      start: this.start,
      target: this.target,
      events: this.events,
      snapshots: this.snapshots,
      result: this.result,
      error: this.error,
    };
  }

  set lastLine(n) {
    this._lastLine = n;
  }
}

// ===========================================================================
// LEGACY (BFS / DFS) — kept intact so the original laboratory keeps working.
// ===========================================================================

export class ExecutionTrace {
  constructor({ algorithm, start, graph }) {
    this.algorithm = algorithm;
    this.start = start;
    this.graph = graph;
    this.events = [];
    this.summary = null;
    this.error = null;
  }

  get length() {
    return this.events.length;
  }

  get done() {
    return this.events.length > 0 && this.events[this.events.length - 1].type === 'complete';
  }

  push(event) {
    event.step = this.events.length + 1;
    this.events.push(event);
    return event;
  }

  getEvent(index) {
    return this.events[index] || null;
  }
}

export function buildTrace(algorithm, graph, start) {
  algorithm = String(algorithm).toUpperCase();
  const trace = new ExecutionTrace({ algorithm, start, graph });
  try {
    const run = algorithm === 'BFS' ? bfs : dfs;
    trace.summary = run(graph, start, { onEvent: (e) => trace.push(e) });
  } catch (err) {
    trace.error = err;
  }
  return trace;
}

/** Fresh legacy state at step 0. */
export function createInitialState(trace) {
  return {
    algorithm: trace.algorithm,
    start: trace.start,
    step: 0,
    total: trace.length,
    currentNode: null,
    queue: [],
    stack: [],
    discovered: [],
    processed: [],
    finished: [],
    levels: {},
    inspecting: null,
    lastEdge: null,
    backtrackNode: null,
    complete: false,
    cycleDetected: false,
    lastEvent: null,
    discoveredEdges: [],
    _pendingEdge: null,
  };
}

function seen(list, node) {
  return list.includes(node);
}

export function applyEvent(state, event) {
  state.step = event.step;
  state.lastEvent = event;

  switch (event.type) {
    case 'initialize':
      state.queue = [];
      state.stack = [];
      state.currentNode = null;
      state.inspecting = null;
      state.backtrackNode = null;
      break;

    case 'enqueue':
      state.queue = event.queue.slice();
      if (event.level != null) state.levels[event.node] = event.level;
      if (!seen(state.discovered, event.node)) state.discovered.push(event.node);
      state.backtrackNode = null;
      break;

    case 'dequeue':
      state.queue = event.queue.slice();
      state.currentNode = event.node;
      if (!seen(state.processed, event.node)) state.processed.push(event.node);
      state.backtrackNode = null;
      break;

    case 'visit-node':
      state.currentNode = event.node;
      if (!seen(state.discovered, event.node)) state.discovered.push(event.node);
      state.backtrackNode = null;
      break;

    case 'discover-node':
      if (state._pendingEdge) {
        state.discoveredEdges.push(state._pendingEdge.edge);
        state._pendingEdge = null;
      }
      if (!seen(state.discovered, event.node)) state.discovered.push(event.node);
      if (event.level != null) state.levels[event.node] = event.level;
      state.backtrackNode = null;
      break;

    case 'inspect-edge':
      state.inspecting = { from: event.from, to: event.to, result: event.result };
      state.lastEdge = state.inspecting;
      state._pendingEdge = event.result === 'unvisited'
        ? { from: event.from, to: event.to, edge: event.edge }
        : null;
      break;

    case 'skip-visited':
      state.inspecting = null;
      state.lastEdge = { from: event.from, to: event.to, result: 'visited' };
      state._pendingEdge = null;
      if (event.backEdge) state.cycleDetected = true;
      break;

    case 'recurse':
      if (state._pendingEdge && state._pendingEdge.to === event.node) {
        state.discoveredEdges.push(state._pendingEdge.edge);
      }
      state._pendingEdge = null;
      state.stack = event.stack.slice();
      state.currentNode = event.node;
      state.backtrackNode = null;
      break;

    case 'backtrack':
      state.backtrackNode = event.node;
      break;

    case 'return':
      state.stack = event.stack.slice();
      state.currentNode = state.stack.length ? state.stack[state.stack.length - 1] : null;
      if (!seen(state.finished, event.node)) state.finished.push(event.node);
      state.backtrackNode = null;
      break;

    case 'finish-node':
      if (!seen(state.processed, event.node)) state.processed.push(event.node);
      state.inspecting = null;
      break;

    case 'complete':
      state.complete = true;
      state.inspecting = null;
      state.backtrackNode = null;
      break;

    default:
      break;
  }

  return state;
}

/** Replay the first `index` events into a legacy state object. */
export function computeState(trace, index) {
  const state = createInitialState(trace);
  const n = Math.max(0, Math.min(index, trace.length));
  for (let i = 0; i < n; i++) applyEvent(state, trace.events[i]);
  return state;
}

/**
 * Build legacy snapshots[i] for i = 0..events.length so that BFS/DFS can use
 * the exact same snapshot-based controller as every other algorithm.
 */
export function legacySnapshots(trace) {
  const snaps = [];
  for (let i = 0; i <= trace.length; i++) snaps.push(computeState(trace, i));
  return snaps;
}
