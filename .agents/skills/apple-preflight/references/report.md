# Формат содержательного отчёта

Записать `semantic.json` рядом с `mechanical.json`:

```json
{
  "schema": 1,
  "fingerprint": "точное значение из mechanical.json",
  "author": "Codex · source review, current session",
  "checkedAt": "2026-11-08T12:00:00Z",
  "findings": [
    {
      "id": "privacy-policy",
      "status": "FLAG",
      "summary": "Фактический вывод с границей доказательства.",
      "evidence": [{"input": "source:concepts/index.html", "line": 9, "note": "Что видно в этой строке."}],
      "source": {"kind": "apple", "url": "https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage", "guideline": "5.1.1"},
      "action": "Предлагаемое действие, без автоматического выполнения."
    }
  ]
}
```

Должны присутствовать ровно девять уникальных разделов:

| id | Область |
|---|---|
| privacy-policy | Политика в приложении и магазине |
| kids | Kids, возрастная полоса, родительские барьеры |
| network-privacy | Данные и сетевые обращения; source review не заменяет трассу устройства |
| functionality | Полезность, самостоятельность,4.2; не автоматический отказ за WebView |
| metadata | Название, описание, возраст, изображения, Support/Privacy URLs |
| content-rights | ASCON, PNG и другие включённые материалы |
| account-purchases | Применимость входа, удаления аккаунта, IAP; при отсутствии — обоснованный N/A |
| reviewer-access | Доступ к функциям, dev-панель и Notes for Review |
| permissions-privacy | API/SDK, purpose strings, privacy manifests; без бинарного файла UNKNOWN |

Статусы: PASS — конкретный проверенный факт; BLOCK — доказанный блокер;
FLAG — риск, требующий решения; UNKNOWN — нет нужного доказательства;
NOT_CHECKED — проверка не исполнялась; N/A — неприменимо с основанием.
Не выдавать отсутствие документа о правах за доказанное нарушение закона.

`evidence.input` берётся только из `mechanical.inputs[].id`, с существующей
строкой. Для PASS/BLOCK/FLAG/N/A нужно хотя бы одно файловое доказательство.
UNKNOWN/NOT_CHECKED допускают `{"note":"Какое доказательство отсутствует"}`.
Все содержательные выводы ссылаются на `https://developer.apple.com/` и номер
применимого пункта; checkedAt фиксирует дату сверки. Непроверенные/недоступные
источники указывать в summary, не отмечать их актуальность как факт.

Не изменять mechanical.json. Нельзя заменять технические результаты, добавлять
содержательный PASS для подписи/устройства или переиспользовать старый fingerprint.
После изменения входов начать новый запуск. При прерывании можно дополнить
semantic.json прежнего запуска и повторить finalize, если входы не изменились.
