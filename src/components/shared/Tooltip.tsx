import type { ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom";
}

export function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const positionClasses =
    position === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
      : "top-full left-1/2 -translate-x-1/2 mt-2";

  const arrowClasses =
    position === "top"
      ? "top-full left-1/2 -translate-x-1/2 border-t-gray-800"
      : "bottom-full left-1/2 -translate-x-1/2 border-b-gray-800";

  const arrowBorder =
    position === "top"
      ? "border-l-transparent border-r-transparent border-b-transparent border-t-4 border-l-4 border-r-4"
      : "border-l-transparent border-r-transparent border-t-transparent border-b-4 border-l-4 border-r-4";

  return (
    <span className="relative group inline-flex">
      {children}
      <span
        className={`absolute ${positionClasses} z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-normal max-w-xs bg-gray-800 text-white text-xs rounded px-2.5 py-1.5 leading-relaxed shadow-lg`}
      >
        {content}
        <span
          className={`absolute ${arrowClasses} ${arrowBorder} w-0 h-0`}
        />
      </span>
    </span>
  );
}
