import { paceOptions } from "../data";
import type { LibrarySnack, Profile, Snack, WeighIn } from "../types";

export type ProfileRow = {
  display_name: string | null;
  age: number | null;
  sex: "male" | "female" | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal_weight_kg: number | null;
  sleep_hrs: number | null;
  activity_level: string | null;
  workouts_per_week: string | null;
  appetite: string;
  pace_kg_per_week: number | null;
  daily_calorie_goal: number;
  onboarding_completed: boolean;
};

export type SnackRow = {
  id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at: string;
  logged_on: string;
  source: string;
};

export type SavedSnackRow = Omit<SnackRow, "logged_at" | "logged_on" | "source">;
export type WeightRow = { id: string; weight_kg: number; recorded_on: string };

const n = (v: unknown) => Number(v) || 0;

export function rowToProfile(r: ProfileRow): Profile {
  const pace = paceOptions.find((p) => p.kgPerWeek === Number(r.pace_kg_per_week)) ?? paceOptions[1];
  return {
    name: r.display_name ?? "",
    age: n(r.age),
    sex: r.sex === "female" ? "Female" : "Male",
    heightCm: n(r.height_cm),
    sleepHrs: r.sleep_hrs === null ? 8 : n(r.sleep_hrs),
    weightKg: n(r.weight_kg),
    goalKg: n(r.goal_weight_kg),
    activity: r.activity_level ?? "Lightly active",
    pace: pace.label,
    workouts: r.workouts_per_week ?? "1–2",
    appetite: r.appetite,
    savedGoal: n(r.daily_calorie_goal),
  };
}

export function profileToRow(p: Profile, onboardingCompleted: boolean): ProfileRow {
  const pace = paceOptions.find((o) => o.label === p.pace) ?? paceOptions[1];
  return {
    display_name: p.name.trim(),
    age: Math.round(p.age),
    sex: p.sex === "Female" ? "female" : "male",
    height_cm: p.heightCm,
    weight_kg: p.weightKg,
    goal_weight_kg: p.goalKg,
    sleep_hrs: p.sleepHrs,
    activity_level: p.activity,
    workouts_per_week: p.workouts,
    appetite: p.appetite,
    pace_kg_per_week: pace.kgPerWeek,
    daily_calorie_goal: Math.round(p.savedGoal),
    onboarding_completed: onboardingCompleted,
  };
}

export const rowToSnack = (r: SnackRow): Snack => ({
  id: r.id,
  name: r.name,
  calories: r.calories,
  protein: n(r.protein_g),
  carbs: n(r.carbs_g),
  fat: n(r.fat_g),
  at: r.logged_at,
  on: r.logged_on,
});

export const rowToLibrary = (r: SavedSnackRow): LibrarySnack => ({
  id: r.id,
  name: r.name,
  calories: r.calories,
  protein: n(r.protein_g),
  carbs: n(r.carbs_g),
  fat: n(r.fat_g),
});

export const rowToWeight = (r: WeightRow): WeighIn => ({ id: r.id, date: r.recorded_on, kg: n(r.weight_kg) });
