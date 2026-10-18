import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Field } from "./ui";
import { activityOptions, paceOptions, workoutOptions } from "../data";
import { recalculatedGoal, useStore } from "../store";
import { addDays, fmtLong } from "../lib/dates";
import type { Profile } from "../types";

const STEPS = 5;
const digits = (v: string) => v.replace(/[^\d.]/g, "");
const num = (v: string) => parseFloat(v) || 0;

export function Onboarding() {
  const { completeOnboarding, signOut } = useStore();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Profile["sex"]>("Male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState("");
  const [activity, setActivity] = useState("Lightly active");
  const [workouts, setWorkouts] = useState("1–2");
  const [pace, setPace] = useState(paceOptions[1].label);

  const dailyGoal = recalculatedGoal(pace);
  const kgPerWeek = paceOptions.find((p) => p.label === pace)?.kgPerWeek ?? 0.5;
  const toGain = num(goal) - num(weight);
  const target = toGain > 0 ? addDays(new Date(), Math.ceil((toGain / kgPerWeek) * 7)) : null;

  // Each step is valid on its own so the Continue button can guide people.
  const valid = [
    name.trim().length > 0,
    num(age) >= 10 && num(age) <= 100,
    num(height) >= 100 && num(height) <= 230 && num(weight) >= 25 && num(weight) <= 250 && toGain > 0,
    true,
    true,
  ][step];

  const hint =
    step === 2 && num(weight) > 0 && num(goal) > 0 && toGain <= 0
      ? "Your goal weight needs to be higher than your current weight."
      : "";

  const next = async () => {
    if (!valid || busy) return;
    if (step < STEPS - 1) return setStep(step + 1);
    setBusy(true);
    await completeOnboarding({
      name: name.trim(),
      age: Math.round(num(age)),
      sex,
      heightCm: num(height),
      sleepHrs: 8,
      weightKg: Math.round(num(weight) * 10) / 10,
      goalKg: Math.round(num(goal) * 10) / 10,
      activity,
      pace,
      workouts,
      appetite: "Not set",
      savedGoal: dailyGoal,
    });
    setBusy(false);
  };

  return (
    <main className="app onboarding fade-in" style={{ paddingBottom: 48 }}>
      <div className="row" style={{ gap: 14, marginBottom: 32 }}>
        <button
          className="icon-btn soft"
          onClick={() => (step === 0 ? void signOut() : setStep(step - 1))}
          aria-label={step === 0 ? "Back to sign in" : "Previous step"}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="progress" style={{ flex: 1, margin: 0 }}>
          <i style={{ width: `${((step + 1) / STEPS) * 100}%` }} />
        </div>
      </div>

      <form
        className="stack gap-20"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <p className="eyebrow">
          Step {step + 1} of {STEPS}
        </p>

        {step === 0 && (
          <>
            <h1 className="h1 sm">What should we call you?</h1>
            <p className="sub" style={{ marginTop: -8 }}>
              We&rsquo;ll use it to greet you each day.
            </p>
            <Field label="First name">
              <input
                className="input"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                autoComplete="given-name"
                autoFocus
                style={{ height: 58 }}
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="h1 sm">A bit about you.</h1>
            <p className="sub" style={{ marginTop: -8 }}>
              Used only to size your daily snack goal.
            </p>
            <div className="form-grid">
              <Field label="Age">
                <input
                  className="input"
                  inputMode="numeric"
                  value={age}
                  onChange={(e) => setAge(digits(e.target.value))}
                  autoFocus
                />
              </Field>
              <Field label="Sex">
                <select
                  className="input"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as Profile["sex"])}
                >
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="h1 sm">Where are you now, and where to?</h1>
            <div className="form-grid">
              <div className="full">
                <Field label="Height (cm)">
                  <input
                    className="input"
                    inputMode="decimal"
                    value={height}
                    onChange={(e) => setHeight(digits(e.target.value))}
                    autoFocus
                  />
                </Field>
              </div>
              <Field label="Current weight (kg)">
                <input
                  className="input"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(digits(e.target.value))}
                />
              </Field>
              <Field label="Goal weight (kg)">
                <input
                  className="input"
                  inputMode="decimal"
                  value={goal}
                  onChange={(e) => setGoal(digits(e.target.value))}
                />
              </Field>
            </div>
            {hint && <p className="form-error">{hint}</p>}
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="h1 sm">How active are you?</h1>
            <Field label="Activity level">
              <select className="input" value={activity} onChange={(e) => setActivity(e.target.value)}>
                {activityOptions.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label="Workouts per week">
              <select className="input" value={workouts} onChange={(e) => setWorkouts(e.target.value)}>
                {workoutOptions.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="h1 sm">How fast do you want to gain?</h1>
            <div className="stack" style={{ gap: 12 }}>
              {paceOptions.map((p) => (
                <button
                  type="button"
                  key={p.label}
                  className={`choice${pace === p.label ? " on" : ""}`}
                  onClick={() => setPace(p.label)}
                >
                  <b>{p.label.split(" · ")[0]}</b>
                  <span>{p.label.split(" · ")[1]}</span>
                </button>
              ))}
            </div>
            <div className="card goal-card" style={{ borderRadius: 28 }}>
              <div className="label">Your daily snack goal</div>
              <div className="num">{dailyGoal}</div>
              <div className="label" style={{ letterSpacing: "0.22em" }}>
                Extra cal from snacks
              </div>
              <p>
                On top of your normal meals.
                {target && <> Goal reached around {fmtLong(target)}.</>}
              </p>
            </div>
          </>
        )}

        <button className="btn primary" disabled={!valid || busy} style={{ height: 60, marginTop: 8 }}>
          {busy ? "Saving…" : step === STEPS - 1 ? "Start tracking" : "Continue"}
        </button>
      </form>
    </main>
  );
}
