import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field } from "./ui";
import { useStore } from "../store";

function AppleMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.61-1.7-3.18-1.72-1.35-.14-2.64.8-3.32.8-.69 0-1.74-.78-2.86-.76-1.47.02-2.83.86-3.59 2.17-1.53 2.65-.39 6.58 1.1 8.73.73 1.05 1.6 2.23 2.74 2.19 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.33-3.49ZM14.2 6.1c.6-.73 1-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.65-1.05 1.68-.92 2.67.97.07 1.96-.49 2.56-1.22Z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6v-3.1H1.28a12 12 0 0 0 0 10.8l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.6l4.01 3.1C6.23 6.87 8.88 4.76 12 4.76Z" />
    </svg>
  );
}

export function Auth() {
  const { signUp, signIn, signInWithProvider, startGuest, showToast } = useStore();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const edit = (set: (v: string) => void) => (e: { target: { value: string } }) => {
    set(e.target.value);
    setError("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const mail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setError("Enter a valid email address.");
    if (mode === "signup" && password.length < 8) return setError("Use at least 8 characters for your password.");
    if (mode === "signin" && !password) return setError("Enter your password.");

    setBusy(true);
    setInfo("");
    const result = mode === "signup" ? await signUp(mail, password) : await signIn(mail, password);
    setBusy(false);
    if (result.error) return setError(result.error);
    if (result.needsConfirmation) {
      setMode("signin");
      setPassword("");
      setInfo("Almost there. Check your email to confirm your account, then sign in.");
    }
    // On success the session arrives and the app moves on by itself.
  };

  const social = async (provider: "google" | "apple") => {
    if (busy) return;
    setBusy(true);
    const result = await signInWithProvider(provider);
    setBusy(false);
    if (result.error) showToast(result.error);
  };

  const guest = async () => {
    if (busy) return;
    setBusy(true);
    const result = await startGuest();
    setBusy(false);
    if (result.error) showToast(result.error);
  };

  return (
    <main className="auth fade-in">
      <p className="brand">
        NC<sup>3</sup>
      </p>
      <h1 className="h1">Non-Complicated.</h1>

      <div className="card">
        <h2>{mode === "signup" ? "Start tracking snacks." : "Welcome back."}</h2>
        <p className="sub" style={{ marginBottom: 28 }}>
          {mode === "signup"
            ? "Track only snacks. Gain weight, simply."
            : "Pick up where you left off."}
        </p>

        <form className="stack gap-20" onSubmit={submit} noValidate>
          <div className="stack" style={{ gap: 14 }}>
            <button type="button" className="btn dark" style={{ height: 64 }} disabled={busy} onClick={() => social("apple")}>
              <AppleMark /> Continue with Apple
            </button>
            <button type="button" className="btn outline" style={{ height: 64 }} disabled={busy} onClick={() => social("google")}>
              <GoogleMark /> Continue with Google
            </button>
          </div>

          <div className="divider">OR</div>

          <Field label="Email">
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={edit(setEmail)}
              style={{ height: 58 }}
            />
          </Field>

          <Field label="Password">
            <div className="pw">
              <input
                className="input"
                type={show ? "text" : "password"}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={edit(setPassword)}
                style={{ height: 58 }}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
          </Field>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="note" role="status" style={{ margin: 0, padding: 0, textAlign: "left" }}>
              {info}
            </p>
          )}

          <button className="btn primary" style={{ height: 64 }} disabled={busy}>
            {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>

          <button
            type="button"
            className="link"
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setError("");
              setInfo("");
            }}
          >
            {mode === "signup" ? (
              <>
                Already have an account? <b>Sign in</b>
              </>
            ) : (
              <>
                New here? <b>Create account</b>
              </>
            )}
          </button>
        </form>
      </div>

      <button type="button" className="btn outline guest-btn" disabled={busy} onClick={guest}>
        Continue as guest
      </button>
      <p className="note">
        Guests start with placeholder details you can change in Settings.
      </p>
    </main>
  );
}
