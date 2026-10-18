import { useMemo, useState } from "react";
import {
  BookOpen,
  ChefHat,
  Clock,
  Cookie,
  CupSoda,
  EggFried,
  ExternalLink,
  IceCreamBowl,
  Lightbulb,
  Nut,
  Pizza,
  Play,
  Salad,
  Sandwich,
  Soup,
  Sparkles,
  Star,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { Sheet } from "./ui";
import { ideas, ideaSources } from "../data";
import { useStore } from "../store";
import type { Difficulty, Idea, IdeaIcon } from "../types";

const icons: Record<IdeaIcon, LucideIcon> = {
  sandwich: Sandwich,
  cookie: Cookie,
  cup: CupSoda,
  parfait: IceCreamBowl,
  bowl: Soup,
  egg: EggFried,
  nut: Nut,
  pizza: Pizza,
  salad: Salad,
  wheat: Wheat,
};

const easeRank: Record<Difficulty, number> = { "Very Easy": 0, Easy: 1, Medium: 2 };

type Sort = "Top picks" | "Calories" | "Protein" | "Ease" | "Taste";
const SORTS: Sort[] = ["Top picks", "Calories", "Protein", "Ease", "Taste"];

/** A search link, not a specific video: we only link to videos we can vouch for. */
const videoSearch = (idea: Idea) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${idea.name} recipe`)}`;

type Ranked = { idea: Idea; rank: number };

function Glance({ items }: { items: Ranked[] }) {
  const [mode, setMode] = useState<"cal" | "macros">("cal");
  const sorted = [...items].sort((a, b) => b.idea.calories - a.idea.calories);
  const max = Math.max(...items.map((r) => r.idea.calories));
  const top = sorted[0].idea;

  return (
    <section className="card pad glance">
      <div className="seg" role="tablist" aria-label="Compare snacks">
        <button role="tab" aria-selected={mode === "cal"} className={mode === "cal" ? "on" : ""} onClick={() => setMode("cal")}>
          Calories
        </button>
        <button role="tab" aria-selected={mode === "macros"} className={mode === "macros" ? "on" : ""} onClick={() => setMode("macros")}>
          Macros
        </button>
      </div>

      {mode === "cal" ? (
        <>
          <p className="glance-note">
            <b>{top.name}</b> tops the chart at {top.calories} kcal, the most calorie-dense option.
          </p>
          <ul className="bars">
            {sorted.map(({ idea }) => (
              <li key={idea.id}>
                <span className="bar-name">{idea.name}</span>
                <span className="bar-track">
                  <i style={{ width: `${(idea.calories / max) * 100}%` }} />
                </span>
                <span className="bar-val">{idea.calories}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="glance-note">Grams of protein, carbs and fat in one serving.</p>
          <ul className="bars">
            {sorted.map(({ idea }) => {
              const total = idea.protein + idea.carbs + idea.fat;
              return (
                <li key={idea.id}>
                  <span className="bar-name">{idea.name}</span>
                  <span className="bar-track stacked" role="img" aria-label={`Protein ${idea.protein}g, carbs ${idea.carbs}g, fat ${idea.fat}g`}>
                    <i className="p" style={{ width: `${(idea.protein / total) * 100}%` }} />
                    <i className="c" style={{ width: `${(idea.carbs / total) * 100}%` }} />
                    <i className="f" style={{ width: `${(idea.fat / total) * 100}%` }} />
                  </span>
                  <span className="bar-val">{total}g</span>
                </li>
              );
            })}
          </ul>
          <div className="legend">
            <span className="p">Protein</span>
            <span className="c">Carbs</span>
            <span className="f">Fat</span>
          </div>
        </>
      )}
    </section>
  );
}

function Recipe({ item, onClose }: { item: Ranked; onClose: () => void }) {
  const { logSnack } = useStore();
  const { idea, rank } = item;
  const [have, setHave] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setHave((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <Sheet eyebrow={`Idea #${rank}`} title={idea.name} onClose={onClose}>
      <p className="sub" style={{ marginTop: 0 }}>
        {idea.blurb}
      </p>
      <div className="facts recipe-facts">
        <span>
          <Clock size={16} /> {idea.prepLabel}
        </span>
        <span className="dot">{idea.ease}</span>
        <span className="dot">
          <Star size={15} /> {idea.taste.toFixed(1)}/10 taste
        </span>
      </div>

      <div className="detail-macros">
        <div>
          <span className="label">Kcal</span>
          <b>{idea.calories}</b>
        </div>
        <div>
          <span className="label">Protein</span>
          <b>{idea.protein}g</b>
        </div>
        <div>
          <span className="label">Carbs</span>
          <b>{idea.carbs}g</b>
        </div>
        <div>
          <span className="label">Fats</span>
          <b>{idea.fat}g</b>
        </div>
      </div>
      {idea.caloriesNote && <p className="recipe-note">Calories are {idea.caloriesNote}.</p>}

      <button
        className="btn primary"
        onClick={() => {
          logSnack(
            { name: idea.name, calories: idea.calories, protein: idea.protein, carbs: idea.carbs, fat: idea.fat },
            new Date(),
          );
          onClose();
        }}
      >
        Log this snack today
      </button>

      <h3 className="recipe-h">Why it works</h3>
      <p className="recipe-why">{idea.why}</p>
      <div className="tags">
        {idea.mentions.map((m) => (
          <span className="tag" key={m}>
            {m}
          </span>
        ))}
      </div>

      <h3 className="recipe-h">
        <ChefHat size={20} /> Ingredients
      </h3>
      <ul className="checklist">
        {idea.ingredients.map((text, i) => (
          <li key={text}>
            <label>
              <input type="checkbox" checked={have.has(i)} onChange={() => toggle(i)} />
              <span>{text}</span>
            </label>
          </li>
        ))}
      </ul>

      <h3 className="recipe-h">
        <BookOpen size={20} /> Instructions
      </h3>
      <ol className="steps">
        {idea.steps.map((text) => (
          <li key={text}>
            <span>{text}</span>
          </li>
        ))}
      </ol>

      <div className="recipe-links">
        <a className="btn outline" href={videoSearch(idea)} target="_blank" rel="noopener noreferrer">
          <Play size={18} /> Watch recipe videos
        </a>
        <a className="btn outline" href={idea.source.url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={18} /> Source: {idea.source.name}
        </a>
      </div>
      <p className="recipe-note">Nutrition values are estimates and vary with ingredients and portions.</p>
    </Sheet>
  );
}

export function Ideas() {
  const [sort, setSort] = useState<Sort>("Top picks");
  const [tag, setTag] = useState("All");
  const [open, setOpen] = useState<Ranked | null>(null);

  // Array order in the data is the popularity rank.
  const ranked = useMemo<Ranked[]>(() => ideas.map((idea, i) => ({ idea, rank: i + 1 })), []);
  const allTags = useMemo(() => ["All", ...Array.from(new Set(ideas.flatMap((i) => i.tags))).sort()], []);

  const shown = useMemo(() => {
    const filtered = ranked.filter((r) => tag === "All" || r.idea.tags.includes(tag));
    const by: Record<Sort, (a: Ranked, b: Ranked) => number> = {
      "Top picks": (a, b) => a.rank - b.rank,
      Calories: (a, b) => b.idea.calories - a.idea.calories,
      Protein: (a, b) => b.idea.protein - a.idea.protein,
      Ease: (a, b) => easeRank[a.idea.ease] - easeRank[b.idea.ease] || a.idea.prepMin - b.idea.prepMin,
      Taste: (a, b) => b.idea.taste - a.idea.taste,
    };
    return [...filtered].sort(by[sort]);
  }, [ranked, sort, tag]);

  const avg = Math.round(ideas.reduce((a, i) => a + i.calories, 0) / ideas.length);
  const maxPrep = Math.max(...ideas.map((i) => i.prepMin));

  return (
    <div className="stack gap-20 fade-in">
      <header className="ideas-head">
        <p className="eyebrow">Research report</p>
        <h1 className="h1 title-icon" style={{ marginTop: 10 }}>
          <Lightbulb size={34} strokeWidth={2} /> Ideas
        </h1>
        <p>
          Ten easy snacks for gaining weight, gathered from Cleveland Clinic, Healthline, food blogs and the r/gainit
          community. Ranked by popularity, ease, taste and calorie density. Tap one for the full recipe.
        </p>
      </header>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="n">{ideas.length}</div>
          <div className="t">Snacks</div>
          <div className="l">Hand-picked</div>
        </div>
        <div className="stat-tile">
          <div className="n">{avg}</div>
          <div className="t">Avg. Calories</div>
          <div className="l">Per snack</div>
        </div>
        <div className="stat-tile">
          <div className="n">{ideaSources.length}</div>
          <div className="t">Sources</div>
          <div className="l">Consulted</div>
        </div>
        <div className="stat-tile">
          <div className="n">{maxPrep} min</div>
          <div className="t">Max Prep</div>
          <div className="l">Most under 10 min</div>
        </div>
      </div>

      <Glance items={ranked} />

      <div className="sort-head label icon" style={{ letterSpacing: "0.22em", fontSize: 13 }}>
        <Sparkles size={18} /> Sort by
      </div>
      <div className="pills">
        {SORTS.map((s) => (
          <button key={s} className={`pill-btn${sort === s ? " on" : ""}`} onClick={() => setSort(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className="pills" style={{ marginTop: -6 }}>
        {allTags.map((t) => (
          <button key={t} className={`tag-btn${tag === t ? " on" : ""}`} onClick={() => setTag(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="stack gap-16">
        {shown.map((item) => {
          const { idea, rank } = item;
          const Icon = icons[idea.icon];
          return (
            <button key={idea.id} className="card idea" onClick={() => setOpen(item)}>
              <div className="idea-top">
                <div className="ico">
                  <Icon size={26} strokeWidth={1.9} />
                </div>
                <div className="rank">
                  #{rank} <span className="kc">{idea.calories} kcal{idea.caloriesNote ? "*" : ""}</span>
                </div>
              </div>
              <h3>{idea.name}</h3>
              <p className="blurb">{idea.blurb}</p>
              <div className="facts">
                <span>
                  <Clock size={15} /> {idea.prepLabel}
                </span>
                <span className="dot">{idea.ease}</span>
                <span className="dot">
                  <Star size={14} /> {idea.taste.toFixed(1)}
                </span>
                <span className="dot">
                  P {idea.protein}g · F {idea.fat}g · C {idea.carbs}g
                </span>
              </div>
              <div className="tags">
                {idea.tags.map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))}
              </div>
              <span className="see-recipe">See full recipe</span>
            </button>
          );
        })}
      </div>

      <section className="stack" style={{ gap: 12 }}>
        <h2 className="h2" style={{ marginTop: 8 }}>
          Where we looked
        </h2>
        <ul className="sources">
          {ideaSources.map((s) => (
            <li key={s.name}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                <span>
                  <b>{s.name}</b>
                  <small>{s.kind}</small>
                </span>
                <ExternalLink size={16} />
              </a>
            </li>
          ))}
        </ul>
        <p className="recipe-note">
          For information only. Always consult a healthcare provider for personalized nutrition advice.
        </p>
      </section>

      {open && <Recipe item={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
