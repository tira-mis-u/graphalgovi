/**
 * main.js — Graphalgovi.
 *
 * A collection of purpose-built, real-world interactive experiences powered
 * by one shared graph-algorithm engine. Algorithms remain pure; the
 * real-world layer is a presentation adapter (src/realworld/).
 */
import Graph from './graph/Graph.js';
import Camera from './camera/Camera.js';
import ExecutionController from './execution/ExecutionController.js';
import GraphInteraction from './interaction/GraphInteraction.js';
import GraphRenderer from './visualization/GraphRenderer.js';
import PseudocodeRenderer from './visualization/PseudocodeRenderer.js';
import { applyVizPalette } from './visualization/AlgorithmRenderer.js';
import { renderMachineryFor, renderTraceInspector } from './visualization/PanelRenderer.js';
import { renderMachinery as renderLegacyMachinery, renderLevels } from './visualization/InternalStateRenderer.js';
import { ALGORITHMS, CATEGORIES, getAlgorithm, validate, searchAlgorithms } from './catalog/algorithms.js';
import { examplesFor, getExample } from './catalog/examples.js';
import { generateGraph } from './tools/generator.js';
import { SCENARIOS, getScenario, scenariosForAlgorithm } from './realworld/scenarios.js';
import { renderWorld } from './realworld/renderers.js';
import { universalize, makeContext } from './realworld/controller.js';
import { experienceFor } from './realworld/experiences.js';
import { initTheme, toggleTheme, THEMES } from './ui/tokens.js';

const $ = (id) => document.getElementById(id);
const LEGACY = new Set(['BFS', 'DFS']);
const REDUCED_MOTION = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const DOMAIN_FA = {
  'Navigation': 'fa-map-location-dot',
  'Infrastructure': 'fa-tower-cell',
  'Networking': 'fa-network-wired',
  'Software Systems': 'fa-code',
  'Logistics': 'fa-truck-fast',
  'Games': 'fa-gamepad',
  'Education': 'fa-graduation-cap',
  'Operations': 'fa-users-gear',
  'Social': 'fa-people-group',
  'Web': 'fa-globe',
  'Transport': 'fa-plane',
  'Life': 'fa-utensils',
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function fa(cls) {
  return `<i class="fa-solid ${cls}" aria-hidden="true"></i>`;
}

// ------------------------------------------------------------------- DOM
const els = {};
[
  'brandHome', 'searchInput', 'themeToggle', 'segTabs',
  'filterBar', 'problemGrid',
  'btnWsBack', 'wsProblemHeading', 'wsScenarioTitle', 'wsDataLabel', 'wsAlgoChips', 'levelSelectWrap', 'levelSelect',
  'canvasWrap', 'graphCanvas', 'btnZoomIn', 'btnZoomOut', 'btnFit', 'ctxBar', 'btnReveal', 'activityLine',
  'revealLegend', 'onboarding', 'onbTitle', 'onbSteps', 'onbDismiss',
  'whatNow', 'metrics', 'metricsTitle', 'whyGraph', 'resultText',
  'machineryBox', 'levelsBox', 'pseudocode', 'tracePanel',
  'btnRun', 'btnStep', 'btnStepBack', 'stepInput', 'stepMax', 'speedInput',
  'compareA', 'compareB', 'btnCompareDo', 'compareResult',
  'genType', 'genN', 'genDensity', 'genDensityVal', 'genWeighted', 'genDirected', 'genWMax', 'genSeed', 'btnGenDo',
  'benchAlgo', 'benchMaxN', 'benchSeed', 'btnBenchDo', 'benchResult',
  'generateModal', 'benchmarkModal',
  'importFile',
  'errorPanel', 'errorStage', 'errorMsg', 'errorStack',
  'wsWhatNow', 'wsMetrics', 'wsWhyGraph', 'wsResult', 'wsInternals', 'wsPseudocode', 'wsTrace', 'wsCompare',
].forEach((id) => { els[id] = $(id); });

// ------------------------------------------------------------------- state
let view = 'home';
let wsMode = 'scenario'; // 'scenario' | 'lab' | 'example'
let reveal = false;
let showScores = false;
let onboardingDismissed = false;
let homeTab = 'problems';
let homeFilter = '';

let currentAlgorithmId = 'dijkstra';
let currentLevel = 'Realistic';
let currentScenarioId = null;
let currentExampleId = null;

let baseGraph = new Graph();
let entities = null;
let scenario = null;
let closedEdgeIds = new Set();

let labGraph = new Graph();
let labWeightedMode = false;

let startNode = null;
let targetNode = null;
let sourceNode = null;
let sinkNode = null;
let params = {};
let validationProblems = [];
let fittedOnce = false;
let lastFitW = 0;
let lastFitH = 0;

const camera = new Camera({ width: 800, height: 600 });
const graphRenderer = new GraphRenderer();
const pseudo = new PseudocodeRenderer(els.pseudocode);

const controller = new ExecutionController({
  onStateChange: () => { updatePanels(); updateControls(); syncStep(); },
});

const interaction = new GraphInteraction({
  canvas: els.graphCanvas,
  camera,
  graph: baseGraph,
  draggableNodes: false,
  callbacks: {
    onNodeSelect: () => {},
    onSetStart: (id) => setRole('start', id),
    onSetTarget: (id) => setRole('target', id),
    onPickEdge: (id) => closeRoad(id),
    onNodeMoved: () => {},
    onViewChanged: () => {},
    onCanvasClick: () => {},
    onAddNode: (x, y) => labAddNode(x, y),
    onDeleteNode: (id) => labDeleteNode(id),
    onDeleteEdge: (id) => labDeleteEdge(id),
    onAddEdge: (a, b) => labAddEdge(a, b),
    onEdgeSource: () => {},
    onToolChange: () => {},
  },
});

// ------------------------------------------------------------------- graphs
function buildGraphFromExample(ex) {
  const g = new Graph({ directed: ex.directed });
  for (const n of ex.nodes) g.addNode({ id: n.id, label: n.label, x: n.x, y: n.y, metadata: n.metadata || {} });
  for (const e of ex.edges) g.addEdge({ from: e.from, to: e.to, weight: e.weight == null ? 1 : e.weight, directed: e.directed != null ? e.directed : ex.directed });
  return g;
}

function defaultLabGraph() {
  const g = new Graph({ directed: false });
  g.addNode({ id: 'A', label: 'A', x: 0, y: -80 });
  g.addNode({ id: 'B', label: 'B', x: -180, y: -220 });
  g.addNode({ id: 'C', label: 'C', x: 180, y: -220 });
  g.addNode({ id: 'D', label: 'D', x: -300, y: -380 });
  g.addNode({ id: 'E', label: 'E', x: 0, y: -400 });
  g.addEdge({ from: 'A', to: 'B' });
  g.addEdge({ from: 'A', to: 'C' });
  g.addEdge({ from: 'B', to: 'D' });
  g.addEdge({ from: 'C', to: 'E' });
  g.addEdge({ from: 'D', to: 'E' });
  return g;
}

function execGraph() {
  if (closedEdgeIds.size === 0) return baseGraph;
  const g = baseGraph.copy();
  for (const id of closedEdgeIds) g.removeEdge(id);
  return g;
}

// ------------------------------------------------------------------- views
function showView(name) {
  view = name;
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== `view-${name}`; });
  if (name === 'home') renderHome();
  if (name === 'lab') openLab();
}

