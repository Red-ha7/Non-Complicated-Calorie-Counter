import { useState, type FormEvent } from "react";
import { Field } from "./ui";
import type { Macros } from "../types";

export type SnackDraft = Macros & { name: string; calories: number };

const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

export function SnackForm({
  initial,
  submitLabel,
  onSubmit,
  offerSave,
}: {
  initial?: Partial<SnackDraft>;
  submitLabel: string;
  onSubmit: (s: SnackDraft, saveToLibrary: boolean) => void;
  offerSave?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [cal, setCal] = useState(initial?.calories ? String(initial.calories) : "");
  const [p, setP] = useState(initial?.protein ? String(initial.protein) : "");
  const [c, setC] = useState(initial?.carbs ? String(initial.carbs) : "");
  const [f, setF] = useState(initial?.fat ? String(initial.fat) : "");
  const [save, setSave] = useState(false);

  // Same limits the database enforces, so people see the problem before saving.
  const valid =
    name.trim().length > 0 &&
    num(cal) >= 1 && num(cal) <= 5000 &&
    num(p) <= 1000 && num(c) <= 1000 && num(f) <= 1000;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit(
      {
        name: name.trim(),
        calories: num(cal),
        protein: num(p),
        carbs: num(c),
        fat: num(f),
      },
      save,
    );
  };

  return (
    <form className="stack gap-16" onSubmit={submit}>
      <Field label="Snack name">
        <input
          className="input"
          maxLength={80}
          placeholder="e.g. Peanut butter toast"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus={!initial?.name}
        />
      </Field>
      <Field label="Calories">
        <input
          className="input"
          inputMode="numeric"
          placeholder="kcal"
          value={cal}
          onChange={(e) => setCal(e.target.value.replace(/[^\d.]/g, ""))}
        />
      </Field>
      <div className="macro-inputs">
        <Field label="Protein (g)">
          <input
            className="input"
            inputMode="numeric"
            placeholder="0"
            value={p}
            onChange={(e) => setP(e.target.value.replace(/[^\d.]/g, ""))}
            style={{ padding: "0 14px" }}
          />
        </Field>
        <Field label="Carbs (g)">
          <input
            className="input"
            inputMode="numeric"
            placeholder="0"
            value={c}
            onChange={(e) => setC(e.target.value.replace(/[^\d.]/g, ""))}
            style={{ padding: "0 14px" }}
          />
        </Field>
        <Field label="Fats (g)">
          <input
            className="input"
            inputMode="numeric"
            placeholder="0"
            value={f}
            onChange={(e) => setF(e.target.value.replace(/[^\d.]/g, ""))}
            style={{ padding: "0 14px" }}
          />
        </Field>
      </div>
      {offerSave && (
        <label className="row" style={{ gap: 12, fontSize: 16, color: "var(--text-muted)" }}>
          <input
            type="checkbox"
            checked={save}
            onChange={(e) => setSave(e.target.checked)}
            style={{ width: 22, height: 22, accentColor: "var(--paprika-600)" }}
          />
          Also save to my library
        </label>
      )}
      <button className="btn primary" disabled={!valid} style={{ marginTop: 4 }}>
        {submitLabel}
      </button>
    </form>
  );
}
