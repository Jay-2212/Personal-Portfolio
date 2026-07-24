import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { AssessmentInputs } from "../../formulas/computeAssessment";
import { SensitivityAnalysis } from "../../app/components/SensitivityAnalysis";

vi.mock("lucide-react", () => ({
  Activity: () => <span />,
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

describe("SensitivityAnalysis", () => {
  it("starts with usage at the unchanged current point", () => {
    render(<SensitivityAnalysis inputs={inputs} />);

    expect(screen.getByRole("button", { name: "Daily usage" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByLabelText("Daily usage change")).toHaveValue("0");
    expect(screen.getByText("10.0 → 10.0")).toBeInTheDocument();
  });

  it("updates the selected canonical result as the slider moves", () => {
    render(<SensitivityAnalysis inputs={inputs} />);

    fireEvent.change(screen.getByLabelText("Daily usage change"), {
      target: { value: "-25" },
    });

    expect(screen.getByText("-25%")).toBeInTheDocument();
    expect(screen.getByText("10.0 → 7.5")).toBeInTheDocument();
  });

  it("switches drivers and resets the selected point to current", () => {
    render(<SensitivityAnalysis inputs={inputs} />);
    fireEvent.change(screen.getByLabelText("Daily usage change"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Billed tariff" }));

    expect(screen.getByRole("button", { name: "Billed tariff" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByLabelText("Billed tariff change")).toHaveValue("0");
    expect(screen.getByText("₹5,000 → ₹5,000")).toBeInTheDocument();
  });

  it("exposes the exact nine-point curve as a data table", () => {
    render(<SensitivityAnalysis inputs={inputs} />);
    fireEvent.click(screen.getByText("View sensitivity data"));

    expect(screen.getAllByRole("row")).toHaveLength(10);
    expect(screen.getByRole("columnheader", { name: "Daily usage" })).toBeInTheDocument();
  });
});
