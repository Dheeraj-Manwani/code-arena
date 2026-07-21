import { describe, it, expect } from "vitest";
import {
  AddMcqSchema,
  AddDsaSchema,
  UpdateMcqSchema,
  UpdateDsaSchema,
} from "./problem.schema";

/**
 * Visibility is the switch that decides whether a question can leave the
 * question bank (LEARN_PATHS.md Phase 0). Two properties matter and neither is
 * obvious from reading the schema:
 *
 *  1. Omitting it must NOT publish. The field is optional, and an optional field
 *     that silently defaulted to `public` would put every newly created problem
 *     in the practice catalogue.
 *  2. Only the three known values are accepted, so a typo'd `"publik"` fails
 *     loudly at the boundary rather than being written and ignored.
 */

const mcq = {
  questionText: "Which traversal visits the root last?",
  options: ["Pre-order", "In-order", "Post-order"],
  correctOptionIndex: 2,
};

const dsa = {
  title: "Two Sum",
  description: "Find two numbers that add to a target.",
  tags: ["array"],
};

describe("visibility on question input schemas", () => {
  it("leaves visibility undefined when omitted, so the DB default (draft) applies", () => {
    const parsedMcq = AddMcqSchema.parse(mcq);
    const parsedDsa = AddDsaSchema.parse(dsa);

    expect(parsedMcq.visibility).toBeUndefined();
    expect(parsedDsa.visibility).toBeUndefined();
  });

  it("never defaults to public", () => {
    expect(AddMcqSchema.parse(mcq).visibility).not.toBe("public");
    expect(AddDsaSchema.parse(dsa).visibility).not.toBe("public");
  });

  it.each(["draft", "public", "contest_only"] as const)(
    "accepts %s on create",
    (visibility) => {
      expect(AddMcqSchema.parse({ ...mcq, visibility }).visibility).toBe(visibility);
      expect(AddDsaSchema.parse({ ...dsa, visibility }).visibility).toBe(visibility);
    },
  );

  it.each(["draft", "public", "contest_only"] as const)(
    "accepts %s on update",
    (visibility) => {
      expect(UpdateMcqSchema.parse({ visibility }).visibility).toBe(visibility);
      expect(UpdateDsaSchema.parse({ visibility }).visibility).toBe(visibility);
    },
  );

  it("rejects an unknown visibility rather than ignoring it", () => {
    expect(AddMcqSchema.safeParse({ ...mcq, visibility: "publik" }).success).toBe(false);
    expect(AddDsaSchema.safeParse({ ...dsa, visibility: "publik" }).success).toBe(false);
    expect(UpdateMcqSchema.safeParse({ visibility: "everyone" }).success).toBe(false);
    expect(UpdateDsaSchema.safeParse({ visibility: "everyone" }).success).toBe(false);
  });

  // The update schemas require at least one field. Visibility alone must satisfy
  // that — flipping a question to public is the single most common edit this
  // feature exists to enable, and it would be absurd to require a second change.
  it("counts visibility alone as a valid update", () => {
    expect(UpdateMcqSchema.safeParse({ visibility: "public" }).success).toBe(true);
    expect(UpdateDsaSchema.safeParse({ visibility: "public" }).success).toBe(true);
  });
});
