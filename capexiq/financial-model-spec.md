# financial-model-spec.md — Investment Outlook and model extensions

This is the governing contract for the Investment Outlook score, discounted payback,
and Equivalent Annual Cost (EAC). `formulas/` is the implementation; tests are the
regression evidence. Last reconciled: 2026-07-22.

## Investment Outlook

The score is an explainable lens over visible outputs, not a proprietary benchmark or a
buy/don’t-buy recommendation. It combines normalized components, rounded to an integer
from 0–100:

| Component | Loan purchase | Cash purchase |
|---|---:|---:|
| Return strength | 35% | 43.75% |
| Speed to payback | 25% | 31.25% |
| Financing resilience | 20% | N/A |
| Operational margin of safety | 20% | 25% |

Cash-purchase weights redistribute the inapplicable financing weight; do not award it
an automatic 100.

### Return strength

`spread = IRR − discount rate`, in percentage points.

```text
spread <= -5       → 0
-5 < spread <= 0   → (spread + 5) / 5 × 50
0 < spread <= 10   → 50 + spread / 10 × 50
spread > 10        → 100
```

If IRR is undefined, use `NPV / initial investment` instead:

```text
ratio <= -0.2      → 0
-0.2 < ratio <= 0  → (ratio + 0.2) / 0.2 × 50
0 < ratio <= 0.5   → 50 + ratio / 0.5 × 50
ratio > 0.5        → 100
```

### Speed to payback

`ratio = discounted payback years / useful life years`.

```text
ratio >= 1.0       → 0
0.5 <= ratio < 1.0 → (1 - ratio) / 0.5 × 50
0.2 <= ratio < 0.5 → 50 + (0.5 - ratio) / 0.3 × 50
ratio < 0.2        → 100
```

No payback inside useful life scores 0.

### Financing resilience

`DSCR-style ratio = monthly operating cash flow before EMI / monthly EMI`.

```text
DSCR <= 1.0        → 0
1.0 < DSCR <= 1.5  → (DSCR - 1) / 0.5 × 50
1.5 < DSCR <= 2.0  → 50 + (DSCR - 1.5) / 0.5 × 50
DSCR > 2.0         → 100
```

The 1.0/1.5/2.0 anchors are designed score thresholds, not Indian-healthcare
benchmarks; the UI must not present them as sourced lender requirements.

### Operational margin of safety

`cushion = (expected usage − break-even usage) / expected usage`.

```text
cushion <= 0          → 0
0 < cushion <= .20    → cushion / .20 × 50
.20 < cushion <= .50  → 50 + (cushion - .20) / .30 × 50
cushion > .50         → 100
```

Undefined break-even (non-positive contribution) or zero usage scores 0.

### Bands and explanation

| Score | Band |
|---:|---|
| 75–100 | Strong |
| 55–74 | Moderate |
| 35–54 | Caution |
| 0–34 | Weak |

The lowest applicable component is the driver. Break ties in this order: return,
payback, financing, operational margin. If the lowest score is at least 55, frame it as
a strength; otherwise frame it as the main risk and state the underlying value.

Use the user-selected discount rate, or the data default of 12.5% where no override
exists. `targetIrr` does not feed the score; it is a separate editable comparison/input
heuristic.

## Discounted payback and EAC

Discounted payback is the first period where cumulative discounted cash flow recovers
the initial investment. Interpolate within the crossing period:

```text
(period - 1) + shortfall before crossing / discounted cash flow in crossing period
```

Return `null` when the project does not repay within the projection horizon.

```text
annuity factor = (1 - (1 + r)^-n) / r
EAC = NPV of costs only / annuity factor
```

For `r = 0`, the annuity factor is `n`. EAC excludes revenue and is useful for comparing
cost structures or assets with differing lives; it is not a score input.

## Deferred extension: actionable price insight

The planned Phase 9 insight tests tariff increases of 2%, 5%, 8%, 10%, and 15% starting
in Years 1–3 (never later than half the useful life). It appears only when payback
improves by at least six months, selecting the smallest qualifying increase, then the
earliest start year, then the greatest improvement. It must be deterministic and may
return `null`.

**Status: not implemented.** Keep it deferred with scenario/sensitivity work; do not
run an undocumented secondary model in the dashboard.
