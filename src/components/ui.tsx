import { useEffect, type ReactNode } from "react";
import {
  ChartColumn,
  House,
  Lightbulb,
  Scale,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Tab } from "../types";
import { useStore } from "../store";

const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "today", label: "Today", icon: House },
  { id: "insights", label: "Insights", icon: ChartColumn },
  { id: "weight", label: "Weight", icon: Scale },
  { id: "ideas", label: "Ideas", icon: Lightbulb },
];

export function TabBar({
  active,
  onChange,
}: {
  active: Tab | null;
  onChange: (t: Tab) => void;
}) {
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`tab${active === id ? " active" : ""}`}
          onClick={() => onChange(id)}
          aria-current={active === id ? "page" : undefined}
        >
          <span className="tab-ico">
            <Icon size={22} strokeWidth={2.25} />
          </span>
          {label}
        </button>
      ))}
    </nav>
  );
}

export function Sheet({
  eyebrow,
  title,
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab" />
        <div className="sheet-head">
          <div>
            <p className="eyebrow" style={{ letterSpacing: "0.3em" }}>
              {eyebrow}
            </p>
            <h1 className="h1">{title}</h1>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

export function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      {toast}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
