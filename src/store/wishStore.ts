import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { TeacherWish, NewTeacherWish } from "../types";

interface WishState {
  wishes: TeacherWish[];
  loading: boolean;
  error: string | null;

  fetchWishes: (teacherId: number) => Promise<void>;
  createWish: (wish: NewTeacherWish) => Promise<TeacherWish>;
  updateWish: (id: number, wish: NewTeacherWish) => Promise<TeacherWish>;
  deleteWish: (id: number) => Promise<void>;
}

export const useWishStore = create<WishState>((set, get) => ({
  wishes: [],
  loading: false,
  error: null,

  fetchWishes: async (teacherId: number) => {
    set({ loading: true, error: null });
    try {
      const wishes = await invoke<TeacherWish[]>("get_teacher_wishes", {
        teacherId,
      });
      set({ wishes, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createWish: async (wish: NewTeacherWish) => {
    const created = await invoke<TeacherWish>("create_teacher_wish", {
      wish,
    });
    set({ wishes: [created, ...get().wishes] });
    return created;
  },

  updateWish: async (id: number, wish: NewTeacherWish) => {
    const updated = await invoke<TeacherWish>("update_teacher_wish", {
      id,
      wish,
    });
    set({
      wishes: get().wishes.map((w) => (w.id === id ? updated : w)),
    });
    return updated;
  },

  deleteWish: async (id: number) => {
    await invoke("delete_teacher_wish", { id });
    set({
      wishes: get().wishes.filter((w) => w.id !== id),
    });
  },
}));
