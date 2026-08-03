"use client";

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success" | "warn";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-sky-50 text-sky-900 border-sky-200",
    error: "bg-rose-50 text-rose-900 border-rose-200",
    success: "bg-emerald-50 text-emerald-900 border-emerald-200",
    warn: "bg-amber-50 text-amber-900 border-amber-200",
  }[tone];

  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${styles}`}>{children}</div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
  className?: string;
}) {
  const styles = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300",
    secondary: "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function formatTime(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

export function accuracyLabel(meters?: number | null) {
  if (meters == null) return "Accuracy unknown";
  if (meters <= 20) return `±${meters}m (good)`;
  if (meters <= 50) return `±${meters}m (fair)`;
  return `±${meters}m (poor — distance may be off)`;
}
