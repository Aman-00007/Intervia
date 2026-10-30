import { ChangeEvent, KeyboardEvent, ReactNode } from "react";

export function Page({
  eyebrow,
  title,
  children,
  className = "",
  beforeTitle,
  headerRight,
  subtitle,
}: {
  eyebrow?: string;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  beforeTitle?: ReactNode;
  headerRight?: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div className={`page ${className}`}>
      {beforeTitle && <div className="page-before-title">{beforeTitle}</div>}
      {headerRight ? (
        <div className="page-header-row">
          <div className="page-header-left">
            {eyebrow && <small className="page-eyebrow">{eyebrow}</small>}
            {title && <h1>{title}</h1>}
            {subtitle && <div className="page-header-subtitle">{subtitle}</div>}
          </div>
          <div className="page-header-right">{headerRight}</div>
        </div>
      ) : (
        <div className="page-header-row">
          <div className="page-header-left">
            {eyebrow && <small className="page-eyebrow">{eyebrow}</small>}
            {title && <h1>{title}</h1>}
            {subtitle && <div className="page-header-subtitle">{subtitle}</div>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`panel ${className}`}>{children}</section>;
}
export function Button({
  children,
  onClick,
  secondary = false,
  className = "",
  type = "button",
  disabled = false,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type={type}
      className={`btn ${secondary ? "btn-secondary secondary" : "btn-primary primary"} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}
export function Field({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  onKeyDown,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="field">
      <small>{label}</small>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}
export function Status({ text }: { text: string }) {
  return <p className="status">■ &nbsp;{text}</p>;
}
export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}
export function DataTable({ title, rows, candidate = false }: { title: string; rows: string[]; candidate?: boolean }) {
  const wide = rows.some((row) => row.split(" | ").length > 3);
  return (
    <Panel className={`table-panel ${wide ? "table-wide" : ""}`}>
      <div className="panel-heading">
        <h2>{title}</h2>
        <small>{rows.length} RECORDS</small>
      </div>
      <div className="table-head">
        {candidate ? <><span>SESSION</span><span>INTERVIEW</span><span>COMPLETED</span><span>REPORT</span><span>ACTION</span></> : <><span>SESSION / CANDIDATE</span><span>INTERVIEW</span>
        <span>{wide ? "DATE & TIME" : "STATUS"}</span><span>{wide ? "INVITATION / REPORT" : ""}</span><span>ACTION</span></>}
      </div>
      {rows.map((row) => (
        <div className="table-row" key={row}>
          {row.split(" | ").map((part) => (
            <span key={part}>{part}</span>
          ))}
          <button className="text-button">View →</button>
        </div>
      ))}
    </Panel>
  );
}
