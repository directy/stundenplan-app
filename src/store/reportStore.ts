import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { ScheduleReport } from "../types";

interface ReportState {
  report: ScheduleReport | null;
  loading: boolean;
  error: string | null;

  fetchReport: (scheduleId: number) => Promise<void>;
}

export const useReportStore = create<ReportState>((set) => ({
  report: null,
  loading: false,
  error: null,

  fetchReport: async (scheduleId: number) => {
    set({ loading: true, error: null });
    try {
      const report = await invoke<ScheduleReport>("get_schedule_report", {
        scheduleId,
      });
      set({ report, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
}));