// ------------------------------------------------------------------- previews
const SVG = {
  // Hà Nội tiled map: district mosaic + river + route + pins
  map: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<g stroke="none">' +
    '<polygon points="8,10 34,8 44,22 30,30 10,28" fill="#3f6b3a"/><polygon points="34,8 60,6 66,20 44,22" fill="#4a7c42"/>' +
    '<polygon points="60,6 84,10 82,24 66,20" fill="#3a6036"/><polygon points="84,10 118,14 114,30 82,24" fill="#4a7c42"/>' +
    '<polygon points="10,28 30,30 26,46 12,44" fill="#3a6036"/><polygon points="30,30 44,22 54,34 38,44 26,46" fill="#4a7c42"/>' +
    '<polygon points="44,22 66,20 74,34 54,34" fill="#604e76"/><polygon points="66,20 82,24 88,38 74,34" fill="#3a6036"/>' +
    '<polygon points="82,24 114,30 108,48 88,38" fill="#4a7c42"/><polygon points="26,46 38,44 42,58 30,58" fill="#604e76"/>' +
    '<polygon points="38,44 54,34 62,50 42,58" fill="#3a6036"/><polygon points="54,34 74,34 78,50 62,50" fill="#4a7c42"/>' +
    '<polygon points="74,34 88,38 90,54 78,50" fill="#604e76"/><polygon points="88,38 108,48 104,60 90,54" fill="#3a6036"/>' +
    '</g>' +
    '<path d="M30,52 C 40,40 52,28 60,18 C 70,28 78,38 92,52" stroke="#4f9cc0" stroke-width="3" fill="none" opacity="0.6"/>' +
    '<g stroke="#1a2a20" stroke-width="0.7"><polygon points="8,10 34,8 44,22 30,30 10,28" fill="none"/><polygon points="34,8 60,6 66,20 44,22" fill="none"/><polygon points="60,6 84,10 82,24 66,20" fill="none"/><polygon points="84,10 118,14 114,30 82,24" fill="none"/><polygon points="10,28 30,30 26,46 12,44" fill="none"/><polygon points="30,30 44,22 54,34 38,44 26,46" fill="none"/><polygon points="44,22 66,20 74,34 54,34" fill="none"/><polygon points="66,20 82,24 88,38 74,34" fill="none"/><polygon points="82,24 114,30 108,48 88,38" fill="none"/><polygon points="26,46 38,44 42,58 30,58" fill="none"/><polygon points="38,44 54,34 62,50 42,58" fill="none"/><polygon points="54,34 74,34 78,50 62,50" fill="none"/><polygon points="74,34 88,38 90,54 78,50" fill="none"/><polygon points="88,38 108,48 104,60 90,54" fill="none"/></g>' +
    '<circle cx="16" cy="14" r="4.5" fill="#0e7490" stroke="#fff" stroke-width="1.2"/><circle cx="106" cy="20" r="4.5" fill="#b45309" stroke="#fff" stroke-width="1.2"/>' +
    '<path d="M16,14 L30,16 L44,22 L54,34 L62,50" stroke="#e89e3b" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '</svg>',
  // Fiber blueprint: buildings + trench cables + $ tags
  blueprint: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0f1c2e"/>' +
    '<g stroke="#22344c" stroke-width="1"><path d="M0,16 H128 M0,32 H128 M0,48 H128"/><path d="M32,0 V64 M64,0 V64 M96,0 V64"/></g>' +
    '<g stroke="#3d7c52" stroke-width="2.5" stroke-linecap="round"><path d="M20,24 L52,24 L52,44 L84,44"/><path d="M20,24 L20,48"/><path d="M52,24 L84,24 L84,44"/></g>' +
    '<g stroke="#7a4b45" stroke-width="2" stroke-dasharray="5 4"><path d="M84,24 L84,16 L108,16"/></g>' +
    '<g fill="#3a4a5c" stroke="#5c7088"><rect x="10" y="18" width="16" height="12" rx="1.5"/><rect x="46" y="18" width="16" height="12" rx="1.5"/><rect x="78" y="38" width="16" height="12" rx="1.5"/><rect x="10" y="42" width="16" height="12" rx="1.5"/><rect x="100" y="10" width="16" height="12" rx="1.5"/></g>' +
    '<g font-size="8" fill="#9fc9a0" font-family="monospace"><text x="22" y="44" text-anchor="middle">$12k</text><text x="54" y="42" text-anchor="middle">$6k</text></g>' +
    '</svg>',
  // Network monitoring: racks + routers + packets
  monitoring: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0d1626"/>' +
    '<g stroke="#22344c" stroke-width="1"><path d="M0,16 H128 M0,32 H128 M0,48 H128"/></g>' +
    '<g stroke="#38495f" stroke-width="1.5"><path d="M24,24 H60 V44 H104"/><path d="M24,24 V44"/><path d="M60,24 H104 V44"/><path d="M24,40 H60"/></g>' +
    '<rect x="16" y="18" width="16" height="12" rx="2" fill="#1a2c42" stroke="#4f8cc9"/><circle cx="22" cy="24" r="1.6" fill="#55c4dd"/><circle cx="26" cy="24" r="1.6" fill="#55c4dd"/>' +
    '<rect x="52" y="18" width="16" height="12" rx="2" fill="#1a2c42" stroke="#4f8cc9"/><circle cx="58" cy="24" r="1.6" fill="#55c4dd"/><circle cx="62" cy="24" r="1.6" fill="#55c4dd"/>' +
    '<rect x="96" y="38" width="16" height="12" rx="2" fill="#1a2c42" stroke="#4f8cc9"/>' +
    '<rect x="52" y="38" width="16" height="12" rx="2" fill="#13233a" stroke="#c9cfda"/>' +
    '<circle cx="42" cy="24" r="2.5" fill="#55c4dd"/><circle cx="82" cy="44" r="2.5" fill="#55c4dd"/>' +
    '<text x="24" y="36" font-size="7" fill="#8fa6c0" text-anchor="middle" font-family="monospace">API</text>' +
    '</svg>',
  // Software pipeline: module cards + status chips + conveyor
  pipeline: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0f1722"/>' +
    '<g stroke="#38495f" stroke-width="1.2"><path d="M22,8 L22,40 L60,48 L60,8 Z M64,6 L64,40 L100,46 L100,6 Z"/></g>' +
    '<rect x="14" y="10" width="22" height="12" rx="2" fill="#1c2b21" stroke="#3d7c52"/><rect x="24" y="12" width="10" height="4" rx="1" fill="#3d7c52"/>' +
    '<rect x="44" y="12" width="24" height="12" rx="2" fill="#2a2113" stroke="#e89e3b"/><rect x="52" y="14" width="12" height="4" rx="1" fill="#e89e3b"/>' +
    '<rect x="74" y="12" width="24" height="12" rx="2" fill="#151a24" stroke="#38495f"/>' +
    '<rect x="0" y="48" width="128" height="8" rx="3" fill="#22344c"/><circle cx="20" cy="52" r="3" fill="#38495f"/><circle cx="60" cy="52" r="3" fill="#3d7c52"/><circle cx="100" cy="52" r="3" fill="#e89e3b"/>' +
    '<text x="25" y="20" font-size="7" fill="#9fc9a0" text-anchor="middle" font-family="monospace">auth</text>' +
    '<text x="56" y="20" font-size="7" fill="#f7cd86" text-anchor="middle" font-family="monospace">api</text>' +
    '</svg>',
  // Water flow: reservoir + pipes + city + flow dots
  flow: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0d1626"/>' +
    '<rect x="6" y="20" width="26" height="18" rx="3" fill="#16303f" stroke="#2f7398"/>' +
    '<path d="M10,30 q4,-4 8,0 t8,0" stroke="#4f9cc0" stroke-width="1.4" fill="none"/>' +
    '<path d="M32,29 C 52,29 52,41 72,41 C 92,41 96,35 118,35" stroke="#2f5a6e" stroke-width="7" fill="none" stroke-linecap="round"/>' +
    '<path d="M32,29 C 52,29 52,41 72,41 C 92,41 96,35 118,35" stroke="#3f7fa0" stroke-width="3" fill="none"/>' +
    '<g fill="#55c4dd"><circle cx="52" cy="33" r="2.6"/><circle cx="88" cy="38" r="2.6"/><circle cx="104" cy="36" r="2.6"/></g>' +
    '<rect x="112" y="24" width="16" height="16" rx="2" fill="#1a2c42" stroke="#4f8cc9"/><rect x="114" y="27" width="4" height="6" fill="#55c4dd"/><rect x="119" y="27" width="4" height="6" fill="#55c4dd"/>' +
    '<text x="19" y="45" font-size="7" fill="#8fb6c8" text-anchor="middle" font-family="monospace">reservoir</text>' +
    '</svg>',
  // Game pathfinding: terrain tiles + flags + character
  game: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0e1411"/>' +
    '<g stroke="#1a2333" stroke-width="1">' +
    '<rect x="4" y="4" width="20" height="16" fill="#2e4a2c"/><rect x="24" y="4" width="20" height="16" fill="#4a4d44"/><rect x="44" y="4" width="20" height="16" fill="#6b4a24"/><rect x="64" y="4" width="20" height="16" fill="#1a4a66"/><rect x="84" y="4" width="20" height="16" fill="#2e4a2c"/>' +
    '<rect x="4" y="20" width="20" height="16" fill="#1a4a66"/><rect x="24" y="20" width="20" height="16" fill="#2e4a2c"/><rect x="44" y="20" width="20" height="16" fill="#4a4d44"/><rect x="64" y="20" width="20" height="16" fill="#2e4a2c"/><rect x="84" y="20" width="20" height="16" fill="#6b4a24"/>' +
    '<rect x="4" y="36" width="20" height="16" fill="#2e4a2c"/><rect x="24" y="36" width="20" height="16" fill="#6b4a24"/><rect x="44" y="36" width="20" height="16" fill="#2e4a2c"/><rect x="64" y="36" width="20" height="16" fill="#4a4d44"/><rect x="84" y="36" width="20" height="16" fill="#2e4a2c"/>' +
    '</g>' +
    '<path d="M14,12 L34,12 L54,20 L74,20 L74,36 L94,36 L94,44" stroke="#55c4dd" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="14" cy="12" r="6" fill="#2e7d4f" stroke="#fff" stroke-width="1.4"/><text x="14" y="15" font-size="8" fill="#fff" text-anchor="middle" font-family="monospace">S</text>' +
    '<circle cx="94" cy="44" r="6" fill="#b45309" stroke="#fff" stroke-width="1.4"/><text x="94" y="47" font-size="8" fill="#fff" text-anchor="middle" font-family="monospace">G</text>' +
    '<circle cx="74" cy="20" r="5" fill="#e89e3b" stroke="#0f1216" stroke-width="1.4"/>' +
    '</svg>',
  // Course planning: semester columns + cards
  planning: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0f1722"/>' +
    '<text x="22" y="10" font-size="6.5" fill="#8fa6c0" text-anchor="middle" font-family="monospace">SEM 1</text>' +
    '<text x="64" y="10" font-size="6.5" fill="#8fa6c0" text-anchor="middle" font-family="monospace">SEM 2</text>' +
    '<text x="106" y="10" font-size="6.5" fill="#8fa6c0" text-anchor="middle" font-family="monospace">SEM 3</text>' +
    '<rect x="8" y="14" width="28" height="12" rx="2" fill="#1c2b21" stroke="#3d7c52"/><rect x="8" y="30" width="28" height="12" rx="2" fill="#1c2b21" stroke="#3d7c52"/>' +
    '<rect x="50" y="18" width="28" height="12" rx="2" fill="#2a2113" stroke="#e89e3b"/><rect x="50" y="34" width="28" height="12" rx="2" fill="#151a24" stroke="#38495f"/>' +
    '<rect x="92" y="22" width="28" height="12" rx="2" fill="#151a24" stroke="#38495f"/><rect x="92" y="38" width="28" height="12" rx="2" fill="#1c2b21" stroke="#3d7c52"/>' +
    '<g stroke="#38495f" stroke-width="1.2" fill="none"><path d="M36,20 C 44,20 42,24 50,24"/><path d="M36,36 C 44,36 42,40 50,40"/><path d="M78,24 C 86,24 84,28 92,28"/><path d="M78,40 C 86,40 84,44 92,44"/></g>' +
    '<circle cx="36" cy="20" r="2" fill="#3d7c52"/><circle cx="78" cy="24" r="2" fill="#3d7c52"/>' +
    '</svg>',
  // Job matching: candidate avatars + job cards + lines
  assignment: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0f1722"/>' +
    '<circle cx="16" cy="16" r="7" fill="#4a78b8" stroke="#fff" stroke-width="1.2"/><text x="16" y="19" font-size="7" fill="#fff" text-anchor="middle" font-family="monospace">LT</text>' +
    '<circle cx="16" cy="38" r="7" fill="#3d9b8c" stroke="#fff" stroke-width="1.2"/><text x="16" y="41" font-size="7" fill="#fff" text-anchor="middle" font-family="monospace">SA</text>' +
    '<circle cx="16" cy="54" r="7" fill="#7c5cd6" stroke="#fff" stroke-width="1.2"/><text x="16" y="57" font-size="7" fill="#fff" text-anchor="middle" font-family="monospace">MR</text>' +
    '<rect x="94" y="10" width="28" height="14" rx="2" fill="#151a24" stroke="#38495f"/><rect x="94" y="32" width="28" height="14" rx="2" fill="#1c2b21" stroke="#3d7c52"/><rect x="94" y="48" width="28" height="14" rx="2" fill="#151a24" stroke="#38495f"/>' +
    '<g stroke-linecap="round"><path d="M23,16 H94" stroke="#3d7c52" stroke-width="2.5"/><path d="M23,38 H94" stroke="#e89e3b" stroke-width="2"/><path d="M23,54 H94" stroke="#38495f" stroke-width="1.5" stroke-dasharray="4 3"/></g>' +
    '</svg>',
  // Critical infrastructure: metro map + critical link
  reliability: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0f1722"/>' +
    '<g stroke="#3a4a5c" stroke-width="3" stroke-linecap="round"><path d="M20,16 H64 V48 H108"/><path d="M20,16 V48"/><path d="M64,16 V48"/></g>' +
    '<path d="M64,16 H108" stroke="#e87a5d" stroke-width="4" stroke-linecap="round"/>' +
    '<g fill="#0f1722" stroke="#c9cfda" stroke-width="1.6"><circle cx="20" cy="16" r="5.5"/><circle cx="64" cy="16" r="5.5"/><circle cx="108" cy="16" r="5.5"/><circle cx="20" cy="48" r="5.5"/><circle cx="64" cy="48" r="5.5"/><circle cx="108" cy="48" r="5.5"/></g>' +
    '<g fill="#c9cfda"><circle cx="20" cy="16" r="2"/><circle cx="64" cy="16" r="2"/><circle cx="108" cy="16" r="2"/><circle cx="20" cy="48" r="2"/><circle cx="64" cy="48" r="2"/><circle cx="108" cy="48" r="2"/></g>' +
    '<text x="86" y="11" font-size="7" fill="#f2a184" text-anchor="middle" font-family="monospace">CRITICAL</text>' +
    '</svg>',
  // Delivery: warehouse + houses + truck
  controlroom: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0e1620"/>' +
    '<g stroke="#38495f" stroke-width="1.2"><path d="M10,40 L120,40"/></g>' +
    '<g fill="#1a2c42" stroke="#4f8cc9"><rect x="6" y="26" width="22" height="16" rx="2"/></g><path d="M6,26 L17,18 L28,26" fill="none" stroke="#e89e3b" stroke-width="1.6"/>' +
    '<g fill="#22303c" stroke="#5c7088"><path d="M46,30 L52,24 L58,30 L58,42 L46,42 Z"/><path d="M72,28 L78,22 L84,28 L84,42 L72,42 Z"/><path d="M98,32 L104,26 L110,32 L110,42 L98,42 Z"/></g>' +
    '<path d="M40,48 C 58,48 58,40 76,40 C 92,40 96,46 116,46" stroke="#d8a53a" stroke-width="2.4" fill="none" stroke-dasharray="5 3" stroke-linecap="round"/>' +
    '<rect x="52" y="36" width="14" height="9" rx="2" fill="#d8a53a" stroke="#0f1216" stroke-width="1"/><circle cx="55" cy="45" r="2" fill="#0f1216"/><circle cx="63" cy="45" r="2" fill="#0f1216"/>' +
    '<text x="17" y="48" font-size="6.5" fill="#e89e3b" text-anchor="middle" font-family="monospace">WAREHOUSE</text>' +
    '</svg>',
  // Street inspection: city blocks + loop route
  inspection: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0f1722"/>' +
    '<g fill="#15202e"><rect x="10" y="10" width="34" height="20" rx="2"/><rect x="64" y="10" width="34" height="20" rx="2"/><rect x="10" y="36" width="34" height="18" rx="2"/><rect x="64" y="36" width="34" height="18" rx="2"/></g>' +
    '<path d="M44,12 L60,12 L60,30 L44,30 Z" stroke="#3d7c52" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M60,30 L60,54 L44,54 L44,42 L30,42 L30,54 L10,54 L10,12" stroke="#e89e3b" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<rect x="52" y="40" width="14" height="9" rx="2" fill="#d8a53a" stroke="#0f1216" stroke-width="1"/>' +
    '</svg>',
  // Social network: avatars + friend lines
  social: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0f1722"/>' +
    '<g stroke="#38495f" stroke-width="1.3"><path d="M64,22 L32,48 M64,22 L96,48 M64,22 L20,12 M64,22 L108,12 M32,48 L96,48"/></g>' +
    '<circle cx="64" cy="22" r="10" fill="#e89e3b" stroke="#0f1216" stroke-width="1.6"/><text x="64" y="25" font-size="8" fill="#0f1216" text-anchor="middle" font-family="monospace">An</text>' +
    '<circle cx="32" cy="48" r="8" fill="#4a78b8" stroke="#0f1216" stroke-width="1.4"/><circle cx="96" cy="48" r="8" fill="#3d9b8c" stroke="#0f1216" stroke-width="1.4"/>' +
    '<circle cx="20" cy="12" r="7" fill="#7c5cd6" stroke="#0f1216" stroke-width="1.4"/><circle cx="108" cy="12" r="7" fill="#c23b6e" stroke="#0f1216" stroke-width="1.4"/>' +
    '<circle cx="64" cy="22" r="15" fill="none" stroke="#4a78b8" stroke-width="1.2" stroke-dasharray="4 4"/>' +
    '</svg>',
  // Web ranking: browser windows + rank bars
  web: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0f1722"/>' +
    '<g stroke="#38495f" stroke-width="1.2"><path d="M64,6 L20,40 M64,6 L108,40 M20,40 L108,40"/></g>' +
    '<rect x="10" y="8" width="30" height="22" rx="2" fill="#151a24" stroke="#38495f"/><rect x="10" y="8" width="30" height="6" fill="#22344c"/>' +
    '<rect x="84" y="36" width="34" height="22" rx="2" fill="#151a24" stroke="#38495f"/><rect x="84" y="36" width="34" height="6" fill="#22344c"/>' +
    '<rect x="50" y="8" width="30" height="22" rx="2" fill="#151a24" stroke="#3d7c52"/><rect x="50" y="8" width="30" height="6" fill="#22344c"/>' +
    '<rect x="14" y="19" width="22" height="5" fill="#22344c"/><rect x="14" y="19" width="16" height="5" fill="#4a78b8"/>' +
    '<rect x="88" y="45" width="26" height="5" fill="#22344c"/><rect x="88" y="45" width="20" height="5" fill="#4a78b8"/>' +
    '<rect x="54" y="19" width="22" height="5" fill="#22344c"/><rect x="54" y="19" width="12" height="5" fill="#4a78b8"/>' +
    '<text x="25" y="16" font-size="6" fill="#8fa6c0" text-anchor="middle" font-family="monospace">search</text>' +
    '</svg>',
  // Airport: radar + flight arcs + plane
  airport: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0c1420"/>' +
    '<g stroke="#1c2a3c" stroke-width="1"><circle cx="64" cy="32" r="14"/><circle cx="64" cy="32" r="28"/><path d="M64,4 V60 M36,32 H92"/></g>' +
    '<g fill="#5c7088"><circle cx="20" cy="18" r="3.5"/><circle cx="108" cy="16" r="3.5"/><circle cx="64" cy="52" r="3.5"/><circle cx="108" cy="48" r="3.5"/></g>' +
    '<g stroke="#e89e3b" stroke-width="2" fill="none" stroke-linecap="round"><path d="M20,18 Q 64,4 108,16"/><path d="M20,18 Q 64,36 64,52"/><path d="M64,52 Q 92,32 108,16"/></g>' +
    '<path d="M56,40 L64,34 L72,40 L68,40 L68,46 L60,46 L60,40 Z" fill="#55c4dd" stroke="#0f1216" stroke-width="0.8"/>' +
    '<text x="20" y="28" font-size="6" fill="#8fa6c0" text-anchor="middle" font-family="monospace">HAN</text>' +
    '<text x="108" y="58" font-size="6" fill="#8fa6c0" text-anchor="middle" font-family="monospace">VCA</text>' +
    '</svg>',
  // Cooking: step cards + arrows
  cooking: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0f1722"/>' +
    '<rect x="8" y="14" width="26" height="14" rx="3" fill="#1c2b21" stroke="#3d7c52"/><rect x="8" y="34" width="26" height="14" rx="3" fill="#151a24" stroke="#38495f"/>' +
    '<rect x="52" y="20" width="26" height="14" rx="3" fill="#2a2113" stroke="#e89e3b"/><rect x="52" y="38" width="26" height="14" rx="3" fill="#1c2b21" stroke="#3d7c52"/>' +
    '<rect x="94" y="28" width="26" height="14" rx="3" fill="#151a24" stroke="#38495f"/>' +
    '<g stroke="#e89e3b" stroke-width="2" fill="none"><path d="M34,21 L52,27"/><path d="M34,41 L52,45"/><path d="M78,27 L94,35"/><path d="M78,45 L94,35"/></g>' +
    '<text x="21" y="23" font-size="8" text-anchor="middle">🥕</text><text x="65" y="29" font-size="8" text-anchor="middle">🍳</text><text x="107" y="37" font-size="8" text-anchor="middle">🍽️</text>' +
    '<text x="21" y="43" font-size="8" text-anchor="middle">🍚</text>' +
    '</svg>',
  // Movie recommendations: film posters + links
  movie: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0f1722"/>' +
    '<g stroke="#38495f" stroke-width="1.1"><path d="M44,24 L18,44 M44,24 L72,44 M44,24 L18,10 M44,24 L72,10 M18,44 L72,44"/></g>' +
    '<rect x="38" y="16" width="14" height="22" rx="2" fill="#4a78b8" stroke="#fff" stroke-width="0.8"/>' +
    '<rect x="12" y="6" width="13" height="20" rx="2" fill="#3d7c52" stroke="#fff" stroke-width="0.8"/>' +
    '<rect x="66" y="6" width="13" height="20" rx="2" fill="#7c5cd6" stroke="#fff" stroke-width="0.8"/>' +
    '<rect x="12" y="40" width="13" height="20" rx="2" fill="#b06a4a" stroke="#fff" stroke-width="0.8"/>' +
    '<rect x="66" y="40" width="13" height="20" rx="2" fill="#3d9b8c" stroke="#fff" stroke-width="0.8"/>' +
    '<text x="45" y="31" font-size="7" fill="#fff" text-anchor="middle" font-family="monospace">★</text>' +
    '</svg>',
  // Power grid: substation + pylons + sagging line
  power: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0f1722"/>' +
    '<rect x="8" y="20" width="24" height="16" rx="2" fill="#1a2733" stroke="#e0a03a"/><text x="20" y="31" font-size="9" text-anchor="middle">⚡</text>' +
    '<g stroke="#5c7088" stroke-width="1.4">' +
    '<path d="M52,10 L60,16 L68,10"/><path d="M60,16 L60,34"/><path d="M46,22 H74"/><path d="M52,34 L46,40 M68,34 L74,40"/>' +
    '<path d="M92,10 L100,16 L108,10"/><path d="M100,16 L100,34"/><path d="M86,22 H114"/><path d="M92,34 L86,40 M108,34 L114,40"/>' +
    '</g>' +
    '<path d="M32,28 Q 46,20 60,28 Q 74,36 100,28" stroke="#e0a03a" stroke-width="2.4" fill="none"/>' +
    '<g fill="#1a2c42" stroke="#4f8cc9"><path d="M46,34 L50,28 L54,34 L54,44 L46,44 Z"/><path d="M86,34 L90,28 L94,34 L94,44 L86,44 Z"/></g>' +
    '</svg>',
  // Maze escape: corridors + pac-man + star
  maze: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#141c28"/>' +
    '<g fill="#2a3343"><rect x="20" y="4" width="12" height="44"/><rect x="52" y="4" width="12" height="20"/><rect x="84" y="4" width="12" height="44"/><rect x="36" y="20" width="16" height="12"/><rect x="68" y="36" width="16" height="12"/></g>' +
    '<path d="M12,16 L20,16 L20,56 L32,56 L32,32 L44,32 L44,44 L52,44 L52,56 L72,56 L72,32 L84,32 L84,12 L100,12 L100,28 L116,28" stroke="#e89e3b" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="12" cy="16" r="7" fill="#e89e3b" stroke="#0f1216" stroke-width="1.4"/><path d="M12,16 L19,13 L19,19 Z" fill="#0f1216"/>' +
    '<circle cx="116" cy="28" r="7" fill="#4a9d66" stroke="#0f1216" stroke-width="1.4"/><text x="116" y="31" font-size="8" fill="#fff" text-anchor="middle">★</text>' +
    '</svg>',
  // Radio towers: masts + colored frequency dots
  towers: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect x="0" y="0" width="128" height="64" fill="#0f1722"/>' +
    '<g stroke="#5c7088" stroke-width="1.6">' +
    '<path d="M22,40 L22,20 M22,20 L15,13 M22,20 L29,13"/><path d="M52,44 L52,24 M52,24 L45,17 M52,24 L59,17"/>' +
    '<path d="M82,40 L82,20 M82,20 L75,13 M82,20 L89,13"/><path d="M112,44 L112,24 M112,24 L105,17 M112,24 L119,17"/>' +
    '</g>' +
    '<g stroke-dasharray="4 3" stroke="#4a5568" stroke-width="1.2"><path d="M29,26 Q 40,18 52,26"/><path d="M59,28 Q 70,20 82,28"/><path d="M89,26 Q 100,18 112,26"/></g>' +
    '<circle cx="22" cy="11" r="3.4" fill="#4a78b8"/><circle cx="52" cy="15" r="3.4" fill="#3d7c52"/><circle cx="82" cy="11" r="3.4" fill="#3d7c52"/><circle cx="112" cy="15" r="3.4" fill="#4a78b8"/>' +
    '<text x="22" y="50" font-size="6.5" fill="#8fa6c0" text-anchor="middle" font-family="monospace">A</text>' +
    '<text x="52" y="54" font-size="6.5" fill="#8fa6c0" text-anchor="middle" font-family="monospace">B</text>' +
    '<text x="82" y="50" font-size="6.5" fill="#8fa6c0" text-anchor="middle" font-family="monospace">B</text>' +
    '<text x="112" y="54" font-size="6.5" fill="#8fa6c0" text-anchor="middle" font-family="monospace">A</text>' +
    '</svg>',
  generic: '<svg viewBox="0 0 128 64" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect x="0" y="0" width="128" height="64" fill="#0f1722"/><g stroke="#38495f" stroke-width="1.6"><path d="M30,20 L64,40 L98,18"/><path d="M30,20 L64,40"/><path d="M64,40 L30,46"/></g><circle cx="30" cy="20" r="6" fill="#5b8cc0"/><circle cx="64" cy="40" r="6" fill="#e89e3b"/><circle cx="98" cy="18" r="6" fill="#4a9d66"/></svg>',
};
function preview(kind) {
  return `<div class="pc-preview">${SVG[kind] || SVG.generic}</div>`;
}

