/**
 * Content-based image classification.
 *
 * Deliberately free of config, Prisma and the AWS SDK: this is the security
 * boundary for uploads, so it has to be unit-testable without an environment.
 * `config/env.ts` exits the process when required variables are missing, and CI
 * runs `vitest` with no `.env` — a pure module importing it would take the
 * whole suite down.
 *
 * ## Why the bytes decide, and not the headers
 *
 * `Content-Type` and the filename both come from the uploader, so neither is
 * evidence of anything. What is stored, and what `Content-Type` it is later
 * served with, is decided here from the file's own magic number.
 *
 * ## Why the allowlist is raster-only
 *
 * SVG is a document, not a picture: it can carry `<script>` and event handlers,
 * and served from our own origin it runs with our origin's privileges. Every
 * format below is inert. This is an allowlist rather than an SVG denylist for
 * that reason — "anything starting with image/" would let SVG straight through.
 */

/** Formats we accept, keyed by the Content-Type we will store and serve. */
export type ImageKind = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export interface ImageSignature {
  kind: ImageKind;
  extension: string;
  matches: (buffer: Buffer) => boolean;
}

/** Length-checked prefix test, so a truncated file can't read past the end. */
const startsWith = (buffer: Buffer, bytes: number[]): boolean =>
  buffer.length >= bytes.length && bytes.every((byte, i) => buffer[i] === byte);

const SIGNATURES: ImageSignature[] = [
  {
    kind: "image/png",
    extension: "png",
    matches: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    kind: "image/jpeg",
    extension: "jpg",
    matches: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  },
  {
    kind: "image/gif",
    extension: "gif",
    // GIF87a / GIF89a
    matches: (b) => startsWith(b, [0x47, 0x49, 0x46, 0x38]),
  },
  {
    kind: "image/webp",
    extension: "webp",
    // WebP is a RIFF container, so the first four bytes are shared with WAV and
    // AVI. The format marker at offset 8 is what actually identifies it.
    matches: (b) =>
      startsWith(b, [0x52, 0x49, 0x46, 0x46]) &&
      b.length >= 12 &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

/**
 * Classifies by content. Returns null for anything off the allowlist —
 * including SVG, which is text and has no magic number to match here at all.
 */
export function sniffImage(buffer: Buffer): ImageSignature | null {
  return SIGNATURES.find((signature) => signature.matches(buffer)) ?? null;
}
