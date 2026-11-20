## ADDED Requirements
### Requirement: Direction assessment compatibility
The direction assessment SHALL preserve existing raw coordinates, geometry/storage keys and closed historical results, and SHALL identify its scoring profile separately from geometry-only attempts.
#### Scenario: Open old work and finish a new attempt
- **WHEN** old ink is reopened with the new assessment and the learner saves a new result
- **THEN** the live assessment checks direction, the new result has the new profile, and previous stored sessions remain unchanged
