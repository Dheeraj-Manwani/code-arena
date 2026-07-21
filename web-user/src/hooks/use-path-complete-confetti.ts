import { useEffect, useRef } from "react";

import { firePathCompleteConfetti } from "@/lib/confetti";

/**
 * Fires the path-completion celebration exactly once per path.
 *
 * ## Why this can't just watch for a false → true transition
 *
 * The completing verdict almost always lands on the *solve* page, not here —
 * the same reason `CelebrationHost` is driven by stored pending state rather
 * than by what happened on this page (LEARN_PATHS.md §5.5). So by the time the
 * path page mounts, `isFinished` is already true on the very first render and
 * there is no transition left to observe. Watching for one would mean the
 * celebration never fires for the path it's meant to celebrate.
 *
 * It therefore fires on first *sighting* of a finished path, and remembers that
 * it did.
 *
 * ## Why localStorage, and what that costs
 *
 * Module and lesson milestones are acknowledged server-side, precisely so a
 * phone and a laptop don't each celebrate the same moment (§5.5). There is no
 * equivalent column for the path level, and adding one is a schema migration —
 * so this uses per-device storage instead, and inherits the limitation that
 * decision was designed to avoid: finish a path on your laptop, open it on your
 * phone, and you'll get the confetti a second time.
 *
 * That is a deliberate trade, not an oversight. Seeing a celebration twice on a
 * once-in-a-path moment is a mild redundancy; the alternative was to hold this
 * feature behind a migration. Promoting it to a `celebratedAt` on
 * `UserLearnPathProgress` is the correct fix when the schema next moves.
 */
const storageKey = (slug: string) => `learn:path-celebrated:${slug}`;

const alreadyCelebrated = (slug: string): boolean => {
  try {
    return window.localStorage.getItem(storageKey(slug)) !== null;
  } catch {
    // Private browsing and blocked-storage modes throw on access. Treating that
    // as "not yet celebrated" means the burst may repeat; treating it as
    // "already" would mean it never fires at all. Repeating is the kinder bug.
    return false;
  }
};

const rememberCelebrated = (slug: string): void => {
  try {
    window.localStorage.setItem(storageKey(slug), new Date().toISOString());
  } catch {
    // Nothing to do — see above.
  }
};

/**
 * Forgets that a path was celebrated, so finishing it again celebrates again.
 *
 * Called on reset. Without it, the one user who deliberately wipes a path to
 * work through it a second time is the one user guaranteed never to see the
 * celebration for it.
 */
export const forgetPathCelebration = (slug: string | undefined): void => {
  if (!slug) return;
  try {
    window.localStorage.removeItem(storageKey(slug));
  } catch {
    // Storage unavailable — nothing was remembered to forget.
  }
};

export const usePathCompleteConfetti = (
  slug: string | undefined,
  isFinished: boolean,
): void => {
  // Guards against the effect re-running within a single visit: the path query
  // refetches after any mutation, and `isFinished` stays true across all of it.
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!slug || !isFinished) return;
    if (firedFor.current === slug) return;
    if (alreadyCelebrated(slug)) return;

    firedFor.current = slug;
    rememberCelebrated(slug);

    // A beat after paint, so the burst lands on a page that has finished
    // rendering rather than competing with the route transition.
    const timer = window.setTimeout(firePathCompleteConfetti, 300);
    return () => window.clearTimeout(timer);
  }, [slug, isFinished]);
};
