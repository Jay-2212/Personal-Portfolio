// Component-level coverage for interactive behaviors this session couldn't verify in
// a real browser (no working Chrome extension connection — see ISSUES.md ISS-21).
// Exercises actual DOM events (click, type) against real rendered components, not
// just the underlying reducer/validation functions.

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { WizardProvider, useWizard } from "../../app/forms/WizardContext";
import { NumberField } from "../../app/components/NumberField";
import { SliderField } from "../../app/components/SliderField";
import { StepNav } from "../../app/components/StepNav";
import { CurrencyUnitField } from "../../app/components/CurrencyUnitField";
import PreStepPage from "../../app/(assessment)/assess/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function SelectMri() {
  const { dispatch } = useWizard();
  return (
    <button onClick={() => dispatch({ type: "SELECT_EQUIPMENT_CATEGORY", category: "MRI" })}>
      select mri
    </button>
  );
}

describe("NumberField — the 'Typical' tag (ux-product-spec.md §6)", () => {
  it("shows the Typical tag for a sourced-default value until the user edits it, then hides it", () => {
    render(
      <WizardProvider>
        <SelectMri />
        <NumberField path="basic.warrantyYears" />
      </WizardProvider>
    );

    fireEvent.click(screen.getByText("select mri"));
    // MRI's warrantyYears default (5) is sourced -> shown as "Typical" until edited.
    expect(screen.getByText("Typical")).toBeInTheDocument();
    expect(screen.getByLabelText(/Warranty period/)).toHaveValue(5);

    fireEvent.change(screen.getByLabelText(/Warranty period/), { target: { value: "6" } });
    expect(screen.queryByText("Typical")).not.toBeInTheDocument();
  });
});

