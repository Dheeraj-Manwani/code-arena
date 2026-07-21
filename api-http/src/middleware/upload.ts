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
 * Turns multer's own errors into the standard response envelope.
 *
 * Multer rejects before the route handler runs, so without this an oversized
 * upload escapes as an unhandled `MulterError` and surfaces as a 500 — a client
 * mistake reported as a server fault.
 */
export const handleUploadError: ErrorRequestHandler = (err, _req, res, next) => {
  if (!(err instanceof multer.MulterError)) return next(err);

  if (err.code === "LIMIT_FILE_SIZE") {
    return sendError(res, ApiErrorCode.LEARN_IMPORT_TOO_LARGE, 400);
  }

  return sendError(res, ApiErrorCode.LEARN_IMPORT_NO_FILE, 400);
};
