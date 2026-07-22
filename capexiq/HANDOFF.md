# HANDOFF.md — current state + change log

This is the in-house log book. Two parts: **Current State** (always overwritten, never
appended — reflects right now) and the **Change Log** below it (append-only, most recent
entry first).

If you only read one section, read Current State. Read the log if you want the history
of *how* we got here.

---

## Current State

*(Last updated: 2026-07-22 — Pallavi's real-user Basic-mode completion blocker
diagnosed and fixed; unit switching, cross-field validation, and guided recovery
verified end to end in Chrome.)*

A blocked Basic-mode Continue is now always explained. The root cause was the wizard's
validation gate, not a network or calculation failure: invalid state correctly withheld
navigation, but feedback could be off-screen or inside collapsed Advanced Mode, and
entered optional fields were skipped by the step gate entirely. Invalid Continue
actions now remain operable, reveal every affected inline error, and show a focused
summary beside the navigation buttons with the blocking step/field and a **Take me
there** action. That action navigates across steps when needed, opens the correct
Advanced topic without changing formula precedence, and scrolls/focuses the field.

Lakh/Crore selection now treats the visible number as the source of truth for both
Purchase cost and Installation/civil cost. Typing 2 and changing the unit leaves 2 in
the input while updating the canonical Crore value to match the newly selected meaning.

Cross-field rules now cover per-use costs versus billed price (individual and combined),
complete/non-decreasing utilization ramps, down payment versus total investment,
moratorium versus loan tenure, warranty/CMC coverage versus useful life, payer mix
totaling 100%, and every populated optional/dynamic maintenance input. Exact contracts
and copy live in `app/forms/wizard-state.md` §2.1 and
`app/forms/crossFieldValidation.ts`.

Verification: **279 tests across 41 files pass**, `npm run build` succeeds, and Chrome
QA reproduced ₹700 billed revenue with ₹800 consumables, confirmed the red inline error,
Step 3 summary, working Take me there focus, and zero network requests on the blocked
click; correcting the value then reached a
fully rendered Results page. Both unit-bearing fields were live-checked in both unit
directions. The existing unrelated `../.DS_Store` modification was preserved.

**Next:** deploy current `main` to the Cloudflare Pages project serving
`capexiq.jaybharti.me` (ISS-28) before considering Pallavi's production incident
closed. Phase 8 chart images and Phase 9 sensitivity/scenario comparison remain future
work.

---

Full history of how we got here lives in the Change Log below (most recent first) —
not duplicated here per this doc's own "overwrite, don't append" rule for this section.

---

## End-of-session checklist

Before you finish a session, do this:

- [ ] Overwrite the **Current State** block above — don't leave it describing an old session.
- [ ] Add a new entry at the **top** of the Change Log below (most recent first).
- [ ] If you made a new folder, confirm it has a README.txt/sources.txt.
- [ ] If the log below is approaching ~150 lines, archive it (see rule below).

---

## Archive rule

Once the Change Log below exceeds roughly 150 lines, move everything except the most
recent 2-3 entries into `handoff-archive/YYYY-Q#.md` (e.g. `handoff-archive/2026-Q3.md`),
and leave a one-line pointer in its place: `See handoff-archive/2026-Q3.md for entries
before <date>.` This keeps HANDOFF.md fast to read no matter how old the project gets.

---

## Change Log

*(most recent first)*

### 2026-07-22 — Pallavi's Basic-mode blocker fixed: guided validation + literal unit switching
**Diagnosis:** the blocked click was a validation gate, not a request/calculation
failure. Existing recovery covered one hidden Advanced-required-field case, but the
button still had no nearby explanation, `aria-disabled` made an intentionally
actionable validation control semantically inert, and populated optional fields were
not included in the gate. Unit buttons also converted the displayed amount instead of
preserving what the user typed.

**Changes:** added `crossFieldValidation.ts`; expanded step validation to all populated
fields and dynamic maintenance years; added cross-field rules documented in
`wizard-state.md` §2.1; added the Step/field summary and Take me there routing/focus;
made invalid Continue buttons real actions; and made both Lakh/Crore selectors preserve
the literal typed number while updating canonical Crore state.

