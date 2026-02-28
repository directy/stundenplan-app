import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { TimeSlot } from "../types";

interface TimeSlotState {
  timeSlots: TimeSlot[];
  loading: boolean;
  error: string | null;

  fetchTimeSlots: () => Promise<void>;
}

export const useTimeSlotStore = create<TimeSlotState>((set) => ({
  timeSlots: [],
  loading: false,
  error: null,

  fetchTimeSlots: async () => {
    set({ loading: true, error: null });
    try {
      const timeSlots = await invoke<TimeSlot[]>("get_time_slots");
      set({ timeSlots, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
}));
