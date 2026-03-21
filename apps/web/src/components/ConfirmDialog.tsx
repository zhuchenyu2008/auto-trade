import type { ReactNode } from "react";

import { StatusBadge } from "./StatusBadge";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "warning";
  children?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = "warning",
  children,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-overlay" role="presentation">
      <div className="dialog" role="dialog" aria-modal="true">
        <div className="dialog-head">
          <StatusBadge tone={tone}>
            {tone === "danger" ? "高风险确认" : "二次确认"}
          </StatusBadge>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {children ? <div className="dialog-body">{children}</div> : null}
        <div className="dialog-actions">
          <button className="button button--ghost" onClick={onCancel}>
            取消
          </button>
          <button
            className={`button ${tone === "danger" ? "button--danger" : ""}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

