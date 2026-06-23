import type { ReactNode } from "react";

/** Honest empty / collecting-baseline state used across Trends, Coach, etc. */
export function EmptyState({
  icon,
  title,
  body,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 text-center ${className}`}>
      {icon && <div className="text-foreground-500">{icon}</div>}
      <p className="text-sm font-medium text-foreground-600">{title}</p>
      {body && <p className="max-w-xs text-xs text-foreground-500">{body}</p>}
    </div>
  );
}
