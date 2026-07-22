# SPEC.md — CapexIQ product contract

**Product:** CapexIQ — `capexiq.jaybharti.me`
**Purpose:** India-first decision support for hospital equipment capex.
**Status:** Core product implemented. This is the current product contract, not the original
brainstorming history. Last reconciled: 2026-07-22.

## Product promise and boundaries

CapexIQ helps hospital owners, administrators, operations leaders, finance teams, and
consultants assess whether a single equipment investment is viable under stated
assumptions. It is a decision-support estimate, not financial, tax, legal, regulatory,
or investment advice.

It must distinguish billed revenue, realized revenue, cash received, operating surplus,
and cash flow after financing. It must surface uncertainty rather than presenting a
single forecast as fact.

Initial scope is India and INR. Supported templates are MRI, CT, Cath Lab, Dialysis,
Ultrasound, and Custom. Custom has no presumed benchmark data.

## Delivered user journey

```text
/                    Landing page
/assess              Equipment and hospital context
/assess/investment   Investment inputs
/assess/usage        Usage and tariff inputs
/assess/costs        Operating costs; optional Advanced workspace
/results             Decision dashboard and exports
/methodology         Plain-language methodology and formula reference
```

The Basic flow is three chapters: investment, usage/revenue, and operating costs.
Advanced groups A–F are optional and reside on the costs route; opening them must not
discard data or silently change formula precedence. `/results` is a destination, not a
wizard step. Export actions live there.

The wizard uses routed state, guards incomplete routes, persists a versioned local
draft, and gives a local-storage/privacy disclosure. A blocked transition must explain
what is invalid and offer focused recovery. The detailed interaction contract is
`app/forms/wizard-state.md`; implementation is in `app/forms/`.

## Inputs and defaults

Basic inputs cover equipment/hospital context, purchase and installation cost, launch
delay, acquisition mode, expected usage, billed tariff, working days, variable costs,
fixed costs, warranty, and post-warranty maintenance. Professional/reporting fee is a
visible per-use cost, not hidden as an advanced-only assumption.

Advanced inputs cover:

- payer mix, realization, deductions, and collection delay;
- utilization ramp-up;
- loan or lease terms;
- pre-opening and launch assumptions;
- year-specific maintenance/lifecycle costs; and
- discount rate, target IRR, useful life, depreciation, and escalation assumptions.

Every input remains editable. Benchmarks are directional aids only: a vendor quotation,
hospital tariff sheet, payer contract, actual service quote, and lender term sheet take
priority. Do not invent values. `equipment-data/` holds defaults and source IDs;
`data-requirements.md` holds the research ledger; field bounds and copy belong in
`content/inputs-metadata.json`.

`targetIrr` has no responsible public Indian benchmark. The UI may offer the labeled,
editable heuristic `discountRate + 4 percentage points`; it is not a sourced default.

## Financial model contract

The shared model must power Results, charts, Excel, Word, ZIP, and future scenarios:

```text
wizard state → toAssessmentInputs() → computeAssessment() → presentation/export
```

Formula modules are pure and independently tested. Do not duplicate formula logic in
components or export code. The detailed score/EAC/discounted-payback contract is
`financial-model-spec.md`; the public formula reference is
`report-templates/formula-appendix.md`.

| Term | Contract |
|---|---|
| Billed revenue | Amount charged before payer deductions or collection delay. |
| Realized revenue | Expected collectible revenue after payer-specific terms. |
| Cash received | Realized revenue shifted by payer collection delay. |
| Variable cost | Consumables + professional/reporting fee + other per-use cost. |
| Operating surplus | Revenue less operating cost, before financing, tax, and depreciation. |
| Cash flow after financing | Cash received less operating cash expense and EMI/lease payment. |

For DSO, downstream NPV, IRR, annual cash-flow, and working-capital calculations must
use the full collection-delayed series. A display may summarize the tail, but must not
drop valid post-horizon collections from model math.

Model and UI rules:

- Basic results are billed-revenue first-pass estimates; Advanced assumptions enable
  realization, collection timing, financing, launch, and lifecycle effects.
- Warranty and AMC/CMC must not be flattened in a way that hides a later maintenance
  cliff.
- EMI, revenue start, and collection start are distinct dates; pre-revenue debt burden
  and working-capital risk must be visible when relevant.
- Depreciation is straight-line for the current model. Tax treatment is not an audited
  accounting output.
- A score is explanatory, never a buy/don’t-buy verdict. Its driver and supporting
  metrics must remain visible.

## Results, transparency, and exports

Results present an Investment Outlook, NPV, IRR, payback, ROI, discounted payback,
break-even activity, equivalent annual cost, cash-flow chart, risk callout, and
assumption adjustments. Use “under the entered assumptions”; do not claim a project is
definitely profitable.

The methodology page exposes the prose calculation walkthrough and formula appendix.
Excel exports contain live formulas linked to an Assumptions sheet so users can trace
the model; they are checked against the canonical pipeline. Word and ZIP exports reuse
the same inputs and result.

Use Indian number grouping and `₹`; full values are required in inputs, tables, chart
labels, and exports. Compact lakh/crore display is allowed only for prominent dashboard
metrics when the exact value remains accessible.

## UX and accessibility

The interface is progressive rather than spreadsheet-first: short grouped questions, an
optional Advanced workspace, visible definitions/directions for wizard fields, and clear
validation recovery. Use the detailed contract in `design/ux-product-spec.md`.

Interactive controls require keyboard access, visible focus, non-colour status cues,
and reduced-motion support. Tooltips outside the wizard are click-triggered; wizard
help is inline. Charts require accessible labels/data and exact-value hover/focus
feedback.

## Explicit implementation gaps and conflicts

Do not describe these planned requirements as shipped:

| Requirement | Current status |
|---|---|
| Scenario comparison and continuous sensitivity UI | Planned Phase 9; not implemented. |
| Automatic price-increase insight | Specified in `financial-model-spec.md`; deferred with Phase 9. |
| Chart images in Excel and Word exports | Deferred; exports include data/formulas, not chart-image sheets. |
| Final multi-equipment/multi-band visual QA and full go-live QA | Remaining work in `agent-build-plan.md`. |
| Deployment parity with `main` | Verify separately; ISS-28 tracks the live deployment state. |

The results page provides concise metric explanations and the methodology page provides
full formula transparency. If a requirement is interpreted as an arithmetic expansion
beside every result on `/results`, that behavior is not currently implemented; treat it
as a product decision, not an assumed capability.

## Ownership map

| Decision | Owner |
|---|---|
| Current status/history | `HANDOFF.md`, `ISSUES.md` |
| Calculation implementation | `formulas/`, `tests/formulas/`, `tests/scenarios/` |
| Financial methodology | `financial-model-spec.md` |
| Form state/validation | `app/forms/`, `app/forms/wizard-state.md` |
| UX behavior and visual system | `design/ux-product-spec.md`, `design/tokens.css` |
| Benchmark provenance | `data-requirements.md`, `equipment-data/` |
| Export layout/formulas | `report-templates/`, `exports/`, `tests/exports/` |

When this spec and implementation diverge, document the conflict here or in the owning
contract before changing behavior. Do not resolve it by deleting the requirement or
silently redefining shipped behavior.
