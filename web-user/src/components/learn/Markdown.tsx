import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

/**
 * Lesson prose (LEARN_PATHS.md §5.8).
 *
 * `LearnLesson.body` is creator-authored, but creator-authored is not the same
 * as trusted: it lands in every learner's DOM, so a single stored `<script>` or
 * `onerror=` would be an XSS affecting everyone who opens the lesson.
 *
 * Two defences, and the first is the one that actually matters:
 *
 *  1. **Raw HTML is never parsed.** `react-markdown` only turns HTML into nodes
 *     when `rehype-raw` is added, and it is deliberately absent. Without it,
 *     `<script>alert(1)</script>` in a lesson is *text*, and React escapes text.
 *  2. **`rehype-sanitize` on top**, with a schema narrowed further than its
 *     default. Belt and braces: if someone later adds `rehype-raw` without
 *     reading this comment, the sanitiser is already in the pipeline.
 *
 * There is no `dangerouslySetInnerHTML` anywhere in this component, and adding
 * one would defeat both defences at once.
 */

/**
 * Narrower than `defaultSchema`: lessons need prose, code and links, not
 * arbitrary markup. Everything not listed is stripped rather than escaped.
 */
const schema = {
  ...defaultSchema,
  tagNames: [
    "p", "br", "strong", "em", "del", "code", "pre",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "hr",
    "a", "table", "thead", "tbody", "tr", "th", "td",
  ],
  attributes: {
    ...defaultSchema.attributes,
    // `className` on `code` is how the fence language survives; anything else
    // an author writes is dropped.
    code: [["className", /^language-./]],
    a: ["href", "title"],
    "*": [],
  },
  // The one injection vector a node-based renderer still has: `javascript:` and
  // `data:` URLs in links. Restricting the allowed protocols closes it.
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
  },
};

interface MarkdownProps {
  children: string;
}

export const Markdown = ({ children }: MarkdownProps) => (
  <div className="learn-prose">
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
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);
