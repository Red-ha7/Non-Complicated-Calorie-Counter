import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Estimate = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  basis?: string;
};

/** Calls an Edge Function and turns any failure into a readable message. */
async function call<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const detail = await error.context.json().catch(() => null);
      throw new Error(detail?.error ?? "Something went wrong. Try again.");
    }
    throw new Error("Couldn't reach the server. Check your connection.");
  }
  return data as T;
}

export const estimateSnack = (input: {
  description?: string;
  image?: { media_type: string; data: string };
}) => call<Estimate>("estimate-snack", input);

export const lookupBarcode = (barcode: string) => call<Estimate>("barcode-lookup", { barcode });

/** Shrinks a photo to a JPEG that is fast to upload, and returns it as base64. */
export async function prepareImage(file: File, maxSide = 1024): Promise<{ media_type: string; data: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { media_type: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1) };
}

export type Insights = {
  goal: number;
  weekCalories: number;
  weekDaysLogged: number;
  daysOnGoal: number;
  historyDaysLogged: number;
  historyAvgCalories: number;
  history: { day: string; calories: number }[];
};

/** Weekly and history numbers, computed in Postgres (see insights_overview). */
export async function fetchInsights(rangeDays: number, today: string): Promise<Insights> {
  const { data, error } = await supabase.rpc("insights_overview", { p_range_days: rangeDays, p_today: today });
  if (error || !data) throw new Error(error?.message ?? "No data");
  return {
    goal: data.goal,
    weekCalories: data.week_calories,
    weekDaysLogged: data.week_days_logged,
    daysOnGoal: data.days_on_goal,
    historyDaysLogged: data.history_days_logged,
    historyAvgCalories: data.history_avg_calories,
    history: data.history,
  };
}
