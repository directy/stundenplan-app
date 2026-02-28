import { useToastStore } from "../../store/toastStore";

const typeStyles = {
  success: "bg-green-50 border-green-300 text-green-800",
  error: "bg-red-50 border-red-300 text-red-800",
  info: "bg-blue-50 border-blue-300 text-blue-800",
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`border rounded-lg shadow-lg px-4 py-3 flex items-start gap-2 animate-[fadeIn_0.2s_ease-out] ${typeStyles[toast.type]}`}
          role="alert"
        >
          <p className="text-sm flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-current opacity-50 hover:opacity-100 text-lg leading-none"
            aria-label="Schliessen"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
