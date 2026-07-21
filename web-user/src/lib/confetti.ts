import confetti from "canvas-confetti";

/**
 * Brand-coloured celebration bursts (LEARN_PATHS.md §3.6).
 *
 * Centralised rather than called inline so every celebration in the app shares
 * one palette and one set of physics — two components each reaching for
 * `canvas-confetti` with their own numbers is how a "celebration" turns into
 * two visibly different effects.
 *
 * ## Reduced motion is a hard stop, not a softening
 *
 * A full-screen particle burst is exactly the class of animation
 * `prefers-reduced-motion` exists to suppress, and it carries no information —
 * the modal and the toast already say what happened in words. So the reduced
 * path fires nothing at all rather than a gentler version.
 */

/**
 * The arena palette, as literal hex.
 *
 * Confetti draws to a `<canvas>`, which cannot resolve a CSS custom property —
 * `hsl(var(--primary))` would silently paint every particle black. These mirror
 * the tokens in `index.css`; if the brand red changes there, it changes here.
 *   --primary       0 72% 51%   → #DC2626
 *   --arena-success 142 76% 36% → #16A34A
 *   --arena-warning 38 92% 50%  → #F59E0B
 */
const BRAND_COLORS = [
  "#DC2626", // primary red
  "#F87171", // lighter red, so a burst reads as depth rather than a flat block
  "#16A34A", // arena success
  "#F59E0B", // arena warning
  "#FAFAFA", // foreground — the light fleck that keeps the mix from muddying
];

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * Above the modal (z-50) but not interactive.
 *
 * `canvas-confetti`'s default canvas sits at z-index 100 with pointer events
 * disabled, which is already what we want — this only pins it so a future
 * z-index change in the app can't quietly bury the effect behind a backdrop.
 */
const canvasStyles: Partial<CSSStyleDeclaration> = {
  position: "fixed",
  top: "0",
  left: "0",
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  zIndex: "60",
};

let sharedCannon: confetti.CreateTypes | null = null;

/**
 * One reusable canvas for the whole app.
 *
 * The default `confetti()` export appends a fresh canvas per call and tears it
 * down when the animation ends; firing several bursts in a row (as the path
 * celebration does) churns DOM nodes for no reason. A single retained canvas
 * also guarantees overlapping bursts composite together instead of stacking.
 */
const cannon = (): confetti.CreateTypes => {
  if (sharedCannon) return sharedCannon;

  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, canvasStyles);
  document.body.appendChild(canvas);

  sharedCannon = confetti.create(canvas, { resize: true, useWorker: true });
  return sharedCannon;
};

/**
 * The module-milestone burst: a single pop from just below centre.
 *
 * Fires from y = 0.6 rather than the default 0.5 so the particles arc up past
 * the modal's heading instead of erupting from behind it.
 */
export const fireMilestoneConfetti = (): void => {
  if (prefersReducedMotion()) return;

  cannon()({
    particleCount: 90,
    spread: 70,
    startVelocity: 38,
    origin: { x: 0.5, y: 0.6 },
    colors: BRAND_COLORS,
    scalar: 0.9,
    disableForReducedMotion: true,
  });
};

/**
 * The path-completion burst: two cannons from the lower corners.
 *
 * Deliberately bigger than the module burst — finishing an entire path is the
 * rarest moment in the feature, and if it looked identical to the milestone
 * that fires every topic, it would read as smaller than it is. Corner origins
 * cross in the middle, which fills the screen in a way one centre burst can't.
 */
export const firePathCompleteConfetti = (): void => {
  if (prefersReducedMotion()) return;

  const fire = cannon();
  const base = {
    particleCount: 70,
    spread: 62,
    startVelocity: 50,
    colors: BRAND_COLORS,
    disableForReducedMotion: true,
  };

  fire({ ...base, angle: 60, origin: { x: 0, y: 0.75 } });
  fire({ ...base, angle: 120, origin: { x: 1, y: 0.75 } });

  // A second, smaller pair a beat later. One volley reads as a glitch; two read
  // as deliberate, and the delay is short enough to feel like one event.
  window.setTimeout(() => {
    fire({ ...base, particleCount: 40, angle: 60, origin: { x: 0.1, y: 0.8 } });
    fire({ ...base, particleCount: 40, angle: 120, origin: { x: 0.9, y: 0.8 } });
  }, 220);
};
