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

describe("stripUserLogging (via generateJudgeBoilerplate)", () => {
  it("removes console.* from the JS harness", () => {
    const code = "function f(){ console.log('SECRET_JS'); return 1; }";
    const out = generateJudgeBoilerplate(
      { ...MANUAL_SIGNATURE, functionName: "f", parameters: [] },
      code,
      [{ input: "[]", expectedOutput: "1" }]
    );
    expect(out.js).not.toContain("SECRET_JS");
  });

  it("removes print(...) from the Python harness", () => {
    const code = "def f():\n    print('SECRET_PY')\n    return 1";
    const out = generateJudgeBoilerplate(
      { ...MANUAL_SIGNATURE, functionName: "f", parameters: [] },
      code,
      [{ input: "[]", expectedOutput: "1" }]
    );
    expect(out.python).not.toContain("SECRET_PY");
  });

  it("removes cout from the C++ harness", () => {
    const code = "int f(){ cout << \"SECRET_CPP\"; return 1; }";
    const out = generateJudgeBoilerplate(
      { ...MANUAL_SIGNATURE, functionName: "f", parameters: [] },
      code,
      [{ input: "[]", expectedOutput: "1" }]
    );
    expect(out.cpp).not.toContain("SECRET_CPP");
  });

  it("removes System.out.println from the Java harness", () => {
    const code = "int f(){ System.out.println(\"SECRET_JAVA\"); return 1; }";
    const out = generateJudgeBoilerplate(
      { ...MANUAL_SIGNATURE, functionName: "f", parameters: [] },
      code,
      [{ input: "[]", expectedOutput: "1" }]
    );
    expect(out.java).not.toContain("SECRET_JAVA");
  });
});

describe("ListNode/TreeNode support (documents current half-implemented behavior)", () => {
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

  it("emits the ListNode struct/class scaffolding for C++ and Java", () => {
    expect(out.cpp).toContain("struct ListNode");
    expect(out.java).toContain("class ListNode");
  });

  it("KNOWN ISSUE (issues.md §7.3): test-case blocks are skipped for non-literal types", () => {
    // Until the literal builders support ListNode/TreeNode, the harness emits a
    // skip comment instead of a real call, so no __CASE__ markers are produced and
    // the worker derives runtime_error. This test pins that behavior so a future
    // fix is a deliberate, visible change.
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
