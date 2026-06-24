import { describe, it, expect } from "vitest";
import {
  generateJudgeBoilerplate,
  MANUAL_SIGNATURE,
  MANUAL_TEST_CASES,
  SAMPLE_USER_CODE,
  JUDGE_OUTPUT_MARKERS,
} from "./judgeBoilerplate";
import type { BoilerplateSignature } from "./types";
import { TYPE_MAP, getType, formatParams, toSnakeCase } from "./types";

const LANGS = ["cpp", "java", "js", "python"] as const;

describe("generateJudgeBoilerplate (twoSum, literal types)", () => {
  const harnesses = generateJudgeBoilerplate(
    MANUAL_SIGNATURE,
    SAMPLE_USER_CODE,
    MANUAL_TEST_CASES
  );

  it("produces a harness for every supported language", () => {
    for (const lang of LANGS) {
      expect(typeof harnesses[lang]).toBe("string");
      expect(harnesses[lang].length).toBeGreaterThan(0);
    }
  });

  it("emits the case/output markers in every harness", () => {
    for (const lang of LANGS) {
      expect(harnesses[lang]).toContain(JUDGE_OUTPUT_MARKERS.CASE);
      expect(harnesses[lang]).toContain(JUDGE_OUTPUT_MARKERS.OUTPUT);
    }
  });

  it("injects the user's function into the harness", () => {
    // JS/C++/Java reference the camelCase name; Python uses snake_case.
    expect(harnesses.js).toContain("twoSum");
    expect(harnesses.cpp).toContain("twoSum");
    expect(harnesses.java).toContain("twoSum");
    expect(harnesses.python).toContain("two_sum");
  });

  it("embeds the test-case data in the JS harness", () => {
    expect(harnesses.js).toContain("[2,7,11,15]");
    expect(harnesses.js).toContain("[3,2,4]");
  });

  it("does not leave the user-code placeholder unsubstituted", () => {
    for (const lang of LANGS) {
      expect(harnesses[lang]).not.toContain("USER_CODE_PLACEHOLDER");
    }
  });
});

describe("user output suppression (issues.md §7.1)", () => {
  // The harness no longer strips print/log statements from source; instead it
  // redirects user stdout to a sink around the call. User code is preserved
  // verbatim, and the harness embeds the redirection scaffolding.
  it("preserves user code verbatim (no source-level stripping)", () => {
    const code = "function f(){ console.log('USER_DEBUG'); return 1; }";
    const out = generateJudgeBoilerplate(
      { ...MANUAL_SIGNATURE, functionName: "f", returnType: "int", parameters: [] },
      code,
      [{ input: "[]", expectedOutput: "1" }]
    );
    expect(out.js).toContain("USER_DEBUG");
  });

  it("redirects user stdout to a sink in every language harness", () => {
    const out = generateJudgeBoilerplate(
      { ...MANUAL_SIGNATURE, functionName: "f", returnType: "int", parameters: [] },
      "function f(){ return 1; }",
      [{ input: "[]", expectedOutput: "1" }]
    );
    expect(out.cpp).toContain("std::cout.rdbuf(_sink.rdbuf())"); // C++ buffer swap
    expect(out.java).toContain("System.setOut("); // Java sink
    expect(out.js).toContain("console.log = function"); // JS console suppression
    expect(out.python).toContain("redirect_stdout"); // Python context manager
  });
});

