const BASE_INTERVAL_MS = 900;
const MIN_SPEED = 0.5;
const MAX_SPEED = 6;

/**
 * ExecutionController — generic trace consumer for EVERY algorithm.
 *
 * A trace is: { algorithm, start, target, events, snapshots, result, error }.
 * `snapshots[i]` is the internal state after i events (snapshots[0] = initial).
 *
 * Controls: RUN / STEP / STEP BACK / PLAY / PAUSE / RESET / SEEK / SPEED.
 * Never modifies the graph.
 */
export default class ExecutionController {
  constructor({ onStateChange = null } = {}) {
    this.onStateChange = onStateChange || (() => {});
    this.trace = null;
    this.index = 0;
    this.playing = false;
    this.speed = 1.75;
    this._timer = null;
  }

  // ------------------------------------------------------------------ setup
  /**
   * RUN — build a trace and position at event 0 (initial state visible).
   * @param {object} opts
   * @param {(algorithm:string, graph:any, params:object)=>object} opts.build
   * @param {string} opts.algorithm
   * @param {any} opts.graph
   * @param {string|null} [opts.start]
   * @param {string|null} [opts.target]
   * @param {object} [opts.params]  extra algorithm params (e.g. heuristic)
   */
  run({ build, algorithm, graph, start = null, target = null, params = {} }) {
    this.stop();
    this.trace = build(algorithm, graph, { start, target, ...params });
    this.index = 0;
    this._notify();
    return this.trace;
  }

  clear() {
    this.stop();
    this.trace = null;
    this.index = 0;
    this._notify();
  }

  // ---------------------------------------------------------------- state
  get total() {
    return this.trace ? this.trace.events.length : 0;
  }

  get state() {
    if (!this.trace || !this.trace.snapshots) return null;
    return this.trace.snapshots[this.index] || null;
  }

  get done() {
    return this.trace ? this.index >= this.trace.events.length : true;
  }

  get progress() {
    if (!this.trace || this.total === 0) return 0;
    return Math.round((this.index / this.total) * 100);
  }

  // ---------------------------------------------------------------- controls
  step() {
    if (!this.trace || this.index >= this.total) return false;
    this.index += 1;
    this._notify();
    if (this.index >= this.total) this.pause();
    return true;
  }

  stepBack() {
    if (!this.trace || this.index <= 0) return false;
    this.index -= 1;
    this._notify();
    return true;
  }

  play() {
    if (!this.trace) return;
    if (this.index >= this.total) {
      this.index = 0;
    }
    this.playing = true;
    this._notify();
    this._schedule();
  }

  pause() {
    this.playing = false;
    if (this._timer != null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  togglePlay() {
    if (this.playing) this.pause();
    else this.play();
  }

  reset() {
    this.stop();
    if (this.trace) this.index = 0;
    this._notify();
  }

  /**
   * Set playback speed as a multiplier of the base interval.
   * Range: 0.5× (slow) … 6× (fast).
   */
  setSpeed(mult) {
    const v = Number(mult);
    this.speed = Number.isFinite(v) ? Math.max(MIN_SPEED, Math.min(MAX_SPEED, v)) : 1.75;
  }

  get intervalMs() {
    return BASE_INTERVAL_MS / this.speed;
  }

  seek(index) {
    if (!this.trace) return;
    this.index = Math.max(0, Math.min(index, this.total));
    this._notify();
  }

  stop() {
    this.pause();
  }

  // ---------------------------------------------------------------- internal
  _schedule() {
    if (this._timer != null) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._timer = null;
      if (!this.playing) return;
      this.step();
      if (this.playing && this.index < this.total) this._schedule();
    }, this.intervalMs);
  }

  _notify() {
    this.onStateChange(this.state, this.trace);
  }
}