// ------------------------------------------------------------------- home
const PROBLEMS = [
  { fa: 'fa-route', title: 'Find a route', desc: 'Find the best route between locations.', scenario: 'city-navigation' },
  { fa: 'fa-tower-cell', title: 'Design a network', desc: 'Connect everything at minimum cost.', scenario: 'fiber-network' },
  { fa: 'fa-plane', title: 'Fly between cities', desc: 'Shortest flight route between airports.', scenario: 'airport-network' },
  { fa: 'fa-network-wired', title: 'Route packets', desc: 'Lowest-latency path between servers.', scenario: 'network-routing' },
  { fa: 'fa-code', title: 'Build software', desc: 'Determine build order and detect cycles.', scenario: 'software-build' },
  { fa: 'fa-droplet', title: 'Move water', desc: 'Max flow through a pipe network.', scenario: 'water-network' },
  { fa: 'fa-gamepad', title: 'Pathfind in a game', desc: 'Guide a character through terrain.', scenario: 'game-pathfinding' },
  { fa: 'fa-people-group', title: 'Explore a social network', desc: 'Who can An reach through friends?', scenario: 'social-network' },
  { fa: 'fa-globe', title: 'Rank web pages', desc: 'Which page is most important?', scenario: 'web-ranking' },
  { fa: 'fa-graduation-cap', title: 'Plan courses', desc: 'Order courses by prerequisites.', scenario: 'course-planning' },
  { fa: 'fa-user-check', title: 'Assign jobs', desc: 'Match candidates to compatible jobs.', scenario: 'job-matching' },
  { fa: 'fa-triangle-exclamation', title: 'Find critical roads', desc: 'Which link causes failure?', scenario: 'critical-infrastructure' },
  { fa: 'fa-boxes-stacked', title: 'Plan deliveries', desc: 'Visit every customer and return.', scenario: 'delivery-logistics' },
  { fa: 'fa-road', title: 'Inspect streets', desc: 'Cover every street exactly once.', scenario: 'street-inspection' },
  { fa: 'fa-utensils', title: 'Plan a recipe', desc: 'Order cooking steps by dependency.', scenario: 'cooking-order' },
];

