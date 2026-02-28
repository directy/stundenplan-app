import { useState } from "react";
import { CreateLicenseForm } from "./components/CreateLicenseForm";
import { VerifyLicense } from "./components/VerifyLicense";
import { HelpView } from "./components/HelpView";

type Tab = "create" | "verify" | "help";

const tabs: { id: Tab; label: string }[] = [
  { id: "create", label: "Lizenz erstellen" },
  { id: "verify", label: "Lizenz pruefen" },
  { id: "help", label: "Hilfe" },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("create");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-gray-800">
            Stundenplan License Manager
          </h1>
        </div>
        <nav className="flex px-4 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
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

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        {activeTab === "create" && <CreateLicenseForm />}
        {activeTab === "verify" && <VerifyLicense />}
        {activeTab === "help" && <HelpView />}
      </main>
    </div>
  );
}

export default App;
