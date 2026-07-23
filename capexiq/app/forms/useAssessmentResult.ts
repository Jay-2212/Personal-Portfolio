"use client";

// The invalid/stale contract, wizard-state.md §4: fresh once every currently-relevant
// field is valid; otherwise the last successfully computed result stays rendered
// (reduced opacity, "based on your last valid entries") — it never blanks. The
// preview strip and the results page both call this single hook, never a second,
// independently-recalculated copy (CONVENTIONS.md §3).

import { useMemo, useRef } from "react";
import {
  computeAssessment,
  type AssessmentInputs,
  type AssessmentResult,
} from "@/formulas/computeAssessment";
import { toAssessmentInputs } from "./toAssessmentInputs";
import { isResultStateFresh } from "./wizardValidation";
import type { WizardState } from "./wizardTypes";

export interface AssessmentResultState {
  result: AssessmentResult | null;
  inputs: AssessmentInputs | null;
  resultState: "fresh" | "stale" | "empty";
}

export function useAssessmentResult(state: WizardState): AssessmentResultState {
  const lastValidSnapshot = useRef<{
    inputs: AssessmentInputs;
    result: AssessmentResult;
  } | null>(null);
  const fresh = isResultStateFresh(state);

  const freshSnapshot = useMemo(() => {
    if (!fresh) return null;
    const inputs = toAssessmentInputs(state);
    return { inputs, result: computeAssessment(inputs) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh, state]);

  if (freshSnapshot) {
    lastValidSnapshot.current = freshSnapshot;
    return { ...freshSnapshot, resultState: "fresh" };
  }

  if (lastValidSnapshot.current) {
    return { ...lastValidSnapshot.current, resultState: "stale" };
  }

  return { inputs: null, result: null, resultState: "empty" };
}
