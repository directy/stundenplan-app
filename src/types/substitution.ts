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
