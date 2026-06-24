import { describe, it, expect } from "vitest";
import { BoilerplateSignatureSchema } from "./problem.schema";

const base = {
  functionName: "solve",
  className: "Solution",
  useClassWrapper: true,
};

describe("BoilerplateSignatureSchema — ListNode/TreeNode rejection (issues.md §7.3)", () => {
  it("accepts a signature using only literal/array types", () => {
    const result = BoilerplateSignatureSchema.safeParse({
      ...base,
      returnType: "int[]",
      parameters: [
        { name: "nums", type: "int[]" },
        { name: "target", type: "int" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a ListNode parameter with a clear message", () => {
    const result = BoilerplateSignatureSchema.safeParse({
      ...base,
      returnType: "int",
      parameters: [{ name: "head", type: "ListNode" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/ListNode/);
      expect(result.error.issues[0].message).toMatch(/not supported/i);
    }
  });

  it("rejects a TreeNode return type", () => {
    const result = BoilerplateSignatureSchema.safeParse({
      ...base,
      returnType: "TreeNode",
      parameters: [{ name: "root", type: "int[]" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/TreeNode/);
    }
  });

  it("reports both offending types when ListNode and TreeNode are mixed", () => {
    const result = BoilerplateSignatureSchema.safeParse({
      ...base,
      returnType: "ListNode",
      parameters: [{ name: "root", type: "TreeNode" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      expect(msg).toMatch(/ListNode/);
      expect(msg).toMatch(/TreeNode/);
    }
  });
});
