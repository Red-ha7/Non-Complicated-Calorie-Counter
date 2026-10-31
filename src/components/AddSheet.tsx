import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Lightbulb,
  PenLine,
  ScanBarcode,
  Search,
  Sparkles,
} from "lucide-react";
import { Field, Sheet } from "./ui";
import { Scanner } from "./Scanner";
import { SnackForm, type SnackDraft } from "./SnackForm";
import { ideas } from "../data";
import { useStore } from "../store";
import { estimateSnack, lookupBarcode, prepareImage, searchFoods, type Estimate, type FoodRow } from "../lib/api";
import type { SnackSource } from "../types";

type Step = "home" | "manual" | "search" | "suggest" | "barcode" | "food";

const reason = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export function AddSheet({
  day,
  remaining,
  onClose,
}: {
  day: Date;
  remaining: number;
  onClose: () => void;
}) {
  const { logSnack, saveLibrarySnack, library, showToast } = useStore();
  const [step, setStep] = useState<Step>("home");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<SnackDraft> | undefined>();
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [source, setSource] = useState<SnackSource>("manual");
  const [estimating, setEstimating] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [foodsBusy, setFoodsBusy] = useState(false);
  const [picked, setPicked] = useState<FoodRow | null>(null);
  const [grams, setGrams] = useState("100");
  const camera = useRef<HTMLInputElement>(null);
  const album = useRef<HTMLInputElement>(null);

  const log = (s: SnackDraft, saveToLibrary = false) => {
    logSnack(s, day, source);
    if (saveToLibrary) saveLibrarySnack(s);
    onClose();
  };

  const goHome = () => {
    setStep("home");
    setSource("manual");
    setPhoto(null);
  };

  // AI and barcode results only prefill the form; the person confirms before it is logged.
  const prefill = (e: Estimate, from: SnackSource) => {
    setDraft({ name: e.name, calories: e.calories, protein: e.protein_g, carbs: e.carbs_g, fat: e.fat_g });
    setSource(from);
    setStep("manual");
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
    setDraft({});
    setSource("manual");
    setStep("manual");
    setEstimating(true);
    try {
      const image = await prepareImage(file);
      prefill(await estimateSnack({ image, description: text.trim() || undefined }), "photo");
    } catch (e) {
      showToast(`${reason(e)} You can enter it yourself.`);
    } finally {
      setEstimating(false);
    }
  };

  const estimateFromText = async () => {
    setEstimating(true);
    try {
      prefill(await estimateSnack({ description: text.trim() }), "text");
    } catch (e) {
      showToast(reason(e));
    } finally {
      setEstimating(false);
    }
  };

  const lookUp = async (code: string = barcode) => {
    setEstimating(true);
    try {
      prefill(await lookupBarcode(code), "barcode");
    } catch (e) {
      showToast(reason(e));
      setScanKey((k) => k + 1); // restart the scanner so another code can be tried
    } finally {
      setEstimating(false);
    }
  };

  const catalogue = useMemo(
    () => [
      ...library.map((s) => ({ ...s, note: "From your library" })),
      ...ideas.map((i) => ({
        id: i.id,
        name: i.name,
        calories: i.calories,
        protein: i.protein,
        carbs: i.carbs,
        fat: i.fat,
        note: "Idea",
      })),
    ],
    [library],
  );
  const results = catalogue.filter((s) =>
    s.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const suggestions = useMemo(() => {
    const cap = remaining > 0 ? remaining : Infinity;
    const fits = ideas.filter((i) => i.calories <= cap);
    const pool = fits.length ? fits : [...ideas].sort((a, b) => a.calories - b.calories);
    // Highest-calorie ideas that still fit, so the goal gets met in fewer snacks.
    return [...pool].sort((a, b) => b.calories - a.calories).slice(0, 3);
  }, [remaining]);

  // Search the food database as the person types (debounced).
  useEffect(() => {
    const term = query.trim();
    if (step !== "search" || term.length < 2) {
      setFoods([]);
      return;
    }
    let cancelled = false;
    setFoodsBusy(true);
    const t = window.setTimeout(() => {
      searchFoods(term)
        .then((rows) => !cancelled && setFoods(rows))
        .catch(() => !cancelled && setFoods([]))
        .finally(() => !cancelled && setFoodsBusy(false));
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, step]);

  const chooseFood = (f: FoodRow) => {
    setPicked(f);
    // Start from the most natural single portion (a medium banana, a slice, a serving) rather than "1 cup mashed".
    const natural = f.portions.find((p) => /\b(medium|serving|slice|piece|each|bar|cookie|egg)\b/i.test(p.description));
    setGrams(String((natural ?? f.portions[0])?.grams ?? 100));
    setStep("food");
  };

  const g = Math.max(0, Math.min(5000, parseFloat(grams) || 0));
  const per = (v: number | null | undefined) => Math.round(((v ?? 0) * g) / 100);

  const titles: Record<Step, string> = {
    food: "How much did you have?",
    home: "Add to your ritual.",
    manual: "Add it yourself.",
    search: "Find a snack.",
    suggest: "Try one of these.",
    barcode: "Scan a barcode.",
  };

  return (
    <Sheet eyebrow="Log snack" title={titles[step]} onClose={onClose}>
      {step !== "home" && (
        <button className="back-link" onClick={step === "food" ? () => setStep("search") : goHome}>
          <ArrowLeft size={18} /> Back
        </button>
      )}

      {step === "home" && (
        <>
          <div className="card pad" style={{ padding: 16, borderRadius: 30 }}>
            <div className="snap-head">
              <div className="ico">
                <Camera size={22} />
              </div>
              <div>
                <b>Snap or upload a meal</b>
                <span>AI reads calories &amp; macros from the image</span>
              </div>
            </div>

            <div className="drop-grid">
              <button className="drop" onClick={() => camera.current?.click()}>
                <Camera size={30} strokeWidth={1.6} />
                Take photo
              </button>
              <button className="drop" onClick={() => album.current?.click()}>
                <ImageIcon size={30} strokeWidth={1.6} />
                From album
              </button>
              <input
                ref={camera}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
              <input
                ref={album}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
            </div>

            <p className="label mt">…or just describe it</p>
            <textarea
              className="input"
              placeholder="e.g. 2 slices of pizza and a glass of juice"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              className="btn primary"
              style={{ marginTop: 20 }}
              disabled={!text.trim() || estimating}
              onClick={estimateFromText}
            >
              <Sparkles size={20} /> {estimating ? "Estimating…" : "Estimate with AI"}
            </button>
          </div>

          <hr className="hr" />

          <div className="suggest-head">
            <div className="l">
              <Lightbulb size={22} /> Suggest snacks
            </div>
            <span className="r">{remaining > 0 ? `${remaining} cal left` : "Goal reached"}</span>
          </div>
          <button
            className="btn outline"
            style={{ marginTop: 16, height: 58 }}
            onClick={() => setStep("suggest")}
          >
            <Sparkles size={20} /> Suggest 3 snacks
          </button>

          <hr className="hr" />

          <p className="or-yourself">OR ADD IT YOURSELF</p>
          <div className="three">
            <button className="tile" onClick={() => setStep("search")}>
              <Search size={26} strokeWidth={1.6} />
              Search
            </button>
            <button
              className="tile"
              onClick={() => setStep("barcode")}
            >
              <ScanBarcode size={26} strokeWidth={1.6} />
              Scan
            </button>
            <button
              className="tile"
              onClick={() => {
                setDraft({});
                setSource("manual");
                setStep("manual");
              }}
            >
              <PenLine size={26} strokeWidth={1.6} />
              Manual
            </button>
          </div>
        </>
      )}

      {step === "manual" && (
        <>
          {photo && <img className="photo-preview" src={photo} alt="Your snack" />}
          {estimating ? (
            <p className="sub" role="status" style={{ marginTop: 0 }}>
              Estimating from your photo…
            </p>
          ) : (
            <SnackForm
              key={draft?.name ?? "blank"}
              initial={draft}
              submitLabel="Log snack"
              offerSave
              onSubmit={log}
            />
          )}
        </>
      )}

      {step === "barcode" && (
        <form
          className="stack gap-16"
          onSubmit={(e) => {
            e.preventDefault();
            if (barcode.length >= 8 && !estimating) lookUp();
          }}
        >
          <Scanner
            key={scanKey}
            paused={estimating}
            onDetect={(code) => {
              setBarcode(code);
              lookUp(code);
            }}
          />
          <p className="sub" style={{ marginTop: 0 }}>
            Or type the number printed under the barcode.
          </p>
          <Field label="Barcode">
            <input
              className="input"
              inputMode="numeric"
              placeholder="e.g. 5000159407236"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value.replace(/\D/g, "").slice(0, 14))}
              autoFocus
            />
          </Field>
          <button className="btn primary" disabled={barcode.length < 8 || estimating}>
            {estimating ? "Looking up…" : "Look up"}
          </button>
        </form>
      )}

      {step === "search" && (
        <>
          <div className="search">
            <Search size={20} />
            <input
              className="input"
              placeholder="Search snacks, ideas and foods"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="list-pick">
            {results.length === 0 && foods.length === 0 && !foodsBusy && query.trim().length >= 2 && (
              <p className="sub" style={{ textAlign: "center", marginTop: 24 }}>
                Nothing matches “{query}”. Try Manual instead.
              </p>
            )}
            {results.map((s) => (
              <button key={s.id} onClick={() => log(s)}>
                <span>
                  {s.name}
                  <small>{s.note}</small>
                </span>
                <span className="kcal">{s.calories} kcal</span>
              </button>
            ))}
          </div>

          {query.trim().length >= 2 && (
            <>
              <p className="label" style={{ margin: "20px 0 8px" }}>
                Food database {foodsBusy ? "· searching…" : ""}
              </p>
              <div className="list-pick">
                {!foodsBusy && foods.length === 0 && (
                  <p className="sub" style={{ textAlign: "center" }}>
                    No foods found for “{query.trim()}”.
                  </p>
                )}
                {foods.map((f) => (
                  <button key={f.id} onClick={() => chooseFood(f)}>
                    <span>
                      {f.name}
                      <small>
                        {[f.category, f.cuisine, f.review_status === "verified" ? null : "estimated, unverified"]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </span>
                    <span className="kcal">{Math.round(f.kcal ?? 0)} kcal / 100 g</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {step === "food" && picked && (
        <>
          <p className="sub" style={{ marginTop: 0 }}>
            <b>{picked.name}</b>
            {picked.review_status !== "verified" && " (estimated values, not yet verified)"}
          </p>
          <div className="pills" style={{ margin: "12px 0", flexWrap: "wrap" }}>
            {[...picked.portions.slice(0, 6), { description: "100 g", grams: 100 }].map((p) => (
              <button
                key={p.description}
                type="button"
                className={`tag-btn${parseFloat(grams) === p.grams ? " on" : ""}`}
                onClick={() => setGrams(String(p.grams))}
              >
                {p.description} · {Math.round(p.grams)} g
              </button>
            ))}
          </div>
          <Field label="Amount (grams)">
            <input
              className="input"
              inputMode="decimal"
              value={grams}
              onChange={(e) => setGrams(e.target.value.replace(/[^\d.]/g, ""))}
              style={{ height: 58 }}
            />
          </Field>
          <div className="detail-macros" style={{ marginTop: 16 }}>
            <div>
              <span className="label">Kcal</span>
              <b>{per(picked.kcal)}</b>
            </div>
            <div>
              <span className="label">Protein</span>
              <b>{per(picked.protein_g)}g</b>
            </div>
            <div>
              <span className="label">Carbs</span>
              <b>{per(picked.carbs_g)}g</b>
            </div>
            <div>
              <span className="label">Fats</span>
              <b>{per(picked.fat_g)}g</b>
            </div>
          </div>
          <button
            className="btn primary"
            style={{ marginTop: 20 }}
            disabled={g <= 0 || per(picked.kcal) < 1}
            onClick={() =>
              log({
                name: `${picked.name} (${Math.round(g)} g)`.slice(0, 80),
                calories: Math.min(5000, per(picked.kcal)),
                protein: per(picked.protein_g),
                carbs: per(picked.carbs_g),
                fat: per(picked.fat_g),
              })
            }
          >
            Log this
          </button>
        </>
      )}

      {step === "suggest" && (
        <>
          <p className="sub" style={{ marginTop: 0 }}>
            {remaining > 0
              ? `Picked to fit your ${remaining} cal left.`
              : "Goal reached — here are the lightest options."}
          </p>
          <div className="list-pick">
            {suggestions.map((s) => (
              <button key={s.id} onClick={() => log(s)}>
                <span>
                  {s.name}
                  <small>
                    P {s.protein}g · C {s.carbs}g · F {s.fat}g
                  </small>
                </span>
                <span className="kcal">{s.calories} kcal</span>
              </button>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
