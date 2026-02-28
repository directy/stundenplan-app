interface SpinnerProps {
  size?: "sm" | "md";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
};

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <span
      className={`inline-block border-current border-t-transparent rounded-full animate-spin ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Laden"
    />
  );
}
