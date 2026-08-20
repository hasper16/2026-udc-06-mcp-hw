# AGENTS.md — catalog app

Guidance for an Agentic IDE working inside `app/`.

## Stack

- TypeScript (ES2022, NodeNext modules), Node 22+
- vitest for tests, colocated as `*.test.ts`
- No framework, no runtime dependencies — this is a plain domain library

## Commands

```bash
npm install
npm test          # vitest run
npm run typecheck # tsc, no emit
npm run build     # tsc -> dist/  (needed before mcp-server/ can import it)
```

## Architecture

- `data/catalog.json` — the seeded product data (synthetic, 24 items).
- `src/catalog.ts` — **pure** functions over a `Product[]` passed in. No I/O.
- `src/loader.ts` — the only file that touches the filesystem (`loadCatalog`).
- `src/index.ts` — public surface; everything external imports from here.

The split is deliberate: pure logic stays trivially testable, and the MCP
server in `mcp-server/` imports the same functions rather than reimplementing
them.

## Conventions

- Named exports only, no default exports.
- No `any`. Prefer `unknown` plus narrowing if a type is genuinely open.
- Keep `src/catalog.ts` free of imports from `node:*` — it must stay pure.
- Every exported function gets a colocated test case in `src/catalog.test.ts`.
- Import paths carry the `.js` extension (NodeNext), even from `.ts` sources.

## Guardrails

- **Do not change the signatures** of the exported catalog functions —
  `mcp-server/` depends on them, and so does the graded homework.
- **Do not edit `data/catalog.json`.** The A/B exercise in Task D compares
  against the seeded numbers; changing the data invalidates it.
- Never add real business data, PII, or secrets here. Everything is synthetic
  on purpose.

<!-- Task A adds a "## MCPs" section here, documenting the servers this
     project expects to have connected and what each is for. -->

## MCPs

This app uses three MCP servers configured at the repo root (`.mcp.json`).

### filesystem

- **Command:** `npx -y @modelcontextprotocol/server-filesystem@2026.7.10 ${workspaceFolder}/app/data`
- **Purpose:** Allows access to `catalog.json` during verification and A/B checks.
- **Key tools:** `read_text_file`, `list_directory`, `list_allowed_directories` (+ write-capable tools like `write_file`, `edit_file`, `move_file`).
- **Scope:** Use a read-only mount or separate copy of `${workspaceFolder}/app/data` so `catalog.json` stays available without write access to the original data directory.

### memory

- **Command:** `npx -y @modelcontextprotocol/server-memory@2026.7.4`
- **Purpose:** Provides in-session note storage so the agent can track intermediate results across tool calls. Useful for A/B logging and comparison.
- **Key tools:** `create_entities`, `create_relations`, `add_observations`, `read_graph`, `search_nodes`, `open_nodes` (+ delete operations).
- **Scope:** Writes to local `memory.jsonl`; data persists between sessions.

### catalog-server

- **Command:** `node ${workspaceFolder}/mcp-server/dist/server.js`
- **Purpose:** Exposes a read-only domain API over the seeded catalog.
- **Transport:** stdio
- **Scope:** Reads catalog data through `app/dist/index.js` (`loadCatalog()`), no write/network operations.
- **Secrets:** none
- **Tools:** `search_inventory`, `check_stock`, `low_stock`
- **Resources:** `inventory://catalog`

No API keys are required for these servers. Least privilege is enforced by scope-limiting filesystem to `app/data` and keeping `catalog-server` read-only.
