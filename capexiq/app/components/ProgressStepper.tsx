"use client";

import { useRouter } from "next/navigation";
import type { WizardStep } from "../forms/wizardTypes";

const STEPS: { step: WizardStep; label: string; href: string }[] = [
  { step: "investment", label: "Investment", href: "/assess/investment" },
  { step: "usage", label: "Usage & Revenue", href: "/assess/usage" },
  { step: "costs", label: "Operating Costs", href: "/assess/costs" },
];

export function ProgressStepper({ current }: { current: WizardStep }) {
  const router = useRouter();
  const currentIndex = STEPS.findIndex((s) => s.step === current);

  return (
    <ol className="progress-stepper" aria-label="Assessment steps">
      {STEPS.map((entry, index) => {
        const state =
          index === currentIndex
            ? "current"
            : index < currentIndex
              ? "complete"
              : "upcoming";
        // Only current/already-completed steps are clickable — jumping ahead to a
        // step not yet reached isn't a "go back and change something" action, and
        // RouteGuard would just bounce an unearned deep link back anyway.
        const clickable = index <= currentIndex && index !== currentIndex;
        return (
          <li key={entry.step} className="progress-stepper__item" data-state={state}>
            {clickable ? (
              <button
                type="button"
                className="progress-stepper__item-button"
                onClick={() => router.push(entry.href)}
              >
                <span className="progress-stepper__index" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="progress-stepper__label">{entry.label}</span>
              </button>
            ) : (
              <>
                <span className="progress-stepper__index" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="progress-stepper__label">{entry.label}</span>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
