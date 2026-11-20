## ADDED Requirements
### Requirement: Responsive lesson selection
Letter selection SHALL initiate the new lesson immediately on selection, without waiting for a modal dismissal callback or doing unrelated repeated lesson work before the new worksheet is visible.
#### Scenario: Cold and repeated transitions
- **WHEN** the learner changes between simple and complex letters on M1, including a first visit
- **THEN** the tap starts the update immediately, no extra one-second delay is introduced, and measured worksheet build timings are reported separately from platform animation
