/**
 * The Compass mark — a north-pointing arrowhead over a crosshair, vectorized from
 * the brand logo (public/logo.png) so it themes and stays crisp at any size.
 *
 * The crosshair strokes use `currentColor` (black on light, near-white on dark);
 * the arrowhead keeps the brand blue via the `accent` token in both themes.
 * Size and color come from the parent via `className` (e.g. `size-5 text-fg`).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role="img"
      aria-label="Compass"
    >
      <path
        d="M12 8v13.5M4.5 15h15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 2 16.5 9h-9z"
        className="fill-accent"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
