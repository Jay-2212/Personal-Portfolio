Results visualizations. See SPEC.md §27.

- `BreakEvenBar.tsx` — a bullet-style comparison of expected usage/day against the
  break-even usage/day threshold (both already computed by `formulas/breakEven.ts` via
  `computeAssessment.ts` — never re-derived here).
- `CashFlowChart.tsx` — a bar chart of the cumulative cash-flow position by year, fed
  by `formulas/roi.ts`'s `cumulativeCashFlowSeries`. Thins its own text labels once the
  series is long (10+ years) but always renders every bar; the full year-by-year
  figures stay available in an accessible `<table>` inside the component.
- `SensitivityChart.tsx` — the NPV curve produced by
  `formulas/sensitivity.ts`; it never calculates financial outputs itself.

All are pure presentational components (CONVENTIONS.md §3) — no calculation logic
lives here, only layout of numbers `/formulas` already produced. Consumed by
`app/(assessment)/results/page.tsx`. Every chart exposes exact values through
keyboard-accessible marks and either visible labels or an adjacent structured table.
