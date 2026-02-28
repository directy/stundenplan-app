export type ScheduleStatus = "draft" | "active" | "archived";

export interface Schedule {
  id: number;
  name: string;
  status: ScheduleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NewSchedule {
  name: string;
  status?: ScheduleStatus;
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
