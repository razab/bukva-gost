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
- **THEN** the completion of the loop SHALL be accepted in single-letter and text practice. The descending stem remains checked, and a standalone upward stem is rejected. The connected demonstration and the closed warmup use their relevant teaching routes.

#### Scenario: Correct a short movement
- **WHEN** the learner briefly corrects a stroke and continues in the taught direction
- **THEN** only a continuous unambiguous reverse run reaching at least 5% of its corresponding taught stroke length and the screen threshold from its start counts for direction. For letters, numbers, signs and text, the screen threshold is 90% of the taught stroke length bounded to 4–10 CSS px. A shorter correction does not lower the direction grade, show «Не по стрелке», or block the next lesson. Geometry is assessed independently.

#### Scenario: Trace a whole letter in warmup
- **WHEN** a warmup contains the whole letter geometry
- **THEN** its cues and direction assessment use the letter's taught route, including separate strokes and allowed pen lifts.

#### Scenario: Use an earlier lowercase б route
- **WHEN** a learner follows the earlier split route for lowercase б
- **THEN** direction assessment accepts that route in single-letter and text practice, while the schema and animation show the connected route.

#### Scenario: Draw the middle bar of Э or э
- **WHEN** a learner draws the middle bar in a current attempt
- **THEN** a left-to-right bar follows the taught direction, and a substantial right-to-left bar triggers «Не по стрелке». Previously completed results remain available.

#### Scenario: Use a previously taught route
- **WHEN** a learner follows the earlier valid split direction for а, Ж/ж or О/о
- **THEN** the direction check still accepts the applicable previous route in practice of letters and text. The ordinary demonstration shows the current route.
