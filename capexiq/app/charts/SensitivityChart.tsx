"use client";

import { useState } from "react";
import type { SensitivityPoint } from "@/formulas/sensitivity";
import { formatInr, formatInrCompact } from "../components/formatting";

interface ActivePoint {
  index: number;
  leftPercentage: number;
  topPercentage: number;
}

export function SensitivityChart({
  points,
  driverLabel,
}: {
  points: SensitivityPoint[];
  driverLabel: string;
}) {
  const [activePoint, setActivePoint] = useState<ActivePoint | null>(null);
  if (points.length === 0) return null;

  const width = 600;
  const height = 220;
  const inset = { top: 20, right: 18, bottom: 34, left: 18 };
  const npvValues = points.map((point) => point.assessment.result.npv);
  const rawMin = Math.min(...npvValues);
  const rawMax = Math.max(...npvValues);
  const span = rawMax - rawMin || Math.max(Math.abs(rawMax), 1);
  const min = rawMin - span * 0.08;
  const max = rawMax + span * 0.08;
  const plotWidth = width - inset.left - inset.right;
  const plotHeight = height - inset.top - inset.bottom;
  const coordinates = points.map((point, index) => ({
    x:
      inset.left +
      (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth),
    y: inset.top + ((max - point.assessment.result.npv) / (max - min)) * plotHeight,
  }));
  const path = coordinates
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
  const zeroY =
    min <= 0 && max >= 0
      ? inset.top + ((max - 0) / (max - min)) * plotHeight
      : null;
  const active = activePoint ? points[activePoint.index] : null;

  return (
    <div className="sensitivity-chart">
      <div className="sensitivity-chart__plot-wrap">
        <svg
          className="sensitivity-chart__plot"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Net present value as ${driverLabel.toLowerCase()} changes`}
        >
          {zeroY !== null && (
            <line
              className="sensitivity-chart__zero-line"
              x1={inset.left}
              x2={width - inset.right}
              y1={zeroY}
              y2={zeroY}
            />
          )}
          <path className="sensitivity-chart__line" d={path} />
          {points.map((point, index) => {
            const coordinate = coordinates[index];
            const showTick =
              index === 0 ||
              index === points.length - 1 ||
              point.changePercentage === 0;
            return (
              <g key={point.changePercentage}>
                <circle
                  className="sensitivity-chart__point"
                  data-current={point.changePercentage === 0}
                  cx={coordinate.x}
                  cy={coordinate.y}
                  r={point.changePercentage === 0 ? 6 : 5}
                  tabIndex={0}
                  role="img"
                  aria-label={`${point.changePercentage > 0 ? "+" : ""}${point.changePercentage}%: ${formatInr(point.assessment.result.npv)} NPV`}
                  onMouseEnter={() =>
                    setActivePoint({
                      index,
                      leftPercentage: (coordinate.x / width) * 100,
                      topPercentage: (coordinate.y / height) * 100,
                    })
                  }
                  onMouseLeave={() => setActivePoint(null)}
                  onFocus={() =>
                    setActivePoint({
                      index,
                      leftPercentage: (coordinate.x / width) * 100,
                      topPercentage: (coordinate.y / height) * 100,
                    })
                  }
                  onBlur={() => setActivePoint(null)}
                />
                {showTick && (
                  <text
                    className="sensitivity-chart__tick"
                    x={coordinate.x}
                    y={height - 10}
                    textAnchor={
                      index === 0
                        ? "start"
                        : index === points.length - 1
                          ? "end"
                          : "middle"
                    }
                  >
                    {point.changePercentage > 0 ? "+" : ""}
                    {point.changePercentage}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {active && activePoint && (
          <div
            className="chart-tooltip"
            data-visible="true"
            style={{
              left: `${activePoint.leftPercentage}%`,
              top: `${activePoint.topPercentage}%`,
            }}
          >
            <strong>{formatInr(active.assessment.result.npv)}</strong>
            <span>
              {active.changePercentage > 0 ? "+" : ""}
              {active.changePercentage}% · NPV
            </span>
          </div>
        )}
      </div>
      <div className="sensitivity-chart__range" aria-hidden="true">
        <span>{formatInrCompact(rawMin)}</span>
        <span>Net present value</span>
        <span>{formatInrCompact(rawMax)}</span>
      </div>
    </div>
  );
}
