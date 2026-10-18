import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, History, Sparkles } from "lucide-react";
import { useStore } from "../store";
import { KCAL_PER_KG } from "../data";
import { fetchInsights, type Insights as InsightsData } from "../lib/api";
import { ChartArt } from "./Art";
import { dayKey, fmtWeekdayShort, fromKey } from "../lib/dates";

const RANGES = [7, 30, 90] as const;
const nf = new Intl.NumberFormat("en-US");

export function Insights() {
  const { profile, dataVersion, showToast } = useStore();
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);
  const [data, setData] = useState<InsightsData | null>(null);
  const [failed, setFailed] = useState(false);

  // The numbers are computed by the database (insights_overview); refetch when snacks change.
  useEffect(() => {
    let cancelled = false;
    fetchInsights(range, dayKey(new Date()))
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        showToast("Couldn't load your insights. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [range, dataVersion, showToast]);

  const loading = !data && !failed;
  const goal = data?.goal || profile.savedGoal;
  const surplus = data?.weekCalories ?? 0;
  const weekGoal = goal * 7;
  const gained = surplus / KCAL_PER_KG;
  const weekLogged = data?.weekDaysLogged ?? 0;
  const daysOnGoal = data?.daysOnGoal ?? 0;
  const avg = data?.historyAvgCalories ?? 0;
  const history = (data?.history ?? []).map((h) => ({ d: fromKey(h.day), cal: h.calories }));

  const message = failed
    ? "We couldn't load your numbers. Switch tabs to try again."
    : weekLogged === 0
      ? "Log a few snacks this week to see your pace."
      : `You average ${nf.format(Math.round(surplus / weekLogged))} cal on days you log — ${Math.round(
          (surplus / weekLogged / goal) * 100,
        )}% of your daily goal.`;

  return (
    <div className="stack gap-20 fade-in" style={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }} aria-busy={loading}>
      <header>
        <p className="eyebrow">Your rhythm</p>
        <h1 className="h1 title-icon" style={{ marginTop: 10 }}>
          <History size={36} strokeWidth={2} /> Insights
        </h1>
      </header>

      <section className="card pad">
        <div className="week-top">
          <div>
            <div className="eyebrow" style={{ fontSize: 13 }}>
              <CalendarDays size={16} /> This week
            </div>
            <div className="range">
              Sun <ArrowRight size={24} /> today
            </div>
          </div>
          <div className="days-on">
            <div className="n">
              {daysOnGoal}
              <i>/7</i>
            </div>
            <div className="label">Days on goal</div>
          </div>
        </div>

        <div className="week-stats">
          <div>
            <div className="label">Total surplus</div>
            <div className="v">
              +{nf.format(surplus)} <small>/ {nf.format(weekGoal)} cal</small>
            </div>
            <div className="progress">
              <i style={{ width: `${Math.min(surplus / weekGoal, 1) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="label">Est. weight gained</div>
            <div className="v">
              +{gained.toFixed(2)} <small>kg</small>
            </div>
          </div>
        </div>
      </section>

      <section className="note-card">
        <div className="label">
          <Sparkles size={20} /> Right now
        </div>
        <p>{message}</p>
      </section>

      <h2 className="h2" style={{ marginTop: 12 }}>
        Snack history
      </h2>
      <div className="seg" role="tablist">
        {RANGES.map((r) => (
          <button
            key={r}
            role="tab"
            aria-selected={range === r}
            className={range === r ? "on" : ""}
            onClick={() => setRange(r)}
          >
            {r} Days
          </button>
        ))}
      </div>

      {history.length === 0 ? (
        <div className="card empty" style={{ padding: "48px 24px" }}>
          <div className="art disc">
            <ChartArt />
          </div>
          <h3>No snacks logged.</h3>
          <p>Log a snack to start building your history.</p>
        </div>
      ) : (
        <>
          <p className="sub" style={{ margin: 0 }}>
            {history.length} {history.length === 1 ? "day" : "days"} logged · avg{" "}
            {nf.format(avg)} cal
          </p>
          <div className="stack" style={{ gap: 12 }}>
            {history.map(({ d, cal }) => (
              <div className="hist-row" key={dayKey(d)}>
                <span className="d">{fmtWeekdayShort(d)}</span>
                <span className="kcal">{nf.format(cal)} cal</span>
                <span className="s">{cal >= goal ? "Goal hit" : `${goal - cal} cal short`}</span>
                <div className="bar">
                  <i className={cal >= goal ? "hit" : ""} style={{ width: `${Math.min(cal / goal, 1) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
