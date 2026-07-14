// One test per named transition in app/forms/wizard-state.md, per CONVENTIONS.md §5's
// "every stateful UI flow gets one test per transition in its transition table" rule.

import { describe, expect, it } from "vitest";
import { wizardReducer } from "../../app/forms/wizardReducer";
import { emptyWizardState } from "../../app/forms/initialState";

describe("SELECT_EQUIPMENT_CATEGORY", () => {
  it("applies sourced defaults for the chosen category", () => {
    const state = wizardReducer(emptyWizardState(), {
      type: "SELECT_EQUIPMENT_CATEGORY",
      category: "MRI",
    });
    expect(state.preStep.equipmentCategory).toBe("MRI");
    expect(state.basic.warrantyYears).toBe(5);
    expect(state.advanced.F.usefulLifeYears).toBe(13);
  });

  it("auto-fills targetIrr as discountRate + 400bps, never left blank (audit F1 pattern)", () => {
    const state = wizardReducer(emptyWizardState(), {
      type: "SELECT_EQUIPMENT_CATEGORY",
      category: "MRI",
    });
    expect(state.advanced.F.discountRate).toBe(12.5);
    expect(state.advanced.F.targetIrr).toBe(16.5);
  });

  it("switching category re-applies a different equipment's defaults", () => {
    let state = wizardReducer(emptyWizardState(), {
      type: "SELECT_EQUIPMENT_CATEGORY",
      category: "MRI",
    });
    state = wizardReducer(state, { type: "SELECT_EQUIPMENT_CATEGORY", category: "CT" });
    expect(state.preStep.equipmentCategory).toBe("CT");
    expect(state.advanced.F.usefulLifeYears).toBe(13);
  });
});

describe("payer mix defaults (found during Phase 6 build — same class of bug as targetIrr's F1)", () => {
  it("defaults to 100% private cash even before any equipment is chosen, satisfying the group-sum constraint by default", () => {
    const state = emptyWizardState();
    expect(state.advanced.A.payerMixSharePct.privateCash).toBe(100);
    expect(state.advanced.A.payerMixSharePct.insuranceTpa).toBe(0);
  });
});

describe("SET_FIELD", () => {
  it("sets the value and marks the field touched", () => {
    const state = wizardReducer(emptyWizardState(), {
      type: "SET_FIELD",
      path: "basic.purchaseCost",
      value: 3.5,
    });
    expect(state.basic.purchaseCost).toBe(3.5);
    expect(state.touched["basic.purchaseCost"]).toBe(true);
  });
});

describe("maintenanceCostByYearPct array resize (wizard-state.md §5)", () => {
  it("extends the array with null slots when useful life increases, preserving existing entries", () => {
    let state = wizardReducer(emptyWizardState(), {
      type: "SET_FIELD",
      path: "advanced.F.usefulLifeYears",
      value: 3,
    });
    state = wizardReducer(state, {
      type: "SET_MAINTENANCE_SCHEDULE_YEAR",
      yearIndex: 0,
      value: 5,
    });
    state = wizardReducer(state, {
      type: "SET_FIELD",
      path: "advanced.F.usefulLifeYears",
      value: 5,
    });
    expect(state.advanced.E.maintenanceCostByYearPct).toEqual([5, null, null, null, null]);
  });

  it("truncates the array when useful life decreases, never discarding entries within the new length", () => {
    let state = wizardReducer(emptyWizardState(), {
      type: "SET_FIELD",
      path: "advanced.F.usefulLifeYears",
      value: 5,
    });
    state = wizardReducer(state, {
      type: "SET_MAINTENANCE_SCHEDULE_YEAR",
      yearIndex: 0,
      value: 5,
    });
    state = wizardReducer(state, {
      type: "SET_MAINTENANCE_SCHEDULE_YEAR",
      yearIndex: 1,
      value: 6,
    });
    state = wizardReducer(state, {
      type: "SET_FIELD",
      path: "advanced.F.usefulLifeYears",
      value: 2,
    });
    expect(state.advanced.E.maintenanceCostByYearPct).toEqual([5, 6]);
  });
});

