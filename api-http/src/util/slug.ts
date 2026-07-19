/**
 * Slugify a problem title for its public URL (`/problems/two-sum`).
 *
 * Mirrors the SQL backfill in migration `20260715000000_problem_visibility_and_slug`:
 * lowercase, every run of non-alphanumerics collapses to one dash, no leading or
 * trailing dashes. Keep the two in step if either changes.
 */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // A title with no alphanumerics (e.g. "***") slugifies to nothing.
  return base || "problem";
}