function renderHome() {
  renderHomeBar();
  renderHomeGrid();
}

function renderHomeBar() {
  const domains = [...new Set(SCENARIOS.map((s) => s.domain))];
  let chips = '';
  if (homeTab === 'problems') {
    chips = `<button class="filter-btn ${homeFilter === '' ? 'active' : ''}" data-f=""><i class="fa-solid fa-border-all"></i> ALL (${SCENARIOS.length})</button>` +
      domains.map((d) => `<button class="filter-btn ${homeFilter === d ? 'active' : ''}" data-f="${esc(d)}">${fa(DOMAIN_FA[d] || 'fa-map')} ${esc(d)}</button>`).join('');
  } else {
    chips = `<button class="filter-btn ${homeFilter === '' ? 'active' : ''}" data-f="">ALL (${ALGORITHMS.length})</button>` +
      CATEGORIES.map((c) => `<button class="filter-btn ${homeFilter === c ? 'active' : ''}" data-f="${esc(c)}">${esc(c)}</button>`).join('');
  }
  els.filterBar.innerHTML = `<div class="filter-chips">${chips}</div>`;
  // sync header segmented tabs
  els.segTabs.querySelectorAll('.seg-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === homeTab));
}

function renderHomeGrid() {
  const q = els.searchInput.value.trim().toLowerCase();
  if (homeTab === 'problems') {
    const list = SCENARIOS.filter((s) => {
      const inF = !homeFilter || s.domain === homeFilter;
      const inQ = !q || (s.title + ' ' + s.domain + ' ' + s.problem.heading).toLowerCase().includes(q);
      return inF && inQ;
    });
    els.problemGrid.innerHTML = list.map((s) => {
      const exp = experienceFor(s.id);
      return `<div class="problem-card" data-scenario="${s.id}">
        ${preview(exp.kind)}
        <h3>${fa(DOMAIN_FA[s.domain] || 'fa-map')} <span>${esc(s.title)}</span></h3>
        <p>${esc(s.problem.heading)}</p>
        <div class="pc-algos">${s.algorithms.slice(0, 4).map((id) => `<span class="chip">${esc(getAlgorithm(id).name)}</span>`).join('')}</div>
      </div>`;
    }).join('') || '<div class="muted-text">No problems match.</div>';
  } else {
    const list = ALGORITHMS.filter((a) => {
      const inF = !homeFilter || a.category === homeFilter;
      const inQ = !q || [a.name, a.fullName, a.category, a.description, ...a.useCases, ...a.keywords].join(' ').toLowerCase().includes(q);
      return inF && inQ;
    });
    els.problemGrid.innerHTML = list.map((a) => {
      const hasScenario = scenariosForAlgorithm(a.id).length > 0;
      return `<div class="cat-card" data-algo="${a.id}">
        <h3>${esc(a.name)} ${hasScenario ? '<span class="cat-sub">· real-world</span>' : ''}</h3>
        <div class="cat-sub">${esc(a.category)} · ${esc(a.difficulty)}</div>
        <div class="cat-desc">${esc(a.description)}</div>
        <div class="cat-meta"><span>${esc(a.complexity)}</span><span>${esc(a.dataStructure)}</span></div>
      </div>`;
    }).join('') || '<div class="muted-text">No algorithms match.</div>';
  }
}

// ------------------------------------------------------------------- workspace opening
function openScenario(id, algoId, level) {
  const sc = getScenario(id);
  if (!sc) return;
  if (level && sc.levels.includes(level)) currentLevel = level;
  else if (!sc.levels.includes(currentLevel)) currentLevel = sc.levels[0];
  const { graph, entities: ent } = sc.build(currentLevel);
  currentScenarioId = id;
  scenario = sc;
  wsMode = 'scenario';
  baseGraph = graph;
  entities = ent;
  closedEdgeIds = new Set();
  startNode = ent.start || null;
  targetNode = ent.target || null;
  sourceNode = ent.source || null;
  sinkNode = ent.sink || null;
  params = sc.params || {};
  currentAlgorithmId = (algoId && sc.algorithms.includes(algoId)) ? algoId : sc.defaultAlgorithm;
  reveal = false;
  onboardingDismissed = false;
  els.btnReveal.classList.remove('active');
  els.btnReveal.innerHTML = `${fa('fa-eye')} REVEAL GRAPH`;
  interaction.setGraph(baseGraph);
  interaction.setDraggable(false);
  interaction.setTool('select');
  camera.minZoom = 0.12;
  applyExperience();
  renderWorkspaceHeader();
  renderAlgoChips();
  renderContextBar();
  renderCompareSelects();
  rebuildExecution();
  showView('workspace');
  requestAnimationFrame(() => fitScenario());
}

function openAlgorithmFromCatalog(id) {
  const scs = scenariosForAlgorithm(id);
  if (scs.length) openScenario(scs[0].id, id);
  else {
    const exs = examplesFor(id);
    if (!exs.length) return;
    currentExampleId = exs[0].id;
    openExample(id, currentExampleId);
  }
}

function openExample(algoId, exId) {
  const ex = getExample(exId);
  if (!ex) return;
  wsMode = 'example';
  currentAlgorithmId = algoId;
  currentExampleId = exId;
  scenario = null;
  entities = null;
  baseGraph = buildGraphFromExample(ex);
  closedEdgeIds = new Set();
  startNode = ex.startNode || null;
  targetNode = ex.targetNode || null;
  sourceNode = ex.sourceNode || null;
  sinkNode = ex.sinkNode || null;
  params = ex.params || {};
  applyExperience();
  interaction.setGraph(baseGraph);
  interaction.setDraggable(false);
  interaction.setTool('select');
  renderWorkspaceHeader();
  renderAlgoChips();
  renderContextBar();
  renderCompareSelects();
  rebuildExecution();
  showView('workspace');
  requestAnimationFrame(() => fitScenario());
}

function openLab() {
  wsMode = 'lab';
  scenario = null;
  entities = null;
  baseGraph = labGraph;
  closedEdgeIds = new Set();
  if (!startNode || !labGraph.hasNode(startNode)) startNode = labGraph.getNodes()[0]?.id || null;
  targetNode = null;
  sourceNode = null;
  sinkNode = null;
  applyExperience();
  interaction.setGraph(labGraph);
  interaction.setDraggable(true);
  interaction.setTool('select');
  renderWorkspaceHeader();
  renderAlgoChips();
  renderContextBar();
  renderCompareSelects();
  rebuildExecution();
  showView('workspace');
  requestAnimationFrame(() => fitScenario());
}

// ------------------------------------------------------------------- experience / header
function applyExperience() {
  const exp = (wsMode === 'scenario' && scenario) ? experienceFor(scenario.id) : null;
  if (exp) {
    els.metricsTitle.textContent = exp.panelTitle.toUpperCase();
    els.canvasWrap.dataset.exp = exp.kind;
    if (exp.onboarding) {
      els.onbTitle.textContent = exp.onboarding.title;
      els.onbSteps.innerHTML = exp.onboarding.steps.map((s) => `<li>${esc(s)}</li>`).join('');
    }
    els.onboarding.hidden = false;
  } else {
    els.metricsTitle.textContent = 'METRICS';
    els.canvasWrap.dataset.exp = 'graph';
    els.onboarding.hidden = true;
  }
}

function renderWorkspaceHeader() {
  const modeSwitch = document.querySelector('.mode-switch');
  if (modeSwitch) modeSwitch.style.display = 'none';
  if (wsMode === 'lab') {
    els.wsProblemHeading.textContent = 'Graph Lab — build and experiment';
    els.wsScenarioTitle.innerHTML = `${fa('fa-flask')} custom graph editor`;
    els.wsDataLabel.textContent = 'your graph';
    els.wsDataLabel.style.display = 'inline';
  } else if (wsMode === 'example') {
    const ex = getExample(currentExampleId);
    els.wsProblemHeading.textContent = ex ? ex.problem.heading : '—';
    els.wsScenarioTitle.textContent = ex ? ex.title : '—';
    els.wsDataLabel.style.display = 'none';
  } else if (scenario) {
    els.wsProblemHeading.textContent = scenario.problem.heading;
    els.wsScenarioTitle.innerHTML = `${fa(DOMAIN_FA[scenario.domain] || 'fa-map')} ${esc(scenario.title)}`;
    els.wsDataLabel.textContent = scenario.dataLabelText;
    els.wsDataLabel.style.display = 'inline';
  }
  // side panel visibility
  const hasScenario = wsMode === 'scenario' && !!scenario;
  els.wsWhatNow.hidden = !hasScenario;
  els.wsMetrics.hidden = !hasScenario;
  els.wsWhyGraph.hidden = !hasScenario;
  els.wsCompare.hidden = !hasScenario;
  els.wsInternals.hidden = false;
  els.wsPseudocode.hidden = false;
  els.wsTrace.hidden = false;
  els.btnReveal.style.display = hasScenario ? 'inline-block' : 'none';
  renderLevelSelect();
}

function renderLevelSelect() {
  if (wsMode === 'scenario' && scenario && scenario.levels && scenario.levels.length > 1) {
    els.levelSelectWrap.hidden = false;
    els.levelSelect.innerHTML = scenario.levels
      .map((l) => `<option value="${l}" ${l === currentLevel ? 'selected' : ''}>${l}</option>`)
      .join('');
  } else {
    els.levelSelectWrap.hidden = true;
    els.levelSelect.innerHTML = '';
  }
}

function renderAlgoChips() {
  let ids = [];
  if (wsMode === 'scenario' && scenario) ids = scenario.algorithms;
  else if (wsMode === 'example') ids = [currentAlgorithmId];
  else ids = ALGORITHMS.map((a) => a.id);

  if (wsMode === 'lab') {
    els.wsAlgoChips.innerHTML = `<select id="labAlgoSelect" class="select-inline" aria-label="Algorithm"></select>`;
    const sel = els.wsAlgoChips.querySelector('#labAlgoSelect');
    sel.innerHTML = ALGORITHMS.map((a) => `<option value="${a.id}" ${a.id === currentAlgorithmId ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
    sel.addEventListener('change', () => { currentAlgorithmId = sel.value; rebuildExecution(); });
    return;
  }

  els.wsAlgoChips.innerHTML = ids.map((id) => {
    const meta = getAlgorithm(id);
    return `<button class="algo-chip ${id === currentAlgorithmId ? 'active' : ''}" data-algo="${id}">${esc(meta.name)}</button>`;
  }).join('');
}

function renderCompareSelects() {
  if (wsMode !== 'scenario' || !scenario) return;
  const opts = scenario.algorithms.map((id) => `<option value="${id}">${esc(getAlgorithm(id).name)}</option>`).join('');
  els.compareA.innerHTML = opts;
  els.compareB.innerHTML = opts;
  els.compareA.value = scenario.algorithms[0];
  els.compareB.value = scenario.algorithms[1] || scenario.algorithms[0];
  els.compareResult.innerHTML = '<div class="muted-text">Run to compare two algorithms on this exact problem.</div>';
}

// ------------------------------------------------------------------- execution
function rebuildExecution() {
  const meta = getAlgorithm(currentAlgorithmId);
  const g = execGraph();
  const s = meta.requirements.requiresSourceSink ? sourceNode : startNode;
  const t = meta.requirements.requiresSourceSink ? sinkNode : targetNode;
  const p = { start: s, target: t, source: sourceNode, sink: sinkNode, ...params };
  validationProblems = validate(meta, g, { start: s, target: t, source: sourceNode, sink: sinkNode });

  if (validationProblems.length > 0) {
    controller.clear();
    renderValidation();
    updateControls();
    updatePanels();
    syncStep();
    return;
  }
  controller.run({ build: (a, gr, prm) => meta.build(gr, prm), algorithm: currentAlgorithmId, graph: g, start: s, target: t, params: p });
  pseudo.setLines(meta.pseudocode);
  updateControls();
  updatePanels();
  syncStep();
}

function setRole(role, id) {
  if (!id || !baseGraph.hasNode(id)) return;
  if (role === 'start') startNode = id;
  if (role === 'target') targetNode = id;
  if (role === 'source') sourceNode = id;
  if (role === 'sink') sinkNode = id;
  renderContextBar();
  rebuildExecution();
}

function closeRoad(edgeId) {
  // Critical infrastructure + Complex city / network / water all support
  // "break the system" events: the affected edge is removed and the algorithm
  // re-runs, so the user sees what changed and how the algorithm responds.
  const breakable = scenario &&
    (scenario.id === 'critical-infrastructure' ||
     (scenario.id === 'city-navigation' && entities && entities.breakable) ||
     scenario.id === 'network-routing' ||
     scenario.id === 'water-network');
  if (!breakable) return;
  const e = baseGraph.getEdge(edgeId);
  if (!e) return;
  if (closedEdgeIds.has(edgeId)) closedEdgeIds.delete(edgeId);
  else closedEdgeIds.add(edgeId);
  renderContextBar();
  rebuildExecution();
}

// ------------------------------------------------------------------- lab editing
function labAddNode(x, y) {
  const label = nextLabLabel();
  const node = labGraph.addNode({ label, x, y });
  interaction.select(node.id);
  if (!startNode || !labGraph.hasNode(startNode)) startNode = node.id;
  rebuildExecution();
}
function labDeleteNode(id) {
  if (startNode === id) startNode = null;
  if (targetNode === id) targetNode = null;
  if (sourceNode === id) sourceNode = null;
  if (sinkNode === id) sinkNode = null;
  if (interaction.selected === id) interaction.clearSelection();
  labGraph.removeNode(id);
  rebuildExecution();
}
function labDeleteEdge(id) {
  labGraph.removeEdge(id);
  rebuildExecution();
}
function labAddEdge(a, b) {
  if (labGraph.hasEdgeBetween(a, b)) return;
  const weight = labWeightedMode ? (parseInt($('labWeightInput')?.value || '1', 10) || 1) : 1;
  labGraph.addEdge({ from: a, to: b, weight, directed: labGraph.directed });
  rebuildExecution();
}
function nextLabLabel() {
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!labGraph.getNodes().some((n) => n.label === letter)) return letter;
  }
  return `n${labGraph.nodeCount + 1}`;
}
function resetLabGraph() {
  labGraph = defaultLabGraph();
  baseGraph = labGraph;
  interaction.setGraph(labGraph);
  interaction.setDraggable(true);
  interaction.setTool('select');
  startNode = 'A';
  targetNode = null;
  sourceNode = null;
  sinkNode = null;
  fitGraph();
  rebuildExecution();
}

// ------------------------------------------------------------------- context bar
function renderContextBar() {
  els.ctxBar.innerHTML = '';
  if (wsMode === 'lab') {
    els.ctxBar.innerHTML = `
      <button class="ctx-btn" data-labtool="add-node">${fa('fa-circle-plus')} ADD NODE</button>
      <button class="ctx-btn" data-labtool="add-edge">${fa('fa-arrow-right-arrow-left')} ADD EDGE</button>
      <button class="ctx-btn" data-labtool="delete-node">${fa('fa-circle-minus')} DELETE NODE</button>
      <button class="ctx-btn" data-labtool="delete-edge">${fa('fa-minus')} DELETE EDGE</button>
      <label class="toggle-label"><input type="checkbox" id="labDirected" ${labGraph.directed ? 'checked' : ''} /> DIRECTED</label>
      <label class="toggle-label"><input type="checkbox" id="labWeighted" ${labWeightedMode ? 'checked' : ''} /> WEIGHTED</label>
      <span class="lab-weight">W <input type="number" id="labWeightInput" value="1" min="1" max="99" /></span>
      <span class="ctx-sep"></span>
      <button class="ctx-btn" data-labtool="generate">${fa('fa-wand-magic-sparkles')} GENERATE</button>
      <button class="ctx-btn" data-labtool="import">${fa('fa-file-import')} IMPORT</button>
      <button class="ctx-btn" data-labtool="export">${fa('fa-file-export')} EXPORT</button>
      <button class="ctx-btn" data-labtool="bench">${fa('fa-gauge-high')} BENCHMARK</button>
      <button class="ctx-btn" data-labtool="reset">${fa('fa-rotate-left')} RESET</button>`;
    bindLabToolbar();
    return;
  }
  if (!scenario) { els.ctxBar.innerHTML = ''; return; }
  const id = scenario.id;
  let html = '';
  if (id === 'city-navigation') {
    html = `
      <button class="ctx-btn" data-ctx="origin">${fa('fa-location-dot')} SET ORIGIN</button>
      <button class="ctx-btn" data-ctx="dest">${fa('fa-flag-checkered')} SET DESTINATION</button>`;
    if (entities && entities.breakable) {
      html += `
      <button class="ctx-btn" data-ctx="close">${fa('fa-road-circle-xmark')} CLOSE A ROAD</button>
      <button class="ctx-btn" data-ctx="restore">${fa('fa-rotate')} RESTORE</button>`;
    }
  } else if (id === 'network-routing') {
    html = `<button class="ctx-btn" data-ctx="close">${fa('fa-link-slash')} DISABLE A LINK</button>
      <button class="ctx-btn" data-ctx="restore">${fa('fa-rotate')} RESTORE</button>`;
  } else if (id === 'water-network') {
    html = `<button class="ctx-btn" data-ctx="close">${fa('fa-pipe-circle-xmark')} BLOCK A PIPE</button>
      <button class="ctx-btn" data-ctx="restore">${fa('fa-rotate')} RESTORE</button>`;
  } else if (id === 'critical-infrastructure') {
    html = `
      <button class="ctx-btn" data-ctx="close">${fa('fa-road-circle-xmark')} CLOSE A ROAD</button>
      <button class="ctx-btn" data-ctx="restore">${fa('fa-rotate')} RESTORE ALL</button>`;
  } else if (id === 'game-pathfinding') {
    html = `<button class="ctx-btn" data-ctx="scores">${fa('fa-chart-simple')} SHOW g / h / f</button>`;
  }
  els.ctxBar.innerHTML = html;
}

function bindLabToolbar() {
  const bar = els.ctxBar;
  bar.querySelectorAll('[data-labtool]').forEach((b) => {
    const tool = b.dataset.labtool;
    if (tool === 'reset') { b.addEventListener('click', resetLabGraph); return; }
    if (tool === 'generate') { b.addEventListener('click', openGenerate); return; }
    if (tool === 'import') { b.addEventListener('click', () => els.importFile.click()); return; }
    if (tool === 'export') { b.addEventListener('click', exportGraph); return; }
    if (tool === 'bench') { b.addEventListener('click', openBenchmark); return; }
    b.addEventListener('click', () => {
      interaction.setTool(tool);
      bar.querySelectorAll('[data-labtool]').forEach((x) => x.classList.toggle('armed', x === b && interaction.tool === tool));
    });
  });
  const d = bar.querySelector('#labDirected');
  if (d) d.addEventListener('change', () => { labGraph.directed = d.checked; rebuildExecution(); });
  const w = bar.querySelector('#labWeighted');
  if (w) w.addEventListener('change', () => { labWeightedMode = w.checked; });
}


// ------------------------------------------------------------------- panels
function updatePanels() {
  const state = controller.state;
  const trace = controller.trace;

  if (validationProblems.length > 0) {
    renderValidation();
    return;
  }
  if (!state || !trace) return;

  const isLegacy = LEGACY.has(state.algorithm);
  const meta = getAlgorithm(currentAlgorithmId);

  if (isLegacy) {
    renderLegacyMachinery(els.machineryBox, state, trace);
    renderLevels(els.levelsBox, state);
  } else {
    els.machineryBox.innerHTML = renderMachineryFor(state, trace, baseGraph, meta);
    els.levelsBox.innerHTML = '';
  }

  const ev = trace.events[state.step - 1] || null;
  pseudo.highlight(ev ? ev.line : 0);
  els.tracePanel.innerHTML = renderTraceInspector(state, trace, baseGraph);

  if (isLegacy) {
    const r = trace.result || {};
    const order = (r.visitOrder || []).join(' → ');
    els.resultText.innerHTML = `<div class="rt">${esc(order ? `Traversal: ${order}` : '—')}</div>`;
  } else {
    els.resultText.innerHTML = `<div class="rt">${esc((state.result || {}).message || '')}</div>`;
  }

  if (scenario) {
    const uState = universalize(state, baseGraph);
    const ctx = makeContext(scenario, uState, trace, baseGraph, entities);
    const ev2 = trace.events[state.step - 1] || null;
    const nar = ev2 && scenario.narrate ? scenario.narrate(ev2, ctx) : null;
    if (nar) {
      els.whatNow.innerHTML = `<div class="headline">${esc(nar.headline)}</div><div class="detail">${esc(nar.detail)}</div>`;
    } else {
      els.whatNow.innerHTML = `<div class="headline">${state.step === 0 ? 'Ready' : esc(ev2 ? ev2.type : '…')}</div><div class="detail">${esc(ev2 ? ev2.message : `Press START to begin.`)}</div>`;
    }

    const mets = scenario.metrics(uState, trace);
    els.metrics.innerHTML = mets.map((m) => `<div class="metric-row"><span class="mk">${esc(m.label)}</span><span class="mv">${esc(m.value)}</span></div>`).join('');

    els.whyGraph.innerHTML = `
      <div class="why-item"><span class="wk">VERTICES</span><div class="wd">${esc(scenario.whyGraph.vertices)}</div></div>
      <div class="why-item"><span class="wk">EDGES</span><div class="wd">${esc(scenario.whyGraph.edges)}</div></div>
      <div class="why-item"><span class="wk">WEIGHTS</span><div class="wd">${esc(scenario.whyGraph.weights)}</div></div>
      <div class="why-item"><span class="wk">WHY ${meta.name.toUpperCase()}?</span><div class="wd">${esc(scenario.whyGraph.whyAlgorithm)}</div></div>`;

    if (state.complete && trace.result) {
      const lines = scenario.resultText(trace.result);
      els.resultText.innerHTML = lines.map((l, i) => `<div class="${i === 0 ? 'rt' : 'rt-note'}">${esc(l)}</div>`).join('');
    } else {
      els.resultText.innerHTML = `<div class="rt-note">${state.step === 0 ? 'Run the simulation to see the real-world result.' : 'Executing…'}</div>`;
    }

    if (scenario.onboarding !== false) {
      els.onboarding.hidden = onboardingDismissed || state.step > 0;
    }
  } else {
  }

  els.activityLine.textContent = state.step === 0
    ? `READY · ${trace.events.length} events`
    : `${trace.events[state.step - 1] ? trace.events[state.step - 1].message : ''}`;
}


function renderValidation() {
  const meta = getAlgorithm(currentAlgorithmId);
  els.whatNow.innerHTML = `<div class="headline">Cannot run ${esc(meta.name)}</div><div class="detail">The current graph does not meet this algorithm's requirements.</div>`;
  els.metrics.innerHTML = '';
  els.resultText.innerHTML = validationProblems.map((p) => `<div class="rt-note" style="color:var(--destructive)">✗ ${esc(p)}</div>`).join('');
  els.whyGraph.innerHTML = `<div class="why-item"><span class="wk">WHY NOT?</span><div class="wd">${esc(whyNotText(meta))}</div></div>`;
  els.tracePanel.innerHTML = `<header class="panel-title">VALIDATION</header><div class="machinery-body">${validationProblems.map((p) => `<div class="err-box">${esc(p)}</div>`).join('')}</div>`;
  els.activityLine.textContent = 'VALIDATION BLOCKED';
  els.onboarding.hidden = true;
}

function whyNotText(meta) {
  const req = meta.requirements;
  if (req.directed === 'undirected') return 'This algorithm needs an UNDIRECTED graph. In the Lab, toggle DIRECTED off — or choose a different algorithm.';
  if (req.directed === 'directed') return 'This algorithm needs a DIRECTED graph. In the Lab, toggle DIRECTED on — or choose a different algorithm.';
  if (req.weighted === 'zeroone') return 'This algorithm only accepts edge weights of 0 or 1.';
  if (req.negativeWeights === 'no') return 'This algorithm requires non-negative edge weights. Use Bellman-Ford for negative weights.';
  if (req.requiresSourceSink) return 'Pick SOURCE and SINK nodes, then run.';
  if (req.requiresTarget) return 'Pick a TARGET node, then run.';
  if (req.maxNodes < Infinity) return 'This exact algorithm grows exponentially — use at most ' + req.maxNodes + ' vertices.';
  if (req.bipartite) return 'This algorithm needs a two-part (left/right) graph.';
  return 'The graph does not meet this algorithm\'s requirements.';
}

// ------------------------------------------------------------------- compare (per scenario)
function metricsOf(trace) {
  const r = trace.result || {};
  const explored = r.explored ?? r.settledCount ?? (r.visitOrder ? r.visitOrder.length : null) ?? (r.discoveredOrder ? r.discoveredOrder.length : null);
  const cost = r.cost ?? r.totalCost ?? r.mstCost ?? r.maxFlow ?? null;
  const path = Array.isArray(r.path) ? r.path : Array.isArray(r.order) ? r.order : null;
  return { steps: trace.events.length, explored, cost, path, message: r.message || '', error: trace.error };
}

function doCompare() {
  if (!scenario || !baseGraph) return;
  const a = els.compareA.value;
  const b = els.compareB.value;
  const ma = getAlgorithm(a);
  const mb = getAlgorithm(b);
  const g = execGraph();
  const base = { start: startNode, target: targetNode, source: sourceNode, sink: sinkNode, ...params };
  const ra = metricsOf(ma.build(g, base));
  const rb = metricsOf(mb.build(g, base));
  const maxExplored = Math.max(ra.explored || 1, rb.explored || 1);
  const col = (name, r, color) => `
    <div class="compare-col">
      <div class="compare-head"><span class="algo-name">${esc(name)}</span></div>
      ${r.error ? `<div class="err-box">${esc(r.error.message)}</div>` : `
      <div class="comp-line">Steps: <strong>${r.steps}</strong></div>
      <div class="comp-line">Explored: <strong>${r.explored ?? '—'}</strong></div>
      <div class="bar"><div class="bar-fill" style="width:${Math.round(((r.explored || 0) / maxExplored) * 100)}%;background:${color}"></div></div>
      ${r.cost != null ? `<div class="comp-line">Cost: <strong>${r.cost}</strong></div>` : ''}
      ${r.path ? `<div class="comp-line">Result: <span class="mono">${esc(r.path.join(' → '))}</span></div>` : ''}`}
    </div>`;
  els.compareResult.innerHTML = `<div class="compare-grid">${col(ma.name, ra, '#e89e3b')}${col(mb.name, rb, '#55c4dd')}</div>
    <div class="muted-text" style="margin-top:8px">Same problem, same graph — measured from real execution traces.</div>`;
}

// ------------------------------------------------------------------- controls
function updateControls() {
  const hasTrace = !!(controller.trace && controller.trace.events.length > 0);
  const done = controller.done;
  const blocked = validationProblems.length > 0;

  els.btnRun.disabled = blocked;
  els.btnStep.disabled = !hasTrace || done || blocked;
  els.btnStepBack.disabled = !hasTrace || controller.index <= 0;

  els.btnRun.innerHTML = controller.playing ? fa('fa-pause') : fa('fa-play');
  els.btnRun.title = controller.playing ? 'Pause' : 'Start';
}

function syncStep() {
  const total = controller.trace ? controller.trace.events.length : 0;
  els.stepInput.max = String(total);
  els.stepInput.value = String(controller.index);
  els.stepMax.textContent = String(total);
}

// ------------------------------------------------------------------- view
function fitGraph() {
  camera.fitGraph(baseGraph.getNodes(), 80);
}

function fitScenario() {
  resizeCanvas();
  fitGraph();
  // City districts: don't allow zooming out past the full overview.
  if (scenario && scenario.id === 'city-navigation') {
    camera.minZoom = Math.max(camera.minZoom, camera.zoom);
  } else {
    camera.minZoom = 0.12;
  }
}

function resizeCanvas() {
  const r = els.canvasWrap.getBoundingClientRect();
  const w = Math.max(60, Math.floor(r.width));
  const h = Math.max(60, Math.floor(r.height));
  const dpr = window.devicePixelRatio || 1;
  els.graphCanvas.width = Math.floor(w * dpr);
  els.graphCanvas.height = Math.floor(h * dpr);
  const ctx = els.graphCanvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  camera.resize(w, h);
}

// ------------------------------------------------------------------- tools
function openGenerate() { els.generateModal.hidden = false; }
function doGenerate() {
  const data = generateGraph({
    type: els.genType.value,
    n: parseInt(els.genN.value, 10) || 8,
    density: parseFloat(els.genDensity.value),
    weighted: els.genWeighted.checked,
    directed: els.genDirected.checked,
    wMax: parseInt(els.genWMax.value, 10) || 9,
    seed: parseInt(els.genSeed.value, 10) || 12345,
  });
  labGraph = new Graph({ directed: data.directed });
  for (const n of data.nodes) labGraph.addNode({ id: n.id, label: n.label, x: n.x, y: n.y });
  for (const e of data.edges) labGraph.addEdge({ from: e.from, to: e.to, weight: e.weight, directed: e.directed });
  startNode = data.nodes[0] ? data.nodes[0].id : null;
  targetNode = data.nodes[data.nodes.length - 1] ? data.nodes[data.nodes.length - 1].id : null;
  sourceNode = data.nodes[0] ? data.nodes[0].id : null;
  sinkNode = data.nodes[data.nodes.length - 1] ? data.nodes[data.nodes.length - 1].id : null;
  els.generateModal.hidden = true;
  openLab();
}

function exportGraph() {
  const g = execGraph();
  const data = {
    directed: g.directed,
    weighted: g.weighted,
    nodes: g.getNodes().map((n) => ({ id: n.id, label: n.label, x: n.x, y: n.y })),
    edges: g.getEdges().map((e) => ({ from: e.from, to: e.to, weight: e.weight, directed: e.directed })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'graph.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importGraph(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error('Invalid graph JSON.');
      labGraph = new Graph({ directed: !!data.directed });
      for (const n of data.nodes) labGraph.addNode({ id: n.id, label: n.label, x: n.x, y: n.y });
      for (const e of data.edges) labGraph.addEdge({ from: e.from, to: e.to, weight: e.weight == null ? 1 : e.weight, directed: e.directed != null ? e.directed : !!data.directed });
      startNode = data.nodes[0] ? data.nodes[0].id : null;
      openLab();
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
}

const BENCH_ALGOS = ['bfs', 'dfs', 'dijkstra', 'astar', 'bellman-ford', 'kruskal', 'prim', 'kahn', 'kosaraju', 'tarjan', 'floyd-warshall'];
function openBenchmark() {
  els.benchAlgo.innerHTML = BENCH_ALGOS.map((id) => `<option value="${id}">${esc(getAlgorithm(id).name)}</option>`).join('');
  els.benchmarkModal.hidden = false;
}
function doBenchmark() {
  const algoId = els.benchAlgo.value;
  const meta = getAlgorithm(algoId);
  const maxN = parseInt(els.benchMaxN.value, 10) || 18;
  const seed = parseInt(els.benchSeed.value, 10) || 12345;
  const rows = [];
  for (let n = 4; n <= maxN; n += 2) {
    const data = generateGraph({ type: 'random', n, density: 0.3, weighted: true, directed: meta.requirements.directed === 'directed', seed: seed + n });
    const g = new Graph({ directed: data.directed });
    for (const nd of data.nodes) g.addNode({ id: nd.id, label: nd.label, x: nd.x, y: nd.y });
    for (const e of data.edges) g.addEdge({ from: e.from, to: e.to, weight: e.weight, directed: e.directed });
    const s = data.nodes[0].id;
    const t = data.nodes[data.nodes.length - 1].id;
    const p = { start: s, target: t, source: s, sink: t };
    const t0 = performance.now();
    const trace = meta.build(g, p);
    const t1 = performance.now();
    rows.push({ nodes: g.nodeCount, edges: g.edgeCount, steps: trace.events.length, ms: (t1 - t0).toFixed(1), ok: !trace.error });
  }
  els.benchResult.innerHTML = `<table class="data-table"><thead><tr><th>Nodes</th><th>Edges</th><th>Steps</th><th>ms</th></tr></thead><tbody>` +
    rows.map((r) => `<tr><td>${r.nodes}</td><td>${r.edges}</td><td>${r.steps}</td><td>${r.ms}</td></tr>`).join('') +
    `</tbody></table><div class="muted-text">Steps are real trace events; time is machine-dependent. Watch how STEPS grow with n.</div>`;
}

// ------------------------------------------------------------------- events
function wireEvents() {
  els.brandHome.addEventListener('click', () => showView('home'));

  // single-click theme toggle (the whole button toggles)
  els.themeToggle.addEventListener('click', () => {
    const t = toggleTheme();
    applyVizPalette(THEMES[document.documentElement.dataset.theme].viz);
    els.themeToggle.innerHTML = t.name === 'dark' ? fa('fa-sun') : fa('fa-moon');
  });

  // header segmented tabs (Problems / Algorithms)
  els.segTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.seg-tab');
    if (!tab) return;
    homeTab = tab.dataset.tab;
    homeFilter = '';
    renderHomeBar();
    renderHomeGrid();
  });

  // filter chips + cards
  els.filterBar.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-btn');
    if (chip) { homeFilter = chip.dataset.f || ''; renderHomeBar(); renderHomeGrid(); }
  });
  els.searchInput.addEventListener('input', () => renderHomeGrid());
  els.problemGrid.addEventListener('click', (e) => {
    const card = e.target.closest('[data-scenario]');
    if (card) openScenario(card.dataset.scenario);
    const acard = e.target.closest('[data-algo]');
    if (acard) openAlgorithmFromCatalog(acard.dataset.algo);
  });

  // workspace
  els.btnWsBack.addEventListener('click', () => showView('home'));
  els.wsAlgoChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.algo-chip');
    if (!chip) return;
    currentAlgorithmId = chip.dataset.algo;
    renderAlgoChips();
    rebuildExecution();
  });
  els.levelSelect.addEventListener('change', () => {
    currentLevel = els.levelSelect.value;
    // re-open the same scenario at the new complexity, keeping the algorithm
    openScenario(currentScenarioId, currentAlgorithmId, currentLevel);
  });
  els.btnReveal.addEventListener('click', () => {
    reveal = !reveal;
    els.btnReveal.classList.toggle('active', reveal);
    els.btnReveal.innerHTML = reveal ? `${fa('fa-eye-slash')} HIDE GRAPH` : `${fa('fa-eye')} REVEAL GRAPH`;
    renderRevealLegend();
  });
  els.onbDismiss.addEventListener('click', () => { onboardingDismissed = true; els.onboarding.hidden = true; });
  els.graphCanvas.addEventListener('pointerdown', () => {
    if (!onboardingDismissed) { onboardingDismissed = true; els.onboarding.hidden = true; }
  });

  // context bar
  els.ctxBar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ctx]');
    if (!btn) return;
    const c = btn.dataset.ctx;
    if (c === 'origin') interaction.setTool('set-start');
    if (c === 'dest') interaction.setTool('set-target');
    if (c === 'close') interaction.setTool('pick-edge');
    if (c === 'restore') { closedEdgeIds = new Set(); rebuildExecution(); }
    if (c === 'scores') { showScores = !showScores; btn.classList.toggle('armed', showScores); }
    if (c === 'origin' || c === 'dest' || c === 'close') {
      els.ctxBar.querySelectorAll('[data-ctx]').forEach((b) => b.classList.toggle('armed', b === btn && interaction.tool !== 'select'));
    }
  });

  // controls
  els.btnRun.addEventListener('click', () => {
    if (controller.playing) { controller.pause(); }
    else {
      if (controller.done) controller.reset();
      controller.play();
    }
    updateControls();
  });
  els.btnStep.addEventListener('click', () => { controller.pause(); controller.step(); });
  els.btnStepBack.addEventListener('click', () => { controller.pause(); controller.stepBack(); });
  els.speedInput.addEventListener('input', () => {
    const v = parseFloat(els.speedInput.value);
    if (Number.isFinite(v)) {
      controller.setSpeed(Math.max(0.5, Math.min(6, v)));
    }
  });
  els.stepInput.addEventListener('change', () => {
    controller.pause();
    const v = parseInt(els.stepInput.value, 10);
    controller.seek(Number.isFinite(v) ? v : 0);
  });

  // compare
  els.btnCompareDo.addEventListener('click', doCompare);

  // view controls
  els.btnZoomIn.addEventListener('click', () => camera.setZoom(camera.zoom * 1.25));
  els.btnZoomOut.addEventListener('click', () => camera.setZoom(camera.zoom / 1.25));
  els.btnFit.addEventListener('click', () => fitGraph());

  // tools
  els.importFile.addEventListener('change', (e) => { if (e.target.files[0]) importGraph(e.target.files[0]); });
  els.btnGenDo.addEventListener('click', doGenerate);
  els.btnBenchDo.addEventListener('click', doBenchmark);

  // modal close
  document.querySelectorAll('.modal-close').forEach((b) => b.addEventListener('click', () => {
    $(b.dataset.close).hidden = true;
  }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal').forEach((m) => { m.hidden = true; });
  });
  document.querySelectorAll('.modal').forEach((m) => m.addEventListener('click', (e) => {
    if (e.target === m) m.hidden = true;
  }));

  els.genDensity.addEventListener('input', () => { els.genDensityVal.textContent = els.genDensity.value; });

  const ro = new ResizeObserver(() => {
    resizeCanvas();
    const r = els.canvasWrap.getBoundingClientRect();
    if (r.width >= 200 && r.height >= 200) {
      if (!fittedOnce || Math.abs(r.width - lastFitW) > 60 || Math.abs(r.height - lastFitH) > 60) {
        fittedOnce = true;
        lastFitW = r.width;
        lastFitH = r.height;
        fitGraph();
      }
    }
  });
  ro.observe(els.canvasWrap);
}

