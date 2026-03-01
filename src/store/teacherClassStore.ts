import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { TeacherClassRestriction, NewTeacherClassRestriction } from "../types";

interface TeacherClassState {
  restrictions: TeacherClassRestriction[];
  loading: boolean;
  error: string | null;

  fetchForTeacher: (teacherId: number) => Promise<void>;
  create: (data: NewTeacherClassRestriction) => Promise<void>;
  update: (id: number, restrictionType: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useTeacherClassStore = create<TeacherClassState>((set, get) => ({
  restrictions: [],
  loading: false,
  error: null,

  fetchForTeacher: async (teacherId: number) => {
    set({ loading: true, error: null });
    try {
      const restrictions = await invoke<TeacherClassRestriction[]>(
        "get_teacher_class_restrictions",
        { teacherId },
      );
      set({ restrictions, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  create: async (data: NewTeacherClassRestriction) => {
    const created = await invoke<TeacherClassRestriction>(
      "create_teacher_class_restriction",
      { data },
    );
    // Replace if same teacher+class exists, otherwise add
    const current = get().restrictions;
    const idx = current.findIndex(
      (r) => r.teacherId === data.teacherId && r.classId === data.classId,
    );
    if (idx >= 0) {
      const updated = [...current];
      updated[idx] = created;
      set({ restrictions: updated });
    } else {
      set({ restrictions: [...current, created] });
    }
  },

  update: async (id: number, restrictionType: string) => {
    const updated = await invoke<TeacherClassRestriction>(
      "update_teacher_class_restriction",
      { id, restrictionType },
    );
    set({
      restrictions: get().restrictions.map((r) =>
        r.id === id ? updated : r,
      ),
    });
  },

  remove: async (id: number) => {
    await invoke("delete_teacher_class_restriction", { id });
    set({
      restrictions: get().restrictions.filter((r) => r.id !== id),
    });
  },
}));
