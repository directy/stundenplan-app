export type WishType =
  | "prefer_morning"
  | "prefer_afternoon"
  | "free_day"
  | "max_consecutive"
  | "compact_schedule"
  | "custom";

export type WishPriority = "low" | "medium" | "high";

export interface TeacherWish {
  id: number;
  teacherId: number;
  wishType: WishType;
  priority: WishPriority;
  parameters: string;
  note: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface NewTeacherWish {
  teacherId: number;
  wishType: WishType;
  priority?: WishPriority;
  parameters?: string;
  note?: string;
  isActive?: boolean;
}
