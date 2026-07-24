The results page presents the canonical `computeAssessment()` result, charts, risks,
scenario comparison, quick settings, and exports. It shares the assessment route
group's `WizardProvider`, so changes made from Results update the same validated input
snapshot used by the wizard and export gate.

## Scenario comparison state

The comparison is local presentation state; it never mutates the saved assessment.
Every evaluated case is a copied `AssessmentInputs` snapshot passed back through
`computeAssessment()`.

| Event | Transition |
|---|---|
| Results mounts | Lower demand = -20% usage, Current = unchanged, Higher demand = +20% usage; tariffs unchanged. |
| A case input changes | Only that case's relative usage or payer-tariff multiplier changes. |
| Canonical inputs change | Relative case adjustments persist; all scenario results recompute from the new validated snapshot. |
| Reset cases | Restore the documented -20% / 0% / +20% presets and zero tariff changes. |
| Assessment becomes invalid | Results retains its last valid canonical snapshot, so scenario values remain coherent with the visible stale result. |
