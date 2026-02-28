import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Holiday, HolidayImportData } from "../types";

interface HolidayState {
  holidays: Holiday[];
  loading: boolean;
  error: string | null;

  fetchHolidays: () => Promise<void>;
  importHolidays: (data: HolidayImportData) => Promise<Holiday[]>;
  deleteAllHolidays: () => Promise<void>;
}

export const useHolidayStore = create<HolidayState>((set) => ({
  holidays: [],
  loading: false,
  error: null,

  fetchHolidays: async () => {
    set({ loading: true, error: null });
    try {
      const holidays = await invoke<Holiday[]>("get_holidays");
      set({ holidays, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  importHolidays: async (data: HolidayImportData) => {
    set({ loading: true, error: null });
    try {
      const holidays = await invoke<Holiday[]>("import_holidays", { data });
      set({ holidays, loading: false });
      return holidays;
    } catch (error) {
      set({ error: String(error), loading: false });
      throw error;
    }
  },

  deleteAllHolidays: async () => {
    set({ loading: true, error: null });
    try {
      await invoke("delete_all_holidays");
      set({ holidays: [], loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
}));
