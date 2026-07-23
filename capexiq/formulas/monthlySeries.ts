// Export-facing view of the canonical monthly cash-flow spine. This module contains
// no financial arithmetic; it only preserves the established export field names.

import type { AssessmentInputs } from "./computeAssessment";
import { buildMonthlyCashFlowSpine } from "./cashFlowSpine";

export interface MonthlySeries {
  monthlyBilledRevenue: number[];
  monthlyRealizedRevenue: number[];
  monthlyVariableCost: number[];
  /** Flat every month — inputs.fixedCostPerMonth has no ramp/seasonality concept. */
  monthlyFixedCost: number[];
  monthlyMaintenanceCost: number[];
  monthlyCashReceived: number[];
  monthlyEmiOrLease: number[];
  monthlyNetCashFlowAfterFinancing: number[];
  monthlyMajorReplacementCost: number[];
  initialEquityOutlay: number;
  terminalSalvageValue: number;
  operationStartMonth: number;
  operationEndMonth: number;
}

export function buildMonthlySeries(inputs: AssessmentInputs): MonthlySeries {
  const spine = buildMonthlyCashFlowSpine(inputs);

  return {
    monthlyBilledRevenue: spine.monthlyBilledRevenue,
    monthlyRealizedRevenue: spine.monthlyRealizedRevenue,
    monthlyVariableCost: spine.monthlyVariableCost,
    monthlyFixedCost: spine.monthlyFixedCost,
    monthlyMaintenanceCost: spine.monthlyMaintenanceCost,
    monthlyCashReceived: spine.monthlyCashReceived,
    monthlyEmiOrLease: spine.monthlyFinancingPayment,
    monthlyNetCashFlowAfterFinancing:
      spine.monthlyNetCashFlowAfterFinancing,
    monthlyMajorReplacementCost: spine.monthlyMajorReplacementCost,
    initialEquityOutlay: spine.initialEquityOutlay,
    terminalSalvageValue: spine.terminalSalvageValue,
    operationStartMonth: spine.operationStartMonth,
    operationEndMonth: spine.operationEndMonth,
  };
}
