import { useState } from "react";
import { ToastContainer } from "./components/shared/Toast";
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

type Tab =
  | "dashboard"
  | "schedule"
  | "teachers"
  | "subjects"
  | "classes"
  | "rooms"
  | "rules"
  | "holidays"
  | "absences"
  | "substitution"
  | "comparison"
  | "reports"
  | "help";

const tabs: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Uebersicht" },
  { id: "schedule", label: "Stundenplan" },
  { id: "teachers", label: "Lehrkraefte" },
  { id: "subjects", label: "Faecher" },
  { id: "classes", label: "Klassen" },
  { id: "rooms", label: "Raeume" },
  { id: "rules", label: "Regeln" },
  { id: "holidays", label: "Ferien" },
  { id: "absences", label: "Abwesenheiten" },
  { id: "substitution", label: "Vertretung" },
  { id: "comparison", label: "Vergleich" },
  { id: "reports", label: "Bericht" },
  { id: "help", label: "Hilfe" },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  return (
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
              onClick={() => setActiveTab(tab.id)}
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
          <DashboardView onNavigate={setActiveTab} />
        )}
        {activeTab === "schedule" && <ScheduleView />}
        {activeTab === "teachers" && <TeacherList />}
        {activeTab === "subjects" && <SubjectList />}
        {activeTab === "classes" && <ClassList />}
        {activeTab === "rooms" && <RoomList />}
        {activeTab === "rules" && <RulesPanel />}
        {activeTab === "holidays" && <HolidayView />}
        {activeTab === "absences" && <AbsenceView />}
        {activeTab === "substitution" && <SubstitutionView />}
        {activeTab === "comparison" && <ComparisonView />}
        {activeTab === "reports" && <ReportView />}
        {activeTab === "help" && <HelpView />}
      </main>
      <ToastContainer />
    </div>
  );
}

export default App;
