import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { TeacherAbsence, NewTeacherAbsence } from "../types";

interface AbsenceState {
  absences: TeacherAbsence[];
  loading: boolean;
  error: string | null;

  fetchAbsences: () => Promise<void>;
  createAbsence: (absence: NewTeacherAbsence) => Promise<TeacherAbsence>;
  updateAbsence: (
    id: number,
    absence: NewTeacherAbsence,
  ) => Promise<TeacherAbsence>;
  deleteAbsence: (id: number) => Promise<void>;
}

export const useAbsenceStore = create<AbsenceState>((set, get) => ({
  absences: [],
  loading: false,
  error: null,

  fetchAbsences: async () => {
    set({ loading: true, error: null });
    try {
      const absences = await invoke<TeacherAbsence[]>("get_absences");
      set({ absences, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createAbsence: async (absence: NewTeacherAbsence) => {
    const created = await invoke<TeacherAbsence>("create_absence", {
      absence,
    });
    set({ absences: [...get().absences, created] });
    return created;
  },

  updateAbsence: async (id: number, absence: NewTeacherAbsence) => {
    const updated = await invoke<TeacherAbsence>("update_absence", {
      id,
      absence,
    });
    set({
      absences: get().absences.map((a) => (a.id === id ? updated : a)),
    });
    return updated;
  },

  deleteAbsence: async (id: number) => {
    await invoke("delete_absence", { id });
    set({ absences: get().absences.filter((a) => a.id !== id) });
  },
}));
