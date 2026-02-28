export interface Holiday {
  id: number;
  schoolYear: string;
  state: string;
  name: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface HolidayPeriod {
  name: string;
  startDate: string;
  endDate: string;
}

export interface HolidayImportData {
  schoolYear: string;
  state: string;
  holidays: HolidayPeriod[];
}
