import { useState, useCallback } from "react";
import { ToastContainer } from "./components/shared/Toast";
import { LicenseGate } from "./components/license/LicenseGate";
import { TeacherList } from "./components/teacher/TeacherList";
import { SubjectList } from "./components/subject/SubjectList";
import { ClassList } from "./components/class/ClassList";
import { RoomList } from "./components/room/RoomList";
import { ScheduleView } from "./components/grid/ScheduleView";
import { RulesPanel } from "./components/rules/RulesPanel";
import { SubstitutionView } from "./components/substitution/SubstitutionView";
import { ReportView } from "./components/reports/ReportView";
import { HolidayView } from "./components/holiday/HolidayView";
import { AbsenceView } from "./components/absence/AbsenceView";
import { SeedDataButton } from "./components/shared/SeedDataButton";
import { HelpView } from "./components/help/HelpView";
import { DashboardView } from "./components/dashboard/DashboardView";
import { ComparisonView } from "./components/comparison/ComparisonView";
import { SetupView } from "./components/settings/SetupView";
import { ClassCurriculumEditor } from "./components/class/ClassCurriculumEditor";

type Tab =
  | "dashboard"
  | "schedule"
  | "teachers"
  | "subjects"
  | "classes"
  | "curriculum"
  | "rooms"
  | "rules"
  | "holidays"
  | "absences"
  | "substitution"
  | "comparison"
  | "reports"
  | "settings"
  | "help";

const tabs: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Übersicht" },
  { id: "schedule", label: "Stundenplan" },
  { id: "teachers", label: "Lehrkräfte" },
  { id: "subjects", label: "Fächer" },
  { id: "classes", label: "Klassen" },
  { id: "curriculum", label: "Stundentafel" },
  { id: "rooms", label: "Räume" },
  { id: "rules", label: "Regeln" },
  { id: "holidays", label: "Ferien" },
  { id: "absences", label: "Abwesenheiten" },
  { id: "substitution", label: "Vertretung" },
  { id: "comparison", label: "Vergleich" },
  { id: "reports", label: "Bericht" },
  { id: "settings", label: "Einstellungen" },
  { id: "help", label: "Hilfe" },
];

const VALID_TABS = new Set<string>(tabs.map((t) => t.id));

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem("stundenplan_active_tab");
    return saved && VALID_TABS.has(saved) ? (saved as Tab) : "dashboard";
  });

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    localStorage.setItem("stundenplan_active_tab", tab);
  }, []);

  return (
    <LicenseGate>
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm print:hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">
            Stundenplan-System
          </h1>
          <SeedDataButton />
        </div>
        <nav className="flex px-4 gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-700"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 p-4">
        {activeTab === "dashboard" && (
          <DashboardView onNavigate={handleTabChange} />
        )}
        {activeTab === "schedule" && <ScheduleView />}
        {activeTab === "teachers" && <TeacherList />}
        {activeTab === "subjects" && <SubjectList />}
        {activeTab === "classes" && <ClassList />}
        {activeTab === "curriculum" && <ClassCurriculumEditor />}
        {activeTab === "rooms" && <RoomList />}
        {activeTab === "rules" && <RulesPanel />}
        {activeTab === "holidays" && <HolidayView />}
        {activeTab === "absences" && <AbsenceView />}
        {activeTab === "substitution" && <SubstitutionView />}
        {activeTab === "comparison" && <ComparisonView />}
        {activeTab === "reports" && <ReportView />}
        {activeTab === "settings" && <SetupView />}
        {activeTab === "help" && <HelpView />}
      </main>
      <ToastContainer />
    </div>
    </LicenseGate>
  );
}

export default App;
