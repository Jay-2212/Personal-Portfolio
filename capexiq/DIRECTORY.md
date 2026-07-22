# DIRECTORY.md — repository map

Use this to locate an owner; do not treat it as a second specification. Last checked:
2026-07-22.

## Read this for what

| Need | Source of truth |
|---|---|
| Current state, recent changes, next work | `HANDOFF.md` |
| Open, accepted, and resolved problems | `ISSUES.md` |
| Product scope and known implementation gaps | `SPEC.md` |
| Investment Outlook, EAC, discounted payback | `financial-model-spec.md` and `formulas/` |
| UX, interaction, formatting, and accessibility direction | `design/ux-product-spec.md`, `design/tokens.css` |
| Benchmark provenance and research limits | `data-requirements.md`, `equipment-data/` |
| Implementation phases and remaining acceptance work | `agent-build-plan.md` |
| Coding, dependencies, and testing conventions | `CONVENTIONS.md` |
| Wizard routes, validation, persistence, and focus contract | `app/forms/wizard-state.md` |
| Formula definitions used by the public methodology page | `report-templates/methodology.md`, `report-templates/formula-appendix.md` |

## Top-level map

```text
capexiq/
├── .claude/             project-local UI and pre-build assurance skills
├── app/                 Next.js routes, assessment UI, shared components, charts
├── content/             field copy, glossary, benchmark notes, input metadata
├── design/              tokens, visual assets, UX product spec
├── equipment-data/      editable benchmark/default records with source IDs
├── exports/             Excel, Word, and ZIP generation
├── formulas/            pure financial calculation modules
├── public/              served equipment/persona imagery and design assets
├── report-templates/    methodology, formula appendix, export content contracts
├── scripts/             content-generation utilities
├── tests/               formulas, wizard, results, exports, and golden scenarios
├── handoff-archive/     older handoff history; not normal session reading
├── icons/ and fonts/    bundled visual assets; see each folder's README
├── AGENTS.md            auto-discovered pointer to `INTRODUCTION.md`
├── INTRODUCTION.md      short onboarding brief
├── HANDOFF.md           live state and concise trace history
├── SPEC.md              current product contract
├── financial-model-spec.md
├── data-requirements.md
└── agent-build-plan.md  phased implementation/go-live checklist
```

## Application map

| Path | Purpose |
|---|---|
| `app/page.tsx` | Landing page |
| `app/methodology/page.tsx` | Public methodology and formula reference |
| `app/(assessment)/assess/page.tsx` | Equipment and hospital-context pre-step |
| `app/(assessment)/assess/investment/` | Investment inputs |
| `app/(assessment)/assess/usage/` | Usage and tariff inputs |
| `app/(assessment)/assess/costs/` | Operating costs and Advanced workspace |
| `app/(assessment)/results/` | Results, charts, risk callout, exports |
| `app/forms/` | Shared state, validation, routing, defaults, persistence |
| `app/advanced/` | Advanced groups A–F |
| `app/components/` | Reusable field, navigation, and result controls |
| `app/charts/` | Break-even and cumulative-cash-flow charts |

## Model and export map

| Area | Primary files |
|---|---|
| Canonical assessment pipeline | `formulas/computeAssessment.ts` |
| Form-to-model adapter | `app/forms/toAssessmentInputs.ts` |
| Cross-field validation | `app/forms/crossFieldValidation.ts` |
| Benchmark defaults | `app/forms/equipmentDefaults.ts`, `equipment-data/*.json` |
| Workbook formula plan / writer | `exports/workbookPlan.ts`, `exports/excel-generator.ts` |
| Word proposal / ZIP package | `exports/word-generator.ts`, `exports/zip-generator.ts` |
| Regression evidence | `tests/scenarios/`, `tests/formulas/`, `tests/exports/`, `tests/wizard/` |

## Boundaries and known gaps

- `public/` is the served asset location; the old root `equipment-images/` and
  `people-personas/` paths no longer exist.
- `.next/`, `.wrangler/`, `out/`, and `node_modules/` are generated/runtime
  folders, so they are intentionally omitted from the source map.
- `data-requirements.md` is intentionally detailed source provenance, not a quick
  implementation guide. Its `sourceId` values are referenced by `equipment-data/`.
- Scenario comparison/sensitivity UI and export chart images are planned, not shipped.
  See `HANDOFF.md`, `ISSUES.md`, and `agent-build-plan.md` before describing them as
  available.
