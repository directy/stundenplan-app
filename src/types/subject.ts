export type RoomType = "standard" | "sports" | "lab" | "music";

export interface Subject {
  id: number;
  name: string;
  shortName: string;
  roomType: RoomType;
  weeklyHoursDefault: number;
}

export interface NewSubject {
  name: string;
  shortName: string;
  roomType?: RoomType;
  weeklyHoursDefault?: number;
}
