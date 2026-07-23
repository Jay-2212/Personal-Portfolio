"use client";

// AMC/CMC cost by year — the one field whose length depends on another field's value
// (advanced.F.usefulLifeYears), so it uses the reducer's dedicated
// SET_MAINTENANCE_SCHEDULE_YEAR action rather than the generic dotted-path setter
// (wizard-state.md §5). This optional schedule overrides the standard warranty →
// CMC → AMC ladder for each populated operating year.

import { useWizard } from "../forms/WizardContext";
import { getFieldDefinition } from "../forms/fieldSchema";
import { validateFieldValue } from "../forms/wizardValidation";

export function MaintenanceScheduleFields() {
  const { state, dispatch } = useWizard();
  const years = state.advanced.E.maintenanceCostByYearPct;
  const definition = getFieldDefinition("advanced.E.maintenanceCostByYearPct");

  if (years.length === 0) {
    return (
      <p className="advanced-group__hint">
        Set Useful life (Group F) to enter a year-by-year maintenance schedule.
      </p>
    );
  }

  return (
    <div className="maintenance-schedule">
      <p className="field-shell__label">AMC / CMC cost by year (% of purchase cost)</p>
      <div className="maintenance-schedule__grid">
        {years.map((value, index) => {
          const path = `advanced.E.maintenanceCostByYearPct.${index}`;
          const revealed = state.touched[path] || state.attemptedSteps.costs;
          const error = revealed ? validateFieldValue(definition, value, state) : null;
          return (
            <label key={index} className="maintenance-schedule__year">
              <span>Yr {index + 1}</span>
              <input
                id={path}
                type="number"
                min={definition.min}
                max={definition.max}
                step={0.1}
                value={value ?? ""}
                aria-invalid={error !== null}
                onChange={(event) => {
                  const raw = event.target.value;
                  dispatch({
                    type: "SET_MAINTENANCE_SCHEDULE_YEAR",
                    yearIndex: index,
                    value: raw === "" ? null : Number(raw),
                  });
                }}
              />
              {error && <small role="alert" className="field-shell__error">{error}</small>}
            </label>
          );
        })}
      </div>
    </div>
  );
}
