import type { PropsWithChildren } from "react";

interface DrawerProps extends PropsWithChildren {
  open: boolean;
  title: string;
  onClose: () => void;
  width?: "normal" | "wide";
}

export function Drawer({ open, title, onClose, width = "normal", children }: DrawerProps): JSX.Element {
  if (!open) {
    return <></>;
  }

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <aside
        className={`drawer drawer-${width}`}
        role="dialog"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            关闭
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}
