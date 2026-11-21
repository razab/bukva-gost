## MODIFIED Requirements

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

#### Scenario: Join the body and descending stem of lowercase а
- **WHEN** the learner closes the lowercase а body in the taught direction and proceeds down the right stem with or without a pen lift
- **THEN** the completion of the loop SHALL be accepted in single-letter and text practice. The descending stem remains checked, and a standalone upward stem is rejected. The existing split demonstration and closed warmup remain valid.

#### Scenario: Correct a short movement
- **WHEN** the learner briefly corrects a stroke and continues in the taught direction
- **THEN** only a continuous unambiguous reverse run reaching at least 6 CSS px from its start counts for direction. A shorter correction does not lower the direction grade, show «Не по стрелке», or block the next lesson. Geometry is assessed independently.
