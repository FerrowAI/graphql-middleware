import { FieldNode, FragmentDefinitionNode, SelectionSetNode } from './ast-types';
import { FragmentCycleError } from './fragments';

function listMultiplier(field: FieldNode, listArgs: string[]): number {
  if (!field.arguments) return 1;
  for (const arg of field.arguments) {
    if (!listArgs.includes(arg.name.value)) continue;
    if (arg.value.kind === 'IntValue') {
      const n = parseInt(arg.value.value, 10);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  }
  return 1;
}

/** cost(field) = ownCost + multiplier * cost(children). `multiplier` comes from list-style
 *  args (default ['first', 'limit']) so `posts(first: 100) { comments(first: 50) { id } }`
 *  correctly scores as ~100 * (1 + 50 * 1), not a flat per-field count. */
export function computeComplexity(
  selectionSet: SelectionSetNode,
  fragments: Map<string, FragmentDefinitionNode>,
  costMap: Record<string, number>,
  listArgs: string[],
  visiting: Set<string> = new Set()
): number {
  let total = 0;
  for (const sel of selectionSet.selections) {
    if (sel.kind === 'Field') {
      const ownCost = costMap[sel.name.value] ?? 1;
      const childCost = sel.selectionSet
        ? computeComplexity(sel.selectionSet, fragments, costMap, listArgs, visiting)
        : 0;
      const multiplier = listMultiplier(sel, listArgs);
      total += ownCost + multiplier * childCost;
    } else if (sel.kind === 'InlineFragment') {
      total += computeComplexity(sel.selectionSet, fragments, costMap, listArgs, visiting);
    } else if (sel.kind === 'FragmentSpread') {
      const name = sel.name.value;
      if (visiting.has(name)) throw new FragmentCycleError(name);
      const frag = fragments.get(name);
      if (!frag) continue;
      visiting.add(name);
      total += computeComplexity(frag.selectionSet, fragments, costMap, listArgs, visiting);
      visiting.delete(name);
    }
  }
  return total;
}
