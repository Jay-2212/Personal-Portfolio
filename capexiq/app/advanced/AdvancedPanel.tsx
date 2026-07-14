"use client";

import { useEffect, useId, useState } from "react";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { useWizard } from "../forms/WizardContext";
import { isStepComplete } from "../forms/wizardValidation";
import { GroupA } from "./GroupA";
import { GroupB } from "./GroupB";
import { GroupC } from "./GroupC";
import { GroupD } from "./GroupD";
import { GroupE } from "./GroupE";
import { GroupF } from "./GroupF";

const TOPICS = [
  { id: "A", label: "Payers & collection", note: "Realization, deductions and payment delays", component: GroupA },
  { id: "B", label: "Demand ramp-up", note: "A more realistic first year", component: GroupB },
  { id: "C", label: "Financing", note: "Loan or lease structure", component: GroupC },
  { id: "D", label: "Before opening", note: "Civil work, approvals and buffer", component: GroupD },
  { id: "E", label: "Lifecycle", note: "Maintenance and major replacements", component: GroupE },
  { id: "F", label: "Finance assumptions", note: "Discount rate, life and escalation", component: GroupF },
] as const;

export function AdvancedPanel() {
  const { state, dispatch } = useWizard();
  const [activeTopic, setActiveTopic] = useState<(typeof TOPICS)[number]["id"]>("A");
  const panelId = useId();
  const active = TOPICS.find((topic) => topic.id === activeTopic) ?? TOPICS[0];
  const ActiveGroup = active.component;
  // Visibility only — NOT the same as state.advancedOpen, which also selects
  // toAssessmentInputs.ts's Advanced-mode formula precedence. A field bounced open
  // by REQUEST_ADVANCED_FOCUS must be reachable without silently opting the user
  // into that precedence (see wizardTypes.ts's advancedPanelForcedOpen doc comment).
  const panelVisible = state.advancedOpen || state.advancedPanelForcedOpen;
  // The "still needs a value" copy is only accurate while that's still true — once
  // the bounced field (and everything else on Costs) is filled in, nothing clears
  // advancedPanelForcedOpen (the panel rightly stays open for further edits), so this
  // must re-check completeness rather than just the forced-open flag, or the message
  // goes stale and keeps claiming a gap that's already been fixed.
  const stillBlockedByForcedOpen =
    state.advancedPanelForcedOpen && !state.advancedOpen && !isStepComplete("costs", state);

  // StepNav's REQUEST_ADVANCED_FOCUS (the fix for the dead "Continue" click): the
  // owning group's tab has to be showing before the field exists in the DOM to focus.
  // First pass switches tabs if needed (re-running this effect once that commits);
  // second pass — tab already matches — focuses the now-mounted field and clears the
  // request. Runs on direct hits too (tab already correct) since AdvancedPanel opening
  // for the first time is part of the same commit as the tab already being correct.
  useEffect(() => {
    const path = state.pendingAdvancedFocusPath;
    if (!path) return;
    const letter = path.split(".")[1];
    const topic = TOPICS.find((candidate) => candidate.id === letter);
    if (topic && topic.id !== activeTopic) {
      setActiveTopic(topic.id);
      return;
    }
    const element = document.getElementById(path);
    element?.focus();
    element?.scrollIntoView({ block: "center" });
    dispatch({ type: "CLEAR_ADVANCED_FOCUS" });
  }, [state.pendingAdvancedFocusPath, activeTopic, dispatch]);

  return (
    <section className="advanced-panel">
      <div className="mode-choice">
        <div className="mode-choice__icon"><SlidersHorizontal aria-hidden="true" size={24} /></div>
        <div>
          <span className="narrative-intro__eyebrow">Want a more precise answer?</span>
          <h2>Refine the assessment in Advanced Mode.</h2>
          <p>
            {stillBlockedByForcedOpen
              ? "A required field below still needs a value before you can continue — it's open to the right topic already."
              : "Your Basic assessment is already complete. Advanced Mode lets you add payer mix, financing, launch timing and lifecycle detail—one topic at a time."}
          </p>
        </div>
        <button
          type="button"
          className="advanced-panel__toggle"
          aria-expanded={panelVisible}
          aria-controls={panelId}
          onClick={() => dispatch({ type: "TOGGLE_ADVANCED" })}
        >
          {panelVisible ? "Close Advanced Mode" : "Enter Advanced Mode"}
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>

      {panelVisible && (
        <div id={panelId} className="advanced-workspace">
          <nav className="advanced-workspace__topics" aria-label="Advanced topics">
            {TOPICS.map((topic, index) => (
              <button key={topic.id} type="button" data-active={topic.id === activeTopic} onClick={() => setActiveTopic(topic.id)}>
                <span className="advanced-workspace__number">{String(index + 1).padStart(2, "0")}</span>
                <span><strong>{topic.label}</strong><small>{topic.note}</small></span>
              </button>
            ))}
          </nav>
          <div className="advanced-workspace__content" key={active.id}>
            <div className="advanced-workspace__heading">
              <span className="narrative-intro__eyebrow">Advanced · {active.id}</span>
              <h2>{active.label}</h2>
              <p>{active.note}. Use your own figures where available; otherwise the Basic assumption stays in place.</p>
            </div>
            <ActiveGroup />
          </div>
        </div>
      )}
    </section>
  );
}
