// Shared display policy: Indian grouping, whole rupees, one decimal for percentages
// and measured counts, and explicit non-finite sentinels. Calculations retain full
// precision; rounding happens only at presentation boundaries.

export const DISPLAY_PRECISION = {
  currency: 0,
  percentage: 1,
  count: 1,
  compactCurrency: 1,
} as const;

const inrFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: DISPLAY_PRECISION.currency,
  maximumFractionDigits: 0,
});

export function formatInr(value: number): string {
  if (!Number.isFinite(value)) return value === Infinity ? "∞" : "Unavailable";
  const sign = value < 0 ? "−" : "";
  return `${sign}₹${inrFormatter.format(Math.abs(value))}`;
}

export function formatNumber(value: number, decimalPlaces = 0): string {
  if (!Number.isFinite(value)) return value === Infinity ? "∞" : "Unavailable";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}

export function formatPercent(
  value: number,
  decimalPlaces = DISPLAY_PRECISION.percentage
): string {
  return `${formatNumber(value, decimalPlaces)}%`;
}

export function formatYears(value: number): string {
  if (!Number.isFinite(value)) return "Never (within useful life)";
  return `${formatNumber(value, DISPLAY_PRECISION.count)} yr`;
}

const CRORE = 1e7;
const LAKH = 1e5;

/** Compact chart form; exact values remain available in chart detail/table views. */
export function formatInrCompact(value: number): string {
  if (!Number.isFinite(value)) return value === Infinity ? "∞" : "Unavailable";
  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);
  if (abs >= CRORE) {
    return `${sign}₹${formatNumber(abs / CRORE, DISPLAY_PRECISION.compactCurrency)} Cr`;
  }
  if (abs >= LAKH) {
    return `${sign}₹${formatNumber(abs / LAKH, DISPLAY_PRECISION.compactCurrency)} L`;
  }
  return formatInr(value);
}