function renderRevealLegend() {
  if (!scenario || !reveal) { els.revealLegend.hidden = true; return; }
  els.revealLegend.innerHTML = `
    <div class="rl-row"><b>${esc(scenario.whyGraph.vertices.split(':')[0])}</b> = Vertex</div>
    <div class="rl-row"><b>${esc(scenario.whyGraph.edges.split(':')[0])}</b> = Edge</div>
    <div class="rl-row"><b>${esc(scenario.whyGraph.weights.split(':')[0])}</b> = Weight</div>`;
  els.revealLegend.hidden = false;
}

// ------------------------------------------------------------------- loop
function loop() {
  if (view === 'workspace' && baseGraph) {
    const ctx = els.graphCanvas.getContext('2d');
    const state = controller.state;
    if (wsMode === 'scenario' && scenario && entities) {
      const uState = universalize(state, baseGraph);
      renderWorld(ctx, {
        graph: baseGraph,
        camera,
        state: uState,
        entities,
        renderer: scenario.renderer,
        ui: { reveal, world: !REDUCED_MOTION, showScores, closed: closedEdgeIds, hovered: interaction.hovered, selected: interaction.selected, theme: document.documentElement.dataset.theme },
      });
    } else {
      graphRenderer.render(ctx, {
        graph: baseGraph,
        camera,
        state,
        ui: {
          hovered: interaction.hovered,
          hoveredEdge: interaction.hoveredEdge,
          selected: interaction.selected,
          startNode: state ? state.start : startNode,
          targetNode: state ? state.target : targetNode,
          edgeSource: interaction.edgeSource,
          showWeights: baseGraph.weighted,
        },
      });
    }
  }
  requestAnimationFrame(loop);
}

