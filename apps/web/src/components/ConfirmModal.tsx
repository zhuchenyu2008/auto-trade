import type { PropsWithChildren } from "react";

interface ConfirmModalProps extends PropsWithChildren {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  tone = "warning",
  onConfirm,
  onCancel,
  children
}: ConfirmModalProps): JSX.Element {
  if (!open) {
    return <></>;
  }
  return (
    <div className="overlay" role="presentation" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h3>{title}</h3>
        </header>
        <p className="modal-description">{description}</p>
        {children}
        <footer className="modal-actions">
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            取消
          </button>
          <button className={`btn btn-${tone}`} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
