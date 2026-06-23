"use client";

import { HeroUIProvider } from "@heroui/react";
import type { ReactNode } from "react";

/**
 * Client-side providers: HeroUI (theming, React-Aria). All data/LLM/guardrail work
 * happens server-side via server actions, so there's no client data layer here.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <HeroUIProvider>{children}</HeroUIProvider>;
}
