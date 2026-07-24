# CapexIQ — agent briefing

CapexIQ is an India-first web assessment tool for hospital equipment investments.
It supports MRI, CT, Cath Lab, Dialysis, Ultrasound, and Custom equipment. Users enter
investment, usage, operating-cost, and optional advanced assumptions; the app produces
ROI, payback, NPV, IRR, break-even, cash-flow/working-capital risk, and Excel/Word/ZIP
exports. Public URL: `capexiq.jaybharti.me`.

## Read in this order

1. `HANDOFF.md` — current state, unresolved work, and concise history.
2. `DIRECTORY.md` — current repository map and task-to-file lookup.
3. `SPEC.md` — current product contract. Read `financial-model-spec.md` or
   `design/ux-product-spec.md` only when the task concerns model or UX rules.
4. Before changing code: `CONVENTIONS.md`, then the relevant local README and tests.

Do not read every document by default. Use `DIRECTORY.md` to open only the source that
owns the decision you need.

## Working rules

- `SPEC.md` describes product intent; implemented code and its focused contract docs
  identify any known gap. Do not silently make a plan-era requirement look shipped.
- Keep one source of truth: formulas in `formulas/`, field rules in
  `content/inputs-metadata.json` and `app/forms/`, benchmark provenance in
  `data-requirements.md` plus `equipment-data/`, and current status in `HANDOFF.md`.
- Never invent a benchmark. Use `Unavailable` or require user input when evidence is
  weak; vendor quotes, tariff sheets, payer contracts, and lender terms take priority.
- Record discovered bugs or gaps in `ISSUES.md`. Update `HANDOFF.md` when a session
  materially changes state; keep its current-state block and history concise.
- Do not delete or rename files in this Documents workspace without permission.

## Current delivery snapshot

The landing page, routed assessment wizard, Advanced workspace, results dashboard,
canonical scenario/sensitivity analysis, formula engine, draft persistence, validation
recovery, methodology page, and exports are implemented. Export chart images, final
multi-equipment visual QA, and production deployment verification remain; see
`HANDOFF.md` and `ISSUES.md` for the live status.
