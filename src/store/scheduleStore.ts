import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type {
  Schedule,
  NewSchedule,
  ScheduleEntry,
  NewScheduleEntry,
} from "../types";

interface ScheduleState {
  schedules: Schedule[];
  currentEntries: ScheduleEntry[];
  loading: boolean;
  error: string | null;

  fetchSchedules: () => Promise<void>;
  createSchedule: (schedule: NewSchedule) => Promise<Schedule>;
  updateSchedule: (id: number, schedule: NewSchedule) => Promise<Schedule>;
  deleteSchedule: (id: number) => Promise<void>;
  fetchScheduleEntries: (scheduleId: number) => Promise<void>;
  createScheduleEntry: (entry: NewScheduleEntry) => Promise<ScheduleEntry>;
  updateScheduleEntry: (
    id: number,
    entry: NewScheduleEntry,
  ) => Promise<ScheduleEntry>;
  deleteScheduleEntry: (id: number) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [],
  currentEntries: [],
  loading: false,
  error: null,

  fetchSchedules: async () => {
    set({ loading: true, error: null });
    try {
      const schedules = await invoke<Schedule[]>("get_schedules");
      set({ schedules, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createSchedule: async (schedule: NewSchedule) => {
    const created = await invoke<Schedule>("create_schedule", { schedule });
    set({ schedules: [...get().schedules, created] });
    return created;
  },

  updateSchedule: async (id: number, schedule: NewSchedule) => {
    const updated = await invoke<Schedule>("update_schedule", { id, schedule });
    set({
      schedules: get().schedules.map((s) => (s.id === id ? updated : s)),
    });
    return updated;
  },

  deleteSchedule: async (id: number) => {
    await invoke("delete_schedule", { id });
    set({ schedules: get().schedules.filter((s) => s.id !== id) });
  },

  fetchScheduleEntries: async (scheduleId: number) => {
    set({ loading: true, error: null });
    try {
      const currentEntries = await invoke<ScheduleEntry[]>(
        "get_schedule_entries",
        { scheduleId },
      );
      set({ currentEntries, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createScheduleEntry: async (entry: NewScheduleEntry) => {
    const created = await invoke<ScheduleEntry>("create_schedule_entry", {
      entry,
    });
    set({ currentEntries: [...get().currentEntries, created] });
    return created;
  },

  updateScheduleEntry: async (id: number, entry: NewScheduleEntry) => {
    const updated = await invoke<ScheduleEntry>("update_schedule_entry", {
      id,
      entry,
    });
    set({
      currentEntries: get().currentEntries.map((e) =>
        e.id === id ? updated : e,
      ),
    });
    return updated;
  },

  deleteScheduleEntry: async (id: number) => {
    await invoke("delete_schedule_entry", { id });
    set({
      currentEntries: get().currentEntries.filter((e) => e.id !== id),
    });
  },
}));
