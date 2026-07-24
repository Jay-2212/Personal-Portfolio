# HANDOFF.md — current state and trace log

Read **Current state** first. This file is a compact operational record; detailed
entries before 2026-07-13 are in `handoff-archive/2026-Q3.md`.

## Current state

Last reviewed: 2026-07-24 (scenario comparison).

CapexIQ has a working static Next.js application: landing and methodology pages, a
routed assessment wizard, Basic and Advanced inputs, local draft persistence,
cross-field validation with guided recovery, a decision-led results page, tested
financial formulas, and Excel/Word/ZIP exports. The canonical path is
`app/forms/toAssessmentInputs.ts` → `formulas/computeAssessment.ts`; dashboard and
exports must consume that path rather than recreate calculations.

The financial basis is equity cash flow for Cash, Loan, and Lease. The canonical
month-by-month implementation is `formulas/cashFlowSpine.ts`; it owns launch timing,
ramp, payer DSO, operating and lifecycle costs, financing timing, terminal salvage,
and the collection tail. `computeAssessment()`, monthly/annual views, and live Excel
formulas now reconcile to that timeline. The exact basis is documented in
`financial-model-spec.md`.

Results now includes a three-case scenario comparison. Lower demand, Current, and
Higher demand cases use editable relative usage/tariff changes and re-run the exact
canonical assessment snapshot; they do not replace financing, DSO, launch, maintenance,
escalation, or terminal-value logic with a simplified side model.

Advanced Mode has explicit activation semantics: closing it preserves entered
values but deactivates optional overrides and their validation. Visible launch,
financing, lifecycle, escalation, and target-IRR fields are consumed; the unused
generic inflation control is no longer rendered. Results use canonical mature usage,
and exports use one validated input/result snapshot and are disabled while stale.

Display formatting is centralized: whole rupees with Indian grouping, one decimal for
percentages and measured counts, and explicit non-finite statuses. Excel applies
equivalent number formats. Scenario regressions cover DSO, launch, financing, salvage,
Advanced activation, and intentional unit reinterpretation.

Recent validation work makes blocked navigation explainable: invalid Continue actions
reveal errors and a field summary, including Advanced-only blockers; **Take me there**
navigates, opens the relevant Advanced group without changing formula precedence, and
focuses the field. Lakh/Crore selectors preserve the visible number while updating the
canonical Crore value. Current cross-field rules live in
`app/forms/crossFieldValidation.ts` and `app/forms/wizard-state.md`.

Known next work:

- Verify deployment of `main` to the Cloudflare Pages project for
  `capexiq.jaybharti.me` (ISS-28).
- Complete the planned continuous sensitivity UI and export chart images.
- Run the remaining multi-equipment/multi-band visual QA and go-live checks in
  `agent-build-plan.md`.

Open/accepted issues belong in `ISSUES.md`; do not recreate an issue list here.

## Change log

### 2026-07-24 — Canonical scenario comparison (Codex run)

**Changed:** added editable Lower demand / Current / Higher demand cases to Results,
with a resettable comparison table for usage, weighted tariff, NPV, IRR, payback, and
outlook. Each case transforms a copied `AssessmentInputs` snapshot and calls
`computeAssessment()`. **Evidence:** 309 tests, TypeScript check, and production build
pass. Continuous sensitivity remains the next phase.

### 2026-07-23 — Formatting and regression cleanup, Phase 3 (Codex run)

**Changed:** standardized UI/Word/Excel/chart precision and Indian grouping; normalized
maintenance presentation; removed obsolete ramp/working-capital paths and stale
comments; added end-to-end cash-flow behavior scenarios. **Evidence:** 301 tests and
TypeScript check pass, and the production build completes successfully.

### 2026-07-23 — Input activation, validation, and export gates, Phase 2 (Codex run)

**Changed:** wired launch breakdown, financing fees/timing, maintenance inflation,
replacement, price/cost escalation, and target IRR; made Advanced close deactivate
optional overrides; preserved literal Lakh/Crore switching with a recalculation cue;
added positive/integer/tenure validation and finite math sentinels; aligned Results,
Word, and Excel with the validated snapshot. **Evidence:** 294 tests and TypeScript
check pass before final Phase 2 documentation. Formatting cleanup and broader scenario
regressions remain for Phase 3.

### 2026-07-23 — Canonical equity cash-flow spine, Phase 1 (Codex run)

**Changed:** selected and documented an equity-NPV basis; introduced one monthly spine
for launch, DSO, costs, financing, replacement, and terminal value; derived return and
payback metrics from it; reconciled live Excel formulas and added focused cash/loan/
lease tests. **Why:** remove DSO omissions and financing double-counting before wiring
the remaining inputs. **Evidence:** 282 tests and TypeScript check pass. Phase 2 input,
mode, validation, and export-gate work remains intentionally deferred.

### 2026-07-22 — Documentation decluttering (Codex run)

**Why:** onboarding and planning docs had accumulated superseded phase language,
duplicate history, and an obsolete repository map. **Changed:** condensed the live
handoff, introduction, directory, product spec, financial-model spec, and UX spec;
kept the detailed source-research ledger and archived handoff history as trace records.
Current implementation gaps are explicitly flagged in `SPEC.md`. Documentation only;
no code, configuration, or files were created.

### 2026-07-22 — Basic-mode validation and unit-switching fix (Pallavi/Codex run)

**Changed:** added cross-field validation, complete blocked-transition guidance, and
literal Lakh/Crore switching for purchase and installation cost. **Why:** a valid
navigation gate could appear to do nothing, while populated optional inputs escaped the
gate. **Evidence:** 279 tests across 41 files, production build, and Chrome QA of the
₹700 billed / ₹800 consumables case; correction to ₹500 reached Results. **Trace:**
`85b963e`.

### 2026-07-16 — QA fixes: defaults, Advanced precedence, equipment switching, exports

**Changed:** fixed Cath Lab/Dialysis unit conversion defaults; made Advanced formula
precedence depend on user edits rather than opening the panel; added confirmation before
equipment switching; deferred eager validation feedback; clarified field errors; made
progress navigation discoverable; personalized Excel content and export filenames.
**Why:** real browser QA exposed data corruption, accidental recomputation, destructive
switching, input friction, and generic output files. **Evidence:** live browser checks,
clean typecheck/build, and 271 then 279 passing tests. **Trace:** `db8c49b`,
`984492a`, `6f464ac`.

### 2026-07-14 — Exports and chart completion (Phase 8/Codex run)

**Changed:** built Excel, Word, and ZIP exports; extracted shared monthly-series logic;
added chart tooltips; fixed ramped billed revenue and verified Excel IRR independently.
**Why:** exports must trace the same model as Results. **Evidence:** HyperFormula
golden-scenario tests, LibreOffice IRR comparison, browser download QA, and passing
build/tests. Chart images remain deferred. Detailed imported-project history is retained
in the existing quarterly archive.

### 2026-07-13 — Wizard, results, and public experience delivered (Phase 6–7 runs)

**Changed:** implemented the wizard, draft persistence, canonical model adapter,
results dashboard, methodology page, landing redesign, and regression scenarios.
**Why:** moved the completed data/formula/design planning work into a usable product.
**Trace:** detailed decisions and earlier work are in `handoff-archive/2026-Q3.md`.

## Maintenance rule

When a session materially changes the project, overwrite **Current state** and add one
concise entry above. Put detailed historical material in the existing quarterly archive
when this log stops being fast to scan. Do not duplicate issue lists, specs, or test
logs here.
