import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { AssessmentInputs } from "../../formulas/computeAssessment";
import { ScenarioComparison } from "../../app/components/ScenarioComparison";

vi.mock("lucide-react", () => ({
  Columns3: () => <span />,
  RotateCcw: () => <span />,
}));

const inputs: AssessmentInputs = {
  purchaseCost: 10_000_000,
  installationCost: 0,
  usagePerDay: 10,
  workingDaysPerMonth: 25,
  payerMix: [
    {
      payerName: "Self-pay",
      shareOfVolume: 100,
      billedTariff: 5_000,
      realizationPercentage: 100,
      collectionDelayDays: 0,
    },
  ],
  variableCostPerUse: 500,
  fixedCostPerMonth: 100_000,
  financing: { type: "cash" },
  maintenance: {
    warrantyYears: 1,
    cmcYears: 0,
    cmcAnnualCost: 0,
    amcAnnualCost: 100_000,
  },
  usefulLifeYears: 8,
  discountRate: 12.5,
  salvageValuePercentage: 0,
};

describe("ScenarioComparison", () => {
  it("shows the default lower, current, and higher cases from the canonical inputs", () => {
    render(<ScenarioComparison inputs={inputs} />);
    const rows = screen.getAllByRole("row");
    const usageRow = rows.find((row) =>
      within(row).queryByText("Usage / day")
    );

    expect(usageRow).toBeDefined();
    expect(within(usageRow!).getByText("8.0")).toBeInTheDocument();
    expect(within(usageRow!).getByText("10.0")).toBeInTheDocument();
    expect(within(usageRow!).getByText("12.0")).toBeInTheDocument();
  });

  it("updates only the edited case and resets to the documented presets", () => {
    render(<ScenarioComparison inputs={inputs} />);
    const lowerUsage = screen.getByLabelText("Lower demand daily usage change");

    fireEvent.change(lowerUsage, { target: { value: "-40" } });
    const usageRow = screen
      .getAllByRole("row")
      .find((row) => within(row).queryByText("Usage / day"))!;
    expect(within(usageRow).getByText("6.0")).toBeInTheDocument();
    expect(within(usageRow).getByText("12.0")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset cases" }));
    expect(within(usageRow).getByText("8.0")).toBeInTheDocument();
  });

  it("keeps percentage cases stable while a changed baseline recomputes their values", () => {
    const { rerender } = render(<ScenarioComparison inputs={inputs} />);
    fireEvent.change(
      screen.getByLabelText("Higher demand billed tariff change"),
      { target: { value: "10" } }
    );

    rerender(
      <ScenarioComparison inputs={{ ...inputs, usagePerDay: 20 }} />
    );

    expect(
      screen.getByLabelText("Higher demand billed tariff change")
    ).toHaveValue(10);
    expect(screen.getByText("24.0")).toBeInTheDocument();
    expect(screen.getByText("₹5,500")).toBeInTheDocument();
  });
});
