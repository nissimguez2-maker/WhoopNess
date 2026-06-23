"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, CalendarRange, TrendingUp, MessageCircle } from "lucide-react";

const TABS = [
  { href: "/", label: "Today", Icon: CalendarCheck },
  { href: "/week", label: "Week", Icon: CalendarRange },
  { href: "/trends", label: "Trends", Icon: TrendingUp },
  { href: "/coach", label: "Coach", Icon: MessageCircle },
] as const;

/** Thumb-reachable bottom nav (mobile-first). Active = teal + top accent bar (never color-alone). */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-divider bg-content1"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="mx-auto grid max-w-[480px] grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="relative flex h-14 flex-col items-center justify-center gap-0.5"
            >
              {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-primary" />}
              <Icon
                size={22}
                className={active ? "text-primary-400" : "text-foreground-500"}
                aria-hidden
              />
              <span className={`text-[11px] font-medium ${active ? "text-primary-400" : "text-foreground-500"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
