import { DocumentNode, FragmentDefinitionNode } from './ast-types';

export function buildFragmentMap(document: DocumentNode): Map<string, FragmentDefinitionNode> {
  const map = new Map<string, FragmentDefinitionNode>();
  for (const def of document.definitions) {
    if (def.kind === 'FragmentDefinition') {
      map.set(def.name.value, def);
    }
  }
  return map;
}

export class FragmentCycleError extends Error {
  constructor(public readonly fragmentName: string) {
    super(`fragment cycle detected: "${fragmentName}" spreads itself (directly or transitively)`);
    this.name = 'FragmentCycleError';
  }
}
