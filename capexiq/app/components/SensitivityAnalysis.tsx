"use client";

import { useMemo, useState } from "react";
import { Activity } from "lucide-react";
import {
  buildSensitivitySeries,
  runSensitivityPoint,
  type SensitivityDriver,
} from "@/formulas/sensitivity";
import type { AssessmentInputs } from "@/formulas/computeAssessment";
import { SensitivityChart } from "../charts/SensitivityChart";
import {
  formatInr,
  formatNumber,
  formatPercent,
  formatYears,
} from "./formatting";

const DRIVER_COPY: Record<
  SensitivityDriver,
  { label: string; valueLabel: string }
> = {
  usage: { label: "Daily usage", valueLabel: "uses / day" },
  tariff: { label: "Billed tariff", valueLabel: "weighted tariff" },
};

export function SensitivityAnalysis({ inputs }: { inputs: AssessmentInputs }) {
  const [driver, setDriver] = useState<SensitivityDriver>("usage");
  const [changePercentage, setChangePercentage] = useState(0);
  const series = useMemo(
    () => buildSensitivitySeries(inputs, driver),
    [driver, inputs]
  );
  const selected = useMemo(
    () => runSensitivityPoint(inputs, driver, changePercentage),
    [changePercentage, driver, inputs]
  );
  const current = series.find((point) => point.changePercentage === 0)!;
  const copy = DRIVER_COPY[driver];
  const formatDriverValue = (value: number) =>
    driver === "usage" ? formatNumber(value, 1) : formatInr(value);

  const selectDriver = (nextDriver: SensitivityDriver) => {
    setDriver(nextDriver);
    setChangePercentage(0);
  };

  return (
    <section className="sensitivity-analysis" aria-labelledby="sensitivity-title">
      <div className="results-detail__heading">
        <Activity aria-hidden="true" />
        <div>
          <span className="narrative-intro__eyebrow">Sensitivity analysis</span>
          <h2 id="sensitivity-title">Which single assumption moves the answer?</h2>
        </div>
      </div>
      <p className="sensitivity-analysis__intro">
        Move one driver at a time. All other payer, collection, financing, launch and
        lifecycle assumptions stay exactly as entered.
      </p>

      <div className="sensitivity-analysis__driver" aria-label="Sensitivity driver">
        {(Object.keys(DRIVER_COPY) as SensitivityDriver[]).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={driver === option}
            onClick={() => selectDriver(option)}
          >
            {DRIVER_COPY[option].label}
          </button>
        ))}
      </div>

      <div className="sensitivity-analysis__workspace">
        <div className="sensitivity-analysis__chart-card">
          <SensitivityChart points={series} driverLabel={copy.label} />
        </div>
        <div className="sensitivity-analysis__control-card">
          <label htmlFor="sensitivity-change">
            <span>{copy.label} change</span>
            <strong>
              {changePercentage > 0 ? "+" : ""}
              {changePercentage}%
            </strong>
          </label>
          <input
            id="sensitivity-change"
            aria-label={`${copy.label} change`}
            type="range"
            min="-40"
            max="40"
            step="1"
            value={changePercentage}
            onChange={(event) => setChangePercentage(Number(event.target.value))}
          />
          <div className="sensitivity-analysis__slider-labels" aria-hidden="true">
            <span>−40%</span>
            <span>Current</span>
            <span>+40%</span>
          </div>
          <dl>
            <div>
              <dt>{copy.valueLabel}</dt>
              <dd>
                {formatDriverValue(current.driverValue)} →{" "}
                {formatDriverValue(selected.driverValue)}
              </dd>
            </div>
            <div>
              <dt>NPV</dt>
              <dd>{formatInr(selected.assessment.result.npv)}</dd>
            </div>
            <div>
              <dt>IRR</dt>
              <dd>
                {selected.assessment.result.irr === null
                  ? "Undefined"
                  : formatPercent(selected.assessment.result.irr)}
              </dd>
            </div>
            <div>
              <dt>Payback</dt>
              <dd>
                {formatYears(
                  selected.assessment.result.paybackYearsFromCashFlows
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <details className="sensitivity-analysis__data">
        <summary>View sensitivity data</summary>
        <div>
          <table>
            <caption className="visually-hidden">
              {copy.label} sensitivity values and canonical assessment outputs
            </caption>
            <thead>
              <tr>
                <th scope="col">Change</th>
                <th scope="col">{copy.label}</th>
                <th scope="col">NPV</th>
                <th scope="col">IRR</th>
                <th scope="col">Payback</th>
              </tr>
            </thead>
            <tbody>
              {series.map((point) => (
                <tr key={point.changePercentage}>
                  <th scope="row">
                    {point.changePercentage > 0 ? "+" : ""}
                    {point.changePercentage}%
                  </th>
                  <td>{formatDriverValue(point.driverValue)}</td>
                  <td>{formatInr(point.assessment.result.npv)}</td>
                  <td>
                    {point.assessment.result.irr === null
                      ? "Undefined"
                      : formatPercent(point.assessment.result.irr)}
                  </td>
                  <td>
                    {formatYears(
                      point.assessment.result.paybackYearsFromCashFlows
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="sensitivity-analysis__footnote">
        This is a one-variable stress test, not a demand or pricing forecast.
      </p>
    </section>
  );
}
