export interface SubstitutionRecord {
  id: number;
  originalEntryId: number;
  substituteTeacherId: number;
  date: string;
  decisionReason: string;
  score: number;
  createdAt: string;
}

export interface NewSubstitutionRecord {
  originalEntryId: number;
  substituteTeacherId: number;
  date: string;
  decisionReason?: string;
  score?: number;
}

export interface SubstitutionCandidate {
  teacherId: number;
  teacherName: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  decisionReason: string;
  isQualified: boolean;
}

export interface ScoreBreakdown {
  engagement: number;
  substitutionLoad: number;
  pedagogical: number;
  weeklyLoad: number;
  subjectQualification: number;
}

export interface AffectedEntry {
  entryId: number;
  timeSlotId: number;
  period: number;
  startTime: string;
  endTime: string;
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  originalTeacherId: number;
  originalTeacherName: string;
  roomId: number;
  roomName: string;
  isSubstituted: boolean;
  substituteTeacherName: string | null;
}
