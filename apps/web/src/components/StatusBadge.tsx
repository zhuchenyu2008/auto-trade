import type { ReactNode } from "react";

import type { BadgeTone } from "../types";

interface StatusBadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

export function StatusBadge({
  tone = "neutral",
  children
}: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${tone}`}>{children}</span>
  );
}

