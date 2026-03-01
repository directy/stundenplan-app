import type { RewardCategory, WishType, WishPriority } from "../types";

export const rewardCategoryLabels: Record<RewardCategory, string> = {
  extra_tasks: "Zusatzaufgaben",
  mentoring: "Mentoring",
  event_organization: "Veranstaltungsorganisation",
  training: "Fortbildung",
  committee_work: "Gremienarbeit",
  exam_supervision: "Prüfungsaufsicht",
  project_lead: "Projektleitung",
  other: "Sonstiges",
};

export const wishTypeLabels: Record<WishType, string> = {
  prefer_morning: "Vormittag bevorzugt",
  prefer_afternoon: "Nachmittag bevorzugt",
  free_day: "Freier Tag",
  max_consecutive: "Max. aufeinanderfolgende Stunden",
  compact_schedule: "Kompakter Stundenplan",
  custom: "Individuell",
};

export const wishPriorityLabels: Record<WishPriority, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
};

export const wishPriorityColors: Record<WishPriority, string> = {
  low: "text-gray-500",
  medium: "text-blue-600",
  high: "text-red-600",
};

export const dayOfWeekLabels: Record<number, string> = {
  1: "Montag",
  2: "Dienstag",
  3: "Mittwoch",
  4: "Donnerstag",
  5: "Freitag",
};