describe("SET_MAINTENANCE_SCHEDULE_YEAR", () => {
  it("updates only the targeted year, leaving other years untouched", () => {
    let state = wizardReducer(emptyWizardState(), {
      type: "SET_FIELD",
      path: "advanced.F.usefulLifeYears",
      value: 3,
    });
    state = wizardReducer(state, {
      type: "SET_MAINTENANCE_SCHEDULE_YEAR",
      yearIndex: 1,
      value: 4.5,
    });
    expect(state.advanced.E.maintenanceCostByYearPct).toEqual([null, 4.5, null]);
  });
});

describe("TOGGLE_ADVANCED", () => {
  it("toggles advancedOpen without discarding already-entered Advanced values (Phase 4-F)", () => {
    let state = wizardReducer(emptyWizardState(), {
      type: "SET_FIELD",
      path: "advanced.F.discountRate",
      value: 15,
    });
    state = wizardReducer(state, { type: "TOGGLE_ADVANCED" });
    expect(state.advancedOpen).toBe(true);
    state = wizardReducer(state, { type: "TOGGLE_ADVANCED" });
    expect(state.advancedOpen).toBe(false);
    expect(state.advanced.F.discountRate).toBe(15);
  });
});

describe("idempotent step submission (wizard-state.md §9)", () => {
  it("a second BEGIN_TRANSITION while one is already in flight is a no-op", () => {
    let state = wizardReducer(emptyWizardState(), { type: "BEGIN_TRANSITION" });
    expect(state.transitionInFlight).toBe(true);
    const afterSecond = wizardReducer(state, { type: "BEGIN_TRANSITION" });
    expect(afterSecond).toBe(state); // same reference — proven no-op, not just equal value
  });

  it("GO_TO_STEP clears transitionInFlight even when navigating to the same step", () => {
    let state = wizardReducer(emptyWizardState(), { type: "BEGIN_TRANSITION" });
    state = wizardReducer(state, { type: "GO_TO_STEP", step: "preStep" });
    expect(state.transitionInFlight).toBe(false);
    expect(state.currentStep).toBe("preStep");
  });

  it("GO_TO_STEP advances currentStep and clears the in-flight flag", () => {
    let state = wizardReducer(emptyWizardState(), { type: "BEGIN_TRANSITION" });
    state = wizardReducer(state, { type: "GO_TO_STEP", step: "investment" });
    expect(state.currentStep).toBe("investment");
    expect(state.transitionInFlight).toBe(false);
  });
});

describe("ATTEMPT_STEP (wizard-state.md §2's Next-click reveal, ISS-25)", () => {
  it("marks the given step attempted without touching `touched` (must not clear the Typical pill)", () => {
    const state = wizardReducer(emptyWizardState(), {
      type: "ATTEMPT_STEP",
      step: "investment",
    });
    expect(state.attemptedSteps.investment).toBe(true);
    expect(state.attemptedSteps.usage).toBeUndefined();
    expect(state.touched).toEqual({});
  });

  it("is idempotent — a second ATTEMPT_STEP for an already-attempted step is a no-op", () => {
    const once = wizardReducer(emptyWizardState(), {
      type: "ATTEMPT_STEP",
      step: "investment",
    });
    const twice = wizardReducer(once, { type: "ATTEMPT_STEP", step: "investment" });
    expect(twice).toBe(once);
  });
});

describe("REQUEST_ADVANCED_FOCUS / CLEAR_ADVANCED_FOCUS (dead 'Continue' click fix)", () => {
  it("makes the Advanced panel visible via advancedPanelForcedOpen, WITHOUT flipping advancedOpen", () => {
    // advancedOpen also selects toAssessmentInputs.ts's Advanced-mode maintenance/
    // utilization formulas — forcing it true here would silently swap a Custom-
    // equipment user's Basic AMC/CMC rate for equipment-defaults() numbers that are
    // null for Custom, zeroing their maintenance cost. Panel visibility must be a
    // separate flag from formula precedence.
    const state = wizardReducer(emptyWizardState(), {
      type: "REQUEST_ADVANCED_FOCUS",
      path: "advanced.F.usefulLifeYears",
    });
    expect(state.advancedPanelForcedOpen).toBe(true);
    expect(state.advancedOpen).toBe(false);
    expect(state.pendingAdvancedFocusPath).toBe("advanced.F.usefulLifeYears");
  });

  it("clears the pending path once AdvancedPanel has focused it, without closing the panel", () => {
    const requested = wizardReducer(emptyWizardState(), {
      type: "REQUEST_ADVANCED_FOCUS",
      path: "advanced.F.usefulLifeYears",
    });
    const state = wizardReducer(requested, { type: "CLEAR_ADVANCED_FOCUS" });
    expect(state.pendingAdvancedFocusPath).toBeNull();
    expect(state.advancedPanelForcedOpen).toBe(true);
  });

  it("TOGGLE_ADVANCED (Close Advanced Mode) closes a force-opened panel entirely", () => {
    const forced = wizardReducer(emptyWizardState(), {
      type: "REQUEST_ADVANCED_FOCUS",
      path: "advanced.F.usefulLifeYears",
    });
    const state = wizardReducer(forced, { type: "TOGGLE_ADVANCED" });
    expect(state.advancedPanelForcedOpen).toBe(false);
    expect(state.advancedOpen).toBe(false);
  });
});

