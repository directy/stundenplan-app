import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type {
  SubstitutionRecord,
  NewSubstitutionRecord,
  SubstitutionCandidate,
  AffectedEntry,
} from "../types";

interface SubstitutionState {
  selectedDate: string;
  isHoliday: boolean;
  affectedEntries: AffectedEntry[];
  candidates: SubstitutionCandidate[];
  selectedEntryId: number | null;
  history: SubstitutionRecord[];
  loading: boolean;
  candidatesLoading: boolean;
  error: string | null;

  setSelectedDate: (date: string) => void;
  checkHoliday: (date: string) => Promise<boolean>;
  fetchAffectedEntries: (scheduleId: number, date: string) => Promise<void>;
  fetchCandidates: (entryId: number, date: string) => Promise<void>;
  assignSubstitute: (record: NewSubstitutionRecord) => Promise<SubstitutionRecord>;
  fetchHistory: (date: string) => Promise<void>;
  clearCandidates: () => void;
}

export const useSubstitutionStore = create<SubstitutionState>((set, get) => ({
  selectedDate: new Date().toISOString().slice(0, 10),
  isHoliday: false,
  affectedEntries: [],
  candidates: [],
  selectedEntryId: null,
  history: [],
  loading: false,
  candidatesLoading: false,
  error: null,

  setSelectedDate: (date: string) => {
    set({ selectedDate: date, candidates: [], selectedEntryId: null });
  },

  checkHoliday: async (date: string) => {
    try {
      const result = await invoke<boolean>("check_holiday", { date });
      set({ isHoliday: result });
      return result;
    } catch {
      set({ isHoliday: false });
      return false;
    }
  },

  fetchAffectedEntries: async (scheduleId: number, date: string) => {
    set({ loading: true, error: null });
    try {
      const affectedEntries = await invoke<AffectedEntry[]>(
        "get_affected_entries",
        { scheduleId, date },
      );
      set({ affectedEntries, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  fetchCandidates: async (entryId: number, date: string) => {
    set({ candidatesLoading: true, selectedEntryId: entryId, error: null });
    try {
      const candidates = await invoke<SubstitutionCandidate[]>(
        "get_substitution_candidates",
        { entryId, date },
      );
      set({ candidates, candidatesLoading: false });
    } catch (error) {
      set({ error: String(error), candidatesLoading: false });
    }
  },

  assignSubstitute: async (record: NewSubstitutionRecord) => {
    const created = await invoke<SubstitutionRecord>("create_substitution", {
      substitution: record,
    });
    set({ history: [...get().history, created] });
    return created;
  },

  fetchHistory: async (date: string) => {
    try {
      const history = await invoke<SubstitutionRecord[]>(
        "get_substitutions_by_date",
        { date },
      );
      set({ history });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  clearCandidates: () => {
    set({ candidates: [], selectedEntryId: null });
  },
}));
