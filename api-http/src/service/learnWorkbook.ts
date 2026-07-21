import ExcelJS from "exceljs";

/**
 * The learn-path progress spreadsheet (LEARN_PATHS.md §3.9).
 *
 * One round-trippable artefact: export gives the learner every question in the
 * path with a `Completed` column, and import reads that same column back and
 * applies it. Deliberately *progress only* — it never carries curriculum, so a
 * learner editing their sheet can never reshape the path itself.
 *
 * ## Why identity is a hidden numeric column, not the title
 *
 * Titles are not stable (a curator can rename a problem) and not unique (the
 * same problem legitimately appears in several lessons). Matching on them would
 * silently mis-apply progress after any rename. The `Question ID` column is the
 * real key; it is hidden rather than deleted because a visible surrogate key is
 * noise the learner would be tempted to "tidy up", and a deleted one makes the
 * file unimportable.
 *
 * This module is deliberately free of Prisma and Express: it turns rows into a
 * buffer and a buffer back into rows, which is what makes both directions
 * testable without a database or an HTTP layer.
 */

/** Where the question id lives. Import reads this column and nothing else for identity. */
const ID_COLUMN = 1;
/** Where the tick lives. The only column import interprets. */
const COMPLETED_COLUMN = 8;
const HEADER_ROW = 1;

/** Accepted spellings of "yes" in the Completed column, lowercased. */
const TRUTHY = new Set(["yes", "y", "true", "1", "x", "done", "complete", "completed"]);
/** Accepted spellings of "no". Anything else in the column is a malformed row. */
const FALSY = new Set(["no", "n", "false", "0", "", "-", "—"]);

export interface WorkbookQuestion {
  questionId: number;
  moduleTitle: string;
  lessonTitle: string;
  title: string;
  kind: "problem" | "mcq";
  difficulty: string | null;
  /** Absolute URL to solve it, or null for an MCQ (answered inside the lesson). */
  solveUrl: string | null;
  isComplete: boolean;
  source: "verified" | "self_marked" | null;
}

export interface WorkbookPath {
  slug: string;
  title: string;
  questions: WorkbookQuestion[];
}

const SOURCE_LABEL: Record<"verified" | "self_marked", string> = {
  verified: "Verified",
  self_marked: "Self-marked",
};

/**
 * Builds the .xlsx.
 *
 * Verified rows are visually distinct and their `Completed` cell is locked,
 * because §3 D3 says a verified completion cannot be un-ticked — the import will
 * refuse it, and a sheet that lets you type "NO" into a cell the server will
 * ignore teaches the wrong thing. The lock is a usability affordance, not a
 * security control: sheet protection is trivially removable, which is exactly
 * why `applyProgressImport` re-enforces the same rule server-side.
 */
export const buildProgressWorkbook = async (path: WorkbookPath): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Code Arena";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Progress", {
    views: [{ state: "frozen", ySplit: HEADER_ROW }],
  });

  sheet.columns = [
    { header: "Question ID", key: "questionId", width: 12, hidden: true },
    { header: "Topic", key: "moduleTitle", width: 26 },
    { header: "Lesson", key: "lessonTitle", width: 26 },
    { header: "Question", key: "title", width: 46 },
    { header: "Type", key: "kind", width: 10 },
    { header: "Difficulty", key: "difficulty", width: 12 },
    { header: "Link", key: "link", width: 34 },
    { header: "Completed", key: "completed", width: 12 },
    { header: "Source", key: "source", width: 13 },
  ];

  const header = sheet.getRow(HEADER_ROW);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
  header.alignment = { vertical: "middle" };
  header.height = 22;

  for (const question of path.questions) {
    const row = sheet.addRow({
      questionId: question.questionId,
      moduleTitle: question.moduleTitle,
      lessonTitle: question.lessonTitle,
      title: question.title,
      kind: question.kind === "mcq" ? "MCQ" : "Problem",
      difficulty: question.difficulty ?? "—",
      // Text stays "Open" rather than the raw URL: the sheet is read by humans,
      // and a column of long slugs buries the columns either side of it.
      link: question.solveUrl ? { text: "Open", hyperlink: question.solveUrl } : "—",
      completed: question.isComplete ? "YES" : "NO",
      source: question.source ? SOURCE_LABEL[question.source] : "—",
    });

    if (question.solveUrl) {
      row.getCell("link").font = { color: { argb: "FF2563EB" }, underline: true };
    }

    const completedCell = row.getCell(COMPLETED_COLUMN);
    completedCell.alignment = { horizontal: "center" };

    const editable = question.source !== "verified" && question.kind === "problem";

    if (editable) {
      // Cells in xlsx are locked by DEFAULT, and that default only bites once
      // the sheet is protected. So the editable cells are the ones that need an
      // explicit `locked: false` — setting `locked: true` on the others would
      // serialise nothing and leave the whole sheet uniformly read-only.
      completedCell.protection = { locked: false };

      // A dropdown beats free text: it removes the "did they type Yes or TRUE"
      // question at the source, even though the parser tolerates both.
      completedCell.dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: ['"YES,NO"'],
        showErrorMessage: true,
        errorTitle: "Use YES or NO",
        error: "Type YES to mark this question complete, or NO to clear it.",
      };
    } else {
      completedCell.font = { color: { argb: "FF6B7280" }, italic: true };
    }

    if (question.source === "verified") {
      row.getCell("source").font = { color: { argb: "FF16A34A" }, bold: true };
    }
  }

  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 2 },
    to: { row: HEADER_ROW + path.questions.length, column: 9 },
  };

  // Unlocked-by-default so only the cells marked `locked` above resist editing.
  // Without a password the user can lift this in one click, which is the point:
  // it steers, it does not obstruct.
  await sheet.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    autoFilter: true,
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
};

