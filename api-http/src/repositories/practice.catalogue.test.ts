/**
 * The practiceable rule (PRACTICE_MODE_AND_NAVIGATION.md §4.4).
 *
 * This is the contest-integrity guard: it decides which problems the public
 * catalogue is allowed to reveal. A regression here leaks a live contest's
 * problems (and their sample tests) to participants mid-contest, so the rule is
 * asserted directly rather than through a query.
 *
 * Prisma is mocked — this stays a DB-free unit test.
 */
import { describe, it, expect } from "vitest";

import { practiceableWhere } from "./problem.repository";

const NOW = new Date("2026-07-15T12:00:00.000Z");

/** The nested `contest` filter that decides what gets withheld. */
const withheldContestFilter = (now: Date) => {
  const where = practiceableWhere(now);
  const notClause = where.NOT as {
    contestLinks: { some: { contest: Record<string, unknown> } };
  };
  return notClause.contestLinks.some.contest;
};

describe("practiceableWhere", () => {
  it("only ever offers problems explicitly marked public", () => {
    expect(practiceableWhere(NOW).visibility).toBe("public");
  });

  it("excludes rather than includes — draft and contest_only can't slip in", () => {
    // A bare `visibility: 'public'` equality (not an `in`/`not`) is what keeps
    // draft and contest_only out; assert it isn't loosened to a range.
    expect(typeof practiceableWhere(NOW).visibility).toBe("string");
  });

  it("withholds problems linked to an unfinished published competitive contest", () => {
    const contest = withheldContestFilter(NOW);

    expect(contest.status).toBe("published");
    expect(contest.type).toBe("competitive");
    // "Not finished" = ends in the future, or has no end at all.
    expect(contest.OR).toEqual([{ endTime: { gt: NOW } }, { endTime: null }]);
  });

  it("treats a null endTime as never-finished, so it stays withheld", () => {
    const contest = withheldContestFilter(NOW);
    const orClause = contest.OR as Array<Record<string, unknown>>;

    expect(orClause).toContainEqual({ endTime: null });
  });

  it("scopes the withhold to competitive contests only", () => {
    // Practice-type contests are self-paced and unranked — nothing to protect,
    // so they must not withhold a problem from the catalogue.
    expect(withheldContestFilter(NOW).type).toBe("competitive");
  });

  it("ignores draft and cancelled contests when withholding", () => {
    // Only `published` contests withhold: a draft contest's problems aren't
    // visible to participants anyway, and shouldn't block practice.
    expect(withheldContestFilter(NOW).status).toBe("published");
  });

  it("threads the caller's clock through, so 'finished' is evaluated at request time", () => {
    const later = new Date("2027-01-01T00:00:00.000Z");
    const contest = withheldContestFilter(later);
    const orClause = contest.OR as Array<{ endTime?: { gt?: Date } }>;

    expect(orClause[0].endTime?.gt).toBe(later);
  });
});
