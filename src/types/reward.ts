export type RewardCategory =
  | "extra_tasks"
  | "mentoring"
  | "event_organization"
  | "training"
  | "committee_work"
  | "exam_supervision"
  | "project_lead"
  | "other";

export interface RewardPoint {
  id: number;
  teacherId: number;
  points: number;
  category: RewardCategory;
  reason: string;
  date: string;
  createdAt: string;
}

export interface NewRewardPoint {
  teacherId: number;
  points: number;
  category: RewardCategory;
  reason?: string;
  date?: string;
}

export interface TeacherRanking {
  teacherId: number;
  teacherName: string;
  totalPoints: number;
  rank: number;
  rankingMultiplier: number;
}
