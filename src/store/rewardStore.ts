import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { RewardPoint, NewRewardPoint, TeacherRanking } from "../types";

interface RewardState {
  rewardPoints: RewardPoint[];
  rankings: TeacherRanking[];
  loading: boolean;
  error: string | null;

  fetchRewardPoints: (teacherId: number) => Promise<void>;
  createRewardPoint: (reward: NewRewardPoint) => Promise<RewardPoint>;
  deleteRewardPoint: (id: number) => Promise<void>;
  fetchRankings: () => Promise<void>;
}

export const useRewardStore = create<RewardState>((set, get) => ({
  rewardPoints: [],
  rankings: [],
  loading: false,
  error: null,

  fetchRewardPoints: async (teacherId: number) => {
    set({ loading: true, error: null });
    try {
      const rewardPoints = await invoke<RewardPoint[]>("get_reward_points", {
        teacherId,
      });
      set({ rewardPoints, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createRewardPoint: async (reward: NewRewardPoint) => {
    const created = await invoke<RewardPoint>("create_reward_point", {
      reward,
    });
    set({ rewardPoints: [created, ...get().rewardPoints] });
    return created;
  },

  deleteRewardPoint: async (id: number) => {
    await invoke("delete_reward_point", { id });
    set({
      rewardPoints: get().rewardPoints.filter((r) => r.id !== id),
    });
  },

  fetchRankings: async () => {
    set({ loading: true, error: null });
    try {
      const rankings = await invoke<TeacherRanking[]>(
        "get_teacher_rankings",
      );
      set({ rankings, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
}));
