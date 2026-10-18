import { useEffect, useId, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { dayKey, fromKey } from "../lib/dates";

type Props = {
  /** Selected day, YYYY-MM-DD */
  value: string;
  onChange: (day: string) => void;
  /** Latest day that can be picked (inclusive), YYYY-MM-DD */
  max: string;
  /** Earliest day that can be picked (inclusive), YYYY-MM-DD */
  min?: string;
  /** Days that already have something logged; shown with a dot */
  marked?: Set<string>;
  label?: string;
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = Array.from({ length: 12 }, (_, m) =>
  new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(2026, m, 1)),
);
const longDay = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(d);
const shortDay = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(d);

/**
 * An in-app calendar. The browser's native date input varies by device and language,
 * so this one looks and behaves the same everywhere.
 */
export function DatePicker({ value, onChange, max, min = "2000-01-01", marked, label = "Date" }: Props) {
  const [open, setOpen] = useState(false);
  const selected = fromKey(value);
  const [view, setView] = useState({ y: selected.getFullYear(), m: selected.getMonth() });
  const panelId = useId();

  // Follow the value when it changes from outside (the quick chips).
  useEffect(() => {
    const d = fromKey(value);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  }, [value]);

  const maxD = fromKey(max);
  const minD = fromKey(min);
  const today = dayKey(new Date());

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxD.getFullYear(); y >= minD.getFullYear(); y--) list.push(y);
    return list;
  }, [maxD, minD]);

  const cells = useMemo(() => {
    const lead = new Date(view.y, view.m, 1).getDay();
    const days = new Date(view.y, view.m + 1, 0).getDate();
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: days }, (_, i) => dayKey(new Date(view.y, view.m, i + 1))),
    ];
  }, [view]);

  const monthStart = new Date(view.y, view.m, 1);
  const monthEnd = new Date(view.y, view.m + 1, 0);
  const canPrev = monthStart > minD;
  const canNext = monthEnd < maxD;

  const step = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  // Keep the shown month inside the allowed range when jumping by year.
  const jump = (y: number, m: number) => {
    let ny = y;
    let nm = m;
    if (new Date(ny, nm + 1, 0) > maxD) {
      ny = maxD.getFullYear();
      nm = maxD.getMonth();
    }
    if (new Date(ny, nm + 1, 0) < minD) {
      ny = minD.getFullYear();
      nm = minD.getMonth();
    }
    setView({ y: ny, m: nm });
  };

  return (
    <div className="dp">
      <button
        type="button"
        className="dp-field"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <CalendarDays size={20} aria-hidden />
        <span className="dp-text">
          <small>{label}</small>
          <b>{value === today ? `Today · ${shortDay(selected)}` : shortDay(selected)}</b>
        </span>
        <ChevronDown size={20} aria-hidden className={`dp-chev${open ? " open" : ""}`} />
      </button>

      {open && (
        <div
          className="dp-panel"
          id={panelId}
          role="group"
          aria-label="Choose a date"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <div className="dp-head">
            <button type="button" className="dp-nav" aria-label="Previous month" disabled={!canPrev} onClick={() => step(-1)}>
              <ChevronLeft size={20} />
            </button>
            <div className="dp-selects">
              <select aria-label="Month" value={view.m} onChange={(e) => jump(view.y, Number(e.target.value))}>
                {MONTHS.map((name, m) => (
                  <option key={name} value={m}>
                    {name}
                  </option>
                ))}
              </select>
              <select aria-label="Year" value={view.y} onChange={(e) => jump(Number(e.target.value), view.m)}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="dp-nav" aria-label="Next month" disabled={!canNext} onClick={() => step(1)}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="dp-grid" role="grid">
            {WEEKDAYS.map((w, i) => (
              <span className="dp-dow" key={i} aria-hidden>
                {w}
              </span>
            ))}
            {cells.map((key, i) => {
              if (!key) return <span key={`b${i}`} />;
              const disabled = key > max || key < min;
              const isSel = key === value;
              return (
                <button
                  type="button"
                  key={key}
                  disabled={disabled}
                  aria-label={`${longDay(fromKey(key))}${marked?.has(key) ? ", has a weigh-in" : ""}`}
                  aria-pressed={isSel}
                  className={`dp-day${isSel ? " sel" : ""}${key === today ? " today" : ""}${marked?.has(key) ? " has" : ""}`}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                >
                  {Number(key.slice(8))}
                </button>
              );
            })}
          </div>

          <div className="dp-foot">
            <span className="dp-key">
              <i className="dot" /> Has a weigh-in
            </span>
            <button
              type="button"
              className="dp-today"
              onClick={() => {
                onChange(today);
                setOpen(false);
              }}
            >
              Jump to today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
