import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

/**
 * Preview renderer for authored markdown.
 *
 * **This must stay in step with `web-user/src/components/common/Markdown.tsx`.**
 * It is a deliberate copy rather than a shared package — the repo already
 * duplicates contracts across packages this way (see the `judge0.schema.ts`
 * copies) — but the point of a preview is to show the author what a learner
 * will see. If the two schemas drift, the preview starts lying: markup that
 * renders here gets stripped there, and an author ships a broken statement
 * believing they checked it.
 *
 * The security reasoning is identical and applies just as much here: no
 * `rehype-raw`, no `dangerouslySetInnerHTML`, and a narrowed sanitiser schema.
 * Admin users are not exempt — a creator previewing another creator's draft is
 * exactly the case this protects.
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
    code: [["className", /^language-./]],
    a: ["href", "title"],
    img: ["src", "alt", "title"],
    "*": [],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    // No `data:` — a data:image/svg+xml URI is a script-capable document.
    src: ["http", "https"],
  },
};

interface MarkdownProps {
  children: string;
}

export const Markdown = ({ children }: MarkdownProps) => (
  <div className="app-prose">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeSanitize, schema]]}
      components={{
        a: ({ href, children: linkChildren }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {linkChildren}
          </a>
        ),
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
