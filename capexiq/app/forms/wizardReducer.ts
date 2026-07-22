// The single useReducer for all wizard state (wizard-state.md §3, §6) — every
// transition named in that doc is one action here, not scattered component-local
// state. See tests/wizard/wizardReducer.test.ts for one test per named transition.

import { setFieldValue } from "./fieldPath";
import { applyEquipmentDefaults, emptyWizardState } from "./initialState";
import type {
  EquipmentCategory,
  CurrencyUnit,
  FieldValue,
  WizardState,
  WizardStep,
} from "./wizardTypes";

export type WizardAction =
  | { type: "SET_FIELD"; path: string; value: FieldValue }
  | { type: "SELECT_EQUIPMENT_CATEGORY"; category: EquipmentCategory }
  | { type: "TOGGLE_ADVANCED" }
  | { type: "SET_CURRENCY_UNIT"; field: "purchaseCost" | "installationCost"; unit: CurrencyUnit }
  | { type: "BEGIN_TRANSITION" }
  | { type: "GO_TO_STEP"; step: WizardStep }
  | { type: "RESTORE_DRAFT"; state: WizardState; savedAt: string }
  | { type: "ACKNOWLEDGE_RESTORED_DRAFT" }
  | { type: "MARK_HYDRATED" }
  | { type: "START_OVER" }
  | { type: "SET_MAINTENANCE_SCHEDULE_YEAR"; yearIndex: number; value: number | null }
  | { type: "ATTEMPT_STEP"; step: Exclude<WizardStep, "results"> }
  | { type: "REQUEST_ADVANCED_FOCUS"; path: string }
  | { type: "CLEAR_ADVANCED_FOCUS" }
  | { type: "REQUEST_FIELD_FOCUS"; path: string }
  | { type: "CLEAR_FIELD_FOCUS" };

function resizeMaintenanceArray(
  state: WizardState,
  newLength: number
): WizardState {
  const existing = state.advanced.E.maintenanceCostByYearPct;
  const resized = Array.from(
    { length: Math.max(0, newLength) },
    (_, index) => existing[index] ?? null
  );
  return {
    ...state,
    advanced: {
      ...state.advanced,
      E: { ...state.advanced.E, maintenanceCostByYearPct: resized },
    },
  };
}

