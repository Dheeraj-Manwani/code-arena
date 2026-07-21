import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import { env, isImageUploadConfigured } from "../config/env";
import { sniffImage, type ImageKind } from "./imageSniff";
import { AppError } from "../errors/app-error";
import { logger } from "../lib/logger";

/**
 * Image uploads for problem descriptions, backed by Cloudflare R2.
 *
 * R2 speaks the S3 API, so this is `@aws-sdk/client-s3` pointed at an R2
 * endpoint rather than a separate client library.
 *
 * ## The three rules that make serving user-supplied files safe
 *
 * Uploaded images are served from a domain and embedded in every learner's
 * page, which makes this an XSS surface, not just a storage problem:
 *
 *  1. **The bytes decide the type, not the client.** `Content-Type` and the
 *     filename both come from the uploader and neither is evidence of
 *     anything. The magic-number sniff below is what actually classifies the
 *     file, and what we store as its `ContentType`.
 *  2. **No SVG. Ever.** An SVG is a document, not a picture: it can carry
 *     `<script>` and event handlers, and served from your own origin it runs
 *     with your origin's privileges. Every other raster format here is inert.
 *     This is why the allowlist is by sniffed magic number and not by
 *     "anything starting with image/".
 *  3. **The stored key is ours.** The original filename is never used to build
 *     a path — a name like `../../index.html` or one carrying its own
 *     extension is how a bucket gets a file that isn't the type it claims.
 */

/**
 * Built lazily so the process can boot without R2 configured.
 *
 * Same posture as Google OAuth in `config/env.ts`: an unset integration means
 * the feature is off and its endpoint says so, not that the server refuses to
 * start. A dev working on the judge should not need storage credentials.
 */
let client: S3Client | null = null;

function r2(): S3Client {
  if (client) return client;

  client = new S3Client({
    // R2 ignores the region but the SDK requires one.
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
    /**
     * Required for R2, not optional tuning.
     *
     * @aws-sdk/client-s3 v3.729.0 began sending `x-amz-checksum-crc32` on
     * PutObject by default, which R2 rejects outright with
     * "NotImplemented: Header 'x-amz-checksum-crc32' ... not implemented".
     * WHEN_REQUIRED sends a checksum only where the API actually demands one,
     * which is Cloudflare's documented workaround. Removing these two lines
     * breaks every upload against R2.
     */
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return client;
}

export interface UploadedImage {
  /** Absolute, public URL to embed in markdown. */
  url: string;
  /** Object key, so a future cleanup job can find it. */
  key: string;
  contentType: ImageKind;
  bytes: number;
}

/**
 * Stores one image and returns the URL to embed.
 *
 * The key is `problem-images/<uuid>.<ext>` — flat, random, and derived entirely
 * from what we sniffed. Nothing the uploader controls reaches the path.
 */
export async function uploadImage(file: Buffer): Promise<UploadedImage> {
  if (!isImageUploadConfigured) {
    throw new AppError(
      "Image uploads are not configured on this server",
      501,
      "UPLOAD_NOT_CONFIGURED",
    );
  }

  const signature = sniffImage(file);
  if (!signature) {
    throw new AppError(
      "That file isn't a PNG, JPEG, WebP or GIF image",
      400,
      "UPLOAD_UNSUPPORTED_TYPE",
    );
  }

  const key = `problem-images/${randomUUID()}.${signature.extension}`;

  try {
    await r2().send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
        Body: file,
        // The sniffed type, never the client's claim — this header is what a
        // browser trusts when deciding how to render the response.
        ContentType: signature.kind,
        // Belt and braces against a crafted file that survives sniffing:
        // `inline` is what we want for an image, and nosniff stops the browser
        // second-guessing the Content-Type we just set.
        ContentDisposition: "inline",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (err) {
    logger.error({ err: String(err), key }, "R2 upload failed");
    throw new AppError("Couldn't store that image", 502, "UPLOAD_FAILED");
  }

  return {
    // Trailing slashes are a common way to configure this wrong; normalise
    // rather than emit a URL with a double slash that some CDNs 404.
    url: `${env.R2_PUBLIC_URL!.replace(/\/+$/, "")}/${key}`,
    key,
    contentType: signature.kind,
    bytes: file.length,
  };
}
