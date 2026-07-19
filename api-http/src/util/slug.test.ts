import { describe, it, expect } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and dashes a plain title", () => {
    expect(slugify("Two Sum")).toBe("two-sum");
  });

  it("collapses runs of non-alphanumerics to a single dash", () => {
    expect(slugify("Longest Substring -- Without   Repeating!")).toBe(
      "longest-substring-without-repeating",
    );
  });

  it("strips leading and trailing dashes", () => {
    expect(slugify("  ...Valid Parentheses?  ")).toBe("valid-parentheses");
  });

  it("keeps digits", () => {
    expect(slugify("3Sum Closest")).toBe("3sum-closest");
  });

  it("falls back to 'problem' when a title has no alphanumerics", () => {
    expect(slugify("***")).toBe("problem");
    expect(slugify("")).toBe("problem");
  });

  it("matches the SQL backfill for an en-dash title", () => {
    // The seed builds titles like "Two Sum – C12"; the en-dash is not [a-z0-9]
    // so it collapses like any other separator, same as the migration's regex.
    expect(slugify("Two Sum – C12")).toBe("two-sum-c12");
  });
});
