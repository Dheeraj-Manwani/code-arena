/**
 * Lesson prose (LEARN_PATHS.md §5.8).
 *
 * The implementation moved to `components/common/Markdown` when problem
 * statements started needing the same renderer. One component means one
 * sanitiser schema — two copies would drift, and only one of them would get the
 * next hardening fix.
 *
 * Re-exported rather than deleted so `@/components/learn/Markdown` keeps
 * working; the security reasoning lives in the common module.
 */
export { Markdown } from "@/components/common/Markdown";
