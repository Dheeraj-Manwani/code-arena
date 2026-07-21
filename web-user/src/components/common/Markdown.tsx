import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

import { cn } from "@/lib/utils";

/**
 * The app's one markdown renderer — learn lessons and problem statements.
 *
 * Both inputs are creator-authored, and creator-authored is not the same as
 * trusted: they land in every learner's DOM, so a single stored `<script>` or
 * `onerror=` would be an XSS affecting everyone who opens the page.
 *
 * Two defences, and the first is the one that actually matters:
 *
 *  1. **Raw HTML is never parsed.** `react-markdown` only turns HTML into nodes
 *     when `rehype-raw` is added, and it is deliberately absent. Without it,
 *     `<script>alert(1)</script>` is *text*, and React escapes text.
 *  2. **`rehype-sanitize` on top**, with a schema narrowed further than its
 *     default. Belt and braces: if someone later adds `rehype-raw` without
 *     reading this comment, the sanitiser is already in the pipeline.
 *
 * There is no `dangerouslySetInnerHTML` anywhere in this component, and adding
 * one would defeat both defences at once.
 *
 * This lives in `common/` rather than beside either feature on purpose: one
 * schema means a hardening fix applies everywhere at once, where two copies
 * would drift and only one would get patched.
 */

/**
 * Narrower than `defaultSchema`: prose, code, links and images — not arbitrary
 * markup. Everything not listed is stripped rather than escaped.
 */
const schema = {
  ...defaultSchema,
  tagNames: [
    "p", "br", "strong", "em", "del", "code", "pre",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "hr",
    "a", "img", "table", "thead", "tbody", "tr", "th", "td",
  ],
  attributes: {
    ...defaultSchema.attributes,
    // `className` on `code` is how the fence language survives; anything else
    // an author writes is dropped.
    code: [["className", /^language-./]],
    a: ["href", "title"],
    // No `width`/`height`/`style`: sizing is the stylesheet's job below, and
    // `style` is an injection surface not worth reopening for layout control.
    img: ["src", "alt", "title"],
    "*": [],
  },
  /**
   * The one injection vector a node-based renderer still has: URL schemes.
   *
   * `src` is restricted to http(s) — **notably excluding `data:`**. A
   * `data:image/svg+xml` URI is an SVG document rendered from our own page, and
   * SVG can carry script; allowing it here would undo the raster-only
   * allowlist the upload endpoint enforces on the server. Images have to come
   * from a URL, which in practice means our own bucket.
   */
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
  },
};

interface MarkdownProps {
  children: string;
  /** Extra classes on the wrapper, for surfaces with their own type scale. */
  className?: string;
}

export const Markdown = ({ children, className }: MarkdownProps) => (
  <div className={cn("app-prose", className)}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeSanitize, schema]]}
      components={{
        // Links leave the app, so they get the usual noopener treatment —
        // `target="_blank"` without `rel="noreferrer"` hands the opened page a
        // handle back to this one.
        a: ({ href, children: linkChildren }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {linkChildren}
          </a>
        ),
        // `loading="lazy"` because a problem statement can carry several
        // screenshots and only the first is usually in view. `decoding="async"`
        // keeps a large image off the main thread while it paints.
        img: ({ src, alt, title }) => (
          <img
            src={typeof src === "string" ? src : undefined}
            alt={alt ?? ""}
            title={title}
            loading="lazy"
            decoding="async"
            className="my-3 h-auto max-w-full rounded-lg border border-border"
          />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);
