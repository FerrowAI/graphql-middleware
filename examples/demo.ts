import {
  ArgumentNode,
  DocumentNode,
  FieldNode,
  OperationDefinitionNode,
  SelectionSetNode,
  guardOperation,
} from '../src/index';

// --- tiny hand-built AST helpers (structural, matching graphql-js's shape) ---

function name(value: string) {
  return { kind: 'Name' as const, value };
}

function selSet(selections: FieldNode[]): SelectionSetNode {
  return { kind: 'SelectionSet', selections };
}

function field(fieldName: string, options: { args?: ArgumentNode[]; selectionSet?: SelectionSetNode } = {}): FieldNode {
  return { kind: 'Field', name: name(fieldName), arguments: options.args, selectionSet: options.selectionSet };
}

function intArg(argName: string, value: number): ArgumentNode {
  return { kind: 'Argument', name: name(argName), value: { kind: 'IntValue', value: String(value) } };
}

function documentOf(op: OperationDefinitionNode): DocumentNode {
  return { kind: 'Document', definitions: [op] };
}

function query(fields: FieldNode[]): DocumentNode {
  return documentOf({ kind: 'OperationDefinition', operation: 'query', selectionSet: selSet(fields) });
}

// 1. Deep query: a { b { c { d { e } } } } — depth 5.
const deepDoc = query([
  field('a', {
    selectionSet: selSet([
      field('b', {
        selectionSet: selSet([
          field('c', {
            selectionSet: selSet([field('d', { selectionSet: selSet([field('e')]) })]),
          }),
        ]),
      }),
    ]),
  }),
]);

const depthResult = guardOperation(deepDoc, { maxDepth: 3 });
console.log(`deep query: depth=${depthResult.depth} allowed=${depthResult.allowed}`);
console.log(`  violations: ${depthResult.violations.map((v) => `${v.rule}: ${v.message}`).join('; ')}`);

// 2. Costly query: posts(first: 100) { comments(first: 50) { id } }
const costlyDoc = query([
  field('posts', {
    args: [intArg('first', 100)],
    selectionSet: selSet([
      field('comments', {
        args: [intArg('first', 50)],
        selectionSet: selSet([field('id')]),
      }),
    ]),
  }),
]);

const complexityResult = guardOperation(costlyDoc, {
  maxComplexity: 1000,
  costMap: { posts: 1, comments: 1, id: 1 },
});
console.log(`\ncostly query: complexity=${complexityResult.complexity} allowed=${complexityResult.allowed}`);
console.log(`  violations: ${complexityResult.violations.map((v) => `${v.rule}: ${v.message}`).join('; ')}`);

// 3. Introspection query: __schema { types { name } }
const introspectionDoc = query([
  field('__schema', { selectionSet: selSet([field('types', { selectionSet: selSet([field('name')]) })]) }),
]);

const introspectionResult = guardOperation(introspectionDoc, { blockIntrospection: true });
console.log(`\nintrospection query: allowed=${introspectionResult.allowed}`);
console.log(`  violations: ${introspectionResult.violations.map((v) => `${v.rule}: ${v.message}`).join('; ')}`);
