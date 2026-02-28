export type ScheduleStatus = "draft" | "active" | "archived";

export interface Schedule {
  id: number;
  name: string;
  status: ScheduleStatus;
  validFrom: string | null;
  validTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewSchedule {
  name: string;
  status?: ScheduleStatus;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface ScheduleEntry {
  id: number;
  scheduleId: number;
  timeSlotId: number;
  classId: number;
  subjectId: number;
  teacherId: number;
  roomId: number;
  decisionLog: string;
  createdAt: string;
}

export interface NewScheduleEntry {
  scheduleId: number;
  timeSlotId: number;
  classId: number;
  subjectId: number;
  teacherId: number;
  roomId: number;
  decisionLog?: string;
}

export interface GenerationResult {
  entriesCreated: number;
  totalScore: number;
  averageScore: number;
  unplacedTasks: UnplacedTask[];
}

export interface UnplacedTask {
  classId: number;
  subjectId: number;
  reason: string;
}

export interface TabuSearchConfig {
  maxIterations: number;
  tabuTenure: number;
  maxNoImprove: number;
  neighborhoodSampleSize: number;
}

export interface OptimizationResult {
  initialScore: number;
  finalScore: number;
  improvementPercent: number;
  iterationsRun: number;
  movesApplied: number;
  entriesModified: number;
}
