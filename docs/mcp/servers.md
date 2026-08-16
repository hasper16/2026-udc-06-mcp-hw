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
| **Як запускається** | `npx -y @modelcontextprotocol/server-filesystem@latest C:\Users\Haspe\IdeaProjects\bmad\2026-udc-06-mcp-hw\app\data` |
| **Область доступу (scope)** | Точно `C:\Users\Haspe\IdeaProjects\bmad\2026-udc-06-mcp-hw\app\data`. Цього достатньо для домашки, без доступу до home/root. |
| **Секрети** | немає |
| **Версія** | плаваюча (`@latest`) |

**Які tools він дав агенту (факт з `tools/list`):**
- `read_file`, `read_text_file`, `read_media_file`, `read_multiple_files`
- `list_directory`, `list_directory_with_sizes`, `directory_tree`, `search_files`
- `get_file_info`, `list_allowed_directories`
- `write_file`, `edit_file`, `create_directory`, `move_file`

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
| **Як запускається** | `npx -y @modelcontextprotocol/server-memory@latest` |
| **Область доступу (scope)** | Файлового доступу немає; працює з in-memory knowledge graph. |
| **Секрети** | немає |
| **Версія** | плаваюча (`@latest`) |

**Які tools він дав агенту (факт з `tools/list`):**
- `create_entities`, `create_relations`, `add_observations`
- `delete_entities`, `delete_observations`, `delete_relations`
- `read_graph`, `search_nodes`, `open_nodes`

**Перевірка, що працює (факт):**
- Прямий stdio-запит `initialize` + `tools/list` повернув повний набір Knowledge Graph tools

---

## Що НЕ підключали і чому

- **git/fetch MCP**: потребують `uv` і розширюють surface area без потреби для цього синтетичного кейсу.
- **Сервери з токенами**: не потрібні для задачі; зайвий секрет-менеджмент.

---

## Область доступу — головне

Найважливіше рішення у Task A: filesystem обмежено тільки `app/data`, а не:
- `C:\Users\Haspe`
- `C:\`
- увесь каталог проєктів

Це мінімізує ризик витоку локальних файлів і відповідає принципу least privilege.