// ------------------------------------------------------------------- init
function showError(stage, err) {
  els.errorStage.textContent = stage;
  els.errorMsg.textContent = err ? err.message : 'unknown';
  els.errorStack.textContent = err && err.stack ? err.stack : '';
  els.errorPanel.hidden = false;
}

function init() {
  try {
    const theme = initTheme();
    applyVizPalette(theme.viz);
    els.themeToggle.innerHTML = theme.name === 'dark' ? fa('fa-sun') : fa('fa-moon');
    console.log(`✓ ${SCENARIOS.length} real-world scenarios · ${ALGORITHMS.length} algorithms · theme ${theme.name}`);
    wireEvents();
    resizeCanvas();
    requestAnimationFrame(loop);
    labGraph = defaultLabGraph();
    controller.setSpeed(1.75);
    renderHome();
    console.log('✓ Graphalgovi initialized');
  } catch (err) {
    console.error(err);
    showError('Initialization', err);
  }
}

// ------------------------------------------------------------------- debug API
window.__lab = {
  version: '4.0',
  getView: () => view,
  getMode: () => wsMode,
  getAlgorithm: () => currentAlgorithmId,
  getScenario: () => currentScenarioId,
  getStartNode: () => startNode,
  getTargetNode: () => targetNode,
  getTheme: () => document.documentElement.dataset.theme,
  getGraph: () => ({
    directed: baseGraph.directed,
    weighted: baseGraph.weighted,
    nodes: baseGraph.getNodes().map((n) => ({ id: n.id, label: n.label, x: n.x, y: n.y, metadata: n.metadata })),
    edges: baseGraph.getEdges().map((e) => ({ id: e.id, from: e.from, to: e.to, weight: e.weight, directed: e.directed })),
  }),
  getTrace: () => (controller.trace ? {
    algorithm: controller.trace.algorithm,
    length: controller.trace.events.length,
    summary: controller.trace.result,
    error: controller.trace.error ? controller.trace.error.message : null,
  } : null),
  getState: () => controller.state,
  getCamera: () => ({ x: camera.x, y: camera.y, zoom: camera.zoom }),
  worldToScreen: (x, y) => camera.worldToScreen(x, y),
  screenToWorld: (x, y) => camera.screenToWorld(x, y),
  getSelected: () => interaction.selected,
  getHovered: () => interaction.hovered,
  getTool: () => interaction.tool,
  setTool: (t) => interaction.setTool(t),
  setAlgorithm: (id) => { currentAlgorithmId = id; renderAlgoChips(); rebuildExecution(); },
  setStart: (id) => setRole('start', id),
  setTarget: (id) => setRole('target', id),
  setTheme: (name) => { applyVizPalette(THEMES[name].viz); },
  openScenario: (id, algo) => openScenario(id, algo),
  openAlgorithm: (id) => openAlgorithmFromCatalog(id),
  openLab: () => openLab(),
  showView: (v) => showView(v),
  setLabGraph: (data) => {
    labGraph = new Graph({ directed: !!data.directed });
    for (const n of data.nodes) labGraph.addNode({ id: n.id, label: n.label, x: n.x, y: n.y });
    for (const e of data.edges) labGraph.addEdge({ from: e.from, to: e.to, weight: e.weight == null ? 1 : e.weight, directed: e.directed != null ? e.directed : !!data.directed });
    startNode = data.nodes[0] ? data.nodes[0].id : null;
    openLab();
  },
  fitGraph: () => fitGraph(),
  resetView: () => camera.reset(),
  step: () => controller.step(),
  stepBack: () => controller.stepBack(),
  play: () => controller.play(),
  pause: () => controller.pause(),
  reset: () => controller.reset(),
  run: () => rebuildExecution(),
  isPlaying: () => controller.playing,
  controllerIndex: () => controller.index,
  setSpeed: (v) => controller.setSpeed(v),
  validationProblems: () => validationProblems.slice(),
  reveal: () => reveal,
  closeRoad: (id) => closeRoad(id),
  closedRoads: () => [...closedEdgeIds],
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
