import { useState } from "react";
import { ArrowLeft, BookHeart, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Sheet } from "./ui";
import { SnackForm } from "./SnackForm";
import { useStore } from "../store";
import type { LibrarySnack } from "../types";

export function Library({ onBack }: { onBack: () => void }) {
  const { library, saveLibrarySnack, removeLibrarySnack, logSnack } = useStore();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<LibrarySnack | "new" | null>(null);

  const shown = library.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="stack gap-20 fade-in">
      <header className="top-bar">
        <button className="icon-btn soft" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="grow">
          <p className="eyebrow">Your shortcuts</p>
          <h1 className="h1" style={{ marginTop: 6, fontSize: 30, whiteSpace: "nowrap" }}>
            Snack library.
          </h1>
          <p className="sub" style={{ fontSize: 14.5 }}>
            Save the snacks you reach for most.
          </p>
        </div>
        <button className="icon-btn green" onClick={() => setEditing("new")} aria-label="Add snack">
          <Plus size={22} />
        </button>
      </header>

      <div className="search">
        <Search size={22} />
        <input
          className="input"
          placeholder="Search your snacks"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {library.length === 0 ? (
        <div className="card empty" style={{ padding: "48px 28px 44px" }}>
          <div className="art disc">
            <BookHeart size={44} strokeWidth={2.25} />
          </div>
          <h3 style={{ fontSize: 26 }}>Build your shortcut list.</h3>
          <p style={{ fontSize: 17 }}>
            Save a snack once, then log it in one tap whenever you have it.
          </p>
          <button
            className="btn primary inline"
            style={{ margin: "28px auto 0", height: 56 }}
            onClick={() => setEditing("new")}
          >
            <Plus size={20} /> Add your first snack
          </button>
        </div>
      ) : shown.length === 0 ? (
        <p className="sub" style={{ textAlign: "center" }}>
          Nothing matches “{query}”.
        </p>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {shown.map((s) => (
            <div className="snack-row" key={s.id}>
              <div className="meta">
                <div className="name">{s.name}</div>
                <div className="detail">
                  <span className="kcal" style={{ fontSize: 15 }}>
                    {s.calories} kcal
                  </span>{" "}
                  · P {s.protein}g · C {s.carbs}g · F {s.fat}g
                </div>
              </div>
              <button className="mini-btn" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}>
                <Pencil size={16} />
              </button>
              <button
                className="mini-btn"
                onClick={() => removeLibrarySnack(s.id)}
                aria-label={`Delete ${s.name}`}
              >
                <Trash2 size={16} />
              </button>
              <button
                className="mini-btn green"
                onClick={() => logSnack(s, new Date())}
                aria-label={`Log ${s.name}`}
              >
                <Plus size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Sheet
          eyebrow="Snack library"
          title={editing === "new" ? "Save a snack." : "Edit snack."}
          onClose={() => setEditing(null)}
        >
          <SnackForm
            initial={editing === "new" ? undefined : editing}
            submitLabel={editing === "new" ? "Save to library" : "Save changes"}
            onSubmit={(s) => {
              saveLibrarySnack(editing === "new" ? s : { ...s, id: editing.id });
              setEditing(null);
            }}
          />
        </Sheet>
      )}
    </div>
  );
}
