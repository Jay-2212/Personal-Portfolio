import { cashReceivedByMonth, type PayerCollectionProfile } from "./dso";
import { monthlyEmi } from "./emi";
import { maintenanceScheduleForYears } from "./maintenance";
import { preOperativeInterest } from "./launchDelay";
import { billedMonthlyRevenue, monthlyRealizedRevenue } from "./revenue";
import { realizedRevenuePerUse, type PayerMixEntry } from "./realization";
import type { AssessmentInputs } from "./computeAssessment";

export interface MonthlyCashFlowSpine {
  initialEquityOutlay: number;
  financedPrincipal: number;
  capitalizedInterest: number;
  processingCharges: number;
  terminalSalvageValue: number;
  operationStartMonth: number;
  operationEndMonth: number;
  monthlyBilledRevenue: number[];
  monthlyRealizedRevenue: number[];
  monthlyCashReceived: number[];
  monthlyVariableCost: number[];
  monthlyFixedCost: number[];
  monthlyMaintenanceCost: number[];
  monthlyMajorReplacementCost: number[];
  monthlyFinancingPayment: number[];
  monthlyNetCashFlowAfterFinancing: number[];
}

function utilizationFractionForOperatingMonth(
  ramp: AssessmentInputs["utilizationRamp"],
  operatingMonthIndex: number
): number {
  if (!ramp) return 1;
  const monthNumber = operatingMonthIndex + 1;
  if (monthNumber <= 3) return ramp.month1to3Pct / 100;
  if (monthNumber <= 6) return ramp.month4to6Pct / 100;
  if (monthNumber <= 12) return ramp.month7to12Pct / 100;
  return ramp.year2PlusPct / 100;
}

function loanPaymentStartMonth(inputs: AssessmentInputs): number {
  if (inputs.financing.type !== "loan") return 0;
  return Math.max(
    0,
    inputs.financing.emiStartMonth ?? 0,
    inputs.financing.moratoriumPeriodMonths ?? 0
  );
}

