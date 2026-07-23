// The single canonical wizard-inputs -> full-result pipeline (app/forms/wizard-state.md
// §4: "there is exactly one" derivation the live preview strip and /results dashboard
// both call). Composition order and which cash-flow basis feeds which output is not
// invented here — it's copied exactly from the independently-hand-derived golden
// scenarios in tests/scenarios/ (A: simple cash purchase, B: financed + payer mix +
// DSO, C: non-viable edge cases, D: Custom equipment with zero benchmark data). See
// tests/formulas/computeAssessment.test.ts, which re-asserts this function reproduces
// every one of those golden numbers.

import { billedMonthlyRevenue, monthlyRealizedRevenue } from "./revenue";
import { realizedRevenuePerUse, PayerMixEntry } from "./realization";
import { contributionPerUse, breakEvenUsagePerDay } from "./breakEven";
import {
  maintenanceScheduleForYears,
  MaintenanceScheduleEntry,
} from "./maintenance";
import { npv } from "./npv";
import { irr } from "./irr";
import { roi, paybackPeriodFromCashFlows } from "./roi";
import { equivalentAnnualCost } from "./eac";
import { discountedPaybackPeriod } from "./discountedPayback";
import { annualStraightLineDepreciation } from "./depreciation";
import {
  investmentOutlookScore,
  InvestmentOutlookResult,
} from "./investmentOutlookScore";
import { buildMonthlyCashFlowSpine } from "./cashFlowSpine";

export interface AssessmentPayer {
  payerName: string;
  shareOfVolume: number;
  billedTariff: number;
  /** Already netted for claim deduction/disallowance by the caller — see
   *  app/forms/wizardFields.ts's resolvePayerMix() for the exact combination rule. */
  realizationPercentage: number;
  collectionDelayDays: number;
}

export type AssessmentFinancing =
  | { type: "cash" }
  | {
      type: "loan";
      downPayment: number;
      interestRate: number;
      tenureMonths: number;
      processingChargesPct?: number;
      emiStartMonth?: number;
      moratoriumPeriodMonths?: number;
    }
  | {
      type: "lease";
      rentalPerMonth: number;
      /** ISS-18 (Jay's decision, 2026-07-13, after an Opus advisor pass): after this
       *  many months the rental stops and the equipment is treated as owned outright
       *  for the rest of usefulLifeYears — a finance/capital-lease model, mirroring
       *  loan's tenureMonths so Lease and Loan are directly comparable over the same
       *  ownership horizon, rather than the rental running for the entire useful life. */
      tenureMonths: number;
      paymentStartMonth?: number;
    };

export interface AssessmentMaintenance {
  warrantyYears: number;
  cmcYears: number;
  cmcAnnualCost: number;
  amcAnnualCost: number;
  /** Optional per-year override (ISS-19) — index i is year i+1's cost as % of
   *  purchaseCost, applied instead of the warranty/cmc/amc schedule for that year
   *  when non-null. Missing/shorter-than-usefulLifeYears arrays are fine; unset
   *  indices simply keep the computed warranty/cmc/amc schedule. */
  costByYearPct?: (number | null)[];
  inflationRate?: number;
  majorReplacementCost?: number;
}

/** Advanced Group B (SPEC.md §11.1 B / §13.2) — utilization ramp-up, each percentage
 *  is "% of mature utilization" (AssessmentInputs.usagePerDay). Optional (ISS-19):
 *  omitted entirely means flat mature usage from month 1, i.e. every consumer below
 *  degenerates to its pre-ramp behavior. */
export interface UtilizationRampUp {
  month1to3Pct: number;
  month4to6Pct: number;
  month7to12Pct: number;
  year2PlusPct: number;
}

