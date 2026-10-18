export type Macros = { protein: number; carbs: number; fat: number };

export type Snack = Macros & {
  id: string;
  name: string;
  calories: number;
  /** ISO timestamp of when it was eaten */
  at: string;
  /** The calendar day it was logged against (YYYY-MM-DD, the user's own day) */
  on: string;
};

export type SnackSource = "manual" | "text" | "photo" | "barcode";

export type LibrarySnack = Macros & {
  id: string;
  name: string;
  calories: number;
};

export type WeighIn = { id: string; date: string; kg: number };

export type Difficulty = "Very Easy" | "Easy" | "Medium";

export type IdeaIcon =
  | "sandwich"
  | "cookie"
  | "cup"
  | "parfait"
  | "bowl"
  | "egg"
  | "nut"
  | "pizza"
  | "salad"
  | "wheat";

export type Idea = Macros & {
  id: string;
  name: string;
  blurb: string;
  calories: number;
  /** Clarifies what the calories cover when it isn't one whole snack (e.g. "per ball") */
  caloriesNote?: string;
  prepMin: number;
  /** Human wording for the prep time, e.g. "10 min + overnight" */
  prepLabel: string;
  ease: Difficulty;
  /** 0-10 taste score from the report */
  taste: number;
  tags: string[];
  icon: IdeaIcon;
  /** Why it works for gaining weight */
  why: string;
  /** Communities and creators that recommend it */
  mentions: string[];
  ingredients: string[];
  steps: string[];
  source: { name: string; url: string };
};

export type Profile = {
  name: string;
  age: number;
  sex: "Male" | "Female";
  heightCm: number;
  sleepHrs: number;
  weightKg: number;
  goalKg: number;
  activity: string;
  pace: string;
  workouts: string;
  appetite: string;
  /** goal currently shown on the Today ring */
  savedGoal: number;
};

export type Tab = "today" | "insights" | "weight" | "ideas";
export type Overlay = "library" | "settings" | null;
