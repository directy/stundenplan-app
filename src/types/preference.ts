export type PreferenceType = "preferred" | "unavailable";

export interface TeacherPreference {
  id: number;
  teacherId: number;
  dayOfWeek: number;
  period: number;
  preferenceType: PreferenceType;
  reason: string | null;
}

export interface NewTeacherPreference {
  teacherId: number;
  dayOfWeek: number;
  period: number;
  preferenceType: PreferenceType;
  reason?: string | null;
}
