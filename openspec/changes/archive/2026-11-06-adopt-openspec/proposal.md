## Why
История требований накопилась в переписке и длинных AGENTS/PROJECT; начальные сводки уже отстают от рабочей сборки 55. Владелец поручил установить OpenSpec, проанализировать текущий проект и вести следующие изменения через него.

## What Changes
- Установлен OpenSpec CLI 1.16.0 и настроены 6 локальных Codex skills.
- Зафиксированы существующие контракты сборки 55 по 10 областям; это baseline, а не повторная реализация прошлых функций.
- Добавляются анализ проекта, компактные инструкции разработки и новый контракт development-workflow.
- Прежние инструкции сохраняются историческим снимком, бэклог остаётся без исполнения.
- Пользовательский runtime, шрифт, чернила, номер сборки и LAN-сервис не меняются.

## Capabilities
### New Capabilities
- `development-workflow`: спецификации, границы разрешения, проверка и архивирование изменений.
### Modified Capabilities
Нет продуктовых изменений. Десять baseline-спецификаций документируют существующие product-experience, letter-geometry, writing-instructions, lesson-content, tablet-workspace, drawing-input-feedback, settings-and-editor, local-data-progress, offline-delivery, verification.

## Impact
Новые openspec/ и .agents/skills/, wrapper scripts/openspec.mjs, npm-команды spec/spec:check, актуальные README/AGENTS и указатели PROJECT. OpenSpec — глобальный dev CLI, не runtime dependency. Не затрагиваются concepts/, editor/, хранилище, форма букв или поставка App Store.
