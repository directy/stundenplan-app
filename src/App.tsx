import { useState } from "react";
import { TeacherList } from "./components/teacher/TeacherList";
import { SubjectList } from "./components/subject/SubjectList";
import { ClassList } from "./components/class/ClassList";
import { RoomList } from "./components/room/RoomList";
import { ScheduleView } from "./components/grid/ScheduleView";
import { RulesPanel } from "./components/rules/RulesPanel";
import { SubstitutionView } from "./components/substitution/SubstitutionView";
import { ReportView } from "./components/reports/ReportView";

type Tab =
  | "schedule"
  | "teachers"
  | "subjects"
  | "classes"
  | "rooms"
  | "rules"
  | "substitution"
  | "reports";

const tabs: { id: Tab; label: string }[] = [
  { id: "schedule", label: "Stundenplan" },
  { id: "teachers", label: "Lehrkraefte" },
  { id: "subjects", label: "Faecher" },
  { id: "classes", label: "Klassen" },
  { id: "rooms", label: "Raeume" },
  { id: "rules", label: "Regeln" },
  { id: "substitution", label: "Vertretung" },
  { id: "reports", label: "Bericht" },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("schedule");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-gray-800">
            Stundenplan-System
          </h1>
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
        {activeTab === "schedule" && <ScheduleView />}
        {activeTab === "teachers" && <TeacherList />}
        {activeTab === "subjects" && <SubjectList />}
        {activeTab === "classes" && <ClassList />}
        {activeTab === "rooms" && <RoomList />}
        {activeTab === "rules" && <RulesPanel />}
        {activeTab === "substitution" && <SubstitutionView />}
        {activeTab === "reports" && <ReportView />}
      </main>
    </div>
  );
}

export default App;
