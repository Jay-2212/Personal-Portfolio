# financial-model-spec.md — Investment Outlook and model extensions

This is the governing contract for the Investment Outlook score, discounted payback,
and Equivalent Annual Cost (EAC). `formulas/` is the implementation; tests are the
regression evidence. Last reconciled: 2026-07-22.

## Cash-flow basis and canonical timeline

CapexIQ reports an **equity NPV** for every acquisition mode. Cash purchase is the
special case where the equity outlay is also the full project outlay. The model does
not mix an unlevered project outlay with levered debt-service cash flows.

| Mode | Time-zero equity outlay | Monthly financing cash flow |
|---|---|---|
| Cash | Purchase + installation + pre-opening costs + working-capital buffer | None |
| Loan | Down payment + processing fee + pre-opening costs + working-capital buffer | EMI on financed project cost plus capitalized pre-operative interest |
| Lease | Installation + pre-opening costs + working-capital buffer | Lease rental through the entered tenure |

Loan principal is `max(0, purchase + installation − down payment)`. Processing fees
are paid by equity at time zero. Simple pre-operative interest accrues only for whole
months before debt service starts, is added once to financed principal, and is then
repaid through EMI. If no explicit EMI start is entered, debt service starts when the
equipment launches. Lease follows the current finance-lease contract: after the
entered rental tenure the equipment is treated as owned, so terminal salvage remains
available to equity.

`formulas/cashFlowSpine.ts` is the canonical month-by-month series. A launch delay of
`n` means the first `ceil(n)` monthly periods have no operations and operating month 1
is the following period. When an active Advanced launch breakdown has any user-edited
component, its civil-work, installation, approval, and commissioning durations sum to
the launch delay; otherwise the Basic launch delay applies. The spine applies
utilization ramp, payer-specific
`ceil(DSO days / 30)` collection shifts, variable and fixed operating costs,
operation-year maintenance and inflation, financing start/moratorium, mid-life
replacement, and terminal value. It retains post-useful-life DSO collections and any
remaining financing periods.

Active price escalation compounds billed and realized revenue once per operating year.
Active cost escalation compounds variable cost, fixed cost, and major replacement
once per operating year. Maintenance uses its separate maintenance-inflation input.
Target IRR does not alter cash flow or the Investment Outlook score; it is consumed as
an explicit comparison against calculated IRR.

Terminal salvage is `purchase cost × salvage %` in the final operating month; the
working-capital buffer is released in that same month. NPV discounts the monthly
equity cash flows at the effective monthly rate derived from the annual discount
rate. IRR is solved monthly and annualized. Simple and discounted payback interpolate
on that same monthly equity series. Cash-flow ROI uses the first 12 operating months
over the time-zero equity outlay. Annual cash-flow tables, charts, and exports are
aggregations of the same spine. Break-even remains a mature operations measure based
on contribution per procedure and monthly fixed cost, so financing and DSO do not
alter it.

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
