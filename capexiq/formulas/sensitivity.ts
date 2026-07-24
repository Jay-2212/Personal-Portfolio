// Sensitivity analysis — SPEC.md §28 / agent-build-plan.md Phase 9.
//
// The user-facing sensitivity functions operate on a complete AssessmentInputs
// snapshot and delegate to runAssessmentScenario(), which delegates to the canonical
// computeAssessment() pipeline. The older ScenarioAssumptions adapter at the bottom is
// retained only for the still-deferred actionable price-insight prototype.

import { irr } from "./irr";
import { npv } from "./npv";
import { monthlyRealizedRevenue } from "./revenue";
import { paybackPeriodFromCashFlows, roi } from "./roi";
import {
  runAssessmentScenario,
  type AssessmentScenario,
} from "./assessmentScenario";
import type { AssessmentInputs } from "./computeAssessment";

export type SensitivityDriver = "usage" | "tariff";

export interface SensitivityPoint {
  changePercentage: number;
  driverValue: number;
  assessment: AssessmentScenario;
}

export const DEFAULT_SENSITIVITY_CHANGES = [
  -40, -30, -20, -10, 0, 10, 20, 30, 40,
] as const;

export function runSensitivityPoint(
  inputs: AssessmentInputs,
  driver: SensitivityDriver,
  changePercentage: number
): SensitivityPoint {
  const assessment = runAssessmentScenario(inputs, {
    usageChangePercentage: driver === "usage" ? changePercentage : 0,
    tariffChangePercentage: driver === "tariff" ? changePercentage : 0,
  });

  return {
    changePercentage,
    driverValue:
      driver === "usage"
        ? assessment.inputs.usagePerDay
        : assessment.weightedBilledTariffPerUse,
    assessment,
  };
}

export function buildSensitivitySeries(
  inputs: AssessmentInputs,
  driver: SensitivityDriver,
  changes: readonly number[] = DEFAULT_SENSITIVITY_CHANGES
): SensitivityPoint[] {
  return changes.map((changePercentage) =>
    runSensitivityPoint(inputs, driver, changePercentage)
  );
}

/** @deprecated Simplified pre-canonical adapter; do not use for Results UI. */
export interface ScenarioAssumptions {
  usagePerDay: number;
  realizationPercentage: number;
  financingType: "cash" | "loan" | "lease";
  billedTariffPerUse: number;
  workingDaysPerMonth: number;
  annualOperatingCost: number;
  annualFinancingCost: number;
  initialInvestment: number;
  discountRate: number;
  projectionYears: number;
  tariffIncreasePercentage?: number;
  tariffIncreaseStartYear?: number;
}

export interface ScenarioResult {
  roi: number;
  paybackYears: number;
  npv: number;
  irr: number | null;
  annualNetCashFlows: number[];
}

/** @deprecated Use runAssessmentScenario() or runSensitivityPoint(). */
export function runScenario(assumptions: ScenarioAssumptions): ScenarioResult {
  const annualNetCashFlows = Array.from(
    { length: assumptions.projectionYears },
    (_, yearIndex) => {
      const yearNumber = yearIndex + 1;
      const tariffIncreaseApplies =
        assumptions.tariffIncreasePercentage !== undefined &&
        assumptions.tariffIncreaseStartYear !== undefined &&
        yearNumber >= assumptions.tariffIncreaseStartYear;
      const tariffMultiplier = tariffIncreaseApplies
        ? 1 + assumptions.tariffIncreasePercentage! / 100
        : 1;
      const realizedRevenuePerUse =
        assumptions.billedTariffPerUse *
        tariffMultiplier *
        (assumptions.realizationPercentage / 100);
      const annualRevenue =
        monthlyRealizedRevenue(
          assumptions.usagePerDay,
          realizedRevenuePerUse,
          assumptions.workingDaysPerMonth
        ) * 12;
      const financingCost =
        assumptions.financingType === "cash"
          ? 0
          : assumptions.annualFinancingCost;

      return annualRevenue - assumptions.annualOperatingCost - financingCost;
    }
  );
  const firstYearNetCashFlow = annualNetCashFlows[0] ?? 0;
  let scenarioIrr: number | null = null;

  try {
    scenarioIrr = irr(assumptions.initialInvestment, annualNetCashFlows);
  } catch {
    scenarioIrr = null;
  }

  return {
    roi: roi(firstYearNetCashFlow, assumptions.initialInvestment, "cash-flow"),
    paybackYears: paybackPeriodFromCashFlows(
      assumptions.initialInvestment,
      annualNetCashFlows
    ),
    npv: npv(
      assumptions.discountRate,
      assumptions.initialInvestment,
      annualNetCashFlows
    ),
    irr: scenarioIrr,
    annualNetCashFlows,
  };
}
