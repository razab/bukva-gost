# OpenSpec проекта «Буквы по ГОСТ»

Это рабочий вход для дальнейшей разработки. Baseline зафиксирован 06.11.2026
по исходникам и решениям владельца для сборки 55; он не объявляет продукт готовым
к App Store. [Текущий анализ](project-analysis.md) отделяет факты от вопросов.

## Что где находится

- `specs/<capability>/spec.md` — текущие контракты, не список идей.
- `changes/<name>/` — одно ещё выполняемое изменение: proposal, delta-specs,
  design и tasks.
- `changes/archive/` — завершённые изменения; их delta уже учтена в specs.
- `config.yaml` — русский контекст и правила артефактов.
- [Карта миграции](migration-map.md) — куда перенесены прежние инструкции.
- `../PROJECT-PLAN.md` — исторический план/бэклог, не очередь на автоисполнение.

## Обычный следующий запрос

Можно писать обычным языком: «Исправь…», «Добавь…», «Сначала исследуй…».
Агент сначала читает затронутый контракт и фиксирует change, затем исполняет
ровно порученный объём и проверки. Запрос только исследования/предложения
не разрешает менять продукт. Порученная реализация не требует повторять
подтверждение после каждого артефакта. В конце — валидация, sync и archive.

## Установка и команды

Проверена версия OpenSpec 1.16.0, Node>=22.12. CLI — dev-инструмент, не зависимость приложения.

```sh
npm install -g @fission-ai/openspec@1.16.0
npm run spec -- --version
npm run spec -- context --json
npm run spec -- list --specs
npm run spec -- list
npm run spec:check
```

Для следующего изменения:

```sh
npm run spec -- new change fix-example
npm run spec -- instructions proposal --change fix-example --json
npm run spec -- status --change fix-example
# После фактического выполнения tasks и проверки:
npm run spec -- archive fix-example --yes
npm run spec:check
npm run spec -- validate --archived --strict --no-interactive
```

Не вызывать archive для незавершённых продуктовых задач. `status` отражает наличие
артефактов; галочки и доказательства выполнения остаются ответственностью исполнителя.
Проверка спецификаций не заменяет `npm test`/medium/full и аппаратную проверку.

## Codex skills

`openspec init --tools codex --profile core --language ru` установил 6skills
в `.agents/skills/`. Названия взяты из реальных созданных SKILL.md:

| Задача | Skill |
|---|---|
| Исследование без изменения продукта | `$openspec-explore` |
| Подготовка предложения | `$openspec-propose` |
| Реализация порученного изменения | `$openspec-apply-change` |
| Уточнение существующего change | `$openspec-update-change` |
| Синхронизация delta | `$openspec-sync-specs` |
| Архив завершённого change | `$openspec-archive-change` |

В Codex Desktop skills выбираются в интерфейсе Skills; команда CLI init сообщает
именно этот способ. Отображение новых skills в уже открытой сессии здесь не проверялось;
файлы установлены и входят в репозиторий. Старые `/opsx:...` не являются Codex-командами.

Wrapper `scripts/openspec.mjs` отключает telemetry только для своей дочерней команды,
не меняя личную глобальную конфигурацию. При отсутствии CLI выводит точную команду
установки. Дополнительный сервер, OpenSpec UI и runtime SDK приложению не нужны.
