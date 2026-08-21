/**
 * Design tokens — single source of truth for theming.
 *
 * UI tokens are applied to the document as CSS custom properties; VIZ tokens
 * are pushed into the canvas renderers via AlgorithmRenderer.applyVizPalette().
 * Domain simulation canvases keep their own domain color systems (see the
 * real-world renderers); the abstract graph view + all DOM chrome follow the
 * active theme.
 */

const UI_KEYS = [
  'background', 'foreground', 'card', 'card-foreground', 'muted', 'muted-foreground',
  'border', 'border-strong', 'input', 'primary', 'primary-foreground', 'secondary',
  'secondary-foreground', 'accent', 'accent-foreground', 'destructive', 'success',
  'warning', 'info', 'canvas-bg', 'canvas-text', 'canvas-text-dim',
];

const VIZ_KEYS = [
  'bg', 'grid', 'unvisitedFill', 'unvisitedStroke', 'discoveredFill', 'discoveredStroke',
  'visitedFill', 'visitedStroke', 'currentFill', 'currentStroke', 'backtrackFill',
  'backtrackStroke', 'pathFill', 'pathStroke', 'sourceStroke', 'sinkFill', 'sinkStroke',
  'startRing', 'targetRing', 'hover', 'selected', 'label', 'labelDim', 'edge',
  'edgeTree', 'edgeSeen', 'edgeActive', 'edgePath', 'edgeRejected', 'edgeCycle',
  'edgeMatched', 'canvasBg', 'canvasText', 'canvasTextDim',
];

export const THEMES = {
  dark: {
    name: 'dark',
    ui: {
      'background': '#0f1216',
      'foreground': '#e8eaf0',
      'card': '#161a21',
      'card-foreground': '#e8eaf0',
      'muted': '#20252e',
      'muted-foreground': '#8d96a8',
      'border': '#262c38',
      'border-strong': '#323b4c',
      'input': '#1b2029',
      'primary': '#4f83f1',
      'primary-foreground': '#ffffff',
      'secondary': '#222835',
      'secondary-foreground': '#d7dbe4',
      'accent': '#e89e3b',
      'accent-foreground': '#16120a',
      'destructive': '#e87a5d',
      'success': '#4a9d66',
      'warning': '#e0a03a',
      'info': '#5b8cc0',
      'canvas-bg': '#0f1216',
      'canvas-text': '#e8eaf0',
      'canvas-text-dim': '#8d96a8',
    },
    viz: {
      bg: '#0f1216', grid: 'rgba(255,255,255,0.035)',
      unvisitedFill: '#161b26', unvisitedStroke: '#3a4256',
      discoveredFill: '#24344f', discoveredStroke: '#5b7fb0',
      visitedFill: '#4a7c59', visitedStroke: '#79b98f',
      currentFill: '#e89e3b', currentStroke: '#f7cd86',
      backtrackFill: '#e87a5d', backtrackStroke: '#f2a184',
      pathFill: '#1d3a44', pathStroke: '#55c4dd',
      sourceStroke: '#55c4dd', sinkFill: '#3b2326', sinkStroke: '#e87a5d',
      startRing: '#55c4dd', targetRing: '#8f7ae8',
      hover: '#f2f5fa', selected: '#ffffff',
      label: '#d7dce6', labelDim: '#7c8598',
      edge: '#2b3346', edgeTree: '#5f7f6a', edgeSeen: '#39465f',
      edgeActive: '#e89e3b', edgePath: '#55c4dd', edgeRejected: '#7a4b45',
      edgeCycle: '#e87a5d', edgeMatched: '#4a7c59',
      canvasBg: '#0f1216', canvasText: '#e8eaf0', canvasTextDim: '#8d96a8',
    },
  },

  light: {
    name: 'light',
    ui: {
      'background': '#f5f6f8',
      'foreground': '#1a1e26',
      'card': '#ffffff',
      'card-foreground': '#1a1e26',
      'muted': '#edeff3',
      'muted-foreground': '#5c6574',
      'border': '#e1e4ea',
      'border-strong': '#c9cfda',
      'input': '#ffffff',
      'primary': '#2f6fe4',
      'primary-foreground': '#ffffff',
      'secondary': '#e8ecf2',
      'secondary-foreground': '#1f2430',
      'accent': '#b45309',
      'accent-foreground': '#ffffff',
      'destructive': '#c23b2e',
      'success': '#2e7d4f',
      'warning': '#a16207',
      'info': '#2f6fb8',
      'canvas-bg': '#f5f6f8',
      'canvas-text': '#1a1e26',
      'canvas-text-dim': '#5c6574',
    },
    viz: {
      bg: '#f5f6f8', grid: 'rgba(15,17,21,0.05)',
      unvisitedFill: '#ffffff', unvisitedStroke: '#98a2b4',
      discoveredFill: '#dce8f8', discoveredStroke: '#4a78b8',
      visitedFill: '#d7ecdd', visitedStroke: '#3d7c52',
      currentFill: '#f59e0b', currentStroke: '#b45309',
      backtrackFill: '#f6d6cd', backtrackStroke: '#b95a43',
      pathFill: '#d3ecf3', pathStroke: '#0e7490',
      sourceStroke: '#0e7490', sinkFill: '#f7dcd8', sinkStroke: '#b95a43',
      startRing: '#0e7490', targetRing: '#7c5cd6',
      hover: '#1a1e26', selected: '#1a1e26',
      label: '#1a1e26', labelDim: '#5c6574',
      edge: '#c3c9d3', edgeTree: '#3d7c52', edgeSeen: '#98a2b4',
      edgeActive: '#d97706', edgePath: '#0e7490', edgeRejected: '#b95a43',
      edgeCycle: '#b95a43', edgeMatched: '#3d7c52',
      canvasBg: '#f5f6f8', canvasText: '#1a1e26', canvasTextDim: '#5c6574',
    },
  },
};

const STORAGE_KEY = 'gal-theme';
let current = 'dark';

export function applyTheme(name) {
  const t = THEMES[name] ? name : 'dark';
  current = t;
  const theme = THEMES[t];
  const root = document.documentElement;
  root.dataset.theme = t;
  for (const k of UI_KEYS) {
    root.style.setProperty(`--${k}`, theme.ui[k]);
  }
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {
    /* storage unavailable */
  }
  return theme;
}

export function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return applyTheme(saved || 'dark');
}

export function toggleTheme() {
  return applyTheme(current === 'dark' ? 'light' : 'dark');
}

export function currentTheme() {
  return current;
}