export function wizardReducer(
  state: WizardState,
  action: WizardAction
): WizardState {
  switch (action.type) {
    case "SET_FIELD": {
      const next = setFieldValue(state, action.path, action.value);
      const touched = { ...state.touched, [action.path]: true };
      const withTouched = { ...next, touched };
      if (action.path === "advanced.F.usefulLifeYears") {
        return resizeMaintenanceArray(
          withTouched,
          typeof action.value === "number" ? action.value : 0
        );
      }
      return withTouched;
    }

    case "SELECT_EQUIPMENT_CATEGORY": {
      return applyEquipmentDefaults(state, action.category);
    }

    case "TOGGLE_ADVANCED": {
      // The button toggles combined visibility (advancedOpen OR the force-open flag
      // REQUEST_ADVANCED_FOCUS sets) — closing from either state clears both, since
      // "Close Advanced Mode" should mean closed regardless of how it got opened.
      // Opening for real is always a genuine advancedOpen:true opt-in.
      const visible = state.advancedOpen || state.advancedPanelForcedOpen;
      return visible
        ? { ...state, advancedOpen: false, advancedPanelForcedOpen: false }
        : { ...state, advancedOpen: true };
    }

    case "SET_CURRENCY_UNIT": {
      const currentUnits = state.currencyUnits ?? {
        purchaseCost: "Crore" as CurrencyUnit,
        installationCost: "Lakh" as CurrencyUnit,
      };
      const previousUnit = currentUnits[action.field];
      if (previousUnit === action.unit) return state;
      const path = `basic.${action.field}`;
      const currentValue = state.basic[action.field];
      // basic.* costs are canonical Crore values. Re-scale that canonical value when
      // the display unit changes so the visible number remains the user's source of
      // truth (2 Lakh -> switch -> 2 Crore, never 0.02 or 200 in the input).
      const nextValue =
        currentValue === null
          ? null
          : previousUnit === "Lakh" && action.unit === "Crore"
            ? currentValue * 100
            : currentValue / 100;
      return {
        ...state,
        basic: { ...state.basic, [action.field]: nextValue },
        currencyUnits: {
          ...currentUnits,
          [action.field]: action.unit,
        },
        touched: currentValue === null ? state.touched : { ...state.touched, [path]: true },
      };
    }

    case "BEGIN_TRANSITION": {
      // Idempotent step submission (wizard-state.md §9): a second BEGIN_TRANSITION
      // while one is already in flight is a no-op.
      if (state.transitionInFlight) return state;
      return { ...state, transitionInFlight: true };
    }

    case "GO_TO_STEP": {
      if (state.currentStep === action.step) {
        return { ...state, transitionInFlight: false };
      }
      return { ...state, currentStep: action.step, transitionInFlight: false };
    }

    case "RESTORE_DRAFT": {
      // Force true regardless of what the persisted draft itself contains — a
      // restored draft is by definition post-hydration, and older drafts saved
      // before this field existed would otherwise carry `undefined` in here.
      // attemptedSteps is forced back to `{}` for the same reason ISS-25's reveal
      // state is ephemeral session UI, not something a restored draft should carry
      // forward (and older drafts predate the field entirely).
      return {
        ...action.state,
        preStep: {
          ...action.state.preStep,
          hospitalName: action.state.preStep.hospitalName ?? "",
        },
        currencyUnits: action.state.currencyUnits ?? {
          purchaseCost: "Crore",
          installationCost: "Lakh",
        },
        attemptedSteps: {},
        pendingAdvancedFocusPath: null,
        pendingFieldFocusPath: null,
        advancedPanelForcedOpen: false,
        restoredDraftSavedAt: action.savedAt,
        hasHydrated: true,
      };
    }

    case "ACKNOWLEDGE_RESTORED_DRAFT": {
      return { ...state, restoredDraftSavedAt: null };
    }

    case "MARK_HYDRATED": {
      return { ...state, hasHydrated: true };
    }

    case "START_OVER": {
      // Client-side reset, not a reload — there's no localStorage draft left to wait
      // on (clearDraft() already ran), so RouteGuard must not block on hydration again.
      return { ...emptyWizardState(), hasHydrated: true };
    }

    case "REQUEST_ADVANCED_FOCUS": {
      // advancedPanelForcedOpen, not advancedOpen — this only needs to make the field
      // reachable in the DOM, not opt the user into Advanced Mode's own precedence
      // rules (toAssessmentInputs.ts's maintenance-rate/mature-utilization branches
      // key off advancedOpen specifically; flipping it here would silently swap a
      // Custom-equipment user's Basic AMC/CMC rate for equipment-defaults() numbers
      // that don't exist for Custom, zeroing their maintenance cost).
      return { ...state, advancedPanelForcedOpen: true, pendingAdvancedFocusPath: action.path };
    }

    case "CLEAR_ADVANCED_FOCUS": {
      if (state.pendingAdvancedFocusPath === null) return state;
      return { ...state, pendingAdvancedFocusPath: null };
    }

    case "REQUEST_FIELD_FOCUS": {
      return { ...state, pendingFieldFocusPath: action.path };
    }

    case "CLEAR_FIELD_FOCUS": {
      if (state.pendingFieldFocusPath === null) return state;
      return { ...state, pendingFieldFocusPath: null };
    }

    case "ATTEMPT_STEP": {
      // ISS-25: reveals every blocked field's error on this step at once (the
      // disabled-"Next" discoverability behavior, wizard-state.md §2/audit F7) without
      // touching `touched` — that would incorrectly clear the "Typical" pill (§6) on
      // every still-default, still-valid field on the step.
      if (state.attemptedSteps[action.step]) return state;
      return {
        ...state,
        attemptedSteps: { ...state.attemptedSteps, [action.step]: true },
      };
    }

    case "SET_MAINTENANCE_SCHEDULE_YEAR": {
      // maintenanceCostByYearPct is an array (length = usefulLifeYears, §5's
      // truncate/extend rule) — it can't go through SET_FIELD's generic dotted-path
      // setter (fieldPath.ts's object-spread setter would destructure the array into
      // a plain object), so it gets its own action.
      const updated = [...state.advanced.E.maintenanceCostByYearPct];
      updated[action.yearIndex] = action.value;
      const path = `advanced.E.maintenanceCostByYearPct.${action.yearIndex}`;
      return {
        ...state,
        touched: { ...state.touched, [path]: true },
        advanced: {
          ...state.advanced,
          E: { ...state.advanced.E, maintenanceCostByYearPct: updated },
        },
      };
    }

    default:
      return state;
  }
}
