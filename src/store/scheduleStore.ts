import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type {
  Schedule,
  NewSchedule,
  ScheduleEntry,
  NewScheduleEntry,
  GenerationResult,
  OptimizationResult,
} from "../types";
import { useToastStore } from "./toastStore";

interface ScheduleState {
  schedules: Schedule[];
  currentEntries: ScheduleEntry[];
  loading: boolean;
  error: string | null;
  generating: boolean;
  generationResult: GenerationResult | null;
  optimizing: boolean;
  optimizationResult: OptimizationResult | null;

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
  swapScheduleEntries: (idA: number, idB: number) => Promise<void>;
  generateSchedule: (scheduleId: number) => Promise<GenerationResult>;
  optimizeSchedule: (scheduleId: number) => Promise<OptimizationResult>;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [],
  currentEntries: [],
  loading: false,
  error: null,
  generating: false,
  generationResult: null,
  optimizing: false,
  optimizationResult: null,

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
    useToastStore.getState().addToast("success", `Plan "${created.name}" erstellt`);
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
    useToastStore.getState().addToast("success", "Plan gelöscht");
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

  swapScheduleEntries: async (idA: number, idB: number) => {
    const [updatedA, updatedB] = await invoke<[ScheduleEntry, ScheduleEntry]>(
      "swap_schedule_entries",
      { idA, idB },
    );
    set({
      currentEntries: get().currentEntries.map((e) => {
        if (e.id === updatedA.id) return updatedA;
        if (e.id === updatedB.id) return updatedB;
        return e;
      }),
    });
  },

  generateSchedule: async (scheduleId: number) => {
    set({ generating: true, error: null, generationResult: null });
    try {
      const result = await invoke<GenerationResult>("generate_schedule", {
        scheduleId,
      });
      set({ generationResult: result, generating: false });
      // Eintraege nach Generierung neu laden
      await get().fetchScheduleEntries(scheduleId);
      useToastStore.getState().addToast("success", `Generierung abgeschlossen – ${result.entriesCreated} Einträge erstellt`);
      return result;
    } catch (error) {
      set({ error: String(error), generating: false });
      useToastStore.getState().addToast("error", `Generierung fehlgeschlagen: ${String(error)}`);
      throw error;
    }
  },

  optimizeSchedule: async (scheduleId: number) => {
    set({ optimizing: true, error: null, optimizationResult: null });
    try {
      const result = await invoke<OptimizationResult>("optimize_schedule", {
        scheduleId,
      });
      set({ optimizationResult: result, optimizing: false });
      // Eintraege nach Optimierung neu laden
      await get().fetchScheduleEntries(scheduleId);
      useToastStore.getState().addToast("success", `Optimierung abgeschlossen – ${result.movesApplied} Moves angewendet`);
      return result;
    } catch (error) {
      set({ error: String(error), optimizing: false });
      useToastStore.getState().addToast("error", `Optimierung fehlgeschlagen: ${String(error)}`);
      throw error;
    }
  },
}));
