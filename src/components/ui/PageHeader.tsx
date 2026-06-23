import type { ReactNode } from "react";

/** Consistent page header across all tabs. */
export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-foreground-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
