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
