/**
 * Scenario 2 — FILE SYSTEM (hierarchical tree / undirected).
 * "Explore every file and directory inside a project."
 */
export default {
  id: 'filesystem',
  title: 'File System',
  subtitle: 'Directory traversal',
  directed: false,
  editable: false,
  defaultStartNode: 'Project',

  problem: {
    heading: 'Explore every file & folder',
    text: 'Explore every file and directory inside a project, from the root folder down to each leaf file.',
  },

  nodeDefinition: 'A file or a folder.',
  edgeDefinition: 'A containment relationship (folder contains file/folder).',
  graphType: 'Undirected graph (tree) — a folder “contains” its children.',

  dataset: {
    nodes: [
      { id: 'Project', label: 'Project', x: 0, y: 0 },
      { id: 'src', label: 'src', x: -200, y: -160 },
      { id: 'assets', label: 'assets', x: 220, y: -160 },
      { id: 'README', label: 'README.md', x: 30, y: 200 },
      { id: 'algorithms', label: 'algorithms', x: -300, y: -350 },
      { id: 'main.js', label: 'main.js', x: -90, y: -350 },
      { id: 'bfs.js', label: 'bfs.js', x: -410, y: -520 },
      { id: 'dfs.js', label: 'dfs.js', x: -190, y: -520 },
      { id: 'logo.svg', label: 'logo.svg', x: 130, y: -350 },
      { id: 'graph.png', label: 'graph.png', x: 330, y: -350 },
    ],
    edges: [
      { from: 'Project', to: 'src' },
      { from: 'Project', to: 'assets' },
      { from: 'Project', to: 'README' },
      { from: 'src', to: 'algorithms' },
      { from: 'src', to: 'main.js' },
      { from: 'algorithms', to: 'bfs.js' },
      { from: 'algorithms', to: 'dfs.js' },
      { from: 'assets', to: 'logo.svg' },
      { from: 'assets', to: 'graph.png' },
    ],
  },

  graphTheory: [
    { term: 'NODE', def: 'A file or a folder.' },
    { term: 'EDGE', def: 'A containment relationship.', diagram: { kind: 'tree' } },
    { term: 'STRUCTURE', def: 'A hierarchical graph — a tree (no cycles).', diagram: { kind: 'tree2' } },
    { term: 'WHY DFS?', def: 'Natural for recursive directory exploration — dive into a folder, list everything, then back out.' },
    { term: 'WHY BFS?', def: 'Reveals directory depth — files at the same depth form BFS levels.' },
  ],

  bfsExplanation: [
    'BFS visits the project folder by folder, one depth level at a time: the root, then everything directly inside it, then everything one level deeper.',
    'Each BFS level is a directory depth — depth 0 is the root, depth 1 its children, and so on.',
    'This mirrors tools that list a directory tree level by level.',
  ],

  dfsExplanation: [
    'DFS is exactly how a recursive directory walk works: enter src, descend into algorithms, reach bfs.js, return, try dfs.js, return, and so on.',
    'Watch the call stack grow as it descends and shrink as it returns — this is real recursion.',
    'This is why DFS feels natural for filesystems: it finishes one whole subtree before moving to the next.',
  ],

  result: {
    bfs: (r) => [
      `Visited ${r.visitedCount} of ${r.total} files/folders`,
      `Maximum directory depth: ${r.maxDistance}`,
      `Traversal order: ${r.order.join(' → ')}`,
      'Traversal completed.',
    ],
    dfs: (r) => [
      `Visited ${r.visitedCount} of ${r.total} files/folders`,
      `Maximum recursion depth: ${r.maxDistance}`,
      `Traversal order: ${r.order.join(' → ')}`,
      'Traversal completed — every file in the tree was reached.',
    ],
  },
};
