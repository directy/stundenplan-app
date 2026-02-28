import { useMemo } from "react";
import type { Subject } from "../types";

const SUBJECT_PALETTES = [
  { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800" },
  { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800" },
  { bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-800" },
  { bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-800" },
  { bg: "bg-rose-100", border: "border-rose-300", text: "text-rose-800" },
  { bg: "bg-cyan-100", border: "border-cyan-300", text: "text-cyan-800" },
  { bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-800" },
  { bg: "bg-indigo-100", border: "border-indigo-300", text: "text-indigo-800" },
  { bg: "bg-lime-100", border: "border-lime-300", text: "text-lime-800" },
  { bg: "bg-pink-100", border: "border-pink-300", text: "text-pink-800" },
  { bg: "bg-teal-100", border: "border-teal-300", text: "text-teal-800" },
  { bg: "bg-fuchsia-100", border: "border-fuchsia-300", text: "text-fuchsia-800" },
] as const;

export type SubjectPalette = (typeof SUBJECT_PALETTES)[number];
export type SubjectColorMap = Map<number, SubjectPalette>;

export function useSubjectColors(subjects: Subject[]): SubjectColorMap {
  return useMemo(() => {
    const map = new Map<number, SubjectPalette>();
    subjects.forEach((subject, index) => {
      map.set(subject.id, SUBJECT_PALETTES[index % SUBJECT_PALETTES.length]);
    });
    return map;
  }, [subjects]);
}
