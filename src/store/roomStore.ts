import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Room, NewRoom } from "../types";
import { useToastStore } from "./toastStore";

interface RoomState {
  rooms: Room[];
  loading: boolean;
  error: string | null;

  fetchRooms: () => Promise<void>;
  createRoom: (room: NewRoom) => Promise<Room>;
  updateRoom: (id: number, room: NewRoom) => Promise<Room>;
  deleteRoom: (id: number) => Promise<void>;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  rooms: [],
  loading: false,
  error: null,

  fetchRooms: async () => {
    set({ loading: true, error: null });
    try {
      const rooms = await invoke<Room[]>("get_rooms");
      set({ rooms, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createRoom: async (room: NewRoom) => {
    const created = await invoke<Room>("create_room", { room });
    set({ rooms: [...get().rooms, created] });
    useToastStore.getState().addToast("success", `Raum "${created.name}" erstellt`);
    return created;
  },

  updateRoom: async (id: number, room: NewRoom) => {
    const updated = await invoke<Room>("update_room", { id, room });
    set({
      rooms: get().rooms.map((r) => (r.id === id ? updated : r)),
    });
    useToastStore.getState().addToast("success", "Raum aktualisiert");
    return updated;
  },

  deleteRoom: async (id: number) => {
    await invoke("delete_room", { id });
    set({ rooms: get().rooms.filter((r) => r.id !== id) });
    useToastStore.getState().addToast("success", "Raum gelöscht");
  },
}));
