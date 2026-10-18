import type { Profile } from "./types";

export { ideas, ideaSources } from "./ideas";

export const emptyProfile: Profile = {
  name: "",
  age: 0,
  sex: "Male",
  heightCm: 0,
  sleepHrs: 8,
  weightKg: 0,
  goalKg: 0,
  activity: "Lightly active",
  pace: "Moderate · 0.5 kg/wk",
  workouts: "1–2",
  appetite: "Not set",
  savedGoal: 0,
};

/** Placeholder details for guest mode; editable in Settings. */
export const guestProfile: Profile = {
  name: "Guest",
  age: 25,
  sex: "Male",
  heightCm: 170,
  sleepHrs: 8,
  weightKg: 60,
  goalKg: 65,
  activity: "Lightly active",
  pace: "Moderate · 0.5 kg/wk",
  workouts: "1–2",
  appetite: "Not set",
  savedGoal: 550,
};

export const paceOptions: { label: string; kgPerWeek: number }[] = [
  { label: "Gentle · 0.25 kg/wk", kgPerWeek: 0.25 },
  { label: "Moderate · 0.5 kg/wk", kgPerWeek: 0.5 },
  { label: "Fast · 0.75 kg/wk", kgPerWeek: 0.75 },
];

export const activityOptions = [
  "Sedentary",
  "Lightly active",
  "Active",
  "Very active",
];
export const workoutOptions = ["0", "1–2", "3–4", "5+"];
export const appetiteOptions = ["Not set", "Small", "Average", "Big"];

/** Energy needed to gain 1 kg of body mass. */
export const KCAL_PER_KG = 7700;
