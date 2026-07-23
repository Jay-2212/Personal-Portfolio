"use client";

import { useState } from "react";
import { useWizard } from "../forms/WizardContext";
import { useFieldController, useDeferredFieldError } from "../forms/useFieldController";
import { FieldShell } from "./FieldShell";
import type { CurrencyUnit } from "../forms/wizardTypes";

const LAKH_PER_CRORE = 100;

export function CurrencyUnitField({
  path,
  field,
}: {
  path: "basic.purchaseCost" | "basic.installationCost";
  field: "purchaseCost" | "installationCost";
}) {
  const controller = useFieldController(path);
  const deferred = useDeferredFieldError(controller);
  const { state, dispatch, announce } = useWizard();
  const [unitChangeMessage, setUnitChangeMessage] = useState<string | null>(null);
  const fallback: CurrencyUnit = field === "purchaseCost" ? "Crore" : "Lakh";
  const unit = state.currencyUnits?.[field] ?? fallback;
  const canonicalCrore = typeof controller.value === "number" ? controller.value : null;
  const displayValue = canonicalCrore === null
    ? ""
    : unit === "Lakh"
      ? Number((canonicalCrore * LAKH_PER_CRORE).toFixed(2))
      : canonicalCrore;

  return (
    <FieldShell
      path={path}
      label={controller.label}
      required={controller.required}
      isTypical={controller.isTypical}
      error={deferred.error}
      tooltipKey={controller.tooltipKey}
      renderControl={({ id, describedBy }) => (
        <div className="currency-unit-field">
          <span className="currency-unit-field__symbol" aria-hidden="true">₹</span>
          <input
            id={id}
            type="number"
            className="field-shell__input currency-unit-field__input"
            value={displayValue}
            min={0}
            step={0.01}
            inputMode="decimal"
            aria-describedby={describedBy || undefined}
            aria-invalid={deferred.error !== null}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === "") return controller.setValue(null);
              const numeric = Number(raw);
              controller.setValue(unit === "Lakh" ? numeric / LAKH_PER_CRORE : numeric);
            }}
            onBlur={deferred.onBlur}
          />
          <div className="currency-unit-field__units" aria-label={`${controller.label} unit`}>
            {(["Lakh", "Crore"] as CurrencyUnit[]).map((option) => (
              <button
                key={option}
                type="button"
                data-selected={unit === option}
                aria-pressed={unit === option}
                onClick={() => {
                  if (option === unit) return;
                  const message =
                    `Unit switched to ${option}. The entered number now means ${option}, ` +
                    "and results were recalculated.";
                  dispatch({ type: "SET_CURRENCY_UNIT", field, unit: option });
                  setUnitChangeMessage(message);
                  announce(message);
                }}
              >
                {option}
              </button>
            ))}
          </div>
          {unitChangeMessage && (
            <small className="currency-unit-field__notice" role="status">
              {unitChangeMessage}
            </small>
          )}
        </div>
      )}
    />
  );
}
