# Threat model MCP-інтеграцій (Task C)

## 1. Що до чого має доступ

| Сервер | Дані/ресурси, до яких дістає | Секрети | Може писати? | Довіра до автора |
|---|---|---|---|---|
| filesystem | `${workspaceFolder}/app/data` (точно: `catalog.json`) | немає | так (`write_file`, `edit_file`, `move_file`, `create_directory`) | Офіційний (@modelcontextprotocol/server-filesystem@2026.7.10) |
| memory | Оперативна пам'ять сеансу (in-session storage) | немає | так (`create_*`, `delete_*`) | Офіційний (@modelcontextprotocol/server-memory@2026.7.4) |
| mcp-server/ (власний) | `${workspaceFolder}/app/dist/index.js` (імпортує catalog.json через app/) | немає | ні (read-only tools) | Свій код, цей ХВ |

## 2. Ризики, які я вважаю реальними для цієї конфігурації

### **Prompt injection через filesystem-сервер**
- **Що саме може статися:** Якщо агентові дозволити читати файли з широкої папки, в тих файлах можуть бути текстові дані, які насправді — інструкції для агента. Приклад: коментар у файлі, що звучить як user instruction, змусить агента зробити щось, чого він не повинен.
- **У цій конфігурації:** Filesystem обмежено на `app/data`, де тільки `catalog.json` — синтетичні дані без текстових інструкцій. Ризик мінімальний для цього репо.
- **Як завдаватиме шкоди в реальному проєкті:** Якби ми прочитали, наприклад, git commit messages або README файли з текстовими інструкціями, агент міг би їх сприйняти як користувацькі команди.

### **Занадто широка область доступу**
- **Що саме:** Кожен сервер видить більше, ніж потребує для завдання.
- **У цій конфігурації:**
  - ✅ Filesystem: точно `app/data`, не весь репо, не домашня тека
  - ✅ Memory: нема файлів, лише сеансова пам'ять
  - ✅ Власний сервер: імпортує з `app/dist`, ніякого додаткового доступу
  - **Висновок:** Доступ узгоджен; через проєкт нема порожніх дотримувалась, навіть для домашки це мінімально.

### **Витік секретів**
- **Що саме:** GitHub не повинен мати реальні API ключі, токени, пароли.
- **У цій конфігурації:**
  - ✅ `.mcp.json` — немає літеральних токенів; усе через команди або `${ENV}`
  - ✅ `.env` вже в `.gitignore` (домашка умовна, але дотримується)
  - ✅ `.env.example` — шаблон без значень
  - **Перевірка:** `git grep -nE "ghp_|github_pat_|sk-"` → нічого
  - **Висновок:** Репо чист.

### **Зміна поведінки сервера після встановлення**
- **Що саме:** Пакети MCP можуть змінюватися між релізами, тому плаваючі версії дають non-deterministic поведінку.
- **У цій конфігурації:**
  - ✅ Filesystem: `@2026.7.10`
  - ✅ Memory: `@2026.7.4`
  - ✅ Власний сервер: зафіксован у `mcp-server/package-lock.json` (lock file гарантує стабільність)
- **Ризик:** знижений через pinning, але не нульовий (можливі upstream issues у зафіксованих версіях).

### **Дії з побічним ефектом**
- **Що саме:** Tool, який щось змінює (пише файли, видаляє дані, надсилає HTTP, запускає команди).
- **У цій конфігурації:**
  - ⚠️ Filesystem і memory включають write/delete tools
  - ✅ Власний `catalog-server` лишається read-only
  - ✅ Filesystem scope обмежений до `${workspaceFolder}/app/data`, що зменшує blast radius
  - **Висновок:** ризик side effects існує для публічних серверів, тому критичні guardrail-и — вузький scope і уважний контроль tool-викликів.

## 3. Що я зробив, щоб це зменшити

### Конкретні кроки у цьому репо:

1. **Filesystem обмежено каталогом даних**
   - Позиційний аргумент `${workspaceFolder}/app/data` обмежує сервер точно на синтетичні товари
   - Не даємо доступу ні до домашньої папки, ні до системних файлів

