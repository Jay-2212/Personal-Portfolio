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

## Sensitivity state

Sensitivity is also local presentation state and never writes to the assessment.

| Event | Transition |
|---|---|
| Results mounts | Daily usage is selected at the unchanged 0% point. |
| Slider changes | Recompute the selected point between -40% and +40%; all non-selected assumptions remain fixed. |
| Driver changes | Switch between Daily usage and weighted Billed tariff, reset the selected point to 0%, and rebuild the nine-point curve. |
| Canonical inputs change | Keep the selected driver/percentage and recompute the curve and selected point from the new validated snapshot. |
| Assessment becomes invalid | Continue using the same last-valid snapshot as the visible Results page. |
