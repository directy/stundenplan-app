export type AbsenceType =
  | "illness"
  | "maternity"
  | "sabbatical"
  | "training"
  | "other";

export interface TeacherAbsence {
  id: number;
  teacherId: number;
  absenceType: AbsenceType;
  startDate: string;
  endDate: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewTeacherAbsence {
  teacherId: number;
  absenceType: AbsenceType;
  startDate: string;
  endDate: string;
  note?: string | null;
}
