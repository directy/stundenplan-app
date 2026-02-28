import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { TeacherPreference, NewTeacherPreference } from "../types";

interface PreferenceState {
  preferences: TeacherPreference[];
  loading: boolean;
  error: string | null;

  fetchPreferences: (teacherId: number) => Promise<void>;
  createPreference: (
    pref: NewTeacherPreference,
  ) => Promise<TeacherPreference>;
  deletePreference: (id: number) => Promise<void>;
}

export const usePreferenceStore = create<PreferenceState>((set, get) => ({
  preferences: [],
  loading: false,
  error: null,

  fetchPreferences: async (teacherId: number) => {
    set({ loading: true, error: null });
    try {
      const preferences = await invoke<TeacherPreference[]>(
        "get_teacher_preferences",
        { teacherId },
      );
      set({ preferences, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createPreference: async (pref: NewTeacherPreference) => {
    const created = await invoke<TeacherPreference>("create_preference", {
      preference: pref,
    });
    set({ preferences: [...get().preferences, created] });
    return created;
  },

  deletePreference: async (id: number) => {
    await invoke("delete_preference", { id });
    set({
      preferences: get().preferences.filter((p) => p.id !== id),
    });
  },
}));
