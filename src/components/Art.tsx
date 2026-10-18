/** Small line illustrations for empty states. They take their color from `currentColor`. */
const base = {
  width: 52,
  height: 52,
  viewBox: "0 0 56 56",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** A bowl waiting to be filled. */
export function BowlArt() {
  return (
    <svg {...base}>
      <path d="M6 27h44a22 22 0 0 1-44 0Z" fill="var(--butter-300)" />
      <path d="M21 50h14" />
      <path d="M20 8c-3 3 3 5 0 9M28 6c-3 3 3 5 0 9M36 8c-3 3 3 5 0 9" />
    </svg>
  );
}

/** Three bars going up: progress still to come. */
export function ChartArt() {
  return (
    <svg {...base}>
      <rect x="8" y="30" width="10" height="18" rx="3" fill="var(--butter-300)" />
      <rect x="23" y="20" width="10" height="28" rx="3" fill="var(--butter-300)" />
      <rect x="38" y="9" width="10" height="39" rx="3" fill="var(--butter-300)" />
    </svg>
  );
}
