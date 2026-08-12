import { DocumentNode, OperationDefinitionNode } from './ast-types';
import { buildFragmentMap, FragmentCycleError } from './fragments';
import { measureDepth } from './depth';
import { computeComplexity } from './complexity';
import { usesIntrospection } from './introspection';

export type ViolationRule = 'depth' | 'complexity' | 'allowlist' | 'denylist' | 'introspection' | 'cycle';

export interface Violation {
  rule: ViolationRule;
  message: string;
}

export interface GuardOptions {
  maxDepth?: number;
  maxComplexity?: number;
  /** per-field-name cost; fields not listed default to 1 */
  costMap?: Record<string, number>;
  /** arg names that multiply a field's subtree cost, e.g. pagination args. Default ['first', 'limit']. */
  listMultiplierArgs?: string[];
  /** if set, only operations with a name in this list are allowed */
  allowlist?: string[];
  /** operation names that are always rejected, checked before allowlist */
  denylist?: string[];
  blockIntrospection?: boolean;
}

export interface GuardResult {
  allowed: boolean;
  violations: Violation[];
  depth: number;
  complexity: number;
}

function guardSingleOperation(op: OperationDefinitionNode, document: DocumentNode, options: GuardOptions): GuardResult {
  const fragments = buildFragmentMap(document);
  const violations: Violation[] = [];
  const opName = op.name?.value;

  if (options.denylist && opName && options.denylist.includes(opName)) {
    violations.push({ rule: 'denylist', message: `operation "${opName}" is on the denylist` });
  }
  if (options.allowlist && !(opName && options.allowlist.includes(opName))) {
    violations.push({
      rule: 'allowlist',
      message: `operation "${opName ?? '(anonymous)'}" is not on the allowlist [${options.allowlist.join(', ')}]`,
    });
  }

  if (options.blockIntrospection && usesIntrospection(op.selectionSet, fragments)) {
    violations.push({ rule: 'introspection', message: 'introspection fields (__schema/__type/...) are blocked' });
  }

  let depth = 0;
  let complexity = 0;
  try {
    depth = measureDepth(op.selectionSet, fragments);
    if (options.maxDepth !== undefined && depth > options.maxDepth) {
      violations.push({ rule: 'depth', message: `query depth ${depth} exceeds max depth ${options.maxDepth}` });
    }

    complexity = computeComplexity(op.selectionSet, fragments, options.costMap ?? {}, options.listMultiplierArgs ?? ['first', 'limit']);
    if (options.maxComplexity !== undefined && complexity > options.maxComplexity) {
      violations.push({
        rule: 'complexity',
        message: `query complexity ${complexity} exceeds max complexity ${options.maxComplexity}`,
      });
    }
  } catch (err) {
    if (err instanceof FragmentCycleError) {
      violations.push({ rule: 'cycle', message: err.message });
    } else {
      throw err;
    }
  }

  return { allowed: violations.length === 0, violations, depth, complexity };
}

/** Evaluates every operation in the document against the configured rules and merges the
 *  results: allowed only if every operation passes every configured rule. */
export function guardOperation(document: DocumentNode, options: GuardOptions = {}): GuardResult {
  const operations = document.definitions.filter(
    (d): d is OperationDefinitionNode => d.kind === 'OperationDefinition'
  );

  if (operations.length === 0) {
    return { allowed: true, violations: [], depth: 0, complexity: 0 };
  }

  const results = operations.map((op) => guardSingleOperation(op, document, options));

  return {
    allowed: results.every((r) => r.allowed),
    violations: results.flatMap((r) => r.violations),
    depth: Math.max(...results.map((r) => r.depth)),
    complexity: results.reduce((sum, r) => sum + r.complexity, 0),
  };
}
