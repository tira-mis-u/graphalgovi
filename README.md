# Graphalgovi

A **real-world graph algorithm explorer** with **19 real-world scenarios**. (formerly Graph Algorithm Laboratory) — a collection of purpose-built
interactive experiences powered by one shared graph-algorithm engine.
Plain HTML, CSS, modern JavaScript (ES modules), **Canvas 2D** and
**Font Awesome** icons.

The product answers *"what problem am I solving?"* first — the graph and the
algorithm are the engine underneath, always available to inspect.

## Design system

- **Token-based theming** — `src/ui/tokens.js` is the single source of truth:
  it drives DOM CSS custom properties *and* the canvas palette
  (`AlgorithmRenderer.applyVizPalette`). Light and dark themes, persisted.
- **Application shell** — stable global header (Home · Explore · Algorithms ·
  Learn · Lab, search, theme, tools); no page-level permanent sidebars.
- **Domain experiences** — each scenario composes a different workspace
  (`src/realworld/experiences.js`): a city *map*, a fiber *blueprint*, a
  software *build pipeline*, a water *flow simulation*, a game *world*, a
  logistics *control room*… with per-domain primary action, panel title, HUD
  metrics and onboarding steps.
- **Contextual controls** — one dominant action (▶ Start route / Start build /
  Run flow…), with step/restart and an "Advanced" drawer for speed, timeline,
  step-back and internals.

## Run it

```bash
node tests/serve.mjs          # http://0.0.0.0:8080
```

## Tests

```bash
npm test                    # 71 Node tests (graph model + all algorithms + tools)
npm run test:browser        # 31 browser tests in headless Chrome (server must be up)
```

## Hà Nội city map

The **City Navigation** scenario renders all **30 districts** as a real tiled
choropleth map (weighted Voronoi partition): districts never overlap, only
touch along borders, each has its own colour (mosaic look), labels sit at the
true centroid of each district, and the Red River runs along the east bank.
Rural districts are scaled mildly so the urban core stays readable. Roads
exist only between bordering districts. District positions are fixed.

The **City Navigation** scenario uses all **30 districts of Hà Nội**
(12 quận · 17 huyện · 1 thị xã) rendered as a cartographic map — district
zones, the Red River, Hồ Tây / Hồ Hoàn Kiếm, roads only between districts that
actually share a border, and distance weights derived from on-map spacing.
The map adapts to light and dark themes.

## Two first-class views over one engine

```
REAL PROBLEM → REAL SYSTEM → WHY A GRAPH → ALGORITHM → SIMULATION → RESULT
                        ⇅  (mode switch never restarts execution)
GRAPH THEORY: nodes/edges, queue/stack, distance table, pseudocode, trace
```

The **mode switch** (GRAPH THEORY ⇄ REAL WORLD) renders the *same* trace step
through a different layer. Switching at STEP 23 keeps STEP 23.

## Real-world applications (11 deep scenarios)

| Application | Algorithms | Domain visualization |
|---|---|---|
| City Navigation | Dijkstra, A*, BFS, Bellman-Ford | stylized city: roads, districts, lake, vehicle, route |
| Fiber Network Design | Kruskal, Prim | buildings + candidate cables + $k costs, install/skip |
| Network Routing | Dijkstra, Bellman-Ford, Max Flow | routers/servers, latency, moving packets |
| Software Build System | Kahn, DFS topo, SCC, cycle | module cards → BUILDING/BUILT/BLOCKED pipeline |
| Delivery Logistics | Dijkstra, A*, TSP, Max Flow, MST | warehouse, customer houses, truck tour |
| Water Pipeline | Edmonds-Karp, Dinic, FF, bridges | reservoir, pipes, flow animation, bottlenecks |
| Game Pathfinding | A*, BFS, Dijkstra | terrain grid (grass/road/mud/water/walls), character |
| Course Planning | Kahn, DFS topo, cycle | semester columns, prerequisite arrows |
| Job Matching | Kuhn, Hopcroft-Karp | candidate/job cards, augmenting paths |
| Critical Infrastructure | Bridges, articulation points | stations, roads, **close-a-road** simulation |
| Street Inspection | Euler circuit/path | intersection map, inspection vehicle |

Each scenario provides: a real problem, honest data labels
(**realistic simulation** / **educational model**), a *"Why is this a graph?"*
panel, live domain metrics, a *"What is happening now?"* narration generated
from the real execution trace, and a **Reveal Graph** overlay that maps the
domain back to vertices/edges/weights.

## Architecture

Algorithms remain **pure** — they never know about roads, buildings, pipes,
modules, or pixels. The real-world layer is a presentation adapter:

```
src/
├── algorithms/     pure implementations (32) — emit universal execution traces
├── graph/          Node / Edge / Graph model (directed, weighted)
├── execution/      ExecutionTrace (events + snapshots) · ExecutionController
├── catalog/        algorithm metadata + graph-theory example datasets
├── realworld/      scenarios.js (domain data + narration + metrics)
│                   renderers.js (domain canvas renderers)
│                   controller.js (legacy→universal state adapter)
├── visualization/  graph renderer · per-algorithm internals · pseudocode
├── interaction/    pointer/camera/hit-testing (also powers domain tools)
└── tools/          seeded graph generator · theory concepts + property explorer
```

### Key behaviours

- **No fake state** — every panel value, metric and narration comes from the
  real execution trace (events carry `from`/`to`/`node`/`weight` fields).
- **Compatibility validation** — metadata-driven requirements; failures are
  explained ("WHY NOT?").
- **Close-a-road simulation** — in Critical Infrastructure you can block a road
  and watch the network analysis re-run on the modified graph.
- **Lab** — build a custom directed/weighted graph, then run any algorithm.
- **Compare / Benchmark / Generate / Import / Export** — secondary tools, kept
  out of the primary navigation.