export interface AssessmentInputs {
  purchaseCost: number;
  installationCost: number;
  usagePerDay: number;
  workingDaysPerMonth: number;
  payerMix: AssessmentPayer[];
  variableCostPerUse: number;
  fixedCostPerMonth: number;
  financing: AssessmentFinancing;
  maintenance: AssessmentMaintenance;
  usefulLifeYears: number;
  discountRate: number;
  salvageValuePercentage: number;
  utilizationRamp?: UtilizationRampUp;
  launchDelayMonths?: number;
  preOpeningFixedCosts?: number;
  workingCapitalBufferAmount?: number;
  priceEscalationRate?: number;
  costEscalationRate?: number;
  targetIrr?: number;
}

export interface AssessmentResult {
  initialInvestment: number;
  realizedRevenuePerUse: number;
  monthlyRealizedRevenue: number;
  monthlyBilledRevenue: number;
  annualOperatingSurplus: number;
  annualDepreciation: number;
  contributionPerUse: number;
  breakEvenUsagePerDay: number | null;
  maintenanceSchedule: MaintenanceScheduleEntry[];
  annualNetCashFlowsBeforeFinancing: number[];
  annualNetCashFlowsAfterFinancing: number[];
  monthlyEmiOrLease: number | null;
  npv: number;
  irr: number | null;
  roiBilled: number;
  roiRealized: number;
  roiCashFlow: number;
  paybackYears: number;
  paybackYearsFromCashFlows: number;
  discountedPaybackYears: number | null;
  eac: number;
  workingCapitalPeakGap: number;
  workingCapitalPeakGapMonth: number;
  investmentOutlook: InvestmentOutlookResult;
  projectCost: number;
  initialEquityOutlay: number;
  capitalizedInterest: number;
  processingCharges: number;
  terminalSalvageValue: number;
  monthlyNetCashFlowsAfterFinancing: number[];
  targetIrr: number | null;
  irrVsTargetPercentagePoints: number | null;
}

function sumRange(series: number[], start: number, length: number): number {
  return series
    .slice(start, start + length)
    .reduce((total, value) => total + value, 0);
}

function annualizeSeries(series: number[]): number[] {
  return Array.from(
    { length: Math.ceil(series.length / 12) },
    (_, yearIndex) => sumRange(series, yearIndex * 12, 12)
  );
}

function annualizedIrrFromMonthly(
  initialOutlay: number,
  monthlyCashFlows: number[]
): number | null {
  try {
    const monthlyIrr = irr(initialOutlay, monthlyCashFlows);
    const annualized = ((1 + monthlyIrr / 100) ** 12 - 1) * 100;
    return Number.isFinite(annualized) ? annualized : null;
  } catch {
    return null;
  }
}

function peakCollectionGap(
  realizedRevenue: number[],
  cashReceived: number[]
): { peakGap: number; peakMonthIndex: number } {
  let cumulativeRealized = 0;
  let cumulativeCashReceived = 0;
  let peakGap = 0;
  let peakMonthIndex = 0;

  for (
    let monthIndex = 0;
    monthIndex < Math.max(realizedRevenue.length, cashReceived.length);
    monthIndex += 1
  ) {
    cumulativeRealized += realizedRevenue[monthIndex] ?? 0;
    cumulativeCashReceived += cashReceived[monthIndex] ?? 0;
    const gap = cumulativeRealized - cumulativeCashReceived;
    if (gap > peakGap) {
      peakGap = gap;
      peakMonthIndex = monthIndex;
    }
  }

  return { peakGap, peakMonthIndex };
}

