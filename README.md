# graphql-middleware

A GraphQL operation guard that works on an already-parsed AST. It doesn't
execute your schema and it doesn't require `graphql-js` — it accepts any
object matching graphql-js's `DocumentNode` shape structurally, so if you
already parse with `graphql-js`, hand it the result; if you don't, hand it
a hand-built object with the same shape.

## What this is
- **Depth limit** — fragment-aware (resolves `FragmentSpread`/
  `InlineFragment` inline) with a cycle guard: a fragment that spreads
  itself (directly or transitively) is reported as a `cycle` violation
  instead of recursing forever.
- **Complexity scoring** — a per-field cost map (`{ posts: 1, comments: 1 }`,
  default 1 for unlisted fields) with multipliers for list-style args
  (`first`, `limit` by default): `cost = ownCost + multiplier *
  childrenCost`.
- **Operation allowlist/denylist** by operation name.
- **Introspection blocking** — flags any `__schema`/`__type`/... field
  (excluding `__typename`), toggle with `blockIntrospection`.
- Every violation names the rule it broke and includes a human-readable
  message; `guardOperation()` returns `{ allowed, violations, depth,
  complexity }`.

## What this is NOT
- Not a GraphQL server, executor, or schema validator — it inspects the
  AST before execution, it doesn't run resolvers.
- Not a parser — you (or `graphql-js`) produce the `DocumentNode`; this
  package only walks it.
- Not authentication/authorization for individual fields — that's a
  separate concern from these structural limits.

## Quickstart

```bash
npm install
npm run build
node dist/examples/demo.js
```

## API

```ts
import { guardOperation } from 'graphql-middleware';

const result = guardOperation(document, {
  maxDepth: 6,
  maxComplexity: 1000,
  costMap: { posts: 1, comments: 1 },
  listMultiplierArgs: ['first', 'limit'],
  allowlist: ['GetUser', 'ListPosts'],
  blockIntrospection: true,
});
// { allowed: false, violations: [{ rule: 'depth', message: '...' }], depth: 7, complexity: 42 }
```

### Demo (hand-built minimal ASTs, no graphql-js)

```
$ node dist/examples/demo.js
deep query: depth=5 allowed=false
  violations: depth: query depth 5 exceeds max depth 3

costly query: complexity=5101 allowed=false
  violations: complexity: query complexity 5101 exceeds max complexity 1000

introspection query: allowed=false
  violations: introspection: introspection fields (__schema/__type/...) are blocked
```

## License
MIT

---
Sponsored by [Ferrow](https://ferrow.ai)

---
Part of the [ferrow-toolkit](https://github.com/FerrowAI/ferrow-toolkit) collection · Sponsored by [Ferrow](https://ferrow.ai)
