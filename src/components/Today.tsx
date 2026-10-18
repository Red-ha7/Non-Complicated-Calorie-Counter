import { useEffect, useMemo, useState } from "react";
import {
  BookHeart,
  ChevronLeft,
  ChevronRight,
  Flame,
  Plus,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import { AddSheet } from "./AddSheet";
import { BowlArt } from "./Art";
import { useStore } from "../store";
import {
  addDays,
  dayKey,
  fmtTime,
  isSameDay,
  relativeDayLabel,
  startOfDay,
} from "../lib/dates";

const R = 100;
const C = 2 * Math.PI * R;

function Ring({ eaten, goal }: { eaten: number; goal: number }) {
  const pct = goal > 0 ? Math.min(eaten / goal, 1) : 0;
  const left = goal - eaten;
  // Shrink the readout as the numbers get longer so it stays inside the ring.
  const len = `+${eaten}/${goal}`.length;
  const size = len <= 6 ? 44 : len <= 8 ? 33 : len <= 9 ? 28 : 24;
  return (
    <div className="ring">
      <svg viewBox="0 0 224 224" aria-hidden>
        <circle className="track" cx="112" cy="112" r={R} fill="none" strokeWidth="18" />
        <circle
          className={`bar${left <= 0 ? " done" : ""}`}
          cx="112"
          cy="112"
          r={R}
          fill="none"
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          style={{ opacity: eaten > 0 ? 1 : 0 }}
        />
      </svg>
      <div className="center">
        <span className="label">Surplus today</span>
        <span className="big" style={{ fontSize: size }}>
          +{eaten}
          <small>/{goal}</small>
        </span>
        <span className={`togo${left <= 0 ? " done" : ""}`}>
          {left > 0
            ? `${left} cal to goal`
            : left === 0
              ? "Goal reached"
              : `${-left} cal over goal`}
        </span>
      </div>
    </div>
  );
}

export function Today({
  onOpenLibrary,
  onOpenSettings,
}: {
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
}) {
  const { profile, snacks, removeSnack, streak, loadDay, dayStatus } = useStore();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [day, setDay] = useState(today);
  const [adding, setAdding] = useState(false);

  // Fetch the viewed day from the database (once per day; cached afterwards).
  useEffect(() => {
    loadDay(day);
  }, [day, loadDay]);

  const daySnacks = useMemo(
    () =>
      snacks
        .filter((s) => s.on === dayKey(day))
        .sort((a, b) => a.at.localeCompare(b.at)),
    [snacks, day],
  );

  const totals = daySnacks.reduce(
    (t, s) => ({
      cal: t.cal + s.calories,
      p: t.p + s.protein,
      c: t.c + s.carbs,
      f: t.f + s.fat,
    }),
    { cal: 0, p: 0, c: 0, f: 0 },
  );

  const isToday = isSameDay(day, today);

  return (
    <div className="stack today fade-in">
      <header className="greet">
        <div>
          <p className="eyebrow">The daily ritual</p>
          <h1 className="h1" style={{ marginTop: 8 }}>
            Nourish, {profile.name}.
          </h1>
        </div>
        <div className="chips">
          <div className="streak" title="Day streak">
            <Flame size={18} /> {streak}
          </div>
          <button className="icon-btn" onClick={onOpenLibrary} aria-label="Snack library">
            <BookHeart size={20} />
          </button>
          <button className="icon-btn" onClick={onOpenSettings} aria-label="Settings">
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      <div className="daybar">
        <button onClick={() => setDay(addDays(day, -1))} aria-label="Previous day">
          <ChevronLeft size={20} />
        </button>
        <div>
          <div className="live">{isToday ? "Live" : "Past"}</div>
          <div className="day">{relativeDayLabel(day, today)}</div>
        </div>
        <button
          onClick={() => setDay(addDays(day, 1))}
          disabled={isToday}
          aria-label="Next day"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <section className="card ring-card">
        <Ring eaten={totals.cal} goal={profile.savedGoal} />
        <div className="macros">
          <div className="macro protein">
            <div className="label">Protein</div>
            <div className="val">{totals.p}g</div>
          </div>
          <div className="macro carbs">
            <div className="label">Carbs</div>
            <div className="val">{totals.c}g</div>
          </div>
          <div className="macro fat">
            <div className="label">Fats</div>
            <div className="val">{totals.f}g</div>
          </div>
        </div>
      </section>

      <div className="section-head" style={{ marginTop: 8 }}>
        <h2 className="h2">{isToday ? "Today’s intake" : "Intake"}</h2>
        <span className="count">
          {daySnacks.length} {daySnacks.length === 1 ? "item" : "items"}
        </span>
      </div>

      {daySnacks.length === 0 && dayStatus(dayKey(day)) === "loading" ? (
        <div className="stack" style={{ gap: 12 }} aria-busy="true" aria-label="Loading your snacks">
          {[0, 1].map((i) => (
            <div className="skeleton-row" key={i}>
              <div style={{ flex: 1, display: "grid", gap: 10 }}>
                <div className="skeleton" style={{ width: i ? "52%" : "68%" }} />
                <div className="skeleton" style={{ width: "36%", height: 10 }} />
              </div>
              <div className="skeleton" style={{ width: 64 }} />
            </div>
          ))}
        </div>
      ) : daySnacks.length === 0 ? (
        <div className="card empty">
          <div className="art disc">
            <BowlArt />
          </div>
          <h3>
            {isToday
              ? "Your first snack of the day? Let’s make it count."
              : "Nothing logged this day."}
          </h3>
          <p>{isToday ? "Tap the button below to log it." : "You can still add one."}</p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {daySnacks.map((s) => (
            <div className="snack-row" key={s.id}>
              <div className="meta">
                <div className="name">{s.name}</div>
                <div className="detail">
                  {fmtTime(new Date(s.at))} · P{s.protein} · C{s.carbs} · F{s.fat}
                </div>
              </div>
              <span className="kcal">{s.calories} kcal</span>
              <button
                className="mini-btn"
                onClick={() => removeSnack(s.id)}
                aria-label={`Remove ${s.name}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="add-wrap">
        <button className="btn primary" style={{ height: 58 }} onClick={() => setAdding(true)}>
          <Plus size={22} /> Add Snack <span className="pill">AI</span>
        </button>
      </div>

      {adding && (
        <AddSheet
          day={day}
          remaining={profile.savedGoal - totals.cal}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}
