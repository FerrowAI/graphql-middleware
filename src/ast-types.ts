/** Structural types matching the shape of graphql-js's AST (graphql/language/ast).
 *  graphql-js is never imported — any object with this shape works, so a document produced
 *  by graphql-js's parse() is accepted with zero coupling and zero hard dependency. */

export interface NameNode {
  kind: 'Name';
  value: string;
}

export interface IntValueNode {
  kind: 'IntValue';
  value: string;
}

export interface OtherValueNode {
  kind: 'FloatValue' | 'StringValue' | 'BooleanValue' | 'NullValue' | 'Variable' | 'ListValue' | 'ObjectValue' | 'EnumValue';
  [key: string]: unknown;
}

export type ValueNode = IntValueNode | OtherValueNode;

export interface ArgumentNode {
  kind: 'Argument';
  name: NameNode;
  value: ValueNode;
}

export interface FieldNode {
  kind: 'Field';
  name: NameNode;
  alias?: NameNode;
  arguments?: ArgumentNode[];
  selectionSet?: SelectionSetNode;
}

export interface FragmentSpreadNode {
  kind: 'FragmentSpread';
  name: NameNode;
}

export interface InlineFragmentNode {
  kind: 'InlineFragment';
  typeCondition?: { name: NameNode };
  selectionSet: SelectionSetNode;
}

export type SelectionNode = FieldNode | FragmentSpreadNode | InlineFragmentNode;

export interface SelectionSetNode {
  kind: 'SelectionSet';
  selections: SelectionNode[];
}

export interface OperationDefinitionNode {
  kind: 'OperationDefinition';
  operation: 'query' | 'mutation' | 'subscription';
  name?: NameNode;
  selectionSet: SelectionSetNode;
}

export interface FragmentDefinitionNode {
  kind: 'FragmentDefinition';
  name: NameNode;
  typeCondition: { name: NameNode };
  selectionSet: SelectionSetNode;
}

export type DefinitionNode = OperationDefinitionNode | FragmentDefinitionNode;

export interface DocumentNode {
  kind: 'Document';
  definitions: DefinitionNode[];
}
