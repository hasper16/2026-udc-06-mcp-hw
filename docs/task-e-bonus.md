# Task E (bonus) — Шлях 2: дебаг через MCP Inspector

**Що робили:**
- Запустили MCP Inspector CLI проти `mcp-server/dist/server.js`
- Виконали `tools/list` і `resources/list`
- Перевірили, що сервер коректно оголошує інтерфейс перед інтеграцією в IDE

**Команди:**
```bash
cd mcp-server
npx -y @modelcontextprotocol/inspector --cli node ./dist/server.js --method tools/list
npx -y @modelcontextprotocol/inspector --cli node ./dist/server.js --method resources/list
```

**Що побачили:**
- `tools/list` повертає 3 tools:
  - `search_inventory`
  - `check_stock`
  - `low_stock`
- `resources/list` повертає 1 resource:
  - `inventory://catalog`

**Що знайшли й полагодили завдяки цьому:**
1. Після першої реалізації в `tools/list` з'являвся лише один tool (`search_inventory`) — це виявило, що друга частина скелета лишилась TODO.
2. Додано і перевірено `check_stock` та `low_stock`.
3. Під час реєстрації ресурсу був mismatch сигнатури SDK (`registerResource`):
   - спочатку передавались 2 аргументи (помилка TS2554)
   - потім виправлено на актуальну сигнатуру з 4 аргументами для встановленої версії SDK.
4. Після фіксу `resources/list` стабільно повертає `inventory://catalog`.

**Висновок:**
Inspector відділяє проблеми протоколу/сервера від проблем інтеграції в IDE. Це найшвидший спосіб довести, що MCP-сервер реально піднявся, оголосив потрібні tools/resources, і саме в тому форматі, який очікує клієнт.

