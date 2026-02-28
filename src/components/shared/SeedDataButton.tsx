import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SeedResult, SchoolType } from "../../types";
import { useTeacherStore } from "../../store/teacherStore";
import { useSubjectStore } from "../../store/subjectStore";
import { useClassStore } from "../../store/classStore";
import { useRoomStore } from "../../store/roomStore";
import { ConfirmDialog } from "./ConfirmDialog";

const SCHOOL_TYPES: { type: SchoolType; label: string; description: string }[] = [
  {
    type: "gymnasium",
    label: "Gymnasium (gross)",
    description: "~80 Lehrkraefte, 16 Faecher, 24 Klassen (5-12), 40 Raeume",
  },
  {
    type: "grundschule",
    label: "Grundschule (mittel)",
    description: "~25 Lehrkraefte, 9 Faecher, 12 Klassen (1-4), 15 Raeume",
  },
  {
    type: "mittelschule",
    label: "Mittelschule (klein)",
    description: "~35 Lehrkraefte, 13 Faecher, 15 Klassen (5-10), 20 Raeume",
  },
];

export function SeedDataButton() {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<SchoolType | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);

  const { fetchTeachers } = useTeacherStore();
  const { fetchSubjects } = useSubjectStore();
  const { fetchClasses } = useClassStore();
  const { fetchRooms } = useRoomStore();

  const handleSeed = async () => {
    if (!selectedType) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await invoke<SeedResult>("seed_example_data", {
        schoolType: selectedType,
      });
      setResult(res);
      // Alle Stores refreshen
      await Promise.all([
        fetchTeachers(),
        fetchSubjects(),
        fetchClasses(),
        fetchRooms(),
      ]);
    } finally {
      setLoading(false);
      setSelectedType(null);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Beispieldaten
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 w-80 z-50">
              <div className="p-3 border-b border-gray-100">
                <div className="text-sm font-medium text-gray-800">
                  Beispieldaten laden
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Alle vorhandenen Stammdaten werden ersetzt.
                </div>
              </div>
              {SCHOOL_TYPES.map((school) => (
                <button
                  key={school.type}
                  onClick={() => {
                    setSelectedType(school.type);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                >
                  <div className="text-sm font-medium text-gray-800">
                    {school.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {school.description}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {result && (
        <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg z-50 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-800">
              Beispieldaten geladen
            </span>
            <button
              onClick={() => setResult(null)}
              className="text-green-400 hover:text-green-600"
            >
              &times;
            </button>
          </div>
          <div className="text-xs text-green-700 space-y-1">
            <div>{result.teachersCreated} Lehrkraefte</div>
            <div>{result.subjectsCreated} Faecher</div>
            <div>{result.classesCreated} Klassen</div>
            <div>{result.roomsCreated} Raeume</div>
            <div>{result.assignmentsCreated} Fachzuordnungen</div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={selectedType !== null && !loading}
        title="Beispieldaten laden"
        message="Alle vorhandenen Stammdaten (Lehrkraefte, Faecher, Klassen, Raeume) werden geloescht und durch Beispieldaten ersetzt. Stundenplaene und Ferien bleiben erhalten. Fortfahren?"
        confirmLabel={loading ? "Lade..." : "Laden"}
        onConfirm={handleSeed}
        onCancel={() => setSelectedType(null)}
        variant="danger"
      />
    </>
  );
}
