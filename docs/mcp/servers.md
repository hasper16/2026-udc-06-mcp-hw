# MCP-сервери проєкту (Task A)

**Хост(и), у якому налаштовано:** GitHub Copilot (IntelliJ IDEA plugin)
**Файл конфігурації проєкту:** `.mcp.json` (у корені репо)

> Примітка: технічну верифікацію серверів виконано через stdio/JSON-RPC і MCP Inspector, щоб мати відтворюваний proof незалежно від UI IDE.

---

## Сервер 1 — Filesystem

| | |
|---|---|
| **Навіщо** | Дає агенту доступ до `catalog.json` для перевірюваних розрахунків у Task D. |
| **Транспорт** | stdio |
| **Як запускається** | `npx -y @modelcontextprotocol/server-filesystem@2026.7.10 ${workspaceFolder}/app/data` |
| **Область доступу (scope)** | Точно `${workspaceFolder}/app/data`. Цього достатньо для домашки, без доступу до home/root. |
| **Секрети** | немає |
| **Версія** | зафіксована `@2026.7.10` |

**Які tools він дав агенту (факт з `tools/list`):**
- `read_file`, `read_text_file`, `read_media_file`, `read_multiple_files`
- `list_directory`, `list_directory_with_sizes`, `directory_tree`, `search_files`
- `get_file_info`, `list_allowed_directories`
- `write_file`, `edit_file`, `create_directory`, `move_file` (write-capable)

**Перевірка, що працює (факт):**
- Прямий stdio-запит `initialize` + `tools/list` повернув валідний список tools
- У stderr сервер вивів: `Client does not support MCP Roots, using allowed directories set from server args`
- `list_allowed_directories` показує рівно один дозволений шлях: `app/data`

---

## Сервер 2 — Memory

| | |
|---|---|
| **Навіщо** | Дає окрему knowledge-graph пам'ять для сесійних нотаток і зв'язків. |
| **Транспорт** | stdio |
| **Як запускається** | `npx -y @modelcontextprotocol/server-memory@2026.7.4` |
| **Область доступу (scope)** | Файлового доступу немає; працює з in-memory knowledge graph. |
| **Секрети** | немає |
| **Версія** | зафіксована `@2026.7.4` |

**Які tools він дав агенту (факт з `tools/list`):**
- `create_entities`, `create_relations`, `add_observations`
- `delete_entities`, `delete_observations`, `delete_relations`
- `read_graph`, `search_nodes`, `open_nodes`

**Перевірка, що працює (факт):**
- Прямий stdio-запит `initialize` + `tools/list` повернув повний набір Knowledge Graph tools

---

## Сервер 3 — catalog-server (custom)

| | |
|---|---|
| **Навіщо** | Дає стабільний read-only доменний API поверх каталогу без ручного парсингу JSON. |
| **Транспорт** | stdio |
| **Як запускається** | `node ${workspaceFolder}/mcp-server/dist/server.js` |
| **Область доступу (scope)** | Читає дані через `app/dist/index.js` (`loadCatalog()`); не виконує запис, видалення або мережеві виклики. |
| **Секрети** | немає |
| **Версія** | локальний код репозиторію |

**Які tools/resources він дає:**
- Tools: `search_inventory`, `check_stock`, `low_stock`
- Resource: `inventory://catalog`

**Перевірка, що працює (факт):**
- `tools/list` через MCP Inspector повертає всі 3 tools
- `resources/list` повертає `inventory://catalog`

---

## Що НЕ підключали і чому

- **git/fetch MCP**: потребують `uv` і розширюють surface area без потреби для цього синтетичного кейсу.
- **Сервери з токенами**: не потрібні для задачі; зайвий секрет-менеджмент.

---

## Область доступу — головне

Найважливіше рішення у Task A: filesystem обмежено тільки `${workspaceFolder}/app/data`, а не:
- `${workspaceFolder}`
- `C:\Users\Haspe`
- `C:\`
- увесь каталог проєктів

Це мінімізує ризик витоку локальних файлів і відповідає принципу least privilege.



