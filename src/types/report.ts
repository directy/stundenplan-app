export interface ScheduleReport {
  scheduleId: number;
  scheduleName: string;
  summary: ReportSummary;
  constraintAnalysis: ConstraintAnalysisItem[];
  entries: ReportEntry[];
  teacherWorkloads: TeacherWorkloadItem[];
}

export interface ReportSummary {
  totalEntries: number;
  averageScore: number;
  minScore: number;
  maxScore: number;
  entriesBelowThreshold: number;
  coveragePercent: number;
}

export interface ConstraintAnalysisItem {
  constraintName: string;
  label: string;
  averageScore: number;
  minScore: number;
  violationsCount: number;
}

export interface ReportEntry {
  entryId: number;
  period: number;
  dayOfWeek: number;
  className: string;
  subjectName: string;
  teacherName: string;
  roomName: string;
  totalScore: number;
  softScores: Record<string, number>;
  reason: string;
}

export interface TeacherWorkloadItem {
  teacherId: number;
  teacherName: string;
  totalHours: number;
  uniqueSubjects: number;
  uniqueClasses: number;
  averageScore: number;
}
