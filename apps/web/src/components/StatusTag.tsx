interface StatusTagProps {
  tone: "neutral" | "success" | "warning" | "danger" | "info";
  label: string;
}

export function StatusTag({ tone, label }: StatusTagProps): JSX.Element {
  return <span className={`status-tag status-tag-${tone}`}>{label}</span>;
}
