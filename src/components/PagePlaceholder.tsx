import { Card, CardBody } from "@heroui/react";
import type { ReactNode } from "react";

export function PagePlaceholder({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-xs text-foreground-500">{subtitle}</p>
      </header>
      <Card className="ws-surface-highlight border border-white/10 bg-content1" shadow="sm">
        <CardBody className="gap-3 p-4 text-sm text-foreground-600">{children}</CardBody>
      </Card>
    </div>
  );
}
