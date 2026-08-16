/**
 * MCP server over the seeded catalog domain — SKELETON for Task B.
 *
 * Fill in the TODOs. Requirements: >= 2 tools, >= 1 resource, read-only,
 * and the catalog logic IMPORTED from app/ rather than reimplemented here.
 *
 * API note: the SDK is mid-transition between v1 and v2 and exact signatures
 * move. If something below does not compile against your installed version,
 * trust the SDK docs over this file — checking that is part of the exercise.
 * Docs: https://ts.sdk.modelcontextprotocol.io/
 */

import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

// The domain lives in app/ — run `cd app && npm run build` first.
// Do NOT reimplement any of this logic in the server: a server is a thin
// protocol adapter, and duplicated business rules drift apart.
import {
  loadCatalog,
  searchProducts,
  findBySku,
  lowStock,
  inventoryValue,
  categories,
} from "../../app/dist/index.js";

const server = new McpServer({
  name: "catalog-server",
  version: "1.0.0",
});

// ── Tool 1 ────────────────────────────────────────────────────────────────
// The DESCRIPTION is what the model reads to decide whether to call this.
// Say WHEN to use it, not just what it is — same lesson as a SKILL.md
// description in Workshop 5. Vague description => the tool never fires.
server.registerTool(
  "search_inventory",
  {
    description:
      "Search the product catalog by name, SKU, or category. Use when the " +
      "user asks what products exist or asks about a specific item.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("Free-text match on product name, SKU, or category"),
    }),
  },
  async ({ query }) => {
    const results = searchProducts(loadCatalog(), query);
    return {
      content: [
        {
          type: "text",
          text:
            results.length === 0
              ? `No products matched "${query}".`
              : results
                  .map(
                    (p) =>
                      `${p.sku} — ${p.name} (${p.category}) · ${p.price} · stock ${p.stock}`,
                  )
                  .join("\n"),
        },
      ],
    };
  },
);

// ── Tool 2 ────────────────────────────────────────────────────────────────
server.registerTool(
  "check_stock",
  {
    description:
      "Check stock and reorder status for a single SKU. Use when the user asks " +
      "about a specific product's availability.",
    inputSchema: z.object({
      sku: z.string().describe("Product SKU, e.g. KB-1001"),
    }),
  },
  async ({ sku }) => {
    const product = findBySku(loadCatalog(), sku);
    if (!product) {
      return {
        content: [{ type: "text", text: `SKU not found: ${sku}` }],
      };
    }

    const needsReorder = product.stock <= product.reorderLevel;
    return {
      content: [
        {
          type: "text",
          text:
            `${product.sku} — ${product.name}\n` +
            `Category: ${product.category}\n` +
            `Price: $${product.price.toFixed(2)}\n` +
            `Stock: ${product.stock}\n` +
            `Reorder level: ${product.reorderLevel}\n` +
            `Needs reorder: ${needsReorder ? "YES" : "NO"}`,
        },
      ],
    };
  },
);

server.registerTool(
  "low_stock",
  {
    description:
      "List all products that need reordering (stock <= reorder level). Use " +
      "when the user asks which products are low or need restock.",
    inputSchema: z.object({}),
  },
  async () => {
    const items = lowStock(loadCatalog());
    return {
      content: [
        {
          type: "text",
          text:
            items.length === 0
              ? "No products need reordering right now."
              : items
                  .map(
                    (p) =>
                      `${p.sku} — ${p.name} · stock ${p.stock} (reorder at ${p.reorderLevel})`,
                  )
                  .join("\n"),
        },
      ],
    };
  },
);

// ── Resource ──────────────────────────────────────────────────────────────
// A resource is APPLICATION-controlled context read by URI — unlike a tool,
// the model does not invoke it. Good fit for "here is the state of the
// catalog" rather than "go compute something".
//
// Resource: inventory://catalog provides a summary of the current catalog state.
server.registerResource(
  "inventory_catalog",
  "inventory://catalog",
  {
    description: "Summary of the current product inventory state",
    mimeType: "text/plain",
  },
  async () => {
    const catalog = loadCatalog();
    const cats = categories(catalog);
    const totalValue = inventoryValue(catalog);
    const lowStockItems = lowStock(catalog);

    return {
      contents: [
        {
          uri: "inventory://catalog",
          mimeType: "text/plain",
          text: `INVENTORY SUMMARY\n` +
            `=================\n\n` +
            `Total products: ${catalog.length}\n` +
            `Categories: ${cats.join(", ")}\n` +
            `Total inventory value: $${totalValue.toFixed(2)}\n` +
            `Items needing reorder: ${lowStockItems.length}\n\n` +
            `ITEMS BELOW REORDER LEVEL:\n` +
            (lowStockItems.length === 0
              ? "None"
              : lowStockItems
                  .map(
                    (p) =>
                      `  • ${p.sku} (${p.name}): ${p.stock}/${p.reorderLevel} units`,
                  )
                  .join("\n")),
        },
      ],
    };
  },
);

// ── Connect ───────────────────────────────────────────────────────────────
// stdio: the HOST launches this process and talks over stdin/stdout.
// Nothing is printed to stdout except protocol messages — if you need to
// debug, log to stderr (console.error), never console.log.
const transport = new StdioServerTransport();
await server.connect(transport);
