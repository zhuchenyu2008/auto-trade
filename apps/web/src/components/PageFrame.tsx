import type { ReactNode } from "react";

interface PageFrameProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageFrame({
  eyebrow,
  title,
  description,
  actions,
  children
}: PageFrameProps) {
  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="page-copy">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="page-description">{description}</p>
        </div>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

