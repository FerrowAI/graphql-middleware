import { FragmentDefinitionNode, SelectionSetNode } from './ast-types';

/** True if any selected field name starts with '__' (introspection), excluding the
 *  universally-allowed '__typename'. Recurses through inline fragments and fragment spreads. */
export function usesIntrospection(
  selectionSet: SelectionSetNode,
  fragments: Map<string, FragmentDefinitionNode>,
  visiting: Set<string> = new Set()
): boolean {
  for (const sel of selectionSet.selections) {
    if (sel.kind === 'Field') {
      if (sel.name.value.startsWith('__') && sel.name.value !== '__typename') return true;
      if (sel.selectionSet && usesIntrospection(sel.selectionSet, fragments, visiting)) return true;
    } else if (sel.kind === 'InlineFragment') {
      if (usesIntrospection(sel.selectionSet, fragments, visiting)) return true;
    } else if (sel.kind === 'FragmentSpread') {
      const name = sel.name.value;
      if (visiting.has(name)) continue; // cycle handling is depth/complexity's job
      const frag = fragments.get(name);
      if (!frag) continue;
      visiting.add(name);
      const found = usesIntrospection(frag.selectionSet, fragments, visiting);
      visiting.delete(name);
      if (found) return true;
    }
  }
  return false;
}
