import type { RoomType } from "./subject";

export interface Room {
  id: number;
  name: string;
  roomType: RoomType;
  capacity: number;
}

export interface NewRoom {
  name: string;
  roomType?: RoomType;
  capacity?: number;
}
