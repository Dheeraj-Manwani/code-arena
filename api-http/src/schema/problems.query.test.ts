import { describe, it, expect } from "vitest";
import { GetProblemsSchema, MAX_CATALOGUE_LIMIT } from "./problem.schema";

describe("GetProblemsSchema — catalogue query (PRACTICE_MODE_AND_NAVIGATION.md §4.5)", () => {
  it("defaults to page 1, newest first", () => {
    const result = GetProblemsSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortBy).toBe("newest");
    expect(result.difficulty).toBeUndefined();
    expect(result.tags).toBeUndefined();
  });

  it("caps limit so a client can't request the whole table", () => {
    const result = GetProblemsSchema.safeParse({ limit: String(MAX_CATALOGUE_LIMIT + 1) });
    expect(result.success).toBe(false);
  });

  it("rejects a page below 1", () => {
    expect(GetProblemsSchema.safeParse({ page: "0" }).success).toBe(false);
  });

  it("parses repeated tags params into an array", () => {
    const result = GetProblemsSchema.parse({ tags: ["dp", "graph"] });
    expect(result.tags).toEqual(["dp", "graph"]);
  });

  it("splits a comma-separated tags param and trims each", () => {
    const result = GetProblemsSchema.parse({ tags: "dp, graph , trees" });
    expect(result.tags).toEqual(["dp", "graph", "trees"]);
  });

  it("treats an all-empty tags param as no filter", () => {
    expect(GetProblemsSchema.parse({ tags: " , " }).tags).toBeUndefined();
  });

  it("treats a whitespace-only search as no filter", () => {
    expect(GetProblemsSchema.parse({ search: "   " }).search).toBeUndefined();
  });

  it("rejects an unknown sort key rather than silently ignoring it", () => {
    expect(GetProblemsSchema.safeParse({ sortBy: "acceptance" }).success).toBe(false);
  });

  it("rejects an unknown difficulty", () => {
    expect(GetProblemsSchema.safeParse({ difficulty: "impossible" }).success).toBe(false);
  });
});

describe("GetProblemsSchema — Phase 5 stats controls (§4.5)", () => {
  it("accepts the acceptance-rate and most-solved sorts", () => {
    expect(GetProblemsSchema.parse({ sortBy: "acceptance-desc" }).sortBy).toBe(
      "acceptance-desc",
    );
    expect(GetProblemsSchema.parse({ sortBy: "acceptance-asc" }).sortBy).toBe(
      "acceptance-asc",
    );
    expect(GetProblemsSchema.parse({ sortBy: "most-solved" }).sortBy).toBe("most-solved");
  });

  it("accepts each status filter", () => {
    for (const status of ["solved", "attempted", "todo"] as const) {
      expect(GetProblemsSchema.parse({ status }).status).toBe(status);
    }
  });

  it("defaults status to undefined (no filter)", () => {
    expect(GetProblemsSchema.parse({}).status).toBeUndefined();
  });

  it("rejects an unknown status rather than silently ignoring it", () => {
    expect(GetProblemsSchema.safeParse({ status: "starred" }).success).toBe(false);
  });
});
