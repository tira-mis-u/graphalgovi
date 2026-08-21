/**
 * InternalStateRenderer — renders the DOM panels that expose the algorithm's
 * internal machinery: queue, call stack, levels, state inspector, result.
 *
 * EVERY value shown here is derived from the real execution state/trace.
 */

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

const prevQueue = { items: [], front: null };

function chipList(arr, cls = '') {
  if (!arr.length) return `<span class="empty-chip">empty</span>`;
  return arr.map((n) => `<span class="chip ${cls}">${escapeHtml(n)}</span>`).join('');
}

// ---------------------------------------------------------------- machinery
export function renderMachinery(root, state, trace) {
  if (!state || !trace) {
    root.innerHTML = '';
    return;
  }
  const isBFS = state.algorithm === 'BFS';

  if (isBFS) {
    // --- QUEUE ---
    const queue = state.queue;
    const newlyEnqueued = queue.filter((n) => !prevQueue.items.includes(n));
    const frontChanged = prevQueue.front !== null && prevQueue.front !== (queue[0] || null) && queue.length > 0;
    prevQueue.items = [...queue];
    prevQueue.front = queue[0] || null;

    const boxes = queue.length
      ? queue.map((n) => `<span class="q-box ${newlyEnqueued.includes(n) ? 'pulse' : ''}">${escapeHtml(n)}</span>`).join('')
      : `<span class="empty-chip">queue empty</span>`;

    const visited = state.processed;
    const discovered = state.discovered;

    root.innerHTML = `
      <header class="panel-title">QUEUE <span class="tag">BFS · FIFO</span></header>
      <div class="machinery-body">
        <div class="queue-zone">
          <div class="front-marker ${frontChanged ? 'pulse' : ''}">FRONT ↓</div>
          <div class="q-items">${boxes}</div>
          <div class="back-marker">BACK ↑</div>
        </div>
        <div class="kv-row"><span class="kv">CURRENT</span><span class="kv-val current">${state.currentNode ? escapeHtml(state.currentNode) : '—'}</span></div>
        <div class="kv-row"><span class="kv">VISITED</span><span class="kv-val">${chipList(visited)}</span></div>
        <div class="kv-row"><span class="kv">DISCOVERED</span><span class="kv-val">${chipList(discovered)}</span></div>
      </div>`;
  } else {
    // --- CALL STACK ---
    const stack = state.stack;
    const frames = stack
      .map((n, i) => {
        const cls = i === stack.length - 1 ? 'frame top' : 'frame';
        return `<div class="${cls}">DFS(<span class="mono">${escapeHtml(n)}</span>)</div>`;
      })
      .join('<div class="stack-arrow">↓</div>');

    const last = state.lastEvent;
    let activity = '';
    if (last && last.type === 'return') {
      activity = `<div class="return-line">DFS(<span class="mono">${escapeHtml(last.node)}</span>) <span class="up-arrow">↑</span> RETURN</div>`;
    } else if (last && last.type === 'backtrack') {
      activity = `<div class="backtrack-line">${escapeHtml(last.node)}: no unvisited neighbors → BACKTRACK <span class="up-arrow">↑</span></div>`;
    }

    root.innerHTML = `
      <header class="panel-title">CALL STACK <span class="tag">DFS · LIFO</span></header>
      <div class="machinery-body">
        <div class="stack-zone">
          ${frames || '<span class="empty-chip">stack empty</span>'}
          ${activity}
        </div>
        <div class="kv-row"><span class="kv">CURRENT</span><span class="kv-val current">${state.currentNode ? escapeHtml(state.currentNode) : '—'}</span></div>
        <div class="kv-row"><span class="kv">VISITED</span><span class="kv-val">${chipList(state.discovered)}</span></div>
        <div class="kv-row"><span class="kv">FINISHED</span><span class="kv-val">${chipList(state.finished)}</span></div>
      </div>`;
  }
}

// ------------------------------------------------------------------- levels
export function renderLevels(root, state) {
  if (!state) {
    root.innerHTML = '';
    return;
  }
  if (state.algorithm === 'BFS') {
    const byLevel = new Map();
    for (const node of state.discovered) {
      const lv = state.levels[node] != null ? state.levels[node] : 0;
      if (!byLevel.has(lv)) byLevel.set(lv, []);
      byLevel.get(lv).push(node);
    }
    const rows = [...byLevel.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([lv, nodes]) => `
        <div class="level-row">
          <span class="level-badge">L${lv}</span>
          <span class="level-nodes">${chipList(nodes)}</span>
        </div>`)
      .join('');

    root.innerHTML = `
      <header class="panel-title">LEVELS <span class="tag">distance from start</span></header>
      <div class="machinery-body">${rows || '<span class="empty-chip">run BFS to see levels</span>'}</div>`;
  } else {
    const depth = state.stack.length;
    const last = state.lastEvent;
    const backtrackNode = state.backtrackNode;
    let bt = '';
    if (last && last.type === 'backtrack') {
      bt = `<div class="bt-tree">${escapeHtml(last.node)}<div class="bt-note">└─ no unvisited neighbors<br><span class="bt-arrow">BACKTRACK ↑</span></div></div>`;
    } else if (backtrackNode) {
      bt = `<div class="bt-tree">${escapeHtml(backtrackNode)}<div class="bt-note">└─ backtracking…</div></div>`;
    }
    root.innerHTML = `
      <header class="panel-title">DEPTH / BACKTRACK <span class="tag">recursion</span></header>
      <div class="machinery-body">
        <div class="kv-row"><span class="kv">STACK DEPTH</span><span class="kv-val current">${depth}</span></div>
        ${bt ? `<div class="backtrack-zone">${bt}</div>` : ''}
        <div class="kv-row"><span class="kv">FINISHED</span><span class="kv-val">${chipList(state.finished)}</span></div>
      </div>`;
  }
}

