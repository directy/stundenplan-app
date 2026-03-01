export type RestrictionType = "preference" | "qualification";

export interface TeacherClassRestriction {
  id: number;
  teacherId: number;
  classId: number;
  restrictionType: RestrictionType;
}

export interface NewTeacherClassRestriction {
  teacherId: number;
  classId: number;
  restrictionType?: RestrictionType;
}
