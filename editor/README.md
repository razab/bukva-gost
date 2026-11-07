# Локальные инструменты автора

## Атлас схем

Открыть http://127.0.0.1:8782/ на Mac разработчика. Все 33 пары расположены
по алфавиту на одной странице. Поиск принимает одну или несколько букв любого
регистра; пустой поиск возвращает все. Масштаб 75/100/150% сохраняет общий размер
координат для всех форм; толщина 100/125/150% использует формулу приложения.
«Порядок движений» раскрывает уже существующие инструкции.

Данные берутся из `concepts/components/glyphs.js`, SVG — из общего
`WritingScheme.markup`; после изменения исходников обновить страницу.
Атлас не загружает worksheet-runtime, не запускает 66 уроков/анимаций и не
пишет в localStorage. Проверка статических схем не заменяет проверку динамического
показа, раскладки самого урока или физического Pencil.

Для массовых визуальных проверок сначала использовать этот стенд; открывать
отдельные уроки для проверки их интеграции и интерактивного поведения.

## Запуск и остановка

Сервис `letter-atlas` зарегистрирован в Local Projects Dashboard отдельно
от существующего LAN-приложения. Запуск/остановка:

```sh
node /Users/dcor/projects/local-projects-management/scripts/pm.mjs start --path /Users/dcor/projects/my/analysis/plan/kickstart/11-drawing-letters --service letter-atlas
node /Users/dcor/projects/local-projects-management/scripts/pm.mjs stop --path /Users/dcor/projects/my/analysis/plan/kickstart/11-drawing-letters --service letter-atlas
```

Команда сервиса: `node scripts/letter-atlas-server.mjs`; адрес только 127.0.0.1:8782.
HTTP readiness `/healthz`: `app: gost-letter-atlas, ok: true`.
Разрешены ровно HTML, JS атласа и два общих JS компонента. Другие исходники и
редактор не раздаются; POST запрещён. LAN8781 и автономный пакет не содержат атлас.
Сервис переживает окончание чата, но автоматически при загрузке ОС не запускается.

## Ponytail

Установлен официальный Codex plugin `ponytail@ponytail` версии 5.3.3 из
https://github.com/DietrichGebert/ponytail . Проверить: `codex plugin list --json`.
Skills подключаются в новой сессии; для автоматической инъекции правил Codex требует
отдельно просмотреть и доверить bundled hooks через `/hooks`. Файл доверия вручную
не изменён. В этой задаче skill прочитан явно. Для проверки diff:
`$ponytail:ponytail-review`. OpenSpec остаётся источником требований и задач.
