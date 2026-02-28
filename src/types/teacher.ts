export interface Teacher {
  id: number;
  name: string;
  email: string | null;
  engagementScore: number;
  pedagogicalScore: number;
  partTimeQuota: number;
  maxHoursPerDay: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewTeacher {
  name: string;
  email?: string | null;
  engagementScore?: number;
  pedagogicalScore?: number;
  partTimeQuota?: number;
  maxHoursPerDay?: number;
}
