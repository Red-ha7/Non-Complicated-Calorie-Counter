import { useId, useState, type FormEvent } from "react";
import { Calendar, Scale, Target, TrendingDown, TrendingUp, X } from "lucide-react";
import { useStore } from "../store";
import { addDays, dayKey, fromKey, fmtMonthDay, fmtWeekdayLong, fmtWeekdayShort } from "../lib/dates";
import { DatePicker } from "./DatePicker";

const one = (n: number) => n.toFixed(1);
const signed = (n: number, digits = 1) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(digits)}`;

function Trend({ points }: { points: { date: string; kg: number }[] }) {
  const gid = useId();
  const W = 340;
  const H = 180;
  const padX = 8;
  const padTop = 18;
  const padBottom = 46;
  const kgs = points.map((p) => p.kg);
  const lo = Math.min(...kgs);
  const hi = Math.max(...kgs);
  const span = hi - lo || 1;

  // Entries are evenly spaced, like the reference, rather than scaled by date.
  const xy = points.map((p, i) => [
    padX + (i / Math.max(points.length - 1, 1)) * (W - padX * 2),
    padTop + (1 - (p.kg - lo) / span) * (H - padTop - padBottom),
  ]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${xy[xy.length - 1][0]} ${H} L${xy[0][0]} ${H} Z`;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weight trend">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {xy.map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="4.5" ry="4.5" fill="var(--surface)" stroke="currentColor" strokeWidth="2.5" />
      ))}
    </svg>
  );
}

