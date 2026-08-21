/**
 * Experience configs — how each real-world scenario composes its workspace.
 * Every scenario keeps the SAME engine underneath but presents a different
 * domain experience: different primary action, panel title, HUD and
 * onboarding guidance.
 */
export const EXPERIENCES = {
  'city-navigation': {
    kind: 'map',
    controlLabel: 'Start route',
    panelTitle: 'Route summary',
    panelSubtitle: 'Dijkstra · shortest route',
    hud: 'route',
    onboarding: {
      title: 'Plan a route across Hà Nội',
      steps: [
        'All 30 districts are shown — roads only connect districts that actually border each other.',
        'Pick a district, then press SET ORIGIN. Pick another, then SET DESTINATION.',
        'Press START ROUTE and watch the navigator expand across the city.',
      ],
    },
  },
  'fiber-network': {
    kind: 'blueprint',
    controlLabel: 'Start network design',
    panelTitle: 'Construction ledger',
    panelSubtitle: 'Kruskal · minimum spanning network',
    hud: 'ledger',
    onboarding: {
      title: 'Connect 12 buildings at minimum cost',
      steps: [
        'Candidate cables are ranked by construction cost.',
        'Press START NETWORK DESIGN.',
        'Cheap safe cables get INSTALLED — redundant ones are SKIPPED.',
      ],
    },
  },
  'network-routing': {
    kind: 'monitoring',
    controlLabel: 'Start routing',
    panelTitle: 'Network monitor',
    panelSubtitle: 'Dijkstra · lowest latency',
    hud: 'route',
    onboarding: {
      title: 'Route traffic from Server A to API-01',
      steps: [
        'Every link has a latency (ms).',
        'Press START ROUTING.',
        'Links settle in order of lowest latency.',
      ],
    },
  },
  'software-build': {
    kind: 'pipeline',
    controlLabel: 'Start build',
    panelTitle: 'Build console',
    panelSubtitle: 'Kahn · dependency order',
    hud: 'pipeline',
    onboarding: {
      title: 'Compile 8 modules in the right order',
      steps: [
        'Each module waits for its dependencies.',
        'Press START BUILD.',
        'Modules flow: WAITING → READY → BUILDING → BUILT.',
      ],
    },
  },
  'water-network': {
    kind: 'flow',
    controlLabel: 'Run flow simulation',
    panelTitle: 'Flow monitor',
    panelSubtitle: 'Edmonds-Karp · maximum flow',
    hud: 'flow',
    onboarding: {
      title: 'Maximize water from reservoir to city',
      steps: [
        'Pipes have capacities in L/s.',
        'Press RUN FLOW SIMULATION.',
        'Augmenting paths push water; the bottleneck caps the total.',
      ],
    },
  },
  'game-pathfinding': {
    kind: 'game',
    controlLabel: 'Start pathfinding',
    panelTitle: 'Expedition log',
    panelSubtitle: 'A* · heuristic search',
    hud: 'route',
    onboarding: {
      title: 'Move the character to the goal',
      steps: [
        'Grass and roads cost 1, mud 3, water 4 per step.',
        'Press START PATHFINDING.',
        'A* explores toward the target using g + h.',
      ],
    },
  },
  'course-planning': {
    kind: 'planning',
    controlLabel: 'Plan courses',
    panelTitle: 'Degree plan',
    panelSubtitle: 'Kahn · topological order',
    hud: 'pipeline',
    onboarding: {
      title: 'Order 9 courses by prerequisite',
      steps: [
        'Press PLAN COURSES.',
        'Courses unlock as their prerequisites complete.',
        'A prerequisite cycle would make the plan impossible.',
      ],
    },
  },
  'job-matching': {
    kind: 'assignment',
    controlLabel: 'Run matching',
    panelTitle: 'Assignment board',
    panelSubtitle: 'Kuhn · augmenting paths',
    hud: 'ledger',
    onboarding: {
      title: 'Match 4 candidates to 4 jobs',
      steps: [
        'Edges mean "this candidate can do this job".',
        'Press RUN MATCHING.',
        'Augmenting paths reassign jobs until no improvement is possible.',
      ],
    },
  },
  'critical-infrastructure': {
    kind: 'reliability',
    controlLabel: 'Analyze network',
    panelTitle: 'Reliability analysis',
    panelSubtitle: 'Bridges · single points of failure',
    hud: 'ledger',
    onboarding: {
      title: 'Find roads & stations that would split the network',
      steps: [
        'Press ANALYZE NETWORK.',
        'Critical roads and stations are flagged.',
        'Try CLOSE A ROAD and see which regions get cut off.',
      ],
    },
  },
  'delivery-logistics': {
    kind: 'controlroom',
    controlLabel: 'Start deliveries',
    panelTitle: 'Delivery board',
    panelSubtitle: 'TSP heuristic · nearest neighbour + 2-opt',
    hud: 'route',
    onboarding: {
      title: 'Visit every customer and return',
      steps: [
        'The truck leaves the warehouse.',
        'Press START DELIVERIES.',
        'A heuristic tour is built — fast, but approximate.',
      ],
    },
  },
  'street-inspection': {
    kind: 'inspection',
    controlLabel: 'Start inspection',
    panelTitle: 'Inspection route',
    panelSubtitle: 'Euler circuit · every street once',
    hud: 'route',
    onboarding: {
      title: 'Cover every street exactly once',
      steps: [
        'Press START INSPECTION.',
        'The inspector drives each street once.',
        'Requires 0 or 2 odd-degree intersections.',
      ],
    },
  },
  'social-network': {
    kind: 'social',
    controlLabel: 'Start',
    panelTitle: 'Friendship map',
    panelSubtitle: 'BFS · degrees of separation',
    hud: 'route',
    onboarding: {
      title: 'Who can Độ Mixi reach through friends?',
      steps: [
        'Độ Mixi is the start — BFS expands in friendship waves.',
        'Press START: direct friends appear first, then friends of friends.',
        'The ring around an avatar marks a newly discovered person.',
      ],
    },
  },
  'web-ranking': {
    kind: 'web',
    controlLabel: 'Start ranking',
    panelTitle: 'Rank dashboard',
    panelSubtitle: 'PageRank · link-based importance',
    hud: 'ledger',
    onboarding: {
      title: 'Which page is the most important?',
      steps: [
        'Each page is a browser window; hyperlinks are arrows.',
        'Press START RANKING and watch rank flow along links.',
        'Bar lengths show final importance after convergence.',
      ],
    },
  },
  'airport-network': {
    kind: 'airport',
    controlLabel: 'Start routing',
    panelTitle: 'Flight route',
    panelSubtitle: 'Dijkstra · shortest flying distance',
    hud: 'route',
    onboarding: {
      title: 'Fly from Hà Nội to Cần Thơ',
      steps: [
        'Airports are shown by IATA code on a flight radar.',
        'Press START ROUTING to expand along flight corridors.',
        'The shortest route (by km) is highlighted with a moving plane.',
      ],
    },
  },
  'cooking-order': {
    kind: 'cooking',
    controlLabel: 'Start cooking',
    panelTitle: 'Prep order',
    panelSubtitle: 'Kahn · topological sort',
    hud: 'pipeline',
    onboarding: {
      title: 'In what order should I cook?',
      steps: [
        'Each step waits for its prerequisites.',
        'Press START COOKING to plan the order.',
        'Steps flow: WAITING → READY → DOING → DONE.',
      ],
    },
  },
  'movie-recommendations': {
    kind: 'movie',
    controlLabel: 'Start',
    panelTitle: 'Recommendations',
    panelSubtitle: 'BFS · co-watched graph',
    hud: 'route',
    onboarding: {
      title: 'What should you watch next?',
      steps: [
        'Each poster is a film; links mean the same people watched both.',
        'Press START and BFS expands from your film in relation rings.',
        'Closer rings = more directly related suggestions.',
      ],
    },
  },
  'power-grid': {
    kind: 'power',
    controlLabel: 'Start design',
    panelTitle: 'Grid ledger',
    panelSubtitle: 'Kruskal · minimum spanning grid',
    hud: 'ledger',
    onboarding: {
      title: 'Connect 8 towns to the substation',
      steps: [
        'Candidate transmission lines are ranked by cost ($M).',
        'Press START DESIGN — safe cheap lines get energized.',
        'Redundant lines are skipped.',
      ],
    },
  },
  'maze-escape': {
    kind: 'maze',
    controlLabel: 'Start',
    panelTitle: 'Escape route',
    panelSubtitle: 'BFS · fewest steps',
    hud: 'route',
    onboarding: {
      title: 'Find the shortest way out',
      steps: [
        'BFS expands one step at a time in all directions.',
        'Press START and watch the wavefront sweep the maze.',
        'The first time it reaches the exit is the shortest path.',
      ],
    },
  },
  'radio-frequencies': {
    kind: 'towers',
    controlLabel: 'Start',
    panelTitle: 'Frequency plan',
    panelSubtitle: 'Bipartite · 2-coloring',
    hud: 'ledger',
    onboarding: {
      title: 'Assign frequencies to 10 towers',
      steps: [
        'Linked towers are too close and would interfere.',
        'Press START to colour towers with frequency A or B.',
        'If it succeeds, 2 frequencies are enough.',
      ],
    },
  },
};

export function experienceFor(id) {
  return EXPERIENCES[id] || { kind: 'generic', controlLabel: 'Start simulation', panelTitle: 'Simulation', panelSubtitle: '', hud: null, onboarding: null };
}
