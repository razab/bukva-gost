# Ввод, оценка и исправление проб

## Purpose

Обеспечить письмо стилусом с устойчивой прокруткой, геометрической обратной связью и быстрым исправлением без потери исходных линий.

## Requirements

### Requirement: Стилус по умолчанию
По умолчанию чернила MUST принимать стилус и мышь, отсекая палец; пользователь может явно разрешить письмо пальцем.

#### Scenario: Стилус по умолчанию
- **WHEN** палец касается поля в обычном режиме
- **THEN** он не оставляет чернил, а режим действует одинаково на все уроки.

### Requirement: Обычная прокрутка пальцем
После завершения реального контакта пера SHALL быть доступна новая обычная вертикальная прокрутка, в том числе поверх полей.

#### Scenario: Обычная прокрутка пальцем
- **WHEN** пользователь отпускает перо и начинает отдельный жест пальцем
- **THEN** нет искусственной задержки 800 мс и блокировки по размеру контакта.

### Requirement: Защита пересекающихся касаний
Касание, пересёкшееся с pen-down, MUST блокироваться до своего окончания; отмена и уход приложения в фон не оставляют зависший ввод.

#### Scenario: Защита пересекающихся касаний
- **WHEN** ладонь остаётся на экране после pen-up
- **THEN** её остаточные события не создают случайных линий или кликов; новое независимое касание позднее работает.

### Requirement: Фиксированный масштаб и отсутствие выделения
Рабочий лист MUST запрещать пользовательский zoom, выделение и перетаскивание содержимого, сохраняя обычную вертикальную прокрутку.

#### Scenario: Фиксированный масштаб и отсутствие выделения
- **WHEN** возникают pinch, двойное касание, long-press или попытка выделить процент
- **THEN** масштаб и текстовые блоки не изменяются, допустимый одиночный scroll остаётся доступен.

### Requirement: Геометрическая оценка
Геометрическая основа оценки SHALL зависеть от геометрии и допуска, а не направления, порядка, числа движений или отрывов пера.

#### Scenario: Геометрическая оценка
- **WHEN** та же правильная линия выполнена в обратном направлении либо несколькими штрихами
- **THEN** она не получает специального ограничения 59% или штрафа за способ выполнения.

### Requirement: Допуск в экранных единицах
Допуск MUST измеряться в CSS px фактического поля и применяться к уже сохранённым линиям при изменении настройки.

#### Scenario: Допуск в экранных единицах
- **WHEN** меняется размер поля или ширина допуска
- **THEN** коридор и процент пересчитываются согласованно без потери чернил.

### Requirement: Отзывчивая локальная подсказка
Расчёт подсветки MUST выполняться отменяемо в фоне, не блокируя процент/reset и не применяя поздние результаты к другому полю.

#### Scenario: Отзывчивая локальная подсказка
- **WHEN** пользователь открывает процент и немедленно сбрасывает длинную пробу
- **THEN** сброс срабатывает до готовности подсветки, поздняя задача не возвращает удалённую работу.

### Requirement: Немедленный сброс без подтверждения
Процент и reset SHALL реагировать на принятый pointerup, сохраняя keyboard/click fallback и подавляя поздний дублирующий click.

#### Scenario: Немедленный сброс без подтверждения
- **WHEN** пользователь быстро нажимает процент, затем сброс
- **THEN** одно поле сбрасывается один раз без подтверждения, задержки навешивания handler и изменения соседних записей.

### Requirement: Локальная отмена
Undo MUST восстанавливать собственное последнее действие и не перезаписывать чужие изменения или остальные поля.

#### Scenario: Локальная отмена
- **WHEN** после сброса или ввода используется undo
- **THEN** возвращается соответствующая работа вместе с согласованными связанными данными.

### Requirement: Исходные точки и косметика пера
Толщина и сглаживание SHALL менять только вид нарисованной копии; оценка и сохранение используют исходные точки.

#### Scenario: Исходные точки и косметика пера
- **WHEN** меняются настройки внешнего вида пера
- **THEN** сохранённые координаты, процент и толщина шрифта остаются прежними.

### Requirement: Mandatory direction feedback
Practice of letters, numbers, signs, their parts and text SHALL check stroke direction against the teaching route shown for that exercise by default. Clear backward movement SHALL be labelled «Не по стрелке» and SHALL prevent a green result. The final percentage SHALL account for direction while the geometric subscore remains available internally. Pictures are excluded.
#### Scenario: Reverse a correct shape
- **WHEN** a learner draws the correct shape with a substantial stroke in the opposite direction
- **THEN** raw ink remains visible, «Не по стрелке» explains the result and the final score is below90, with the usual immediate reset and undo; next-lesson actions stay unavailable until the required guided backward work is corrected or reset, while finishing a session remains allowed
#### Scenario: Lift the pen or pause
- **WHEN** correct directed motion is split into several physical strokes or independent strokes are reordered
- **THEN** lifts and order alone do not cause a penalty; dots, small jitter and ambiguous joins are not treated as definite backward writing

#### Scenario: Trace a closed warmup
- **WHEN** a learner follows the arrow on the closed warmup for lowercase а or another practice part
- **THEN** direction uses the actual warmup path. Its arrow and assessment agree, even if the same area is drawn in separate motions in the whole letter.

## Evidence

- `concepts/components/input-policy.js`
- `concepts/components/worksheet-runtime.js`
- `concepts/components/feedback-jobs.js`
- `concepts/components/feedback-worker.js`
- `concepts/components/pen-appearance.js`
- `concepts/tests/palm-guard.test.cjs`
- `concepts/tests/feedback.test.cjs`
- `concepts/tests/helpers/feedback-jobs.cjs`