2. **Власний сервер — тільки read-only tools**
   - `search_inventory` — читає і фільтрує товари
   - `low_stock` — читає і лічить товари нижче лімітів
   - `inventory://catalog` — resource, тільки читання
   - Жодного `fs.writeFile`, жодних network calls, жодних shell commands

3. **Логіка знаходиться в окремому app/, не в сервері**
   - Сервер — лише тонкий adapter через MCP protocol
   - Бізнес-логіка в `app/src/catalog.ts` залишається чистою та тестованою
   - Риск того, що логіка розділиться й різниться між місцями — відсутній

4. **Версії зафіксовано**
   - Власний сервер залежить від зафіксованих версій `@modelcontextprotocol/server`
   - Public servers зафіксовано на `@2026.7.10` (filesystem) і `@2026.7.4` (memory)

5. **Нема секретів у конфізі чи коді**
   - `.mcp.json` — шляхи, командл, немає ключів
   - `.env` — у .gitignore
   - `git grep` для перевірки — чисто

## 4. Що лишилось прийнятим ризиком

1. **Публічні сервери мають write/delete tools**
   - Навіть за вузького scope filesystem може змінювати файли всередині `app/data`
   - memory дозволяє мутації knowledge graph (`create_*`, `delete_*`)
   - Для цього репо ризик прийнятний через синтетичні дані та відсутність секретів

2. **MCP Roots vs хост-визначений scope**
   - Специфікація MCP 2026-07-28 позначила `roots` deprecated; реальна межа — права ОС
   - На Windows це права користувача (я запускаюся як Haspe, тому доступу до системних папок не маю автоматично)
   - На домашці це OK; в проді — потрібна окрема вісь під процес або контейнер

3. **Вручну проведена валідація конфіг**
   - Немає окремого runtime-check, що scope не був розширений поза `app/data`
   - Довіремося стверджувальній SDK і офіційним серверам
   - На домашці: OK; в проді — аудит + monitoring

## 5. Чек-лист перед підключенням будь-якого нового MCP-сервера

- [x] Я знаю, хто автор і чи це офіційний сервер
  - filesystem → @modelcontextprotocol (офіційний)
  - memory → @modelcontextprotocol (офіційний)
  - catalog-server → мій код в цьому ХВ
  
- [x] Я прочитав, які саме tools він додає (а не лише назву пакета)
  - filesystem: `read_file`, `read_text_file`, `read_media_file`, `read_multiple_files`, `list_directory`, `list_directory_with_sizes`, `directory_tree`, `search_files`, `get_file_info`, `list_allowed_directories`, `write_file`, `edit_file`, `create_directory`, `move_file`
  - memory: `create_entities`, `create_relations`, `add_observations`, `delete_entities`, `delete_observations`, `delete_relations`, `read_graph`, `search_nodes`, `open_nodes`
  - catalog-server: `search_inventory`, `check_stock`, `low_stock` + resource `inventory://catalog`
  
- [x] Я дав йому мінімальну область доступу, а не «щоб точно працювало»
  - filesystem: лише `app/data`
  - memory: in-session (no filesystem)
  - catalog-server: 0 доступу самостійно, тільки через app/ (read-only)
  
- [x] Жоден секрет не потрапив у файл, який комітиться
  - .mcp.json: нема токенів, .env у .gitignore, .env.example шаблон
  - git grep clean
  
- [x] Я знаю, чи є серед його tools такі, що змінюють стан, і чи вимагається підтвердження перед викликом
  - filesystem: має `write_file`/`edit_file`/`move_file`/`create_directory` (state-changing)
  - memory: має `create_*` та `delete_*` (state-changing в межах graph)
  - catalog-server: жодних write tools
  
- [x] Версія зафіксована настільки, наскільки це можливо
  - Власний сервер: package-lock.json гарантує версії
  - Public: зафіксовано `@2026.7.10` і `@2026.7.4`




