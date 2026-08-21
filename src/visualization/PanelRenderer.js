/**
 * PanelRenderer — renders the INTERNAL MACHINERY panels for the universal
 * algorithms (everything except legacy BFS/DFS, which use InternalStateRenderer).
 * Every value shown comes from the real execution snapshot.
 */
import { fmt } from '../algorithms/common.js';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function chips(arr, cls = '') {
  if (!arr || !arr.length) return '<span class="empty-chip">—</span>';
  return arr.map((n) => `<span class="chip ${cls}">${esc(n)}</span>`).join('');
}

function header(name, tag) {
  return `<header class="panel-title">${esc(name)}${tag ? ` <span class="tag">${esc(tag)}</span>` : ''}</header><div class="machinery-body">`;
}

function kv(label, value, cls = '') {
  return `<div class="kv-row"><span class="kv">${esc(label)}</span><span class="kv-val ${cls}">${value}</span></div>`;
}

function table(headers, rows) {
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `<table class="data-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

// ---------------------------------------------------------------- dispatcher
export function renderMachinery(state, trace, graph, meta) {
  if (!state || !trace) return '';
  const kind = meta ? meta.panelKind : 'generic';
  const renderer = RENDERERS[kind] || renderGeneric;
  return renderer(state, trace, graph, meta);
}

// ---------------------------------------------------------------- generic
function renderGeneric(state, trace, graph, meta) {
  const ev = trace.events[state.step - 1] || null;
  return header(meta.name, meta.dataStructure) +
    kv('EVENT', ev ? `${ev.type}` : 'ready') +
    (state.message ? kv('MESSAGE', esc(state.message)) : '') +
    '</div>';
}

// ---------------------------------------------------------------- components
const RENDERERS = {};

RENDERERS.components = (state) => {
  const p = state.panel || {};
  const comps = (p.components || []).map((c, i) => {
    const members = Array.isArray(c) ? c : c.nodes;
    return `<div class="comp-row"><span class="comp-badge">C${i + 1}</span><span class="reach-chips">${chips(members, 'ok')}</span></div>`;
  }).join('');
  return header('COMPONENTS', 'connected groups') +
    kv('COUNT', (p.count != null ? p.count : (p.components || []).length)) +
    `<div class="machinery-list">${comps || '<span class="empty-chip">run to compute</span>'}</div>` +
    '</div>';
};

RENDERERS.cycle = (state) => {
  const p = state.panel || {};
  const edges = (p.cycleEdges || []).map((id) => {
    const e = graphEdge(id);
    return e ? `${e.from} – ${e.to}` : id;
  });
  return header('CYCLE CHECK', state.algorithm === 'cycle-detection' ? 'DFS' : '') +
    kv('HAS CYCLE', p.hasCycle ? 'YES' : 'no', p.hasCycle ? 'cycle-yes' : '') +
    (p.hasCycle ? kv('CYCLE EDGE', chips(edges, 'no')) : '') +
    (p.color ? kv('COLORS', esc(JSON.stringify(p.color))) : '') +
    '</div>';
};

RENDERERS.bipartite = (state) => {
  const p = state.panel || {};
  const parts = p.partitions || [[], []];
  return header('2-COLORING', 'partitions') +
    `<div class="two-col">` +
    `<div class="part-box"><div class="part-title">COLOR 0</div>${chips(parts[0] || [], 'ok')}</div>` +
    `<div class="part-box"><div class="part-title">COLOR 1</div>${chips(parts[1] || [], 'ok')}</div>` +
    `</div>` +
    (p.conflictEdge ? kv('CONFLICT EDGE', esc(String(p.conflictEdge)), 'cycle-yes') : '') +
    '</div>';
};

RENDERERS.dijkstra = (state) => {
  const p = state.panel || {};
  const pq = (p.pq || []).map((x) => `(${esc(x.node)}, ${fmt(x.dist)})`).join('  ');
  const rows = Object.keys(p.dist || {}).map((id) => [
    `<span class="mono">${esc(id)}</span>`,
    fmt(p.dist[id]),
    p.prev[id] != null ? esc(p.prev[id]) : '—',
  ]);
  return header('PRIORITY QUEUE + DISTANCE', 'priority queue') +
    kv('PQ', pq ? `<span class="mono pq-line">${pq}</span>` : '<span class="empty-chip">empty</span>') +
    table(['NODE', 'DIST', 'PREV'], rows) +
    kv('PATH', p.path && p.path.length ? `<span class="mono path-line">${p.path.map(esc).join(' → ')}</span>` : '—') +
    (p.totalCost != null && p.totalCost !== Infinity ? kv('TOTAL COST', fmt(p.totalCost)) : '') +
    '</div>';
};

RENDERERS.astar = (state) => {
  const p = state.panel || {};
  const open = (p.open || []).map((x) => `${esc(x.node)} <span class="mono">g=${fmt(x.g)} h=${fmt(x.h)} f=${fmt(x.f)}</span>`).join(' · ');
  return header('OPEN / CLOSED', 'f = g + h') +
    kv('OPEN SET', open || '<span class="empty-chip">empty</span>') +
    kv('CLOSED SET', chips(p.closed || [])) +
    kv('HEURISTIC', esc(p.heuristic || '—')) +
    kv('PATH', p.path && p.path.length ? `<span class="mono path-line">${p.path.map(esc).join(' → ')}</span>` : '—') +
    (p.cost != null && p.cost !== Infinity ? kv('PATH COST g', fmt(p.cost)) : '') +
    '</div>';
};

RENDERERS.bellman = (state) => {
  const p = state.panel || {};
  const rows = Object.keys(p.dist || {}).map((id) => [`<span class="mono">${esc(id)}</span>`, fmt(p.dist[id]), p.prev[id] != null ? esc(p.prev[id]) : '—']);
  return header('RELAXATION', `pass ${p.pass != null ? p.pass : '—'}`) +
    table(['NODE', 'DIST', 'PREV'], rows) +
    (p.negCycle ? kv('NEGATIVE CYCLE', 'DETECTED', 'cycle-yes') : '') +
    '</div>';
};

RENDERERS.matrix = (state) => {
  const p = state.panel || {};
  if (!p.matrix) return header('DISTANCE MATRIX', '') + '</div>';
  const ids = p.ids || [];
  const head = ['', ...ids];
  const rows = p.matrix.map((row, i) => [`<span class="mono">${esc(ids[i])}</span>`, ...row.map((v) => (v === Infinity ? '∞' : fmt(v)))]);
  return header('DISTANCE MATRIX', p.k ? `k = ${esc(p.k)}` : '') +
    table(head, rows) +
    '</div>';
};

RENDERERS.matrix01 = (state) => {
  const p = state.panel || {};
  if (!p.matrix) return header('REACHABILITY MATRIX', '') + '</div>';
  const ids = p.ids || [];
  const head = ['', ...ids];
  const rows = p.matrix.map((row, i) => [`<span class="mono">${esc(ids[i])}</span>`, ...row.map((v) => (v ? '1' : '0'))]);
  return header('REACHABILITY (1/0)', p.k ? `k = ${esc(p.k)}` : '') +
    table(head, rows) +
    '</div>';
};

RENDERERS.zeroone = (state) => {
  const p = state.panel || {};
  const deque = (p.deque || []).map(esc).join('  ');
  const rows = Object.keys(p.dist || {}).map((id) => [`<span class="mono">${esc(id)}</span>`, fmt(p.dist[id])]);
  return header('DEQUE', '0/1 BFS') +
    kv('DEQUE', deque ? `<span class="mono pq-line">${deque}</span>` : '<span class="empty-chip">empty</span>') +
    table(['NODE', 'DIST'], rows) +
    '</div>';
};

RENDERERS.kruskal = (state) => {
  const p = state.panel || {};
  const sorted = (p.sorted || []).map((e) => {
    const mark = e.state === 'tree' ? '✓' : e.state === 'rejected' ? '✗' : '';
    const cls = e.state === 'tree' ? 'ok' : e.state === 'rejected' ? 'no' : '';
    return `<div class="edge-row"><span class="mono">${esc(e.from)}–${esc(e.to)}</span><span class="w">${fmt(e.weight)}</span><span class="${cls}">${mark}</span></div>`;
  }).join('');
  return header('SORTED EDGES', 'DSU components') +
    `<div class="edge-list">${sorted || '<span class="empty-chip">—</span>'}</div>` +
    kv('MST COST', fmt(p.mstCost != null ? p.mstCost : 0)) +
    kv('COMPONENTS', (p.sets || []).map((s) => `{${s.join(' ')}}`).join(' · ') || '—') +
    '</div>';
};

RENDERERS.prim = (state) => {
  const p = state.panel || {};
  const mst = (p.mst || []).map((e) => `${esc(e.from)}–${esc(e.to)} (${fmt(e.weight)})`).join(' · ');
  const frontier = (p.frontier || []).map((e) => `${esc(e.from)}–${esc(e.to)} (${fmt(e.weight)})`).join(' · ');
  return header('MST + FRONTIER', 'cut') +
    kv('MST EDGES', mst || '<span class="empty-chip">—</span>') +
    kv('FRONTIER', frontier || '<span class="empty-chip">—</span>') +
    kv('COST', fmt(p.cost != null ? p.cost : 0)) +
    '</div>';
};

RENDERERS.dsu = (state) => {
  const p = state.panel || {};
  const rows = Object.keys(p.parent || {}).map((id) => [`<span class="mono">${esc(id)}</span>`, esc(p.parent[id]), (p.size || {})[id] != null ? p.size[id] : '—']);
  return header('UNION-FIND', 'parent pointers') +
    table(['NODE', 'PARENT', 'SIZE'], rows) +
    kv('SETS', (p.sets || []).map((s) => `{${s.join(' ')}}`).join(' · ') || '—') +
    '</div>';
};

RENDERERS.kahn = (state) => {
  const p = state.panel || {};
  const rows = Object.keys(p.indegree || {}).map((id) => [`<span class="mono">${esc(id)}</span>`, p.indegree[id]]);
  return header('IN-DEGREE + QUEUE', 'Kahn') +
    kv('QUEUE', chips(p.queue || [])) +
    table(['NODE', 'IN-DEG'], rows) +
    kv('ORDER', p.order && p.order.length ? `<span class="mono">${p.order.map(esc).join(' → ')}</span>` : '—') +
    '</div>';
};

RENDERERS.dfsTopo = (state) => {
  const p = state.panel || {};
  return header('DFS FINISH ORDER', 'topological') +
    kv('ORDER', p.order && p.order.length ? `<span class="mono">${p.order.map(esc).join(' → ')}</span>` : '—') +
    (p.hasCycle ? kv('CYCLE', 'DETECTED', 'cycle-yes') : '') +
    '</div>';
};

RENDERERS.scc = (state) => {
  const p = state.panel || {};
  const comps = (p.components || []).map((c, i) => `<div class="comp-row"><span class="comp-badge">SCC${i + 1}</span><span class="reach-chips">${chips(c, 'ok')}</span></div>`).join('');
  return header('STRONGLY CONNECTED COMPONENTS', 'components') +
    `<div class="machinery-list">${comps || '<span class="empty-chip">—</span>'}</div>` +
    '</div>';
};

RENDERERS.lowlink = (state) => {
  const p = state.panel || {};
  const rows = Object.keys(p.tin || {}).map((id) => [
    `<span class="mono">${esc(id)}</span>`, p.tin[id] != null ? p.tin[id] : '—', p.low[id] != null ? p.low[id] : '—',
  ]);
  const found = p.bridges || p.aps || [];
  const label = p.bridges ? 'BRIDGES' : 'ARTICULATION POINTS';
  const names = found.map((x) => (typeof x === 'string' ? esc(x) : `${x.from}–${x.to}`));
  return header(label, 'tin / low') +
    table(['NODE', 'tin', 'low'], rows) +
    kv('FOUND', chips(names, 'no') || 'none') +
    '</div>';
};

RENDERERS.euler = (state) => {
  const p = state.panel || {};
  const odd = p.odd || [];
  const degRows = Object.keys(p.degree || {}).map((id) => [`<span class="mono">${esc(id)}</span>`, p.degree[id], p.degree[id] % 2 === 1 ? 'ODD' : '']);
  return header('EULER TRAIL', 'edges used') +
    kv('ODD-DEGREE', chips(odd, 'no') || 'none') +
    kv('USED', `${p.usedEdges != null ? p.usedEdges : 0} / ${p.totalEdges != null ? p.totalEdges : 0}`) +
    kv('TRAIL', p.trail && p.trail.length ? `<span class="mono">${p.trail.map(esc).join(' → ')}</span>` : '—') +
    `<details class="deg-details"><summary>degrees</summary>${table(['NODE', 'DEG', 'PARITY'], degRows)}</details>` +
    '</div>';
};

RENDERERS.hamilton = (state) => {
  const p = state.panel || {};
  return header('BACKTRACKING SEARCH', 'path') +
    kv('DEPTH', `${p.depth != null ? p.depth : 0}`) +
    kv('CURRENT PATH', p.path && p.path.length ? `<span class="mono">${p.path.map(esc).join(' → ')}</span>` : '—') +
    (p.solution ? kv('SOLUTION', `<span class="mono path-line">${p.solution.map(esc).join(' → ')}</span>`) : '') +
    '</div>';
};

RENDERERS.tsp = (state) => {
  const p = state.panel || {};
  return header('TOUR', state.algorithm === 'tsp-exact' ? 'branch & bound' : 'greedy + 2-opt') +
    kv('TOUR', p.tour && p.tour.length ? `<span class="mono">${p.tour.map(esc).join(' → ')}</span>` : '—') +
    kv('COST', p.cost != null ? fmt(p.cost) : '—') +
    (p.bestCost != null ? kv('BEST COST', fmt(p.bestCost)) : '') +
    (p.explored != null ? kv('EXPLORED / PRUNED', `${p.explored} / ${p.pruned != null ? p.pruned : 0}`) : '') +
    '</div>';
};

RENDERERS.flow = (state) => {
  const p = state.panel || {};
  const flows = (p.flows || []).map((f) => `<div class="edge-row"><span class="mono">${esc(f.from)}→${esc(f.to)}</span><span class="w">${fmt(f.flow)} / ${fmt(f.cap)}</span></div>`).join('');
  const residual = (p.residual || []).slice(0, 12).map((r) => `${esc(r.from)}→${esc(r.to)}:${fmt(r.cap)}`).join(' · ');
  return header('FLOW / RESIDUAL', 'residual graph') +
    kv('TOTAL FLOW', fmt(p.totalFlow != null ? p.totalFlow : 0), 'current') +
    kv('PATH', p.path && p.path.length ? `<span class="mono">${p.path.map(esc).join(' → ')}</span>` : '—') +
    (p.bottleneck != null ? kv('BOTTLENECK', fmt(p.bottleneck)) : '') +
    `<div class="edge-list">${flows || '<span class="empty-chip">—</span>'}</div>` +
    `<details class="deg-details"><summary>residual arcs</summary><div class="muted-text">${residual || 'none'}</div></details>` +
    '</div>';
};

RENDERERS.matching = (state) => {
  const p = state.panel || {};
  const pairs = (p.matching || []).map((m) => `<span class="chip ok">${esc(m.left)} — ${esc(m.right)}</span>`).join('');
  return header('MATCHING', 'augmenting paths') +
    kv('SIZE', (p.matching || []).length) +
    kv('MATCHED', pairs || '<span class="empty-chip">none yet</span>') +
    (p.augmentingPath && p.augmentingPath.length ? kv('AUGMENTING PATH', (p.augmentingPath || []).map((c) => `${esc(c.left)}↔${esc(c.right)}`).join(' → ')) : '') +
    '</div>';
};

RENDERERS.pagerank = (state) => {
  const p = state.panel || {};
  const rows = Object.keys(p.rank || {}).map((id) => [`<span class="mono">${esc(id)}</span>`, (p.rank[id]).toFixed(4)]);
  return header('RANK VECTOR', `iteration ${p.iteration != null ? p.iteration : 0}`) +
    table(['PAGE', 'RANK'], rows) +
    '</div>';
};

// helper to resolve an edge id into its endpoints
let _graphRef = null;
function graphEdge(id) {
  if (!_graphRef) return null;
  return _graphRef.getEdge(id);
}

export function renderMachineryFor(state, trace, graph, meta) {
  _graphRef = graph;
  return renderMachinery(state, trace, graph, meta);
}

// ------------------------------------------------------- trace inspector
export function renderTraceInspector(state, trace, graph) {
  if (!state || !trace) return '';
  const ev = trace.events[state.step - 1] || null;
  const total = trace.events.length;
  let html = header('TRACE INSPECTOR', `step ${state.step}/${total}`);
  if (!ev) {
    html += '<div class="muted-text">Press STEP to inspect the first event.</div>';
  } else {
    html += kv('STEP', `${state.step} / ${total}`);
    html += kv('EVENT', `<span class="mono current">${esc(ev.type)}</span>`);
    html += kv('MESSAGE', esc(ev.message || '—'));
    if (ev.why) {
      html += `<div class="why-block"><div class="why-title">WHY?</div><p>${esc(ev.why)}</p></div>`;
    }
    const extras = Object.keys(ev).filter((k) => !['type', 'step', 'line', 'message', 'why'].includes(k));
    if (extras.length) {
      html += `<details class="deg-details"><summary>raw event fields</summary><pre class="raw-event">${esc(JSON.stringify(ev, null, 2))}</pre></details>`;
    }
  }
  html += '</div>';
  return html;
}

// ------------------------------------------------------- result panel
export function renderResultPanel(state, trace) {
  if (!state || !trace) return '';
  if (trace.error) {
    return header('ERROR', '') +
      `<div class="err-box">${esc(trace.error.message)}</div>` +
      '</div>';
  }
  if (!state.complete) {
    return header('RESULT', state.algorithm) +
      `<div class="muted-text">${state.step === 0 ? 'Run the algorithm to see the result.' : 'Executing…'}</div>` +
      '</div>';
  }
  const r = state.result || trace.result || {};
  let extra = '';
  if (Array.isArray(r.path) && r.path.length) {
    extra += kv('TRAVERSAL / PATH', `<span class="mono path-line">${r.path.map(esc).join(' → ')}</span>`);
  }
  return header('RESULT', `${state.algorithm} · complete`) +
    `<div class="result-msg">${esc(r.message || 'done')}</div>` +
    extra +
    '</div>';
}
