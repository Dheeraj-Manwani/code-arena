/**
 * The progress-spreadsheet round trip (LEARN_PATHS.md §3.9).
 *
 * The property that matters is that export → edit → import survives a real
 * Excel file: the hidden id column has to come back readable, and the Completed
 * column has to be understood however the user's spreadsheet program decided to
 * store "yes". These tests write and re-read genuine .xlsx buffers rather than
 * mocking ExcelJS, because every bug this feature can have lives in that
 * serialisation, not in the logic around it.
 *
 * Pure — no DB. Which rows are *allowed* to change is `learn.service`'s job and
 * is not tested here.
 */
import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";

import {
  buildProgressWorkbook,
  parseProgressWorkbook,
  type WorkbookQuestion,
  type WorkbookPath,
} from "./learnWorkbook";

const question = (over: Partial<WorkbookQuestion> = {}): WorkbookQuestion => ({
  questionId: 1,
  moduleTitle: "Binary Search",
  lessonTitle: "Search Space",
  title: "Guess Number Higher or Lower",
  kind: "problem",
  difficulty: "easy",
  solveUrl: "https://app.test/problems/guess-number/solve",
  isComplete: false,
  source: null,
  ...over,
});

const path = (questions: WorkbookQuestion[]): WorkbookPath => ({
  slug: "dsa-essentials",
  title: "DSA Essentials",
  questions,
});

/** Re-opens a built workbook so assertions run against the real file. */
const reopen = async (buffer: Buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  return workbook.getWorksheet("Progress")!;
};

describe("buildProgressWorkbook", () => {
  it("writes one row per question, in path order", async () => {
    const buffer = await buildProgressWorkbook(
      path([
        question({ questionId: 10, title: "First" }),
        question({ questionId: 11, title: "Second" }),
        question({ questionId: 12, title: "Third" }),
      ]),
    );

    const sheet = await reopen(buffer);

    // +1 for the header row.
    expect(sheet.rowCount).toBe(4);
    expect(sheet.getRow(2).getCell(4).value).toBe("First");
    expect(sheet.getRow(3).getCell(4).value).toBe("Second");
    expect(sheet.getRow(4).getCell(4).value).toBe("Third");
  });

  it("keeps the id column present but hidden", async () => {
    const buffer = await buildProgressWorkbook(path([question({ questionId: 42 })]));
    const sheet = await reopen(buffer);

    expect(sheet.getColumn(1).hidden).toBe(true);
    // Hidden must still mean *written* — this is the import key.
    expect(sheet.getRow(2).getCell(1).value).toBe(42);
  });

  it("writes the solve URL as a clickable link", async () => {
    const buffer = await buildProgressWorkbook(
      path([question({ solveUrl: "https://app.test/problems/two-sum/solve" })]),
    );
    const sheet = await reopen(buffer);

    const cell = sheet.getRow(2).getCell(7).value as { hyperlink: string; text: string };
    expect(cell.hyperlink).toBe("https://app.test/problems/two-sum/solve");
    expect(cell.text).toBe("Open");
  });

  /**
   * Cells are locked by default in xlsx, so "editable" is the state that has to
   * be written explicitly. Asserting it the other way round passes trivially and
   * would have hidden the fact that nothing was unlocked at all.
   */
  it("leaves only the editable Completed cells unlocked", async () => {
    const buffer = await buildProgressWorkbook(
      path([
        question({ questionId: 1, isComplete: true, source: "verified" }),
        question({ questionId: 2, isComplete: true, source: "self_marked" }),
        question({ questionId: 3, kind: "mcq", solveUrl: null }),
      ]),
    );
    const sheet = await reopen(buffer);

    // Verified: cannot be un-ticked (§3 D3), so it stays at the locked default.
    expect(sheet.getRow(2).getCell(8).protection?.locked).not.toBe(false);
    // Self-marked: the one row the user may actually change.
    expect(sheet.getRow(3).getCell(8).protection?.locked).toBe(false);
    // MCQ: earned by answering, never claimed by hand.
    expect(sheet.getRow(4).getCell(8).protection?.locked).not.toBe(false);
  });
});

