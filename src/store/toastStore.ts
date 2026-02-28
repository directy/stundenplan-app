import { create } from "zustand";

export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastState {
  toasts: Toast[];
  addToast: (type: Toast["type"], message: string) => void;
  removeToast: (id: string) => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (type, message) => {
    const id = String(++nextId);
    const toast: Toast = { id, type, message };
    const current = get().toasts;
    const updated = current.length >= 3 ? [...current.slice(1), toast] : [...current, toast];
    set({ toasts: updated });

    const delay = type === "error" ? 6000 : 4000;
    setTimeout(() => {
      get().removeToast(id);
    }, delay);
  },

  removeToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));