**Verification:** 279/279 tests pass and the production build succeeds. In Chrome,
₹700 billed revenue + ₹800 consumables produced the expected red inline error and
Step 3 summary; Take me there focused `basic.consumableCostPerUse`; DevTools captured
zero network requests for the blocked click; correcting to ₹500 removed the summary
and rendered `/results`. Purchase and installation values both stayed `2` through
Lakh↔Crore switches.

### 2026-07-16 (round 2, same session) — ISS-31/32/33 approved and fixed: Cath Lab data corruption, Advanced Mode silent recompute, equipment-switch overwrite
**What happened:** immediately after the round-1 QA/fix session below and its PR, Jay
reviewed the three flagged-but-not-fixed findings (ISS-31/32/33) and explicitly
approved fixing all three in the same PR: *"the bug is real, catlab and dialysis one,
advanced mode silently recalculating is just waste of compute, and the third one makes
sense too, please fix all three, add them in this pr."*
1. **ISS-31 (real bug):** `app/forms/equipmentDefaults.ts` added a `toCanonicalCrore(value,
   unit)` helper that branches on `data.purchaseCost.unit` ("INR (Crore)" used as-is,
   "INR (Lakh)" divided by 100, plain "INR" divided by 1 crore) instead of always
   dividing by 1 crore. `installationCost` now derives from the already-converted
   Crore figure rather than re-deriving from the raw value. Live-verified: Cath Lab's
   Purchase Cost now loads as `9` (Crore) and Installation Cost as `225` (Lakh).
2. **ISS-32:** `app/forms/toAssessmentInputs.ts`'s maintenance-cost and usage-per-day
   precedence switches now gate on `state.touched["advanced.E.cmcYears"]` /
   `state.touched["advanced.B.expectedMatureUtilization"]` instead of
   `state.advancedOpen` alone — the same `touched` map `useFieldController` already
   uses everywhere else as the "did the user actually engage with this field" signal,
   set only by a real `SET_FIELD` dispatch, never by `applyEquipmentDefaults`' silent
   pre-population. Live-verified on a full Cath Lab assessment: Payback/score
   (4.3yr/81) identical before and after opening Advanced Mode; editing Group E's CMC
   coverage period afterward correctly recalculated to 4.4yr.
3. **ISS-33:** `app/(assessment)/assess/page.tsx` now requires a second confirming
   click before switching away from an already-selected equipment type — mirrors
   `StartOver.tsx`'s existing inline "click again to confirm" pattern (armed state
   shown as an amber tile with "Click again to confirm — resets cost & usage
   defaults"). The very first equipment pick and re-clicking the already-selected tile
   both apply immediately, no confirmation needed. Live-verified: MRI stays selected
   on a first click on Cath Lab; a second click actually switches.
4. **Verification:** 271 tests passing (up from 262 after round 1; new files
   `tests/wizard/equipmentDefaults.test.ts` plus new cases in
   `tests/wizard/toAssessmentInputs.test.ts` and `tests/wizard/components.test.tsx`),
   clean `tsc --noEmit`, clean static-export build. All three fixes live-re-verified
   in the browser, not just via tests.
**Files touched (round 2):** `app/forms/equipmentDefaults.ts`,
`app/forms/toAssessmentInputs.ts`, `app/(assessment)/assess/page.tsx`,
`app/globals.css`, plus new/updated tests in `tests/wizard/equipmentDefaults.test.ts`
(new), `tests/wizard/toAssessmentInputs.test.ts`, `tests/wizard/components.test.tsx`.
Same PR as round 1 (`qol-input-validation-and-export-personalization`), not yet merged.