export function computeAssessment(
  inputs: AssessmentInputs
): AssessmentResult {
  const projectCost = inputs.purchaseCost + inputs.installationCost;
  const payerMixEntries: PayerMixEntry[] = inputs.payerMix.map((payer) => ({
    payerName: payer.payerName,
    shareOfVolume: payer.shareOfVolume,
    billedTariff: payer.billedTariff,
    realizationPercentage: payer.realizationPercentage,
  }));
  const realizedPerUse = realizedRevenuePerUse(payerMixEntries);
  const billedPerUseWeighted = inputs.payerMix.reduce(
    (total, payer) => total + (payer.shareOfVolume / 100) * payer.billedTariff,
    0
  );
  const monthlyRealized = monthlyRealizedRevenue(
    inputs.usagePerDay,
    realizedPerUse,
    inputs.workingDaysPerMonth
  );
  const monthlyBilled = billedMonthlyRevenue(
    inputs.usagePerDay,
    billedPerUseWeighted,
    inputs.workingDaysPerMonth
  );
  const matureAnnualVariableCost =
    inputs.usagePerDay *
    inputs.variableCostPerUse *
    inputs.workingDaysPerMonth *
    12;
  const annualFixedCost = inputs.fixedCostPerMonth * 12;
  const annualOperatingSurplus =
    monthlyRealized * 12 - matureAnnualVariableCost - annualFixedCost;
  const contribution = contributionPerUse(
    realizedPerUse,
    inputs.variableCostPerUse
  );
  let breakEven: number | null;
  try {
    breakEven = breakEvenUsagePerDay(
      annualFixedCost / 12,
      contribution,
      inputs.workingDaysPerMonth
    );
  } catch {
    breakEven = null;
  }

  const baseMaintenanceSchedule = maintenanceScheduleForYears(
    inputs.maintenance.warrantyYears,
    inputs.maintenance.cmcYears,
    inputs.maintenance.cmcAnnualCost,
    inputs.maintenance.amcAnnualCost,
    inputs.usefulLifeYears
  );
  const maintenanceSchedule: MaintenanceScheduleEntry[] = baseMaintenanceSchedule.map(
    (entry, yearIndex) => {
      const overridePct = inputs.maintenance.costByYearPct?.[yearIndex];
      return {
        yearNumber: entry.yearNumber,
        coverageType:
          overridePct === null || overridePct === undefined
            ? entry.coverageType
            : "override",
        annualCost:
          (overridePct === null || overridePct === undefined
            ? entry.annualCost
            : (overridePct / 100) * inputs.purchaseCost) *
          (1 + (inputs.maintenance.inflationRate ?? 0) / 100) ** yearIndex,
      };
    }
  );

  const spine = buildMonthlyCashFlowSpine(inputs);
  const initialInvestment = spine.initialEquityOutlay;
  const annualNetCashFlowsAfterFinancing = annualizeSeries(
    spine.monthlyNetCashFlowAfterFinancing
  );
  const annualNetCashFlowsBeforeFinancing = annualizeSeries(
    spine.monthlyNetCashFlowAfterFinancing.map(
      (cashFlow, monthIndex) =>
        cashFlow + spine.monthlyFinancingPayment[monthIndex]
    )
  );
  const irrResult = annualizedIrrFromMonthly(
    initialInvestment,
    spine.monthlyNetCashFlowAfterFinancing
  );
  const monthlyDiscountRate =
    ((1 + inputs.discountRate / 100) ** (1 / 12) - 1) * 100;
  const discountedPaybackMonths = discountedPaybackPeriod(
    initialInvestment,
    spine.monthlyNetCashFlowAfterFinancing,
    monthlyDiscountRate
  );
  const discountedPaybackYears =
    discountedPaybackMonths === null ? null : discountedPaybackMonths / 12;
  const paybackMonths = paybackPeriodFromCashFlows(
    initialInvestment,
    spine.monthlyNetCashFlowAfterFinancing
  );
  const monthlyPayment =
    spine.monthlyFinancingPayment.find((value) => value > 0) ?? 0;
  const annualCostsByYear = annualizeSeries(
    spine.monthlyVariableCost.map(
      (variableCost, monthIndex) =>
        variableCost +
        spine.monthlyFixedCost[monthIndex] +
        spine.monthlyMaintenanceCost[monthIndex] +
        spine.monthlyMajorReplacementCost[monthIndex] +
        spine.monthlyFinancingPayment[monthIndex]
    )
  );
  const { peakGap, peakMonthIndex } = peakCollectionGap(
    spine.monthlyRealizedRevenue,
    spine.monthlyCashReceived
  );
  const firstOperatingYearStart = spine.operationStartMonth;
  const firstOperatingYearBilledNet =
    sumRange(spine.monthlyBilledRevenue, firstOperatingYearStart, 12) -
    sumRange(spine.monthlyVariableCost, firstOperatingYearStart, 12) -
    sumRange(spine.monthlyFixedCost, firstOperatingYearStart, 12);
  const firstOperatingYearRealizedNet =
    sumRange(spine.monthlyRealizedRevenue, firstOperatingYearStart, 12) -
    sumRange(spine.monthlyVariableCost, firstOperatingYearStart, 12) -
    sumRange(spine.monthlyFixedCost, firstOperatingYearStart, 12);
  const firstOperatingYearCashFlow = sumRange(
    spine.monthlyNetCashFlowAfterFinancing,
    firstOperatingYearStart,
    12
  );

  return {
    initialInvestment,
    realizedRevenuePerUse: realizedPerUse,
    monthlyRealizedRevenue: monthlyRealized,
    monthlyBilledRevenue: monthlyBilled,
    annualOperatingSurplus,
    annualDepreciation: annualStraightLineDepreciation(
      inputs.purchaseCost,
      inputs.purchaseCost * (inputs.salvageValuePercentage / 100),
      inputs.usefulLifeYears
    ),
    contributionPerUse: contribution,
    breakEvenUsagePerDay: breakEven,
    maintenanceSchedule,
    annualNetCashFlowsBeforeFinancing,
    annualNetCashFlowsAfterFinancing,
    monthlyEmiOrLease: inputs.financing.type === "cash" ? null : monthlyPayment,
    npv: npv(
      monthlyDiscountRate,
      initialInvestment,
      spine.monthlyNetCashFlowAfterFinancing
    ),
    irr: irrResult,
    roiBilled: roi(
      firstOperatingYearBilledNet,
      initialInvestment,
      "billed"
    ),
    roiRealized: roi(
      firstOperatingYearRealizedNet,
      initialInvestment,
      "realized"
    ),
    roiCashFlow: roi(
      firstOperatingYearCashFlow,
      initialInvestment,
      "cash-flow"
    ),
    paybackYears: paybackMonths / 12,
    paybackYearsFromCashFlows: paybackMonths / 12,
    discountedPaybackYears,
    eac: equivalentAnnualCost(
      initialInvestment,
      annualCostsByYear,
      inputs.discountRate,
      inputs.usefulLifeYears
    ),
    workingCapitalPeakGap: peakGap,
    workingCapitalPeakGapMonth: peakMonthIndex,
    investmentOutlook: investmentOutlookScore({
      irr: irrResult,
      discountRate: inputs.discountRate,
      npv: npv(
        monthlyDiscountRate,
        initialInvestment,
        spine.monthlyNetCashFlowAfterFinancing
      ),
      initialInvestment,
      discountedPaybackYears,
      usefulLifeYears: inputs.usefulLifeYears,
      financingType: inputs.financing.type,
      monthlyOperatingCashFlowBeforeEmi: annualOperatingSurplus / 12,
      monthlyEmi: monthlyPayment,
      usagePerDay: inputs.usagePerDay,
      breakEvenUsagePerDay: breakEven,
    }),
    projectCost,
    initialEquityOutlay: initialInvestment,
    capitalizedInterest: spine.capitalizedInterest,
    processingCharges: spine.processingCharges,
    terminalSalvageValue: spine.terminalSalvageValue,
    monthlyNetCashFlowsAfterFinancing:
      spine.monthlyNetCashFlowAfterFinancing,
    targetIrr: inputs.targetIrr ?? null,
    irrVsTargetPercentagePoints:
      irrResult === null || inputs.targetIrr === undefined
        ? null
        : irrResult - inputs.targetIrr,
  };
}
