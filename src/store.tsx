import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { emptyProfile, guestProfile, KCAL_PER_KG, paceOptions } from "./data";
import { dayKey } from "./lib/dates";
import {
  profileToRow,
  rowToLibrary,
  rowToProfile,
  rowToSnack,
  rowToWeight,
  type ProfileRow,
  type SavedSnackRow,
  type SnackRow,
  type WeightRow,
} from "./lib/db";
import type { LibrarySnack, Macros, Profile, Snack, SnackSource, WeighIn } from "./types";

type NewSnack = Macros & { name: string; calories: number };
type AuthResult = { error?: string; needsConfirmation?: boolean };
type DayStatus = "loading" | "done";

type Store = {
  /** True until we know whether someone is signed in and their data has loaded. */
  loading: boolean;
  /** Set when the first load failed; call retry() to try again. */
  loadError: string | null;
  retry: () => void;
  signedIn: boolean;
  onboarded: boolean;
  email: string | null;
  guest: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithProvider: (provider: "google" | "apple") => Promise<AuthResult>;
  startGuest: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  completeOnboarding: (p: Profile) => Promise<boolean>;

  profile: Profile;
  setProfile: (p: Profile) => Promise<boolean>;

  snacks: Snack[];
  /** Fetches that day's snacks once; safe to call on every render of a day. */
  loadDay: (day: Date) => void;
  dayStatus: (key: string) => DayStatus | undefined;
  logSnack: (s: NewSnack, day: Date, source?: SnackSource) => void;
  removeSnack: (id: string) => void;

  library: LibrarySnack[];
  saveLibrarySnack: (s: NewSnack & { id?: string }) => void;
  removeLibrarySnack: (id: string) => void;

  weights: WeighIn[];
  /** Logs a weigh-in for any past day. A day that already has one is updated, not duplicated. */
  addWeight: (date: string, kg: number) => void;
  removeWeight: (id: string) => void;

  toast: string | null;
  showToast: (msg: string) => void;
  /** Consecutive days with a snack, computed by the database. */
  streak: number;
  /** Bumps whenever snack data changes so SQL-backed views know to refetch. */
  dataVersion: number;
};

const Ctx = createContext<Store | null>(null);

