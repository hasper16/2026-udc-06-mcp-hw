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

This app connects to two public MCP servers configured at the repo root (`.mcp.json`).

### filesystem

- **Command:** `npx @modelcontextprotocol/server-filesystem@latest --allowed-directories <repo>/app/data`
- **Purpose:** Allows the agent to read `catalog.json` during work and especially during the A/B test (Task D). Read-only to this folder.
- **Key tools:** `read_file`, `list_directory`
- **Scope:** Limited to `app/data/` — not the full repo or home directory.

### memory

- **Command:** `npx @modelcontextprotocol/server-memory@latest`
- **Purpose:** Provides in-session note storage so the agent can track intermediate results across tool calls. Useful for A/B logging and comparison.
- **Key tools:** `save_note`, `retrieve_note`, `list_notes`
- **Scope:** Session-only (no filesystem touch).

Both servers are configured with no secrets (no API keys required). The setup enforces least privilege: only the minimum tools the agent needs to complete the homework tasks.
