export interface SchoolClass {
  id: number;
  name: string;
  gradeLevel: number;
  classTeacherId: number | null;
  studentCount: number;
}

export interface NewSchoolClass {
  name: string;
  gradeLevel: number;
  classTeacherId?: number | null;
  studentCount?: number;
}
