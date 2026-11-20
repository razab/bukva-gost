## MODIFIED Requirements

### Requirement: Compact numbers and signs worksheet
The application SHALL provide one supplementary worksheet for 0–9 and + − = . , :, using upright type Б outlines from the same source as the letters. The worksheet SHALL show two sequential labelled sections: «Цифры» with 0–9, then «Знаки» with + − = . , :, without tabs or separate pages. Each symbol SHALL have a selectable reference, animated writing with a pencil, a parallel-arrow numbered scheme and two practice fields by default; an explicit global repeat setting SHALL override that default.

#### Scenario: Open and select a symbol
- **WHEN** the learner opens «Цифры и знаки» and selects a reference or starts a practice field
- **THEN** the worksheet shows that symbol's animation and scheme, without rebuilding or clearing other fields

#### Scenario: Practice and return
- **WHEN** the learner writes, resets, undoes or reopens the supplementary worksheet
- **THEN** the existing geometric feedback and autosave apply, backup includes its ink, and previous letter ink, course order and letter results remain unchanged

#### Scenario: Tablet layout
- **WHEN** the supplementary worksheet opens in the iPad application
- **THEN** it uses the full available writing width with native Back navigation and undo, horizontal ruling and no separate course completion flow
