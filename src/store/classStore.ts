import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { SchoolClass, NewSchoolClass } from "../types";

interface ClassState {
  classes: SchoolClass[];
  loading: boolean;
  error: string | null;

  fetchClasses: () => Promise<void>;
  createClass: (schoolClass: NewSchoolClass) => Promise<SchoolClass>;
  updateClass: (id: number, schoolClass: NewSchoolClass) => Promise<SchoolClass>;
  deleteClass: (id: number) => Promise<void>;
}

export const useClassStore = create<ClassState>((set, get) => ({
  classes: [],
  loading: false,
  error: null,

  fetchClasses: async () => {
    set({ loading: true, error: null });
    try {
      const classes = await invoke<SchoolClass[]>("get_classes");
      set({ classes, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createClass: async (schoolClass: NewSchoolClass) => {
    const created = await invoke<SchoolClass>("create_class", { class: schoolClass });
    set({ classes: [...get().classes, created] });
    return created;
  },

  updateClass: async (id: number, schoolClass: NewSchoolClass) => {
    const updated = await invoke<SchoolClass>("update_class", { id, class: schoolClass });
    set({
      classes: get().classes.map((c) => (c.id === id ? updated : c)),
    });
    return updated;
  },

  deleteClass: async (id: number) => {
    await invoke("delete_class", { id });
    set({ classes: get().classes.filter((c) => c.id !== id) });
  },
}));
