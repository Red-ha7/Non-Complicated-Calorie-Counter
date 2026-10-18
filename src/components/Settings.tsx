import { useState } from "react";
import { ArrowLeft, LogOut, Save } from "lucide-react";
import { Field } from "./ui";
import { activityOptions, appetiteOptions, paceOptions, workoutOptions } from "../data";
import { recalculatedGoal, useStore } from "../store";
import { addDays, fmtLong } from "../lib/dates";
import type { Profile } from "../types";

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select className="input box" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

export function Settings({ onBack }: { onBack: () => void }) {
  const { profile, setProfile, showToast, signOut, deleteAccount, guest } = useStore();
  const [draft, setDraft] = useState<Profile>(profile);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setNum = (k: "age" | "heightCm" | "sleepHrs" | "weightKg" | "goalKg", raw: string) =>
    set(k, parseFloat(raw.replace(/[^\d.]/g, "")) || 0);

  const goal = recalculatedGoal(draft.pace);
  const pace = paceOptions.find((p) => p.label === draft.pace)?.kgPerWeek ?? 0.5;
  const toGain = draft.goalKg - draft.weightKg;
  const target = toGain > 0 ? addDays(new Date(), Math.ceil((toGain / pace) * 7)) : null;

  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    const ok =
      draft.sleepHrs >= 3 && draft.sleepHrs <= 14 &&
      draft.age >= 10 && draft.age <= 100 &&
      draft.heightCm >= 100 && draft.heightCm <= 230 &&
      draft.weightKg >= 25 && draft.weightKg <= 250 &&
      toGain > 0;
    if (!ok) {
      showToast("Check your age, height, sleep and weights. Goal weight must be above current.");
      return;
    }
    setSaving(true);
    const saved = await setProfile({ ...draft, name: draft.name.trim() || profile.name, savedGoal: goal });
    setSaving(false);
    if (saved) showToast("Saved. Your Today goal is now " + goal + " cal");
  };

  const numField = (k: "age" | "heightCm" | "sleepHrs" | "weightKg" | "goalKg") => (
    <input
      className="input box"
      inputMode="decimal"
      value={draft[k] === 0 ? "" : String(draft[k])}
      onChange={(e) => setNum(k, e.target.value)}
    />
  );

  return (
    <div className="stack fade-in" style={{ gap: 28 }}>
      <header className="row" style={{ justifyContent: "center", position: "relative", minHeight: 52 }}>
        <button
          className="icon-btn soft"
          style={{ position: "absolute", left: 0, top: 4 }}
          onClick={onBack}
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ textAlign: "center" }}>
          <p className="eyebrow" style={{ fontSize: 11 }}>
            Yours to shape
          </p>
          <h1 className="h2" style={{ fontSize: 28, marginTop: 4 }}>
            Settings
          </h1>
        </div>
      </header>

      <section className="settings-group">
        <h2>Identity</h2>
        <div className="card pad form-grid" style={{ padding: 24, borderRadius: 28 }}>
          <div className="full">
            <Field label="Name">
              <input
                className="input box"
                maxLength={40}
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Age">{numField("age")}</Field>
          <Field label="Sex">
            <Select value={draft.sex} options={["Male", "Female"]} onChange={(v) => set("sex", v as Profile["sex"])} />
          </Field>
        </div>
      </section>

      <section className="settings-group">
        <h2>Body</h2>
        <div className="card pad form-grid" style={{ padding: 24, borderRadius: 28 }}>
          <Field label="Height (cm)">{numField("heightCm")}</Field>
          <Field label="Sleep (hrs)">{numField("sleepHrs")}</Field>
          <Field label="Current weight (kg)">{numField("weightKg")}</Field>
          <Field label="Goal weight (kg)">{numField("goalKg")}</Field>
        </div>
      </section>

      <section className="settings-group">
        <h2>Lifestyle</h2>
        <div className="card pad stack gap-16" style={{ padding: 24, borderRadius: 28 }}>
          <Field label="Activity level">
            <Select value={draft.activity} options={activityOptions} onChange={(v) => set("activity", v)} />
          </Field>
          <Field label="Gain pace">
            <Select
              value={draft.pace}
              options={paceOptions.map((p) => p.label)}
              onChange={(v) => set("pace", v)}
            />
          </Field>
          <Field label="Workouts per week">
            <Select value={draft.workouts} options={workoutOptions} onChange={(v) => set("workouts", v)} />
          </Field>
          <Field label="Appetite">
            <Select value={draft.appetite} options={appetiteOptions} onChange={(v) => set("appetite", v)} />
          </Field>
        </div>
      </section>

      <section className="settings-group">
        <h2>Daily Snack Goal</h2>
        <div className="card goal-card" style={{ borderRadius: 28 }}>
          <div className="label">Recalculated snack goal</div>
          <div className="num">{goal}</div>
          <div className="label" style={{ letterSpacing: "0.22em" }}>
            Extra cal from snacks
          </div>
          <p>
            On top of your normal meals. NC3 tracks snacks only.
            {target && <> Goal reached around {fmtLong(target)}.</>}
          </p>
          <p>Saving updates the goal shown on your Today ring.</p>
        </div>
      </section>

      {guest && (
        <p className="note" style={{ margin: 0, padding: 0, textAlign: "center" }}>
          You&rsquo;re browsing as a guest. Leaving guest mode clears everything you&rsquo;ve added.
        </p>
      )}

      <button
        className="btn soft"
        style={{ height: 56 }}
        onClick={() => {
          if (!guest || window.confirm("Leave guest mode? Your guest data will be cleared.")) void signOut();
        }}
      >
        <LogOut size={20} /> {guest ? "Leave guest mode" : "Sign out"}
      </button>

      {!guest && (
        <button
          className="danger"
          onClick={() => {
            if (window.confirm("Delete your account and all your data? This can't be undone.")) {
              showToast("Deleting your account…");
              void deleteAccount();
            }
          }}
        >
          Delete account
        </button>
      )}

      <div className="save-bar">
        <button className="btn primary" style={{ height: 60 }} disabled={saving} onClick={save}>
          <Save size={20} /> {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
