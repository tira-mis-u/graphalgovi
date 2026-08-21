import socialNetwork from './socialNetwork.js';
import fileSystem from './fileSystem.js';
import dependencyGraph from './dependencyGraph.js';
import networkTopology from './networkTopology.js';
import algorithmLab from './algorithmLab.js';

/**
 * The scenario registry — every scenario provides:
 *   title, realProblem, graphTheory, nodeDefinition, edgeDefinition,
 *   graphType, dataset, defaultStartNode, bfsExplanation, dfsExplanation.
 */
export const SCENARIOS = [
  socialNetwork,
  fileSystem,
  dependencyGraph,
  networkTopology,
  algorithmLab,
];

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
}

export const DEFAULT_SCENARIO_ID = 'social';

export default SCENARIOS;
