import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Teacher, NewTeacher, Subject } from "../types";

interface TeacherState {
  teachers: Teacher[];
  loading: boolean;
  error: string | null;

  fetchTeachers: () => Promise<void>;
  createTeacher: (teacher: NewTeacher) => Promise<Teacher>;
  updateTeacher: (id: number, teacher: NewTeacher) => Promise<Teacher>;
  deleteTeacher: (id: number) => Promise<void>;
  getTeacherSubjects: (teacherId: number) => Promise<Subject[]>;
  addTeacherSubject: (teacherId: number, subjectId: number) => Promise<void>;
  removeTeacherSubject: (teacherId: number, subjectId: number) => Promise<void>;
}

export const useTeacherStore = create<TeacherState>((set, get) => ({
  teachers: [],
  loading: false,
  error: null,

  fetchTeachers: async () => {
    set({ loading: true, error: null });
    try {
      const teachers = await invoke<Teacher[]>("get_teachers");
      set({ teachers, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createTeacher: async (teacher: NewTeacher) => {
    const created = await invoke<Teacher>("create_teacher", { teacher });
    set({ teachers: [...get().teachers, created] });
    return created;
  },

  updateTeacher: async (id: number, teacher: NewTeacher) => {
    const updated = await invoke<Teacher>("update_teacher", { id, teacher });
    set({
      teachers: get().teachers.map((t) => (t.id === id ? updated : t)),
    });
    return updated;
  },

  deleteTeacher: async (id: number) => {
    await invoke("delete_teacher", { id });
    set({ teachers: get().teachers.filter((t) => t.id !== id) });
  },

  getTeacherSubjects: async (teacherId: number) => {
    return await invoke<Subject[]>("get_teacher_subjects", { teacherId });
  },

  addTeacherSubject: async (teacherId: number, subjectId: number) => {
    await invoke("add_teacher_subject", { teacherId, subjectId });
  },

  removeTeacherSubject: async (teacherId: number, subjectId: number) => {
    await invoke("remove_teacher_subject", { teacherId, subjectId });
  },
}));