describe("RESTORE_DRAFT / ACKNOWLEDGE_RESTORED_DRAFT (wizard-state.md §6.5, §7.2)", () => {
  it("restores the given state and records the announcement timestamp", () => {
    const draftState = wizardReducer(emptyWizardState(), {
      type: "SET_FIELD",
      path: "basic.purchaseCost",
      value: 2,
    });
    const state = wizardReducer(emptyWizardState(), {
      type: "RESTORE_DRAFT",
      state: draftState,
      savedAt: "2026-07-13T00:00:00.000Z",
    });
    expect(state.basic.purchaseCost).toBe(2);
    expect(state.restoredDraftSavedAt).toBe("2026-07-13T00:00:00.000Z");
  });

  it("resets attemptedSteps on restore — ISS-25's reveal state is ephemeral session UI, not part of a saved draft", () => {
    const attemptedDraft = wizardReducer(emptyWizardState(), {
      type: "ATTEMPT_STEP",
      step: "investment",
    });
    const state = wizardReducer(emptyWizardState(), {
      type: "RESTORE_DRAFT",
      state: attemptedDraft,
      savedAt: "2026-07-13T00:00:00.000Z",
    });
    expect(state.attemptedSteps).toEqual({});
  });

  it("resets pendingAdvancedFocusPath on restore — same ephemeral-session-UI reasoning as attemptedSteps", () => {
    const requestedDraft = wizardReducer(emptyWizardState(), {
      type: "REQUEST_ADVANCED_FOCUS",
      path: "advanced.F.usefulLifeYears",
    });
    const state = wizardReducer(emptyWizardState(), {
      type: "RESTORE_DRAFT",
      state: requestedDraft,
      savedAt: "2026-07-13T00:00:00.000Z",
    });
    expect(state.pendingAdvancedFocusPath).toBeNull();
  });

  it("resets advancedPanelForcedOpen on restore — a restored draft shouldn't carry over a stale forced-open panel", () => {
    const requestedDraft = wizardReducer(emptyWizardState(), {
      type: "REQUEST_ADVANCED_FOCUS",
      path: "advanced.F.usefulLifeYears",
    });
    const state = wizardReducer(emptyWizardState(), {
      type: "RESTORE_DRAFT",
      state: requestedDraft,
      savedAt: "2026-07-13T00:00:00.000Z",
    });
    expect(state.advancedPanelForcedOpen).toBe(false);
  });

  it("acknowledging clears the restored-draft flag without touching other state", () => {
    let state = wizardReducer(emptyWizardState(), {
      type: "RESTORE_DRAFT",
      state: emptyWizardState(),
      savedAt: "2026-07-13T00:00:00.000Z",
    });
    state = wizardReducer(state, { type: "ACKNOWLEDGE_RESTORED_DRAFT" });
    expect(state.restoredDraftSavedAt).toBeNull();
  });
});

describe("START_OVER (wizard-state.md §7.2)", () => {
  it("resets to a genuinely empty state, discarding all entered values", () => {
    let state = wizardReducer(emptyWizardState(), {
      type: "SELECT_EQUIPMENT_CATEGORY",
      category: "MRI",
    });
    state = wizardReducer(state, {
      type: "SET_FIELD",
      path: "basic.purchaseCost",
      value: 5,
    });
    state = wizardReducer(state, { type: "START_OVER" });
    expect(state.preStep.equipmentCategory).toBeNull();
    expect(state.basic.purchaseCost).toBeNull();
    expect(state.currentStep).toBe("preStep");
  });
});
