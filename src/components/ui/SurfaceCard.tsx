import { Card, type CardProps } from "@heroui/react";

/** Canonical card surface — premium dark depth via inner highlight + soft shadow. */
export const SURFACE_CARD_CLASS = "ws-surface-highlight ws-card-shadow border border-white/[0.06] bg-content1";

export function SurfaceCard({ className = "", children, ...props }: CardProps) {
  return (
    <Card radius="lg" shadow="none" className={`${SURFACE_CARD_CLASS} ${className}`} {...props}>
      {children}
    </Card>
  );
}