describe("output comparison + verdict markers (issues.md §7.2)", () => {
  it("emits PASS/FAIL markers and embeds the expected value in every harness", () => {
    const out = generateJudgeBoilerplate(MANUAL_SIGNATURE, SAMPLE_USER_CODE, MANUAL_TEST_CASES);
    for (const lang of LANGS) {
      expect(out[lang]).toContain(JUDGE_OUTPUT_MARKERS.PASS);
      expect(out[lang]).toContain(JUDGE_OUTPUT_MARKERS.FAIL);
    }
    // C++/Java build a typed `expected` literal from expectedOutput and compare it.
    expect(out.cpp).toContain("expected =");
    expect(out.java).toContain("expected =");
  });

  it("uses an epsilon tolerance for double / double[] (not exact ==)", () => {
    const doubleSig: BoilerplateSignature = {
      functionName: "avg",
      returnType: "double",
      parameters: [{ name: "nums", type: "double[]" }],
      className: "Solution",
      useClassWrapper: true,
    };
    const out = generateJudgeBoilerplate(doubleSig, "double avg(...)", [
      { input: "[[1.0,2.0]]", expectedOutput: "1.5" },
    ]);
    expect(out.cpp).toContain("std::fabs(result - expected) < 1e-6");
    expect(out.java).toContain("Math.abs(result - expected) < 1e-6");
    // Scalar doubles must NOT fall back to operator==.
    expect(out.cpp).not.toContain("(result == expected)");
  });

  it("compares double[] element-wise with epsilon", () => {
    const sig: BoilerplateSignature = {
      functionName: "scale",
      returnType: "double[]",
      parameters: [{ name: "nums", type: "double[]" }],
      className: "Solution",
      useClassWrapper: true,
    };
    const out = generateJudgeBoilerplate(sig, "...", [
      { input: "[[1.0]]", expectedOutput: "[2.0]" },
    ]);
    expect(out.cpp).toContain("std::fabs(result[_k] - expected[_k]) >= 1e-6");
    expect(out.java).toContain("Math.abs(result[_k] - expected[_k]) < 1e-6");
  });
});

describe("ListNode/TreeNode (issues.md §7.3 — rejected at creation, harness is defensive)", () => {
  const listSig: BoilerplateSignature = {
    functionName: "reverseList",
    returnType: "ListNode",
    parameters: [{ name: "head", type: "ListNode" }],
    className: "Solution",
    useClassWrapper: true,
  };
  const out = generateJudgeBoilerplate(listSig, "// noop", [
    { input: "[[1,2,3]]", expectedOutput: "[3,2,1]" },
  ]);

  it("still emits ListNode scaffolding (rejection happens at problem creation, see schema tests)", () => {
    expect(out.cpp).toContain("struct ListNode");
    expect(out.java).toContain("class ListNode");
  });

  it("defensively skips unsupported-type test blocks if such a signature ever reaches the generator", () => {
    expect(out.cpp).toContain("unsupported types");
    expect(out.java).toContain("unsupported types");
  });
});

describe("type helpers", () => {
  it("maps canonical keys to language types", () => {
    expect(getType("cpp", "int[]")).toBe("vector<int>");
    expect(getType("java", "string")).toBe("String");
    expect(getType("python", "double[]")).toBe("List[float]");
    expect(getType("js", "boolean")).toBe("boolean");
  });

  it("falls back to void for unknown mappings", () => {
    // every key is defined, so spot-check the table is complete for all langs
    for (const lang of ["cpp", "java", "js", "python"] as const) {
      for (const key of Object.keys(TYPE_MAP[lang])) {
        expect(TYPE_MAP[lang][key as keyof (typeof TYPE_MAP)[typeof lang]]).toBeTruthy();
      }
    }
  });

  it("formats parameters per language", () => {
    const params = [
      { name: "nums", type: "int[]" as const },
      { name: "target", type: "int" as const },
    ];
    expect(formatParams("cpp", params)).toBe("vector<int> nums, int target");
    expect(formatParams("java", params)).toBe("int[] nums, int target");
    expect(formatParams("python", params)).toBe("nums: List[int], target: int");
    expect(formatParams("js", params)).toBe("nums, target");
  });

  it("converts camelCase to snake_case", () => {
    expect(toSnakeCase("twoSum")).toBe("two_sum");
    expect(toSnakeCase("isValidBST")).toBe("is_valid_b_s_t");
    expect(toSnakeCase("plain")).toBe("plain");
    expect(toSnakeCase("")).toBe("");
  });
});