export function buildMonthlyCashFlowSpine(
  inputs: AssessmentInputs
): MonthlyCashFlowSpine {
  const projectCost = inputs.purchaseCost + inputs.installationCost;
  const operationStartMonth = inputs.launchDelayMonths ?? 0;
  const operatingMonths = inputs.usefulLifeYears * 12;
  const operationEndMonth = operationStartMonth + operatingMonths;

  let initialEquityOutlay: number;
  let financedPrincipal = 0;
  let capitalizedInterest = 0;
  let processingCharges = 0;
  let paymentStartMonth = 0;
  let paymentMonths = 0;
  let monthlyPayment = 0;

  if (inputs.financing.type === "cash") {
    initialEquityOutlay =
      projectCost +
      (inputs.preOpeningFixedCosts ?? 0) +
      (inputs.workingCapitalBufferAmount ?? 0);
  } else if (inputs.financing.type === "loan") {
    const basePrincipal = Math.max(0, projectCost - inputs.financing.downPayment);
    paymentStartMonth = loanPaymentStartMonth(inputs);
    const interestAccrualMonths = paymentStartMonth;
    capitalizedInterest = preOperativeInterest(
      basePrincipal,
      inputs.financing.interestRate,
      interestAccrualMonths
    );
    financedPrincipal = basePrincipal + capitalizedInterest;
    processingCharges =
      basePrincipal * ((inputs.financing.processingChargesPct ?? 0) / 100);
    paymentMonths = inputs.financing.tenureMonths;
    monthlyPayment =
      financedPrincipal === 0
        ? 0
        : monthlyEmi(
            financedPrincipal,
            inputs.financing.interestRate,
            paymentMonths
          );
    initialEquityOutlay =
      inputs.financing.downPayment +
      processingCharges +
      (inputs.preOpeningFixedCosts ?? 0) +
      (inputs.workingCapitalBufferAmount ?? 0);
  } else {
    paymentStartMonth = inputs.financing.paymentStartMonth ?? 0;
    paymentMonths = inputs.financing.tenureMonths;
    monthlyPayment = inputs.financing.rentalPerMonth;
    initialEquityOutlay =
      inputs.installationCost +
      (inputs.preOpeningFixedCosts ?? 0) +
      (inputs.workingCapitalBufferAmount ?? 0);
  }

  const payerMixEntries: PayerMixEntry[] = inputs.payerMix.map((payer) => ({
    payerName: payer.payerName,
    shareOfVolume: payer.shareOfVolume,
    billedTariff: payer.billedTariff,
    realizationPercentage: payer.realizationPercentage,
  }));
  const realizedPerUse = realizedRevenuePerUse(payerMixEntries);
  const billedPerUse = inputs.payerMix.reduce(
    (total, payer) =>
      total + (payer.shareOfVolume / 100) * payer.billedTariff,
    0
  );
  const matureBilledRevenue = billedMonthlyRevenue(
    inputs.usagePerDay,
    billedPerUse,
    inputs.workingDaysPerMonth
  );
  const matureRealizedRevenue = monthlyRealizedRevenue(
    inputs.usagePerDay,
    realizedPerUse,
    inputs.workingDaysPerMonth
  );
  const matureVariableCost =
    inputs.usagePerDay *
    inputs.variableCostPerUse *
    inputs.workingDaysPerMonth;

  const generatedSeriesLength = operationEndMonth;
  const monthlyBilledGenerated = Array.from(
    { length: generatedSeriesLength },
    (_, monthIndex) => {
      if (monthIndex < operationStartMonth) return 0;
      return (
        matureBilledRevenue *
        utilizationFractionForOperatingMonth(
          inputs.utilizationRamp,
          monthIndex - operationStartMonth
        )
      );
    }
  );
  const monthlyRealizedGenerated = Array.from(
    { length: generatedSeriesLength },
    (_, monthIndex) => {
      if (monthIndex < operationStartMonth) return 0;
      return (
        matureRealizedRevenue *
        utilizationFractionForOperatingMonth(
          inputs.utilizationRamp,
          monthIndex - operationStartMonth
        )
      );
    }
  );
  const collectionProfiles: PayerCollectionProfile[] = inputs.payerMix.map(
    (payer) => ({
      payerName: payer.payerName,
      shareOfVolume: payer.shareOfVolume,
      daysToCollect: payer.collectionDelayDays,
    })
  );
  const cashReceivedGenerated = cashReceivedByMonth(
    monthlyRealizedGenerated,
    collectionProfiles
  );

  const financingEndMonth = paymentStartMonth + paymentMonths;
  const horizonMonths = Math.max(
    operationEndMonth,
    cashReceivedGenerated.length,
    financingEndMonth
  );
  const pad = (series: number[]) =>
    Array.from({ length: horizonMonths }, (_, index) => series[index] ?? 0);

  const monthlyBilledRevenue = pad(monthlyBilledGenerated);
  const monthlyRealizedRevenue_ = pad(monthlyRealizedGenerated);
  const monthlyCashReceived = pad(cashReceivedGenerated);
  const monthlyVariableCost = Array.from(
    { length: horizonMonths },
    (_, monthIndex) => {
      if (monthIndex < operationStartMonth || monthIndex >= operationEndMonth) {
        return 0;
      }
      return (
        matureVariableCost *
        utilizationFractionForOperatingMonth(
          inputs.utilizationRamp,
          monthIndex - operationStartMonth
        )
      );
    }
  );
  const monthlyFixedCost = Array.from(
    { length: horizonMonths },
    (_, monthIndex) =>
      monthIndex >= operationStartMonth && monthIndex < operationEndMonth
        ? inputs.fixedCostPerMonth
        : 0
  );

  const baseMaintenanceSchedule = maintenanceScheduleForYears(
    inputs.maintenance.warrantyYears,
    inputs.maintenance.cmcYears,
    inputs.maintenance.cmcAnnualCost,
    inputs.maintenance.amcAnnualCost,
    inputs.usefulLifeYears
  );
  const annualMaintenance = baseMaintenanceSchedule.map((entry, yearIndex) => {
    const overridePct = inputs.maintenance.costByYearPct?.[yearIndex];
    const baseCost =
      overridePct === null || overridePct === undefined
        ? entry.annualCost
        : (overridePct / 100) * inputs.purchaseCost;
    return (
      baseCost *
      (1 + (inputs.maintenance.inflationRate ?? 0) / 100) ** yearIndex
    );
  });
  const monthlyMaintenanceCost = Array.from(
    { length: horizonMonths },
    (_, monthIndex) => {
      if (monthIndex < operationStartMonth || monthIndex >= operationEndMonth) {
        return 0;
      }
      const operatingMonth = monthIndex - operationStartMonth;
      return (annualMaintenance[Math.floor(operatingMonth / 12)] ?? 0) / 12;
    }
  );

  const replacementMonth =
    operationStartMonth + Math.max(0, Math.ceil(operatingMonths / 2) - 1);
  const monthlyMajorReplacementCost = Array.from(
    { length: horizonMonths },
    (_, monthIndex) =>
      monthIndex === replacementMonth
        ? (inputs.maintenance.majorReplacementCost ?? 0)
        : 0
  );
  const monthlyFinancingPayment = Array.from(
    { length: horizonMonths },
    (_, monthIndex) =>
      monthIndex >= paymentStartMonth && monthIndex < financingEndMonth
        ? monthlyPayment
        : 0
  );

  const terminalSalvageValue =
    inputs.purchaseCost * (inputs.salvageValuePercentage / 100);
  const terminalMonth = Math.max(0, operationEndMonth - 1);
  const monthlyNetCashFlowAfterFinancing = Array.from(
    { length: horizonMonths },
    (_, monthIndex) =>
      monthlyCashReceived[monthIndex] -
      monthlyVariableCost[monthIndex] -
      monthlyFixedCost[monthIndex] -
      monthlyMaintenanceCost[monthIndex] -
      monthlyMajorReplacementCost[monthIndex] -
      monthlyFinancingPayment[monthIndex] +
      (monthIndex === terminalMonth
        ? terminalSalvageValue + (inputs.workingCapitalBufferAmount ?? 0)
        : 0)
  );

  return {
    initialEquityOutlay,
    financedPrincipal,
    capitalizedInterest,
    processingCharges,
    terminalSalvageValue,
    operationStartMonth,
    operationEndMonth,
    monthlyBilledRevenue,
    monthlyRealizedRevenue: monthlyRealizedRevenue_,
    monthlyCashReceived,
    monthlyVariableCost,
    monthlyFixedCost,
    monthlyMaintenanceCost,
    monthlyMajorReplacementCost,
    monthlyFinancingPayment,
    monthlyNetCashFlowAfterFinancing,
  };
}
