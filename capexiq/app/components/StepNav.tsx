"use client";

// Next/Back buttons shared by the 3 Basic Mode step pages. An invalid Next remains a
// real, focusable action because activating it opens the validation summary; marking
// it aria-disabled would incorrectly tell assistive technology and browser automation
// that the action cannot be invoked. Idempotent submission (§9): BEGIN_TRANSITION is a no-op if a
// transition is already in flight, and the button that triggered it is inert for the
// remainder of that transition via transitionInFlight.

import { useRouter } from "next/navigation";
import { useWizard } from "../forms/WizardContext";
import { useEffect, useRef, useState } from "react";
import { validationIssuesThroughStep } from "../forms/wizardValidation";
import { STEP_PATH } from "../forms/stepRouting";
import { Button } from "./Button";
import type { WizardStep } from "../forms/wizardTypes";

export function StepNav({
  step,
  complete,
  backHref,
  nextHref,
  nextLabel = "Next",
}: {
  step: Exclude<WizardStep, "results">;
  complete: boolean;
  backHref: string | null;
  nextHref: string;
  nextLabel?: string;
}) {
  const { state, dispatch } = useWizard();
  const router = useRouter();
  const [showSummary, setShowSummary] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const issues = validationIssuesThroughStep(step, state);
  const firstIssue = issues[0] ?? null;
  const canProceed = complete && firstIssue === null;

  useEffect(() => {
    if (!firstIssue) setShowSummary(false);
  }, [firstIssue]);

  useEffect(() => {
    if (showSummary) summaryRef.current?.focus();
  }, [showSummary]);

  const goNext = () => {
    if (!canProceed) {
      for (const attemptedStep of new Set(issues.map((issue) => issue.step))) {
        dispatch({ type: "ATTEMPT_STEP", step: attemptedStep });
      }
      setShowSummary(true);
      return;
    }
    if (state.transitionInFlight) return;
    dispatch({ type: "BEGIN_TRANSITION" });
    router.push(nextHref);
  };

  const takeMeThere = () => {
    if (!firstIssue) return;
    dispatch({ type: "ATTEMPT_STEP", step: firstIssue.step });
    if (firstIssue.path.startsWith("advanced.")) {
      dispatch({ type: "REQUEST_ADVANCED_FOCUS", path: firstIssue.path });
      if (firstIssue.step !== step) router.push(STEP_PATH[firstIssue.step]);
      return;
    }
    if (firstIssue.step !== step) {
      dispatch({ type: "REQUEST_FIELD_FOCUS", path: firstIssue.path });
      router.push(STEP_PATH[firstIssue.step]);
      return;
    }
    const field = document.getElementById(firstIssue.path);
    field?.focus();
    field?.scrollIntoView({ block: "center" });
  };

  const stepName: Record<string, string> = {
    preStep: "Setup",
    investment: "Step 1",
    usage: "Step 2",
    costs: "Step 3",
  };

  return (
    <div className="step-nav-wrap">
      {showSummary && firstIssue && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="validation-summary">
          <div>
            <strong>{stepName[firstIssue.step]}: {firstIssue.fieldLabel}</strong>
            <p>{firstIssue.message}</p>
          </div>
          <Button variant="secondary" onClick={takeMeThere}>Take me there</Button>
        </div>
      )}
      <div className="step-nav">
        {backHref && (
          <Button variant="secondary" onClick={() => router.push(backHref)}>
            Back
          </Button>
        )}
        <Button
          variant="primary"
          data-blocked={!canProceed}
          disabled={state.transitionInFlight}
          onClick={goNext}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