// ---------------------------------------------------------------- inspector
export function renderInspector(root, state, trace, graph) {
  if (!state || !trace) {
    root.innerHTML = '';
    return;
  }
  const total = trace.length;
  const progress = total ? Math.round((state.step / total) * 100) : 0;
  const isBFS = state.algorithm === 'BFS';

  const rows = [
    ['ALGORITHM', state.algorithm],
    ['CURRENT NODE', state.currentNode || '—'],
    ['STEP', `${state.step} / ${total}`],
    ['PROGRESS', `${progress}%`],
  ];
  if (isBFS) {
    rows.push(['QUEUE', `[${state.queue.join(', ')}]`]);
    rows.push(['VISITED', `[${state.processed.join(', ')}]`]);
    rows.push(['DISCOVERED', `[${state.discovered.join(', ')}]`]);
  } else {
    rows.push(['CALL STACK', `[${state.stack.join(', ')}]`]);
    rows.push(['VISITED', `[${state.discovered.join(', ')}]`]);
    rows.push(['FINISHED', `[${state.finished.join(', ')}]`]);
    if (state.cycleDetected) rows.push(['CYCLE', 'detected (back edge)']);
  }

  const html = rows
    .map(([k, v]) => `<div class="insp-row"><span class="insp-key">${k}</span><span class="insp-val">${escapeHtml(v)}</span></div>`)
    .join('');

  root.innerHTML = `
    <header class="panel-title">STATE INSPECTOR <span class="tag">live</span></header>
    <div class="inspector-body">${html}</div>`;
}

// -------------------------------------------------------------------- result
export function computeResult(scenario, trace, graph, state) {
  if (!trace || !trace.summary || !state) return null;
  const s = trace.summary;
  const reachable = (s.reachable || s.discoveredOrder || []).slice();
  const reachSet = new Set(reachable);
  const unreachable = graph.getNodes().map((n) => n.id).filter((id) => !reachSet.has(id));

  const r = {
    visitedCount: reachable.length,
    total: graph.nodeCount,
    order: s.visitOrder || reachable,
    maxDistance: s.algorithm === 'BFS' ? s.maxLevel : s.maxDepth,
    unreachable,
    cycle: !!s.cycleDetected,
  };

  const fn = s.algorithm === 'BFS' ? scenario.result.bfs : scenario.result.dfs;
  return {
    algorithm: s.algorithm,
    lines: fn ? fn(r) : [],
    reachable,
    unreachable,
    r,
  };
}

export function renderResult(root, scenario, trace, graph, state) {
  if (!state || !trace) {
    root.innerHTML = '';
    return;
  }
  const result = computeResult(scenario, trace, graph, state);

  const reachRow = state.discovered.length
    ? `<div class="reach-block">
        <div class="reach-title reachable">REACHABLE</div>
        <div class="reach-chips">${chipList(result.reachable, 'ok')}</div>
        ${result.unreachable.length ? `<div class="reach-title unreachable">UNREACHABLE</div><div class="reach-chips">${chipList(result.unreachable, 'no')}</div>` : ''}
      </div>`
    : '';

  if (!state.complete) {
    root.innerHTML = `
      <header class="panel-title">RESULT <span class="tag">${state.algorithm}</span></header>
      <div class="machinery-body">
        <p class="muted-text">${state.step === 0 ? 'Run the algorithm to see the result.' : 'Executing…'}</p>
        ${reachRow}
      </div>`;
    return;
  }

  root.innerHTML = `
    <header class="panel-title">RESULT <span class="tag">${state.algorithm} · complete</span></header>
    <div class="machinery-body">
      <ul class="result-list">${result.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
      ${reachRow}
    </div>`;
}

// ------------------------------------------------------------------- activity
export function renderActivity(root, state, trace) {
  if (!state || !trace) {
    root.textContent = 'READY';
    return;
  }
  if (state.step === 0) {
    root.textContent = `READY · ${trace.length} trace events · press RUN / STEP / PLAY`;
    return;
  }
  const msg = state.lastEvent ? state.lastEvent.message : '';
  root.textContent = `STEP ${state.step}/${trace.length} · ${msg}`;
}
