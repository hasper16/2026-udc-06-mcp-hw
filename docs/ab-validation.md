# A/B-валідація MCP (Task D)

**Промпт (однаковий для A і B):**

```text
Which products in our catalog need reordering right now, and what is the
total value of the stock we are currently holding? Give me the SKUs and
the total as a number.
```

**Хост / модель:** GitHub Copilot (IntelliJ IDEA plugin), верифікація через stdio/JSON-RPC + MCP Inspector CLI

**Сервер під тестом:** `mcp-server/` (tools: `search_inventory`, `check_stock`, `low_stock` + resource `inventory://catalog`)

## Ground truth

Порахований локально, щоб було з чим звіряти:

```text
SKU, що потребують дозамовлення: DK-4001, WC-8002, DS-6002, MS-2001, MN-3002, HS-5002, SS-1102, KB-1002, CB-7003
Загальна вартість запасів: $46,152.00
```

**Як розраховано:**

```bash
cd app && node -e "import('./dist/index.js').then(m=>{const c=m.loadCatalog();console.log('SKUs:', m.lowStock(c).map(p=>p.sku).join(', '));console.log('Value:', m.inventoryValue(c).toFixed(2));})"
```

Результат: 9 товарів нижче reorderLevel, загальна вартість всіх 24 товарів = $46,152.00

---

## Прогін A — MCP підключено (custom server)

**Як підготували:**
1. Переконатись що `.mcp.json` має всі три сервери (filesystem, memory, catalog-server)
2. Переконатись що `mcp-server/dist/server.js` компільований
3. Для відтворюваної перевірки виконати прямі MCP виклики по stdio:
   - `tools/call` для `low_stock`
   - `resources/read` для `inventory://catalog`

**Що зробив агент/клієнт (факт із логу):**
- Викликано `low_stock` з порожніми аргументами `{}`
- Викликано `resources/read` для `inventory://catalog`
- Повернено 9 SKU в low-stock і `Total inventory value: $46152.00`

**Відповідь, яку видав:**
- SKU: `DK-4001, WC-8002, DS-6002, MS-2001, MN-3002, HS-5002, SS-1102, KB-1002, CB-7003`
- Total: `46152.00`

**Правильно?**
Так. Повний збіг із ground truth.

---

## Прогін B — custom server вимкнено (лише filesystem)

**Як саме вимикали:**
1. Створили тимчасову копію `.mcp.json` без `catalog-server` і залишили тільки filesystem MCP.
2. Перезапустили IntelliJ IDEA, щоб хост підхопив змінений конфіг.
3. У новому чаті повторили той самий prompt і для відтворюваної перевірки прочитали `app/data/catalog.json` через filesystem-only доступ.

**Що зробив агент/клієнт (факт із логу):**
- Замість доменного tool викликано загальний `read_text_file`
- Повернувся сирий JSON каталогу (24 записи)
- На цьому прогоні фінальної агрегації поза MCP не виконували

**Відповідь, яку видав:**
- Сервер повернув лише вміст файлу (без готового списку SKU і без total)

**Правильно?**
Ні. Повернуто сирі дані, але не фінальну відповідь формату "SKU + total".

---

## Таблиця відмінностей

| Аспект | A (з MCP) | B (без MCP) |
|---|---|---|
| Викликав `low_stock` tool | Так | Ні |
| Викликав `read_text_file` (filesystem) | Ні | Так |
| Список SKU повний (всі 9)? | Так | Ні (повернувся сирий JSON) |
| Загальна сума 46152.00 точна | Так | Ні (без MCP повернувся raw JSON; total не обчислювали) |
| Скільки кроків знадобилось | 2 (`low_stock` + `resources/read`) | 1 (`read_text_file`) |
| Впевненість відповіді vs її правильність | Висока, відповідь готова | Нейтральна, лише дані без підсумку |

---

## Висновок

Custom MCP server дає якісну різницю в shape відповіді: одразу повертає бізнес-сутність (SKU на дозамовлення + inventory summary), а не сирі дані. У run B зафіксовано чесний нульовий результат без доменної відповіді: через тимчасове вимкнення `catalog-server` і перезапуск хоста повернувся лише raw JSON каталогу, без фінального SKU/total. Для цього кейсу MCP-сервер виправданий тим, що перетворює "доступ до файлу" на стабільний доменний API.

**Нотатка:**
Через різницю UI між хостами, proof збережено на протокольному рівні (stdio/JSON-RPC) — це відтворювано і не залежить від конкретного IDE плагіна.






