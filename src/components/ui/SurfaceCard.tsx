import { Card, type CardProps } from "@heroui/react";

/** Canonical card surface — warm paper with a hairline edge + soft shadow. */
export const SURFACE_CARD_CLASS = "ws-card-shadow border border-divider bg-content1";

export function SurfaceCard({ className = "", children, ...props }: CardProps) {
  return (
    <Card radius="lg" shadow="none" className={`${SURFACE_CARD_CLASS} ${className}`} {...props}>
      {children}
    </Card>
  );
}