### 2026-07-16 — First hands-on QA pass: eager-validation UX bug fixed, Excel personalized, Cath Lab data-corruption bug found
**What happened:** Jay asked for a first-pass post-launch improvement plan, but
specifically asked it be grounded in actually using the product (Basic + Advanced
Mode, realistic data, pushed to edge cases), not a code read — prompted by his own
report of a "prefilled value → clear it → red warning → retype" friction pattern. Ran
`npm run dev` and drove a full MRI assessment for "Sunrise Multispecialty Hospital"
through every wizard step, all 6 Advanced groups, Loan financing, a second equipment
type (Cath Lab), Results quick-settings, and all three exports — via `claude-in-chrome`
browser automation, not just reading source.
**Findings and fixes, safe/small bucket (implemented, tested, live-verified):**
1. Reproduced Jay's exact pattern and generalized it: clearing a pre-filled "Typical"
   value, or typing a fresh multi-digit number past a field's `min`, flashed a red
   error on every keystroke before the user finished editing — because every
   `NumberField`/`SliderField`/`CurrencyUnitField` dispatches on every keystroke with
   no debounce, and `useFieldController`'s touched-gate flips true on the very edit
   that triggers the problem. Fixed with a new `useDeferredFieldError` hook
   (`app/forms/useFieldController.ts`): display defers to blur; an `ATTEMPT_STEP`
   (blocked "Continue") still reveals every blocked field immediately, unchanged
   (regression-tested in `tests/wizard/components.test.tsx`).
2. ~12 fields' error copy ("X can't be negative") reused the same string for
   missing/too-low/too-high — misleading in 2 of 3 cases (e.g. an empty required Down
   Payment showed "can't be negative"). Reworded to state the actual range in
   `content/inputs-metadata.json`.
3. The step breadcrumb (`ProgressStepper`) looked like tab navigation but had no
   interactive elements — now clickable for the current/completed steps.
4. "EMI start month" and "Moratorium period" shared one tooltip entry with identical
   copy — split into two in `content/tooltip-copy.md`, regenerated via
   `scripts/generateTooltipCopy.mjs`.
5. Basic Mode's blended AMC/CMC default displayed as `4.90625` (false precision) —
   rounded to the field's own declared decimal place in `equipmentDefaults.ts`.
6. Jay asked directly whether the Excel export could be personalized, and whether
   "Excel isn't perfect" too. Unzipped an actual downloaded workbook
   (`xl/sharedStrings.xml`) and confirmed the hospital name appeared nowhere — Word
   already received a `{hospitalName, equipmentCategory}` context object,
   `generateExcelWorkbook` didn't even accept one. Threaded it through
   (`exports/excel-generator.ts`, `exports/workbookPlan.ts`'s Assumptions-sheet title,
   `workbook.title`/`.subject` metadata); new tests in
   `tests/exports/excel-generator.test.ts`. All three export filenames were also
   hardcoded and generic ("Financial Model.xlsx" etc.) — confirmed empirically
   colliding in `~/Downloads` across this session's own repeated downloads. New
   `buildExportFilename` in `app/components/ExportPanel.tsx` builds one from hospital +
   equipment + date; regression-tested in `tests/wizard/exportFilename.test.ts`.