describe("SliderField — never shows a fake value for a genuinely unset required field", () => {
  it("displays the paired number input empty (not def.min) when MRI's billedTariffPerUse has no sourced default; the required-error stays suppressed until blur (this session's fix), then tracks the value", () => {
    render(
      <WizardProvider>
        <SelectMri />
        <SliderField path="basic.billedTariffPerUse" />
      </WizardProvider>
    );

    fireEvent.click(screen.getByText("select mri"));

    // Real value is null (no sourced default) — the exact-value number input must
    // show empty, not silently display def.min (500) as if it were a real answer.
    const exactValueInput = screen.getByLabelText(/exact value/i);
    expect(exactValueInput).toHaveValue(null);
    // ISS-25: the field is invalid underneath (required, empty) but nothing has
    // touched it yet on this fresh render — no red state before interaction.
    expect(screen.queryByText(/Enter a billed amount between/)).not.toBeInTheDocument();

    // Typing an out-of-range value marks the field touched, but the error stays
    // deferred until blur — showing it on every keystroke flashed red while the user
    // was still mid-edit (e.g. clearing a Typical default, or typing "4" -> "45" ->
    // "450" on the way to a valid "4500"). See useDeferredFieldError.
    fireEvent.change(exactValueInput, { target: { value: "0" } });
    expect(screen.queryByText(/Enter a billed amount between/)).not.toBeInTheDocument();
    fireEvent.blur(exactValueInput);
    expect(screen.getByText(/Enter a billed amount between/)).toBeInTheDocument();

    // Once blurred, further edits still track live — typing a real value clears the
    // error immediately without needing another blur.
    fireEvent.change(exactValueInput, { target: { value: "1500" } });
    expect(exactValueInput).toHaveValue(1500);
    expect(screen.queryByText(/Enter a billed amount between/)).not.toBeInTheDocument();
  });

  it("an ATTEMPT_STEP-blocked Continue still reveals the error immediately, without waiting for blur", () => {
    render(
      <WizardProvider>
        <SelectMri />
        <SliderField path="basic.billedTariffPerUse" />
        <StepNav step="usage" complete={false} backHref={null} nextHref="/assess/costs" />
      </WizardProvider>
    );

    fireEvent.click(screen.getByText("select mri"));
    expect(screen.queryByText(/Enter a billed amount between/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText(/Enter a billed amount between/)).toBeInTheDocument();
  });
});

describe("StepNav — blocked navigation summary and guided focus", () => {
  it("clicking Next shows a specific summary, and Take me there focuses the first invalid field", () => {
    render(
      <WizardProvider>
        <NumberField path="basic.purchaseCost" />
        <NumberField path="basic.installationCost" />
        <StepNav step="investment" complete={false} backHref={null} nextHref="/assess/usage" />
      </WizardProvider>
    );

    const nextButton = screen.getByRole("button", { name: "Next" });
    expect(nextButton).toHaveAttribute("data-blocked", "true");
    expect(nextButton).not.toBeDisabled();

    // ISS-25: on a fresh, untouched render, neither field shows red yet.
    expect(screen.queryByText(/Enter the equipment.s purchase cost/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Enter installation.civil cost/)).not.toBeInTheDocument();

    fireEvent.click(nextButton);

    const purchaseCostInput = screen.getByLabelText(/Purchase cost/);
    expect(screen.getByText(/Step 1: Purchase cost/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take me there" })).toBeInTheDocument();
    expect(purchaseCostInput).not.toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Take me there" }));
    expect(purchaseCostInput).toHaveFocus();
    // A blocked Next reveals every blocked field on the step at once, not just the
    // one focus lands on.
    expect(screen.getAllByText(/Enter the equipment.s purchase cost/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Enter installation.civil cost/)).toBeInTheDocument();
  });
});

function CurrencyValueProbe({ field }: { field: "purchaseCost" | "installationCost" }) {
  const { state } = useWizard();
  return <output data-testid={`${field}-canonical`}>{state.basic[field]}</output>;
}

describe("CurrencyUnitField — the typed number is the source of truth", () => {
  it.each([
    ["basic.purchaseCost", "purchaseCost", "Purchase cost"],
    ["basic.installationCost", "installationCost", "Installation / civil cost"],
  ] as const)("keeps the visible number unchanged across unit switches for %s", (path, field, label) => {
    render(
      <WizardProvider>
        <CurrencyUnitField path={path} field={field} />
        <CurrencyValueProbe field={field} />
      </WizardProvider>
    );

    const input = screen.getByRole("spinbutton", { name: label });
    fireEvent.click(screen.getByRole("button", { name: "Lakh" }));
    fireEvent.change(input, { target: { value: "2" } });
    expect(input).toHaveValue(2);
    expect(screen.getByTestId(`${field}-canonical`)).toHaveTextContent("0.02");

    fireEvent.click(screen.getByRole("button", { name: "Crore" }));
    expect(input).toHaveValue(2);
    expect(screen.getByTestId(`${field}-canonical`)).toHaveTextContent("2");

    fireEvent.click(screen.getByRole("button", { name: "Lakh" }));
    expect(input).toHaveValue(2);
    expect(screen.getByTestId(`${field}-canonical`)).toHaveTextContent("0.02");
  });
});

describe("PreStepPage — blocked \"Begin the assessment\" reveals its own required fields too (ISS-25 follow-up)", () => {
  it("has no red on a fresh load, and clicking the continue button while incomplete reveals missing required fields with focus on the first", () => {
    render(
      <WizardProvider>
        <PreStepPage />
      </WizardProvider>
    );

    fireEvent.click(screen.getByText("MRI"));

    // ISS-25: fresh, untouched render — no red yet, even though the fields are
    // genuinely empty/required underneath.
    expect(screen.queryByText(/Enter the hospital name to continue/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Select the city tier closest to your hospital/)
    ).not.toBeInTheDocument();

    const nextButton = screen.getByRole("button", { name: /Begin the assessment/ });
    expect(nextButton).toHaveAttribute("data-blocked", "true");
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);

    // hospitalName precedes hospitalBedSize in STEP_FIELD_PATHS's preStep order, so
    // it's the first invalid field to get focus.
    const hospitalNameInput = screen.getByLabelText(/Hospital name/);
    expect(hospitalNameInput).toHaveFocus();
    expect(screen.getByText(/Enter the hospital name to continue/)).toBeInTheDocument();
    expect(
      screen.getByText(/Select the city tier closest to your hospital/)
    ).toBeInTheDocument();
  });
});

describe("ISS-33 — switching equipment mid-draft requires a second confirming click", () => {
  it("the very first equipment pick applies immediately, with no confirmation needed", () => {
    render(
      <WizardProvider>
        <PreStepPage />
      </WizardProvider>
    );

    fireEvent.click(screen.getByText("MRI"));
    expect(screen.getByRole("radio", { name: /MRI/ })).toHaveAttribute("aria-checked", "true");
  });

  it("switching to a different equipment type after one is already selected requires a second click, and leaves the original selected until then", () => {
    render(
      <WizardProvider>
        <PreStepPage />
      </WizardProvider>
    );

    fireEvent.click(screen.getByText("MRI"));
    expect(screen.getByRole("radio", { name: /MRI/ })).toHaveAttribute("aria-checked", "true");

    // First click on a different tile only arms the confirmation — MRI stays selected.
    fireEvent.click(screen.getByText("Cath Lab"));
    expect(screen.getByText(/Click again to confirm/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /MRI/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Cath Lab/ })).toHaveAttribute("aria-checked", "false");

    // Second click actually switches.
    fireEvent.click(screen.getByText(/Click again to confirm/));
    expect(screen.getByRole("radio", { name: /Cath Lab/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /MRI/ })).toHaveAttribute("aria-checked", "false");
  });

  it("re-clicking the already-selected tile is a no-op, not an armed confirmation", () => {
    render(
      <WizardProvider>
        <PreStepPage />
      </WizardProvider>
    );

    fireEvent.click(screen.getByText("MRI"));
    fireEvent.click(screen.getByText("MRI"));
    expect(screen.queryByText(/Click again to confirm/)).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /MRI/ })).toHaveAttribute("aria-checked", "true");
  });
});

describe("ISS-25 — red validation state is gated by touch/attempt, not shown on a fresh load", () => {
  it("shows no error on an untouched required field, even though it's genuinely invalid underneath", () => {
    render(
      <WizardProvider>
        <NumberField path="basic.purchaseCost" />
      </WizardProvider>
    );

    expect(screen.queryByText(/Enter the equipment.s purchase cost/)).not.toBeInTheDocument();
  });

  it("a blocked Next does not clear the 'Typical' pill on a still-default, still-valid field on the same step", () => {
    render(
      <WizardProvider>
        <SelectMri />
        <NumberField path="basic.warrantyYears" />
        <NumberField path="basic.purchaseCost" />
        <StepNav step="investment" complete={false} backHref={null} nextHref="/assess/usage" />
      </WizardProvider>
    );

    fireEvent.click(screen.getByText("select mri"));
    expect(screen.getByText("Typical")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    // ATTEMPT_STEP reveals purchaseCost's error but must not have written to
    // `touched` — warrantyYears' Typical pill must survive.
    expect(screen.getByText("Typical")).toBeInTheDocument();
  });
});