describe("parseProgressWorkbook", () => {
  it("round-trips an unedited export", async () => {
    const buffer = await buildProgressWorkbook(
      path([
        question({ questionId: 1, isComplete: true, source: "verified" }),
        question({ questionId: 2, isComplete: true, source: "self_marked" }),
        question({ questionId: 3, isComplete: false }),
      ]),
    );

    const { rows, malformedRows } = await parseProgressWorkbook(buffer);

    expect(malformedRows).toEqual([]);
    expect(rows).toEqual([
      { questionId: 1, completed: true },
      { questionId: 2, completed: true },
      { questionId: 3, completed: false },
    ]);
  });

  it("reads an edited tick back out", async () => {
    const buffer = await buildProgressWorkbook(
      path([question({ questionId: 7, isComplete: false })]),
    );

    // Edit the file the way a user would, then re-serialise it.
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    workbook.getWorksheet("Progress")!.getRow(2).getCell(8).value = "YES";
    const edited = Buffer.from(await workbook.xlsx.writeBuffer());

    const { rows } = await parseProgressWorkbook(edited);
    expect(rows).toEqual([{ questionId: 7, completed: true }]);
  });

  /**
   * The tolerance that makes this usable. A round trip through Excel, Google
   * Sheets, or LibreOffice can turn a typed "yes" into any of these before it
   * ever reaches us.
   */
  it.each([
    ["YES", true],
    ["yes", true],
    ["Y", true],
    ["true", true],
    [true, true],
    [1, true],
    ["x", true],
    ["Done", true],
    ["NO", false],
    ["no", false],
    ["false", false],
    [false, false],
    [0, false],
    ["", false],
    ["-", false],
  ])("understands %j as %j", async (written, expected) => {
    const buffer = await buildProgressWorkbook(path([question({ questionId: 5 })]));

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    workbook.getWorksheet("Progress")!.getRow(2).getCell(8).value = written;
    const edited = Buffer.from(await workbook.xlsx.writeBuffer());

    const { rows } = await parseProgressWorkbook(edited);
    expect(rows).toEqual([{ questionId: 5, completed: expected }]);
  });

  it("reports an uninterpretable Completed cell instead of guessing", async () => {
    const buffer = await buildProgressWorkbook(
      path([question({ questionId: 1 }), question({ questionId: 2 })]),
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    workbook.getWorksheet("Progress")!.getRow(3).getCell(8).value = "maybe?";
    const edited = Buffer.from(await workbook.xlsx.writeBuffer());

    const { rows, malformedRows } = await parseProgressWorkbook(edited);

    // The good row still applies; only the ambiguous one is held back.
    expect(rows).toEqual([{ questionId: 1, completed: false }]);
    expect(malformedRows).toEqual([3]);
  });

  it("skips a row whose id was deleted rather than matching on title", async () => {
    const buffer = await buildProgressWorkbook(
      path([question({ questionId: 1 }), question({ questionId: 2 })]),
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.getWorksheet("Progress")!;
    sheet.getRow(2).getCell(1).value = null;
    sheet.getRow(2).getCell(8).value = "YES";
    const edited = Buffer.from(await workbook.xlsx.writeBuffer());

    const { rows } = await parseProgressWorkbook(edited);
    expect(rows).toEqual([{ questionId: 2, completed: false }]);
  });

  it("takes the last occurrence when a row was duplicated", async () => {
    const buffer = await buildProgressWorkbook(path([question({ questionId: 3 })]));

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.getWorksheet("Progress")!;
    sheet.getRow(3).values = [3, "M", "L", "Dup", "Problem", "easy", "—", "YES", "—"];
    const edited = Buffer.from(await workbook.xlsx.writeBuffer());

    const { rows } = await parseProgressWorkbook(edited);
    expect(rows).toEqual([{ questionId: 3, completed: true }]);
  });

  it("rejects a file that is not a workbook", async () => {
    await expect(
      parseProgressWorkbook(Buffer.from("this is definitely not a spreadsheet")),
    ).rejects.toThrow();
  });
});
