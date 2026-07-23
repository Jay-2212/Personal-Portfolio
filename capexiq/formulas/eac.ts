// Equivalent Annual Cost — financial-model-spec.md §2.2

export function equivalentAnnualCost(
  initialInvestment: number,
  costsByYear: number[],
  discountRate: number,
  usefulLifeYears: number
): number {
  if (usefulLifeYears <= 0 || !Number.isFinite(usefulLifeYears)) return 0;
  const rate = discountRate / 100;
  const presentValueOfCosts = costsByYear.reduce(
    (total, cost, yearIndex) =>
      total + cost / (1 + rate) ** (yearIndex + 1),
    initialInvestment
  );
  const annuityFactor =
    rate === 0
      ? usefulLifeYears
      : (1 - (1 + rate) ** -usefulLifeYears) / rate;

  const value = presentValueOfCosts / annuityFactor;
  return Number.isFinite(value) ? value : 0;
}
