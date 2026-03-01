import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { ClassSubject, NewClassSubject } from "../types";

interface ClassCurriculumState {
  classSubjects: ClassSubject[];
  loading: boolean;
  error: string | null;

  fetchAll: () => Promise<void>;
  upsert: (data: NewClassSubject) => Promise<void>;
  batchUpsert: (entries: NewClassSubject[]) => Promise<void>;
  remove: (classId: number, subjectId: number) => Promise<void>;
  getEffectiveHours: (classId: number, subjectId: number, defaultHours: number) => number;
}

export const useClassCurriculumStore = create<ClassCurriculumState>((set, get) => ({
  classSubjects: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const classSubjects = await invoke<ClassSubject[]>("get_all_class_subjects");
      set({ classSubjects, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  upsert: async (data: NewClassSubject) => {
    const result = await invoke<ClassSubject>("upsert_class_subject", { data });
    const current = get().classSubjects;
    const idx = current.findIndex(
      (cs) => cs.classId === data.classId && cs.subjectId === data.subjectId,
    );
    if (idx >= 0) {
      const updated = [...current];
      updated[idx] = result;
      set({ classSubjects: updated });
    } else {
      set({ classSubjects: [...current, result] });
    }
  },

  batchUpsert: async (entries: NewClassSubject[]) => {
    await invoke<ClassSubject[]>("batch_upsert_class_subjects", { entries });
    await get().fetchAll();
  },

  remove: async (classId: number, subjectId: number) => {
    await invoke("delete_class_subject", { classId, subjectId });
    set({
      classSubjects: get().classSubjects.filter(
        (cs) => !(cs.classId === classId && cs.subjectId === subjectId),
      ),
    });
  },

  getEffectiveHours: (classId: number, subjectId: number, defaultHours: number) => {
    const override = get().classSubjects.find(
      (cs) => cs.classId === classId && cs.subjectId === subjectId,
    );
    return override ? override.weeklyHours : defaultHours;
  },
}));