export interface ParsedRow {
  questionId: number;
  completed: boolean;
}

export interface ParseResult {
  rows: ParsedRow[];
  /** 1-based sheet row numbers whose Completed cell was neither yes nor no. */
  malformedRows: number[];
}

/** Reads whatever a spreadsheet put in a cell back into a string. */
const cellText = (value: ExcelJS.CellValue): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  // A formula cell carries its computed result; that is what the user sees, so
  // that is what we read.
  if (typeof value === "object" && "result" in value) return cellText(value.result ?? "");
  if (typeof value === "object" && "text" in value) return String(value.text ?? "");
  if (typeof value === "object" && "richText" in value) {
    return value.richText.map((part) => part.text).join("");
  }
  return String(value);
};

/**
 * Reads a previously exported sheet back into intents.
 *
 * Tolerant on purpose about *format* — a round trip through Excel, Google
 * Sheets, and LibreOffice turns "YES" into `TRUE`, `1`, or a rich-text run
 * depending on the path taken — and strict about *identity*: a row whose hidden
 * id is missing or non-numeric is skipped rather than guessed at from its title.
 *
 * Rows are returned, not applied. Whether a question is actually in this path is
 * the caller's business, because only the caller knows which path was requested.
 */
export const parseProgressWorkbook = async (buffer: Buffer): Promise<ParseResult> => {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS declares its own `Buffer` interface that Node's generic
  // `Buffer<ArrayBufferLike>` no longer structurally satisfies. The value is a
  // real Node Buffer, which is what the implementation reads.
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const sheet = workbook.getWorksheet("Progress") ?? workbook.worksheets[0];
  if (!sheet) return { rows: [], malformedRows: [] };

  const rows: ParsedRow[] = [];
  const malformedRows: number[] = [];
  // A re-uploaded sheet can legitimately contain the same question twice if the
  // user duplicated a row; last write wins, which matches how they'd read it.
  const seen = new Map<number, number>();

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === HEADER_ROW) return;

    const rawId = cellText(row.getCell(ID_COLUMN).value).trim();
    if (!rawId) return;

    const questionId = Number(rawId);
    if (!Number.isInteger(questionId) || questionId <= 0) return;

    const rawCompleted = cellText(row.getCell(COMPLETED_COLUMN).value).trim().toLowerCase();

    let completed: boolean;
    if (TRUTHY.has(rawCompleted)) {
      completed = true;
    } else if (FALSY.has(rawCompleted)) {
      completed = false;
    } else {
      malformedRows.push(rowNumber);
      return;
    }

    const existing = seen.get(questionId);
    if (existing !== undefined) {
      rows[existing] = { questionId, completed };
      return;
    }

    seen.set(questionId, rows.length);
    rows.push({ questionId, completed });
  });

  return { rows, malformedRows };
};
