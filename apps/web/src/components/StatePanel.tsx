interface StatePanelProps {
  state: "empty" | "loading" | "error";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function StatePanel({
  state,
  title,
  description,
  actionLabel,
  onAction
}: StatePanelProps): JSX.Element {
  return (
    <div className={`state-panel state-panel-${state}`}>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction ? (
        <button className="btn btn-secondary" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
