import multer from "multer";
import type { ErrorRequestHandler } from "express";
import { sendError } from "../util/response";
import { ApiErrorCode } from "../schema/error.schema";

/**
 * Spreadsheet upload for the learn-path progress import (LEARN_PATHS.md §3.9).
 *
 * ## Memory storage, and why the size cap is the load-bearing part
 *
 * The file is parsed once and discarded, so writing it to disk would only add a
 * temp file to clean up on every failure path. That makes the cap the only thing
 * standing between an upload and the heap: without it, `memoryStorage` will
 * happily buffer a multi-gigabyte body per concurrent request.
 *
 * 5 MB is far above a real sheet — the largest path is a few hundred rows, which
 * is tens of kilobytes — and far below anything that threatens the process.
 */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const uploadSpreadsheet = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    // One file, no stray text fields: this endpoint takes a sheet and nothing
    // else, and an unbounded field count is its own small DoS.
    files: 1,
    fields: 0,
  },
  fileFilter: (_req, file, cb) => {
    // Advisory only. The client sets both the mimetype and the filename, so
    // neither is evidence of anything — the real validation is ExcelJS failing
    // to parse a non-workbook, which `importPathProgress` turns into a 400.
    // This exists to give an obviously-wrong upload (a .png, a .pdf) a clear
    // message instead of an opaque parse failure.
    const looksRight =
      file.mimetype === XLSX_MIME ||
      file.mimetype === "application/octet-stream" ||
      file.originalname.toLowerCase().endsWith(".xlsx");

    cb(null, looksRight);
  },
}).single("file");

/**
 * Description images (problem authoring).
 *
 * 2 MB because these are screenshots and diagrams inside a problem statement,
 * not photography — and because the cap is the only thing bounding how much a
 * creator can push into the bucket per request.
 *
 * There is no `fileFilter` by mimetype here on purpose. The client sets that
 * header, so filtering on it would look like validation while checking nothing;
 * `upload.service.ts` classifies by magic number instead, which is what
 * actually decides whether the bytes are an image.
 */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const uploadImageFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0 },
}).single("file");

/**
 * Turns multer's own errors into the standard response envelope.
 *
 * Multer rejects before the route handler runs, so without this an oversized
 * upload escapes as an unhandled `MulterError` and surfaces as a 500 — a client
 * mistake reported as a server fault.
 *
 * A factory rather than one shared handler because the two upload routes want
 * different copy: "that spreadsheet is too big" and "that image is too big"
 * have different fixes, and a single generic code would make the client guess
 * which one it was looking at.
 */
const uploadErrorHandler =
  (codes: { tooLarge: ApiErrorCode; invalid: ApiErrorCode }): ErrorRequestHandler =>
  (err, _req, res, next) => {
    if (!(err instanceof multer.MulterError)) return next(err);

    if (err.code === "LIMIT_FILE_SIZE") {
      return sendError(res, codes.tooLarge, 400);
    }

    return sendError(res, codes.invalid, 400);
  };

export const handleUploadError = uploadErrorHandler({
  tooLarge: ApiErrorCode.LEARN_IMPORT_TOO_LARGE,
  invalid: ApiErrorCode.LEARN_IMPORT_NO_FILE,
});

export const handleImageUploadError = uploadErrorHandler({
  tooLarge: ApiErrorCode.UPLOAD_TOO_LARGE,
  invalid: ApiErrorCode.UPLOAD_NO_FILE,
});
