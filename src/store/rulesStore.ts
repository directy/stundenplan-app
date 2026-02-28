import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { ConstraintRule, NewConstraintRule } from "../types";

interface RulesState {
  rules: ConstraintRule[];
  loading: boolean;
  error: string | null;

  fetchRules: () => Promise<void>;
  createRule: (rule: NewConstraintRule) => Promise<ConstraintRule>;
  updateRule: (id: number, rule: NewConstraintRule) => Promise<ConstraintRule>;
}

export const useRulesStore = create<RulesState>((set, get) => ({
  rules: [],
  loading: false,
  error: null,

  fetchRules: async () => {
    set({ loading: true, error: null });
    try {
      const rules = await invoke<ConstraintRule[]>("get_constraint_rules");
      set({ rules, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createRule: async (rule: NewConstraintRule) => {
    const created = await invoke<ConstraintRule>("create_constraint_rule", {
      rule,
    });
    set({ rules: [...get().rules, created] });
    return created;
  },

  updateRule: async (id: number, rule: NewConstraintRule) => {
    const updated = await invoke<ConstraintRule>("update_constraint_rule", {
      id,
      rule,
    });
    set({
      rules: get().rules.map((r) => (r.id === id ? updated : r)),
    });
    return updated;
  },
}));
