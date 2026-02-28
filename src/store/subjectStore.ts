import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Subject, NewSubject } from "../types";

interface SubjectState {
  subjects: Subject[];
  loading: boolean;
  error: string | null;

  fetchSubjects: () => Promise<void>;
  createSubject: (subject: NewSubject) => Promise<Subject>;
  updateSubject: (id: number, subject: NewSubject) => Promise<Subject>;
  deleteSubject: (id: number) => Promise<void>;
}

export const useSubjectStore = create<SubjectState>((set, get) => ({
  subjects: [],
  loading: false,
  error: null,

  fetchSubjects: async () => {
    set({ loading: true, error: null });
    try {
      const subjects = await invoke<Subject[]>("get_subjects");
      set({ subjects, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createSubject: async (subject: NewSubject) => {
    const created = await invoke<Subject>("create_subject", { subject });
    set({ subjects: [...get().subjects, created] });
    return created;
  },

  updateSubject: async (id: number, subject: NewSubject) => {
    const updated = await invoke<Subject>("update_subject", { id, subject });
    set({
      subjects: get().subjects.map((s) => (s.id === id ? updated : s)),
    });
    return updated;
  },

  deleteSubject: async (id: number) => {
    await invoke("delete_subject", { id });
    set({ subjects: get().subjects.filter((s) => s.id !== id) });
  },
}));