export function Weight() {
  const { weights, addWeight, removeWeight, profile, showToast } = useStore();
  const today = dayKey(new Date());
  const [date, setDate] = useState(today);
  const [kg, setKg] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = parseFloat(kg);
    if (!Number.isFinite(v) || v < 20 || v > 300) {
      showToast("Enter a weight between 20 and 300 kg");
      return;
    }
    if (!date || date > today) {
      showToast("Pick today or an earlier day");
      return;
    }
    const replacing = weights.some((w) => w.date === date);
    addWeight(date, Math.round(v * 10) / 10);
    setKg("");
    const when = date === today ? "today" : fmtMonthDay(fromKey(date));
    showToast(`${replacing ? "Updated" : "Logged"} ${one(v)} kg for ${when}`);
  };

  const n = weights.length;
  const latest = weights[n - 1];
  const first = weights[0];

  let body = null;
  if (n > 0) {
    const kgs = weights.map((w) => w.kg);
    const change = latest.kg - first.kg;
    const weeks =
      (fromKey(latest.date).getTime() - fromKey(first.date).getTime()) / (7 * 86_400_000);
    const perWeek = weeks > 0 ? change / weeks : 0;
    const avg = kgs.reduce((a, b) => a + b, 0) / n;

    const cutoff = fromKey(latest.date).getTime() - 28 * 86_400_000;
    const recent = weights.filter((w) => fromKey(w.date).getTime() >= cutoff);
    const last4 = recent.length > 1 ? latest.kg - recent[0].kg : 0;

    const goalSpan = profile.goalKg - profile.weightKg;
    const pct = goalSpan > 0 ? Math.max(0, Math.min(1, (latest.kg - profile.weightKg) / goalSpan)) : 0;
    const toGo = profile.goalKg - latest.kg;
    const weeksToGo = perWeek > 0 && toGo > 0 ? Math.round(toGo / perWeek) : null;

    const stats: { label: string; value: string; tone?: "pos" | "neg"; icon?: boolean }[] = [
      { label: "Total change", value: `${signed(change)} kg`, tone: change >= 0 ? "pos" : "neg", icon: true },
      { label: "Per week", value: `${signed(perWeek, 2)} kg`, tone: perWeek >= 0 ? "pos" : "neg", icon: true },
      { label: "Average", value: `${one(avg)} kg` },
      { label: "Range", value: `${one(Math.min(...kgs))}–${one(Math.max(...kgs))}` },
      { label: "Last 4 weeks", value: `${signed(last4)} kg`, tone: last4 >= 0 ? "pos" : "neg", icon: true },
      { label: "Entries", value: String(n) },
    ];

    body = (
      <>
        <section className="card latest">
          <div className="label">Latest weigh-in</div>
          <div className="num">
            {one(latest.kg)} <small>kg</small>
          </div>
          <div className="when">{fmtWeekdayLong(fromKey(latest.date))}</div>
        </section>

        {n === 1 && (
          <p className="sub" style={{ textAlign: "center", margin: "4px 12px" }}>
            That&rsquo;s your starting weight. Log another weigh-in, ideally weekly, to see your trend.
          </p>
        )}

        {n > 1 && (
          <section className="card pad" style={{ padding: "22px 22px 18px" }}>
            <div className="label icon">
              <Calendar size={14} /> Trend ({n} entries)
            </div>
            <Trend points={weights} />
            <div className="chart-axis" style={{ marginTop: -34 }}>
              <span>{fmtMonthDay(fromKey(first.date))}</span>
              <span>{fmtMonthDay(fromKey(latest.date))}</span>
            </div>
          </section>
        )}

        <section className="card pad" style={{ padding: 22 }}>
          <div className="row between">
            <div className="label icon">
              <Target size={14} /> Goal progress
            </div>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
              {one(profile.weightKg)} → {one(profile.goalKg)} kg
            </span>
          </div>
          <div className="progress" style={{ height: 14, marginTop: 16 }}>
            <i style={{ width: `${pct * 100}%` }} />
          </div>
          <div className="goal-row">
            <div>
              <div className="v">{Math.round(pct * 100)}%</div>
              <div className="label" style={{ marginTop: 6 }}>Complete</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="v">
                {toGo > 0 ? `+${one(toGo)}` : "0.0"} <small>kg</small>
              </div>
              <div className="label" style={{ marginTop: 6 }}>To goal</div>
            </div>
          </div>
          <div className="goal-note">
            {toGo <= 0
              ? "Goal reached — nice work."
              : weeksToGo
                ? `~${weeksToGo} weeks to your goal at current pace.`
                : "Log more weigh-ins to estimate your pace."}
          </div>
        </section>

        <div className="stats">
          {stats.map((s) => {
            const Icon = s.tone === "neg" ? TrendingDown : TrendingUp;
            return (
              <div className="stat" key={s.label}>
                <div className="label icon">
                  {s.icon && <Icon size={12} />} {s.label}
                </div>
                <div className={`v${s.tone ? ` ${s.tone}` : ""}`}>{s.value}</div>
              </div>
            );
          })}
        </div>

        <h2 className="h2" style={{ marginTop: 12 }}>History</h2>
        <div className="stack" style={{ gap: 12 }}>
          {[...weights].reverse().map((w, i, arr) => {
            const prev = arr[i + 1];
            const delta = prev ? w.kg - prev.kg : null;
            return (
              <div className="weigh-item" key={w.id}>
                <div>
                  <div className="kg">{one(w.kg)} kg</div>
                  <div className="dt">{fmtWeekdayShort(fromKey(w.date))}</div>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  {delta !== null && (
                    <div className={`delta${delta < 0 ? " neg" : ""}`}>
                      {delta < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                      {signed(delta)} kg
                    </div>
                  )}
                  <button
                    type="button"
                    className="mini-btn"
                    aria-label={`Delete weigh-in of ${one(w.kg)} kg`}
                    onClick={() => {
                      if (window.confirm(`Delete the ${one(w.kg)} kg weigh-in?`)) removeWeight(w.id);
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <div className="stack gap-16 fade-in">
      <header style={{ marginBottom: 4 }}>
        <p className="eyebrow">Sunday ritual</p>
        <h1 className="h1 title-icon" style={{ marginTop: 10 }}>
          <Scale size={34} strokeWidth={2} /> Weight
        </h1>
      </header>

      <form className="card sm weigh-card" onSubmit={submit}>
        <div className="label">Log a weigh-in</div>

        <div style={{ marginTop: 12 }}>
          <DatePicker
            value={date}
            onChange={setDate}
            max={today}
            marked={new Set(weights.map((w) => w.date))}
            label="Weigh-in date"
          />
        </div>

        <div className="quick-dates" role="group" aria-label="Quick dates">
          {(
            [
              ["Today", today],
              ["Yesterday", dayKey(addDays(new Date(), -1))],
              ["1 week ago", dayKey(addDays(new Date(), -7))],
            ] as const
          ).map(([label, d]) => (
            <button
              type="button"
              key={label}
              className={`tag-btn${date === d ? " on" : ""}`}
              aria-pressed={date === d}
              onClick={() => setDate(d)}
            >
              {label}
            </button>
          ))}
        </div>
        {weights.some((w) => w.date === date) && (
          <p className="date-note" role="status">
            You already have a weigh-in on this day. Logging again replaces it.
          </p>
        )}

        <div className="weigh-form two">
          <input
            className="input"
            inputMode="decimal"
            placeholder="Weight in kg"
            value={kg}
            onChange={(e) => setKg(e.target.value.replace(/[^\d.]/g, ""))}
            aria-label="Weight in kilograms"
          />
          <button className="btn primary" disabled={!kg}>
            Log
          </button>
        </div>
      </form>

      {body ?? (
        <div className="card empty">
          <h3>No weigh-ins yet.</h3>
          <p>Log your first one above to see your trend.</p>
        </div>
      )}
    </div>
  );
}
