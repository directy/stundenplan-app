import { Fragment, useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  useScheduleGrid,
  cellKey,
  parseCellKey,
  type ViewMode,
  type GridEntry,
} from "../../hooks/useScheduleGrid";
import { useSubjectColors } from "../../hooks/useSubjectColors";
import { useScheduleStore } from "../../store/scheduleStore";
import { useTeacherStore } from "../../store/teacherStore";
import { useSubjectStore } from "../../store/subjectStore";
import { useClassStore } from "../../store/classStore";
import { useRoomStore } from "../../store/roomStore";
import { useTimeSlotStore } from "../../store/timeSlotStore";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { GridCell } from "./GridCell";
import { EntryCard } from "./EntryCard";
import { EntryDetailModal } from "./EntryDetailModal";
import { ViewSelector } from "./ViewSelector";
import { TeacherScheduleSidebar } from "./TeacherScheduleSidebar";
import { generateScheduleCsv } from "../../utils/exportCsv";

const DAY_NAMES = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

interface ScheduleGridProps {
  scheduleId: number;
  isDraftSchedule: boolean;
  scheduleName: string;
}

export function ScheduleGrid({
  scheduleId,
  isDraftSchedule,
  scheduleName,
}: ScheduleGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("class");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeEntry, setActiveEntry] = useState<GridEntry | null>(null);
  const [detailEntry, setDetailEntry] = useState<GridEntry | null>(null);

  const { currentEntries, updateScheduleEntry, swapScheduleEntries } =
    useScheduleStore();
  const { teachers } = useTeacherStore();
  const { subjects } = useSubjectStore();
  const { classes } = useClassStore();
  const { rooms } = useRoomStore();
  const { timeSlots } = useTimeSlotStore();

  const colorMap = useSubjectColors(subjects);
  const { gridData, periodLabels } = useScheduleGrid({
    entries: currentEntries,
    timeSlots,
    teachers,
    subjects,
    classes,
    rooms,
    viewMode,
    selectedId,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const entry = event.active.data.current?.entry as GridEntry | undefined;
    setActiveEntry(entry ?? null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveEntry(null);
      const { active, over } = event;
      if (!over) return;

      const draggedEntry = active.data.current?.entry as
        | GridEntry
        | undefined;
      const targetCellId = over.data.current?.cellId as string | undefined;
      if (!draggedEntry || !targetCellId) return;

      const targetOccupant = gridData.get(targetCellId);

      // Zielzelle besetzt -> Swap
      if (targetOccupant) {
        if (targetOccupant.id === draggedEntry.id) return;
        await swapScheduleEntries(draggedEntry.id, targetOccupant.id);
        return;
      }

      // TimeSlot-ID fuer Zielzelle ermitteln
      const { dayOfWeek, period } = parseCellKey(targetCellId);
      const targetSlot = timeSlots.find(
        (ts) => ts.dayOfWeek === dayOfWeek && ts.period === period,
      );
      if (!targetSlot) return;

      await updateScheduleEntry(draggedEntry.id, {
        scheduleId,
        timeSlotId: targetSlot.id,
        classId: draggedEntry.classId,
        subjectId: draggedEntry.subjectId,
        teacherId: draggedEntry.teacherId,
        roomId: draggedEntry.roomId,
        decisionLog: draggedEntry.decisionLog,
      });
    },
    [gridData, timeSlots, updateScheduleEntry, swapScheduleEntries, scheduleId],
  );

  const handleEntryClick = useCallback(
    (entry: GridEntry) => {
      if (!activeEntry) {
        setDetailEntry(entry);
      }
    },
    [activeEntry],
  );

  const selectedName =
    viewMode === "class"
      ? classes.find((c) => c.id === selectedId)?.name ?? ""
      : teachers.find((t) => t.id === selectedId)?.name ?? "";

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleCsvExport = useCallback(async () => {
    const gridEntries: GridEntry[] = [];
    for (const entry of gridData.values()) {
      if (entry) gridEntries.push(entry);
    }
    const csv = generateScheduleCsv(gridEntries, timeSlots);
    const filePath = await save({
      title: "Stundenplan als CSV speichern",
      defaultPath: `stundenplan-${scheduleName.replace(/\s+/g, "-")}.csv`,
      filters: [{ name: "CSV-Dateien", extensions: ["csv"] }],
    });
    if (!filePath) return;
    await writeTextFile(filePath, csv);
  }, [gridData, timeSlots, scheduleName]);

  if (selectedId === null) {
    return (
      <div>
        <ViewSelector
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          classes={classes}
          teachers={teachers}
        />
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p>
            {viewMode === "class"
              ? "Bitte eine Klasse auswählen."
              : "Bitte eine Lehrkraft auswählen."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Print-Header (nur beim Drucken sichtbar) */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">{scheduleName}</h1>
        <p className="text-sm text-gray-600">
          {viewMode === "class" ? "Klasse" : "Lehrkraft"}: {selectedName}
        </p>
        <p className="text-xs text-gray-400">
          Gedruckt am {new Date().toLocaleDateString("de-DE")}
        </p>
      </div>

      {/* Steuerung (beim Drucken ausgeblendet) */}
      <div className="print:hidden flex items-end justify-between gap-4 mb-2">
        <ViewSelector
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          classes={classes}
          teachers={teachers}
        />
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Drucken
          </button>
          <button
            onClick={handleCsvExport}
            className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            CSV
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="bg-white rounded-lg shadow overflow-auto">
              <div className="grid grid-cols-[80px_repeat(5,1fr)] min-w-[700px]">
                {/* Kopfzeile */}
                <div className="p-2 bg-gray-50 border-b border-r border-gray-200 text-xs font-medium text-gray-500">
                  Stunde
                </div>
                {DAY_NAMES.map((name, i) => (
                  <div
                    key={i}
                    className="p-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700 text-center"
                  >
                    {name}
                  </div>
                ))}

                {/* Periodenzeilen */}
                {Array.from({ length: 9 }, (_, i) => i + 1).map((period) => {
                  const label = periodLabels.get(period);
                  return (
                    <Fragment key={period}>
                      <div className="p-2 border-r border-b border-gray-200 text-center bg-gray-50">
                        <div className="text-sm font-medium text-gray-700">
                          {period}.
                        </div>
                        {label && (
                          <div className="text-[10px] text-gray-400">
                            {label.startTime}
                            <br />
                            {label.endTime}
                          </div>
                        )}
                      </div>

                      {[1, 2, 3, 4, 5].map((day) => {
                        const key = cellKey(day, period);
                        return (
                          <div key={key} className="border-b border-gray-200">
                            <GridCell
                              cellId={key}
                              entry={gridData.get(key) ?? null}
                              colorMap={colorMap}
                              isDraftSchedule={isDraftSchedule}
                              showClassName={viewMode === "teacher"}
                              onEntryClick={handleEntryClick}
                            />
                          </div>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </div>
            </div>

            <DragOverlay dropAnimation={null}>
              {activeEntry && (
                <div className="opacity-80 pointer-events-none">
                  <EntryCard
                    entry={activeEntry}
                    colorMap={colorMap}
                    isDraftSchedule={isDraftSchedule}
                    showClassName={viewMode === "teacher"}
                    onEntryClick={() => {}}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Teacher sidebar in teacher view */}
        {viewMode === "teacher" && selectedId && (
          <TeacherScheduleSidebar teacherId={selectedId} />
        )}
      </div>

      {detailEntry && (
        <EntryDetailModal
          entry={detailEntry}
          colorMap={colorMap}
          onClose={() => setDetailEntry(null)}
        />
      )}
    </div>
  );
}