7. Verification: 262 tests passing (up from 255), clean `tsc --noEmit`, clean
   static-export `npm run build`. Live browser re-verification of every fix above
   against its original repro. Automated-browser file downloads didn't land in
   `~/Downloads` in this environment during re-verification (same class of limitation
   HANDOFF.md's 2026-07-15 entry already noted — "a tab/click mismatch, not an export-
   generator defect"); relied on the new deterministic byte-level tests instead, which
   is strictly stronger evidence than a filesystem check.
**Found, NOT fixed — flagged for Jay, methodology-change carve-out:** see ISS-31,
ISS-32, ISS-33 below. All three trace to one root, `applyEquipmentDefaults`
(`app/forms/initialState.ts`), which unconditionally overwrites Basic Mode's
already-answered fields with the newly-selected equipment's benchmark defaults.
ISS-31 is the most severe: a real unit-conversion bug that corrupts Cath Lab's and
Dialysis's Purchase Cost default to ~1e-6 of the real value.
**Files touched:** `app/forms/useFieldController.ts`, `app/components/NumberField.tsx`,
`app/components/SliderField.tsx`, `app/components/CurrencyUnitField.tsx`,
`app/components/FieldShell.tsx`, `app/components/ProgressStepper.tsx`,
`app/globals.css`, `app/forms/equipmentDefaults.ts`, `content/inputs-metadata.json`,
`content/tooltip-copy.md`, `content/tooltip-copy.generated.json`,
`exports/excel-generator.ts`, `exports/workbookPlan.ts`,
`app/components/ExportPanel.tsx`, plus new/updated tests in
`tests/wizard/components.test.tsx`, `tests/exports/excel-generator.test.ts`,
`tests/wizard/exportFilename.test.ts`.

### 2026-07-15 — Live Basic-mode blocker diagnosed; merged fix and Excel export verified
**What was found:** Jay's restored Cath Lab draft used Loan acquisition mode. Every
visible Operating Costs value was valid, but Advanced Group C's required Down payment
was blank. The collapsed UI still said the Basic assessment was complete, so the
blocked Continue click gave no useful explanation on the deployed version being tested.

**Code resolution:** the exact fix had already been implemented on
`fix-basic-mode-dead-click` and was merged to `main` through PR #14 while this QA was in
progress. It routes any hidden `advanced.*` blocker through `REQUEST_ADVANCED_FOCUS`,
opens the correct topic without changing formula precedence, focuses the missing field,
and reveals the normal validation copy. The repository migration and two Cloudflare
deploy-trigger commits are also on `main`; local `main` was fast-forwarded to the same
commit (`7f32557`). A subsequent direct check of the live route's actual JavaScript
bundle found the older implementation, so the code is merged but not yet deployed;
see ISS-28.

**Export check:** direct live-browser QA reached `/results`; Jay confirmed the Excel
download completed. No export code change was needed. Verification on the merged tree:
255 tests across 39 files, clean `tsc --noEmit`, and a successful Next.js static-export
build.

### 2026-07-14 — Phase 8 follow-up: ISS-29 resolved, LibreOffice IRR spot-check
**What changed:** Jay asked to resolve the two items Phase 8 left open (see the entry
below): the flat-billed/ramped-realized asymmetry (ISS-29) and the un-verified-against-
real-Excel IRR cell.
1. **LibreOffice installed and actually used.** The prior session had no headless
   Excel/LibreOffice available; this session installed LibreOffice via Homebrew. A
   first `soffice --headless` attempt hung indefinitely (macOS `AppleSystemPolicy`
   blocking the process — not a slow first-launch); after Jay approved a permission
   prompt, a retry succeeded. Generated a real `.xlsx` for the financed+ramped+multi-
   payer-DSO golden scenario and forced a real recalculation (`OOXMLRecalcMode` set to
   always-recalculate in a scratch profile, since exceljs writes formulas with no
   cached values and LibreOffice doesn't recalc xlsx on load by default). LibreOffice's
   own IRR cell (`19.0812674185733%`) matched `computeAssessment()`'s own IRR
   (`19.081267418573276%`) to ~13 significant digits — independent confirmation beyond
   the existing HyperFormula oracle test.
2. **ISS-29 resolved** — advisor pass weighed three options (ramp billed to match
   realized; ramp everywhere including headline ROI; leave flat and document). Jay
   chose ramping billed revenue to match realized, reusing the existing ramp curve.
   Fixed in `formulas/monthlySeries.ts` and `exports/workbookPlan.ts`'s Monthly-sheet
   billed-revenue formula only; `computeAssessment.ts`'s flat headline
   `roiBilled`/`roiRealized`/`annualOperatingSurplus` fields are untouched by design —
   confirmed before the fix that `Annual Summary`'s billed column already just `SUM()`s
   the Monthly sheet (no separate headline recomputation to reconcile). Updated
   `tests/formulas/monthlySeries.test.ts`, `report-templates/excel-sheet-structure.md`.
   See `ISSUES.md` ISS-29 (moved to Resolved).
3. **Verification:** full suite 249/249 passing, clean `tsc --noEmit`.

### 2026-07-14 — Phase 8 exports built (Excel/Word/ZIP), Phase 7's chart-tooltip gap closed
**What changed:** Jay asked for Phase 8 (Excel/Word/ZIP exports) to be fully built,
following the newly-updated design language, plus the one leftover Phase 7 item
(chart-level hover tooltips). Full detail in the Current State block above; summary:
1. **Chart hover tooltips** — `CashFlowChart`/`BreakEvenBar` bars now show exact
   value + series + period on hover and keyboard focus (`.chart-tooltip`, new CSS),
   per the `$dataviz` skill's interaction rules. 7 new tests.
2. **`formulas/monthlySeries.ts` (new)** — extracted the ramp-fraction/monthly-array
   logic already inside `computeAssessment.ts` (byte-identical refactor, all 203
   pre-existing tests unchanged) and extended it with `monthlyCashReceived`/
   `monthlyEmiOrLease` for the Excel export's Monthly tab. Billed revenue stays flat/
   unramped, faithfully matching the existing engine rather than inventing a ramped
   version that would disagree with the dashboard — flagged as `ISSUES.md` ISS-29.
3. **`exports/workbookPlan.ts` + `excel-generator.ts`** — a pure cell/formula plan
   (direct cell addresses, not Excel defined names — see the doc's rationale) written
   into a real `.xlsx` via `exceljs`. Verified via a **HyperFormula test oracle**
   (`tests/exports/workbookPlan.test.ts`, 23 tests across 4 golden scenarios — cash;
   financed+ramped+DSO; a per-year maintenance override; lease financing) that
   evaluates every formula cell and checks it against `computeAssessment()`/
   `buildMonthlySeries()`'s own numbers — not merely that a formula string exists,
   per an advisor review that flagged the weaker check before it was built. Caught 3
   real bugs pre-ship: an unquoted space-containing sheet name; a missing upper-bound
   guard on a DSO cash-received `INDEX()` lookup; and a second advisor pass catching
   that the Excel maintenance formulas ignored `costByYearPct` (ISS-19) — a real,
   UI-reachable Advanced-mode override that would have made the Excel's headline
   NPV/IRR silently disagree with the dashboard for any user who sets one. Fixed by
   adding a per-year override table to the Assumptions sheet, checked first in both
   the Monthly and Maintenance Schedule formulas.
4. **`exports/word-generator.ts`** — 12-section Word proposal via `docx`, reusing
   `app/components/riskNotes.ts` (extracted from `RiskCallout.tsx` this session) for
   risk notes rather than a second derivation. Verified by unzipping the generated
   `.docx` and checking `word/document.xml` for the exact numbers `computeAssessment()`
   produced (6 tests).
5. **`exports/zip-generator.ts` + `app/components/ExportPanel.tsx`** — bundles both
   via `jszip`; three download buttons on `/results`, lazy-loading the heavy libraries
   on click (confirmed via build output: `/results` grew ~1KB, not ~1MB+). Live-
   verified in a real browser (MRI scenario, "Apex Test Hospital"): all three
   downloads produced correctly-sized, correctly-MIME-typed blobs, zero console errors.
6. **Chart images deferred, not built** — flagged explicitly in both
   `report-templates/excel-sheet-structure.md` and `word-report-template.md` (data
   tables stand in); no headless Excel/LibreOffice available here to verify a
   rasterized image round-trips, judged the wrong tradeoff against the harder
   live-formula verification work this phase actually required.
**Verification:** 248 tests (up from 203), clean `tsc --noEmit`, clean static-export
`npm run build`. Advisor consulted before implementation planning (chart-image scope,
defined-names vs. direct cell refs, oracle-coverage requirements) and again before
declaring done — that second pass is what caught the `costByYearPct` gap above.
**Files touched:** `formulas/monthlySeries.ts` (new), `formulas/computeAssessment.ts`
(byte-identical extraction of the ramp-fraction helper), `exports/{workbookPlan,
excel-generator,word-generator,zip-generator}.ts`, `app/components/{ExportPanel,
riskNotes}.tsx`, `app/components/RiskCallout.tsx` (now consumes `riskNotes.ts`),
`app/charts/{CashFlowChart,BreakEvenBar}.tsx`, `app/globals.css` (chart-tooltip +
export-panel CSS), `app/(assessment)/results/page.tsx`, `report-templates/
{excel-sheet-structure,word-report-template}.md`, `package.json` (added `exceljs`,
`docx`, `jszip`, dev-only `hyperformula`), `tests/exports/*.test.ts` (new),
`tests/formulas/monthlySeries.test.ts` (new), `tests/results/charts.test.tsx`
(tooltip tests added), `agent-build-plan.md`, `ISSUES.md`, `DIRECTORY.md`.

### 2026-07-13 — Phase 7 results dashboard built; reconciled two divergent uncommitted/merged design efforts first
**What changed:** Jay asked for Phase 7 (results dashboard depth) plus a fix for a
red-validation-before-touch bug he'd seen, following "the new design philosophy" —
but the working tree's local `main` had a large uncommitted diff (the full warm-beige
redesign: landing rebuild, hospital name, Lakh/Crore `CurrencyUnitField`, equipment
imagery) that had never been committed, while `origin/main` was one commit ahead with
an independently-authored, already-merged PR (#17, "Resolve ISS-24/ISS-25") that fixed
the *same* validation-reveal bug and rebuilt Methodology, using different (and in the
validation case, more robust — an exhaustive `STEP_FIELD_PATHS`-derived
`stepForFieldPath` instead of a hand-listed one) code. These two lines of work touched
11 of the same files and would have silently clobbered one or the other with a naive
merge.
1. **Reconciliation, not a coin flip:** stashed the uncommitted diff (`git stash push
   -u`), entered a worktree from `origin/main` (so PR #17 was the base), applied the
   stash with `git stash apply` (not `pop`, so the stash survived as a fallback), and
   hand-resolved each of the 11 conflicted files individually — keeping
   `origin/main`'s `ATTEMPT_STEP`/`stepForFieldPath`/Methodology-page implementations
   (more robust, already tested, already shipped) while layering in the stash's actual
   new scope (`hospitalName`, `currencyUnits`/`CurrencyUnit`, the beige landing
   rebuild, `CurrencyUnitField.tsx`, equipment-image carry-forward motion) on top. The
   stash's own duplicate `MARK_STEP_ATTEMPTED` action/dispatch sites were deleted in
   favor of the surviving `ATTEMPT_STEP`. Confirmed byte-for-byte via `diff` that the
   two independent validation-gating implementations were functionally identical
   before choosing which to keep. 191 tests passed immediately after reconciliation,
   before any Phase 7 code was written.
2. **Phase 7 build** (`app/(assessment)/results/page.tsx` + four new presentational
   components): break-even comparison bar and cumulative cash-flow bar chart (moved
   into the pre-scaffolded `app/charts/` — see its README — rather than left in
   `app/components/`, matching what `agent-build-plan.md`'s own Phase 7 goal line and
   `SPEC.md` §27 already named that folder for), a sub-score-driven risk callout, and
   a collapsed-by-default quick-settings panel (`app/components/ResultsQuickSettings.tsx`)
   that is this phase's literal "Advanced settings pane" goal line — Discount Rate,
   Target Hurdle IRR, and the active financing rate/rental, reusing `NumberField` so
   edits dispatch through the one wizard reducer with no separate recompute wiring
   (live-verified: dropping the discount rate from 12.5% to 8% moved the score from
   45/"Caution" to 65/"Moderate" instantly). New pure formula `cumulativeCashFlowSeries`
   in `formulas/roi.ts` (tested) — the chart never re-derives the series itself. New
   `formatInrCompact` in `app/components/formatting.ts` (Lakh/Crore-compact axis
   labels, tested) — this module's own header comment had flagged compact formatting
   as "a Phase 7 concern," so this closes that instead of inventing an unrelated
   pattern. `RiskCallout` reuses `investmentOutlookScore.ts`'s existing 55-point
   "Moderate" band floor as its own flagging threshold rather than a new invented
   cutoff. `design/dashboard-mockup.svg` was read for chart information architecture
   only (per the Phase 7 design gate), never for its old white/slate styling.
3. **One real bug found via live browser QA, not assumed away:** the cash-flow chart's
   per-bar labels became illegible once tested against a realistic 13-year useful-life
   scenario (the mockup only ever showed 6 years) — fixed by thinning labels to ~6
   evenly-spaced ticks while still rendering every bar, full detail staying in the
   chart's accessible `<table>`.
4. **The red-validation-before-touch bug Jay asked to fix could not be reproduced**
   anywhere after reconciliation — see Current State above for the full evidence
   chain, including an extension-proof `data-invalid` DOM check. Also discovered
   `capexiq.jaybharti.me` (the live deploy) is stale, serving the pre-Phase-6
   scaffold — flagged for Jay, not fixed (out of scope, possibly intentional).
5. **Dark Reader in the automation browser silently inverted every screenshot** taken
   before this was noticed (confirmed via `data-darkreader-*` DOM attributes and
   identical computed colors on two elements with different authored CSS variables).
   Re-verified the actual palette and ran a real Phase 4-D contrast check using a
   `<meta name="darkreader-lock">` injection (makes the extension release the page)
   plus direct `getComputedStyle`/WCAG-ratio computation — found and fixed one real
   contrast failure (chart year labels, 3.29:1 → 5.91:1 by switching
   `--text-muted` to `--text-secondary`).
**Verification:** 196 tests (191 immediately post-reconciliation + 5 new
`RiskCallout` branch-coverage tests), `npx tsc --noEmit` clean, `npm run build`
(static export) clean, manual browser QA at 1440px and 390px with Dark Reader locked
for color accuracy, live WCAG contrast computation on every new chart/callout text
element.
6. **A `.next` build-cache trap, not a product bug:** running `npm run build`
   (production) in the same directory as the already-running `npm run dev` server
   corrupted the dev server's chunk cache — every `_next/static/chunks/*` request
   started 503-ing, so the page kept rendering its last-good server HTML but React
   never hydrated (clicks and typing silently did nothing, no console error). Traced
   via `read_network_requests`, not assumed; fixed by killing the dev server, deleting
   `.next`, and restarting. Worth remembering for any future session running both in
   the same worktree.
**Files touched:** `formulas/roi.ts` (`cumulativeCashFlowSeries`, new),
`app/components/formatting.ts` (`formatInrCompact`, new),
`app/charts/{BreakEvenBar,CashFlowChart}.tsx` (new), `app/charts/README.md`,
`app/components/{RiskCallout,ResultsQuickSettings}.tsx` (new),
`app/(assessment)/results/page.tsx`, `app/globals.css` (Phase 7 chart/callout/
quick-settings CSS + one contrast fix), `tests/formulas/roi.test.ts`,
`tests/wizard/formatting.test.ts` (new), `tests/results/{riskCallout.test.tsx,
README.md}` (new); the full reconciliation touched
`DIRECTORY.md`, `HANDOFF.md`, `ISSUES.md`, `agent-build-plan.md`,
`app/(assessment)/assess/page.tsx`, `app/components/StepNav.tsx`, `app/forms/
{useFieldController,wizardReducer,wizardTypes,wizardValidation}.ts`,
`app/methodology/page.tsx`, `tests/wizard/components.test.tsx`, plus the stash's
untouched-by-PR#17 files (landing rebuild, `CurrencyUnitField.tsx`, equipment/hospital
profile motion, `content/inputs-metadata.json`, `design/ux-product-spec.md`,
`public/README.md`, `vitest.config.ts`).

### 2026-07-13 — Phase 7 handoff hardened against legacy-design drift
**What changed:** Added a mandatory design gate directly to `agent-build-plan.md`
Phase 7. Any agent must preserve the implemented warm-beige experience and extend the
current Results foundation; `design/dashboard-mockup.svg` is explicitly limited to
information architecture. Added desktop/mobile browser QA and public-copy requirements,
forbade reviving the stopped Phase 7 worktree, and corrected DIRECTORY.md's stale
description of the Results and Methodology foundations.

### 2026-07-13 — Landing page hierarchy and responsive layout rebuilt
**What changed:** Reworked `/` after a live visual pass found an oversized, heavily
wrapped hero, cramped CTA/privacy details, excessive vertical dead space, and sections
that did not feel like one system. Replaced the landing structure with a shorter
decision-led hero, useful two-link CTA, browser/time notes, a compact model-coverage
strip, three-step assessment story, clearer Basic/Advanced comparison, compact role
cards, and a balanced final CTA. Moved all new landing-specific styling into
`app/landing.css` and imported it from the root layout so assessment styling remains
isolated. Manually verified desktop (1280px) and mobile (390px) in the in-app browser:
no horizontal overflow, no runtime error overlay, and all landing content/assets
rendered. Verified 31 test files / 175 tests, `npx tsc --noEmit`, and the static-export
production build.


See `handoff-archive/2026-Q3.md` for entries before 2026-07-13's Phase 7 results
dashboard entry above.