const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Turns raw auth errors into something a person can act on. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Wrong email or password.";
  if (m.includes("email not confirmed")) return "Confirm your email first. Check your inbox.";
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "That email already has an account. Sign in instead.";
  }
  if (m.includes("password") && m.includes("characters")) return "Use at least 8 characters for your password.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a minute and try again.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) {
    return "That sign-in method isn't turned on yet.";
  }
  if (m.includes("anonymous")) return "Guest mode isn't turned on yet.";
  if (m.includes("fetch") || m.includes("network")) return "Couldn't reach the server. Check your connection.";
  return message;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [profile, setProfileState] = useState<Profile>(emptyProfile);
  const [onboarded, setOnboarded] = useState(false);
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [library, setLibrary] = useState<LibrarySnack[]>([]);
  const [weights, setWeights] = useState<WeighIn[]>([]);
  const [streak, setStreak] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [, setDaysTick] = useState(0);

  const toastTimer = useRef<number | undefined>(undefined);
  const days = useRef<Record<string, DayStatus>>({});
  const pending = useRef(new Set<string>());
  const userIdRef = useRef<string | null>(null);
  const isGuestRef = useRef(false);
  const snacksRef = useRef(snacks);
  const libraryRef = useRef(library);
  const weightsRef = useRef(weights);
  snacksRef.current = snacks;
  libraryRef.current = library;
  weightsRef.current = weights;

  const userId = session?.user.id ?? null;
  userIdRef.current = userId;
  const isGuest = !!session?.user.is_anonymous;
  isGuestRef.current = isGuest;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  // ───────── session ─────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    // Only store the session here; calling Supabase inside this callback can deadlock.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const refreshStreak = useCallback(async () => {
    const { data, error } = await supabase.rpc("current_streak", { p_today: dayKey(new Date()) });
    if (!error && typeof data === "number") setStreak(data);
  }, []);

  // ───────── load everything for the signed-in user ─────────
  useEffect(() => {
    // A different (or no) user: drop everything the last one had.
    setProfileState(emptyProfile);
    setOnboarded(false);
    setSnacks([]);
    setLibrary([]);
    setWeights([]);
    setStreak(0);
    setLoadError(null);
    setBootstrapped(false);
    days.current = {};
    pending.current.clear();
    if (!userId) return;

    let cancelled = false;
    (async () => {
      try {
        let { data: row, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (error) throw error;
        if (!row) {
          // The signup trigger normally creates this; recover if it somehow didn't.
          const created = await supabase.from("profiles").upsert({ id: userId }).select("*").single();
          if (created.error) throw created.error;
          row = created.data;
        }
        let profileRow = row as ProfileRow;

        // Guests skip onboarding and start with placeholder details.
        if (isGuestRef.current && !profileRow.onboarding_completed) {
          const seeded = await supabase
            .from("profiles")
            .update(profileToRow(guestProfile, true))
            .eq("id", userId)
            .select("*")
            .single();
          if (seeded.error) throw seeded.error;
          profileRow = seeded.data as ProfileRow;
          const w = await supabase.from("weight_entries").insert({
            weight_kg: guestProfile.weightKg,
            recorded_on: dayKey(new Date()),
          });
          if (w.error) throw w.error;
        }

        const [lib, wts, streakRes] = await Promise.all([
          supabase.from("saved_snacks").select("*").order("created_at", { ascending: false }),
          supabase.from("weight_entries").select("*").order("recorded_on").order("created_at"),
          supabase.rpc("current_streak", { p_today: dayKey(new Date()) }),
        ]);
        if (lib.error) throw lib.error;
        if (wts.error) throw wts.error;
        if (cancelled) return;

        setProfileState(rowToProfile(profileRow));
        setOnboarded(profileRow.onboarding_completed);
        setLibrary((lib.data as SavedSnackRow[]).map(rowToLibrary));
        setWeights((wts.data as WeightRow[]).map(rowToWeight));
        if (typeof streakRes.data === "number") setStreak(streakRes.data);
        setBootstrapped(true);
      } catch (e) {
        if (!cancelled) setLoadError(messageOf(e));
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only a change of user (or a retry) should trigger a full reload, not token refreshes.
  }, [userId, attempt]);

  // ───────── auth actions ─────────
  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: friendlyAuthError(error.message) };
    return data.session ? {} : { needsConfirmation: true };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: friendlyAuthError(error.message) } : {};
  }, []);

  const signInWithProvider = useCallback(async (provider: "google" | "apple"): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    return error ? { error: friendlyAuthError(error.message) } : {};
  }, []);

  const startGuest = useCallback(async (): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInAnonymously();
    return error ? { error: friendlyAuthError(error.message) } : {};
  }, []);

  const removeAccountOnServer = useCallback(async () => {
    const { error } = await supabase.functions.invoke("delete-account");
    return !error;
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!(await removeAccountOnServer())) {
      showToast("Couldn't delete your account. Try again.");
      return false;
    }
    await supabase.auth.signOut({ scope: "local" });
    return true;
  }, [removeAccountOnServer, showToast]);

  const signOut = useCallback(async () => {
    // A guest has no login to come back to, so leaving guest mode removes it.
    if (isGuestRef.current) await removeAccountOnServer();
    await supabase.auth.signOut({ scope: "local" });
  }, [removeAccountOnServer]);

  // ───────── profile ─────────
  const completeOnboarding = useCallback(
    async (p: Profile) => {
      const { error } = await supabase.from("profiles").upsert({ id: userIdRef.current, ...profileToRow(p, true) });
      if (error) {
        showToast("Couldn't save your details. Try again.");
        return false;
      }
      // Your starting weight is your first weigh-in.
      const entry = { id: crypto.randomUUID(), weight_kg: p.weightKg, recorded_on: dayKey(new Date()) };
      const w = await supabase.from("weight_entries").insert(entry);
      if (w.error) showToast("Saved, but we couldn't record your starting weight.");
      else setWeights([rowToWeight(entry)]);
      setProfileState(p);
      setOnboarded(true);
      return true;
    },
    [showToast],
  );

  const setProfile = useCallback(
    async (p: Profile) => {
      const previous = profile;
      setProfileState(p);
      const { error } = await supabase.from("profiles").update(profileToRow(p, true)).eq("id", userIdRef.current!);
      if (error) {
        setProfileState(previous);
        showToast("Couldn't save your changes. Try again.");
        return false;
      }
      setDataVersion((v) => v + 1); // the daily goal feeds Insights
      return true;
    },
    [profile, showToast],
  );

  // ───────── snacks ─────────
  const loadDay = useCallback(
    (day: Date) => {
      const key = dayKey(day);
      const uid = userIdRef.current;
      if (!uid || days.current[key]) return;
      days.current[key] = "loading";
      setDaysTick((t) => t + 1);
      supabase
        .from("snack_logs")
        .select("*")
        .eq("logged_on", key)
        .order("logged_at")
        .then(({ data, error }) => {
          if (userIdRef.current !== uid) return; // signed out or switched account meanwhile
          if (error) {
            delete days.current[key];
            setDaysTick((t) => t + 1);
            showToast("Couldn't load your snacks. Try again.");
            return;
          }
          const fetched = (data as SnackRow[]).map(rowToSnack);
          const ids = new Set(fetched.map((s) => s.id));
          setSnacks((prev) => [
            // Keep other days, and any snack still being saved for this one.
            ...prev.filter((s) => (s.on !== key || pending.current.has(s.id)) && !ids.has(s.id)),
            ...fetched,
          ]);
          days.current[key] = "done";
          setDaysTick((t) => t + 1);
        });
    },
    [showToast],
  );

  const dayStatus = useCallback((key: string) => days.current[key], []);

  const logSnack = useCallback(
    (s: NewSnack, day: Date, source: SnackSource = "manual") => {
      const id = crypto.randomUUID();
      const now = new Date();
      // Keep the current clock time, but on the day being viewed.
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
      const on = dayKey(day);
      pending.current.add(id);
      // Optimistic: show it immediately, undo if the server says no.
      setSnacks((prev) => [...prev, { ...s, id, at: at.toISOString(), on }]);
      showToast(`Logged ${s.name} · ${s.calories} cal`);
      supabase
        .from("snack_logs")
        .insert({
          id,
          name: s.name,
          calories: s.calories,
          protein_g: s.protein,
          carbs_g: s.carbs,
          fat_g: s.fat,
          source,
          logged_at: at.toISOString(),
          logged_on: on,
        })
        .then(({ error }) => {
          pending.current.delete(id);
          if (error) {
            setSnacks((prev) => prev.filter((x) => x.id !== id));
            showToast("Couldn't save that snack. Try again.");
            return;
          }
          refreshStreak();
          setDataVersion((v) => v + 1);
        });
    },
    [refreshStreak, showToast],
  );

  const removeSnack = useCallback(
    (id: string) => {
      const removed = snacksRef.current.find((s) => s.id === id);
      if (!removed) return;
      setSnacks((prev) => prev.filter((s) => s.id !== id));
      supabase
        .from("snack_logs")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            setSnacks((prev) => [...prev, removed]);
            showToast("Couldn't remove that snack. Try again.");
            return;
          }
          refreshStreak();
          setDataVersion((v) => v + 1);
        });
    },
    [refreshStreak, showToast],
  );

  // ───────── library ─────────
  const saveLibrarySnack = useCallback(
    (s: NewSnack & { id?: string }) => {
      const fields = { name: s.name, calories: s.calories, protein_g: s.protein, carbs_g: s.carbs, fat_g: s.fat };
      if (s.id) {
        const previous = libraryRef.current;
        setLibrary((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...s, id: x.id } : x)));
        supabase
          .from("saved_snacks")
          .update(fields)
          .eq("id", s.id)
          .then(({ error }) => {
            if (error) {
              setLibrary(previous);
              showToast("Couldn't save your changes. Try again.");
            }
          });
        return;
      }
      const id = crypto.randomUUID();
      setLibrary((prev) => [{ id, name: s.name, calories: s.calories, protein: s.protein, carbs: s.carbs, fat: s.fat }, ...prev]);
      supabase
        .from("saved_snacks")
        .insert({ id, ...fields })
        .then(({ error }) => {
          if (error) {
            setLibrary((prev) => prev.filter((x) => x.id !== id));
            showToast("Couldn't save that snack. Try again.");
          }
        });
    },
    [showToast],
  );

  const removeLibrarySnack = useCallback(
    (id: string) => {
      const previous = libraryRef.current;
      setLibrary((prev) => prev.filter((x) => x.id !== id));
      supabase
        .from("saved_snacks")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            setLibrary(previous);
            showToast("Couldn't delete that snack. Try again.");
          }
        });
    },
    [showToast],
  );

  // ───────── weight ─────────
  const addWeight = useCallback(
    (date: string, kg: number) => {
      const existing = weightsRef.current.find((w) => w.date === date);
      if (existing) {
        const previous = weightsRef.current;
        setWeights((prev) => prev.map((w) => (w.id === existing.id ? { ...w, kg } : w)));
        supabase
          .from("weight_entries")
          .update({ weight_kg: kg })
          .eq("id", existing.id)
          .then(({ error }) => {
            if (error) {
              setWeights(previous);
              showToast("Couldn't update that weigh-in. Try again.");
            }
          });
        return;
      }
      const id = crypto.randomUUID();
      setWeights((prev) => [...prev, { id, date, kg }].sort((a, b) => a.date.localeCompare(b.date)));
      supabase
        .from("weight_entries")
        .insert({ id, weight_kg: kg, recorded_on: date })
        .then(({ error }) => {
          if (error) {
            setWeights((prev) => prev.filter((w) => w.id !== id));
            showToast("Couldn't save that weigh-in. Try again.");
          }
        });
    },
    [showToast],
  );

  const removeWeight = useCallback(
    (id: string) => {
      const previous = weightsRef.current;
      setWeights((prev) => prev.filter((w) => w.id !== id));
      supabase
        .from("weight_entries")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            setWeights(previous);
            showToast("Couldn't delete that weigh-in. Try again.");
          }
        });
    },
    [showToast],
  );

  const value: Store = {
    loading: !authReady || (!!userId && !bootstrapped && !loadError),
    loadError,
    retry: () => setAttempt((a) => a + 1),
    signedIn: !!session,
    onboarded,
    email: session?.user.email ?? null,
    guest: isGuest,
    signUp,
    signIn,
    signInWithProvider,
    startGuest,
    signOut,
    deleteAccount,
    completeOnboarding,
    profile,
    setProfile,
    snacks,
    loadDay,
    dayStatus,
    logSnack,
    removeSnack,
    library,
    saveLibrarySnack,
    removeLibrarySnack,
    weights,
    addWeight,
    removeWeight,
    toast,
    showToast,
    streak,
    dataVersion,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}

/** Extra daily snack calories needed to gain at the chosen pace. */
export function recalculatedGoal(pace: string): number {
  const kg = paceOptions.find((p) => p.label === pace)?.kgPerWeek ?? 0.5;
  return Math.round((kg * KCAL_PER_KG) / 7 / 5) * 5;
}
