import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { ConstraintRule, NewConstraintRule, ConstraintOrderUpdate } from "../types";
import { useToastStore } from "./toastStore";

interface RulesState {
  rules: ConstraintRule[];
  loading: boolean;
  error: string | null;

  fetchRules: () => Promise<void>;
  createRule: (rule: NewConstraintRule) => Promise<ConstraintRule>;
  updateRule: (id: number, rule: NewConstraintRule) => Promise<ConstraintRule>;
  deleteRule: (id: number) => Promise<void>;
  updateOrder: (updates: ConstraintOrderUpdate[]) => Promise<void>;
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
    useToastStore.getState().addToast("success", "Regel aktualisiert");
    return updated;
  },

  deleteRule: async (id: number) => {
    await invoke("delete_constraint_rule", { id });
    set({ rules: get().rules.filter((r) => r.id !== id) });
    useToastStore.getState().addToast("success", "Regel geloescht");
  },

  updateOrder: async (updates: ConstraintOrderUpdate[]) => {
    await invoke("update_constraint_order", { updates });
    // Optimistisch die lokale Reihenfolge aktualisieren
    const rules = get().rules.map((r) => {
      const update = updates.find((u) => u.id === r.id);
      return update ? { ...r, sortOrder: update.sortOrder } : r;
    });
    rules.sort((a, b) => a.sortOrder - b.sortOrder);
    set({ rules });
  },
}));
