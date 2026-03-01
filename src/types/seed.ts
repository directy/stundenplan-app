export interface SeedResult {
  teachersCreated: number;
  subjectsCreated: number;
  classesCreated: number;
  roomsCreated: number;
  assignmentsCreated: number;
}

export type SchoolType = "gymnasium" | "grundschule" | "mittelschule" | "vollstaendig";
