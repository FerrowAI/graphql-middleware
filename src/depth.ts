import { FragmentDefinitionNode, SelectionSetNode } from './ast-types';
import { FragmentCycleError } from './fragments';

/** Depth of the deepest nested field. A flat `{ a b }` is depth 1; `{ a { b } }` is depth 2.
 *  Fragment spreads are resolved inline (fragment-aware); a fragment that (directly or
 *  transitively) spreads itself throws FragmentCycleError instead of recursing forever. */
export function measureDepth(
  selectionSet: SelectionSetNode,
  fragments: Map<string, FragmentDefinitionNode>,
  visiting: Set<string> = new Set()
): number {
  let max = 0;
  for (const sel of selectionSet.selections) {
    if (sel.kind === 'Field') {
      const d = sel.selectionSet ? 1 + measureDepth(sel.selectionSet, fragments, visiting) : 1;
      max = Math.max(max, d);
    } else if (sel.kind === 'InlineFragment') {
      max = Math.max(max, measureDepth(sel.selectionSet, fragments, visiting));
    } else if (sel.kind === 'FragmentSpread') {
      const name = sel.name.value;
      if (visiting.has(name)) throw new FragmentCycleError(name);
      const frag = fragments.get(name);
      if (!frag) continue;
      visiting.add(name);
      const d = measureDepth(frag.selectionSet, fragments, visiting);
      visiting.delete(name);
      max = Math.max(max, d);
    }
  }
  return max;
}
