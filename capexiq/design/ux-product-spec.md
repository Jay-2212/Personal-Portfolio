# CapexIQ UX/UI product spec

This document governs product-facing interaction and visual intent. `design/tokens.css`
and the implemented components are the detailed source for tokens and mechanics. Last
reconciled: 2026-07-22.

## Design direction

Use a calm, clinical, editorial interface: warm neutral surfaces, deep ink structure,
restrained slate-blue interaction, and green/amber/red only for meaningful status. It
must feel like a careful hospital-finance tool, not generic SaaS or a marketing-heavy
site. The landing page is factual and single-scroll, with one primary action: **Start
Assessment**.

Use the bundled IBM Plex Sans and IBM Plex Mono roles and the type/spacing scales in
`design/tokens.css`. INR uses Indian grouping (`₹12,34,567`); compact lakh/crore values
are only for prominent metrics, never where a precise value is needed.

## Journey and information hierarchy

- Landing: concise product explanation, how-it-works, audience, methodology link, and
  Start Assessment.
- `/assess`: equipment selection plus hospital context before investment questions.
- Basic assessment: small related groups, not one field per page or one long form.
- Costs: explicit choice to continue with Basic assumptions or open Advanced topics.
- Results: decision statement, score, key financial metrics, break-even/cash-flow
  charts, risk context, quick settings, exports, and a non-advice disclaimer.
- Methodology: reference content, not marketing copy.

Changing equipment after a draft has meaningful values requires an in-page second-click
confirmation because defaults will reset cost and usage fields.

## Help, defaults, and validation

Wizard fields show definition and direction inline. “More info” expands remaining field
context in document flow; it is not a hover or popover interaction. Outside the wizard,
help opens on click and closes on trigger, outside click, or Escape.

Untouched sourced or heuristic defaults use subdued styling and a **Typical** tag;
edited values use normal input styling. The target-IRR default is a clearly labeled
editable heuristic, not a researched benchmark. Missing values with no defensible
default remain visibly empty and must be entered when required.

Validation truth is live, but feedback must be discoverable rather than punitive: avoid
red errors on a fresh form, explain a blocked continuation, identify its step and field,
and focus the destination when the user asks to navigate there. The full state and
timing contract is `app/forms/wizard-state.md`.

## Accessibility and interaction

- Every control works by keyboard and has a visible focus style.
- Status never relies on colour alone; pair colour with text, shape, or icon.
- Honour `prefers-reduced-motion`; motion is decorative, not information-bearing.
- Slider inputs have an equivalent precise numeric input.
- Charts expose labelled data and exact values on hover and keyboard focus.
- Maintain at least 4.5:1 contrast for normal chart/data-label text.

## Chart and score semantics

Series colours stay fixed by meaning. Conditional colour is reserved for status:
Investment Outlook uses the bands in `financial-model-spec.md`; cash-flow and
break-even risk use text/markers as well as colour. Do not recolour unrelated metrics
to imply a change in their meaning.

## Exports

Excel contains live formulas tracing from an Assumptions sheet. Word and ZIP reuse the
canonical assessment result. Exports should be named for the hospital/equipment/date
to prevent collisions. Chart images in exports are deliberately deferred; do not imply
that a workbook Charts tab or Word chart image exists.

## Implementation watch items

- Scenario comparison and continuous sensitivity are not yet user-facing.
- Final multi-equipment/multi-band visual QA remains in `agent-build-plan.md`.
- The exact implemented visual states live in `app/` and `design/tokens.css`; update
  this spec only for deliberate product decisions, not to narrate CSS history.
