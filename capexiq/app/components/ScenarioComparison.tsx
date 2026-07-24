"use client";

import { useMemo, useState } from "react";
import { Columns3, RotateCcw } from "lucide-react";
import {
  runAssessmentScenario,
  type AssessmentScenarioAdjustments,
} from "@/formulas/assessmentScenario";
import type { AssessmentInputs } from "@/formulas/computeAssessment";
import {
  formatInr,
  formatNumber,
  formatPercent,
  formatYears,
} from "./formatting";

interface EditableScenario {
  id: "lower" | "current" | "higher";
  label: string;
  note: string;
  adjustments: AssessmentScenarioAdjustments;
  editable: boolean;
}

const DEFAULT_SCENARIOS: EditableScenario[] = [
  {
    id: "lower",
    label: "Lower demand",
    note: "Starts 20% below entered daily usage.",
    adjustments: { usageChangePercentage: -20, tariffChangePercentage: 0 },
    editable: true,
  },
  {
    id: "current",
    label: "Current case",
    note: "The assessment exactly as entered.",
    adjustments: { usageChangePercentage: 0, tariffChangePercentage: 0 },
    editable: false,
  },
  {
    id: "higher",
    label: "Higher demand",
    note: "Starts 20% above entered daily usage.",
    adjustments: { usageChangePercentage: 20, tariffChangePercentage: 0 },
    editable: true,
  },
];

export function ScenarioComparison({ inputs }: { inputs: AssessmentInputs }) {
  const [scenarios, setScenarios] =
    useState<EditableScenario[]>(DEFAULT_SCENARIOS);
  const evaluated = useMemo(
    () =>
      scenarios.map((scenario) => ({
        ...scenario,
        assessment: runAssessmentScenario(inputs, scenario.adjustments),
      })),
    [inputs, scenarios]
  );

  const updateScenario = (
    id: EditableScenario["id"],
    field: keyof AssessmentScenarioAdjustments,
    value: number
  ) => {
    setScenarios((current) =>
      current.map((scenario) =>
        scenario.id === id
          ? {
              ...scenario,
              adjustments: { ...scenario.adjustments, [field]: value },
            }
          : scenario
      )
    );
  };

  return (
    <section className="scenario-comparison" aria-labelledby="scenario-comparison-title">
      <div className="scenario-comparison__heading">
        <div className="results-detail__heading">
          <Columns3 aria-hidden="true" />
          <div>
            <span className="narrative-intro__eyebrow">Scenario comparison</span>
            <h2 id="scenario-comparison-title">Test a lower and higher case</h2>
          </div>
        </div>
        <button
          type="button"
          className="scenario-comparison__reset"
          onClick={() => setScenarios(DEFAULT_SCENARIOS)}
        >
          <RotateCcw aria-hidden="true" size={14} />
          Reset cases
        </button>
      </div>
      <p className="scenario-comparison__intro">
        Change demand or billed tariff relative to the current assessment. Every case
        keeps the same payer mix, collection timing, financing, launch and lifecycle
        assumptions.
      </p>

      <div className="scenario-comparison__controls">
        {evaluated.map((scenario) => (
          <article key={scenario.id} data-current={scenario.id === "current"}>
            <div>
              <h3>{scenario.label}</h3>
              <p>{scenario.note}</p>
            </div>
            {scenario.editable ? (
              <div className="scenario-comparison__inputs">
                <label>
                  <span>Daily usage change</span>
                  <span className="scenario-comparison__input-wrap">
                    <input
                      aria-label={`${scenario.label} daily usage change`}
                      type="number"
                      min="-100"
                      max="200"
                      step="1"
                      value={scenario.adjustments.usageChangePercentage}
                      onChange={(event) =>
                        updateScenario(
                          scenario.id,
                          "usageChangePercentage",
                          Math.min(200, Math.max(-100, Number(event.target.value)))
                        )
                      }
                    />
                    <span>%</span>
                  </span>
                </label>
                <label>
                  <span>Billed tariff change</span>
                  <span className="scenario-comparison__input-wrap">
                    <input
                      aria-label={`${scenario.label} billed tariff change`}
                      type="number"
                      min="-100"
                      max="200"
                      step="1"
                      value={scenario.adjustments.tariffChangePercentage}
                      onChange={(event) =>
                        updateScenario(
                          scenario.id,
                          "tariffChangePercentage",
                          Math.min(200, Math.max(-100, Number(event.target.value)))
                        )
                      }
                    />
                    <span>%</span>
                  </span>
                </label>
              </div>
            ) : (
              <p className="scenario-comparison__locked">Reference case</p>
            )}
          </article>
        ))}
      </div>

      <div className="scenario-comparison__table-wrap">
        <table>
          <caption className="visually-hidden">
            Financial results for lower demand, current, and higher demand scenarios
          </caption>
          <thead>
            <tr>
              <th scope="col">Measure</th>
              {evaluated.map((scenario) => (
                <th scope="col" key={scenario.id}>
                  {scenario.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Usage / day</th>
              {evaluated.map((scenario) => (
                <td key={scenario.id}>
                  {formatNumber(scenario.assessment.inputs.usagePerDay, 1)}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Weighted billed tariff</th>
              {evaluated.map((scenario) => (
                <td key={scenario.id}>
                  {formatInr(scenario.assessment.weightedBilledTariffPerUse)}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">NPV</th>
              {evaluated.map((scenario) => (
                <td key={scenario.id}>{formatInr(scenario.assessment.result.npv)}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">IRR</th>
              {evaluated.map((scenario) => (
                <td key={scenario.id}>
                  {scenario.assessment.result.irr === null
                    ? "Undefined"
                    : formatPercent(scenario.assessment.result.irr)}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Payback</th>
              {evaluated.map((scenario) => (
                <td key={scenario.id}>
                  {formatYears(
                    scenario.assessment.result.paybackYearsFromCashFlows
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Outlook</th>
              {evaluated.map((scenario) => (
                <td key={scenario.id}>
                  {scenario.assessment.result.investmentOutlook.band} ·{" "}
                  {scenario.assessment.result.investmentOutlook.score}/100
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="scenario-comparison__footnote">
        These are assumption cases, not forecasts or probabilities.
      </p>
    </section>
  );
}
