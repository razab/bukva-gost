## MODIFIED Requirements

### Requirement: Геометрическая оценка
Геометрическая основа оценки SHALL зависеть от геометрии и допуска, а не направления, порядка, числа движений или отрывов пера.

#### Scenario: Геометрическая оценка
- **WHEN** та же правильная линия выполнена в обратном направлении либо несколькими штрихами
- **THEN** она не получает специального ограничения 59% или штрафа за способ выполнения.

## ADDED Requirements
### Requirement: Mandatory direction feedback
Practice of letters, numbers, signs, their parts and text SHALL check stroke direction against the displayed teaching routes by default. Clear backward movement SHALL be labelled «Обратно» and SHALL prevent a green result. The final percentage SHALL account for direction while the geometric subscore remains available internally. Pictures are excluded.
#### Scenario: Reverse a correct shape
- **WHEN** a learner draws the correct shape with a substantial stroke in the opposite direction
- **THEN** raw ink remains visible, «Обратно» explains the result and the final score is below90, with the usual immediate reset and undo; next-lesson actions stay unavailable until the required guided backward work is corrected or reset, while finishing a session remains allowed
#### Scenario: Lift the pen or pause
- **WHEN** correct directed motion is split into several physical strokes or independent strokes are reordered
- **THEN** lifts and order alone do not cause a penalty; dots, small jitter and ambiguous joins are not treated as definite backward writing
