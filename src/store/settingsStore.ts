import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { AppSetting } from "../types";

interface SettingsState {
  settings: AppSetting[];
  loading: boolean;
  error: string | null;

  fetchSettings: () => Promise<void>;
  setSetting: (key: string, value: string) => Promise<void>;
  getBool: (key: string, defaultValue?: boolean) => boolean;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: [],
  loading: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await invoke<AppSetting[]>("get_all_settings");
      set({ settings, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  setSetting: async (key: string, value: string) => {
    const updated = await invoke<AppSetting>("set_setting", { key, value });
    set({
      settings: get().settings.map((s) =>
        s.key === key ? updated : s,
      ).concat(
        get().settings.some((s) => s.key === key) ? [] : [updated],
      ),
    });
  },

  getBool: (key: string, defaultValue = true) => {
    const setting = get().settings.find((s) => s.key === key);
    if (!setting) return defaultValue;
    return setting.value === "true";
  },
}));
