/**
 * JUDGE BOILERPLATE — Execution-facing code.
 * Wraps user's submitted code, loads test cases, runs them.
 * Generated programs NEVER print verdict strings; they only emit structured output
 * markers. Verdict computation (pass/fail/runtime error) happens outside (worker).
 *
 * Output format (per test case, two lines):
 *   __CASE__<index>
 *   __OUTPUT__<json-serialized result>   OR   __ERROR__<message>
 *
 * To log judge boilerplate locally: edit MANUAL_SIGNATURE, MANUAL_TEST_CASES, SAMPLE_USER_CODE below, then run: pnpm run judge-boilerplate
 */

import type { Language } from "../../schema/language.schema";
import { LANGUAGES } from "../../schema/language.schema";
import type { BoilerplateSignature, BoilerplateTypeKey } from "./types";
import { toSnakeCase } from "./types";

/** Placeholder replaced with user's submitted code when building the full program */
const USER_CODE_PLACEHOLDER = "__USER_CODE__";

/** Machine-readable markers for worker to parse stdout. No verdict strings in generated code. */
export const JUDGE_OUTPUT_MARKERS = {
  CASE: "__CASE__",
  OUTPUT: "__OUTPUT__",
  ERROR: "__ERROR__",
} as const;

/** Primitives and array type keys we can generate literals for (no ListNode/TreeNode) */
const LITERAL_TYPE_KEYS: BoilerplateTypeKey[] = [
  "int", "long", "double", "boolean", "string",
  "int[]", "long[]", "double[]", "boolean[]", "string[]", "int[][]", "void", "object",
];

function toCppLiteral(val: unknown, typeKey: BoilerplateTypeKey): string {
  if (typeKey === "void") return "void()";
  if (typeKey === "object") return "nullptr";
  if (typeKey === "int" || typeKey === "long") return String(Number(val));
  if (typeKey === "double") return String(Number(val)) + (Number.isInteger(Number(val)) ? ".0" : "");
  if (typeKey === "boolean") return val ? "true" : "false";
  if (typeKey === "string") return `"${String(val).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  if (typeKey === "int[]") {
    const arr = Array.isArray(val) ? val.map((x) => Number(x)) : [Number(val)];
    return `vector<int>({${arr.join(", ")}})`;
  }
  if (typeKey === "long[]") {
    const arr = Array.isArray(val) ? val.map((x) => Number(x)) : [Number(val)];
    return `vector<long long>({${arr.join(", ")}})`;
  }
  if (typeKey === "double[]") {
    const arr = Array.isArray(val) ? val.map((x) => Number(x)) : [Number(val)];
    return `vector<double>({${arr.join(", ")}})`;
  }
  if (typeKey === "boolean[]") {
    const arr = Array.isArray(val) ? val.map((x) => !!x) : [!!val];
    return `vector<bool>({${arr.map((b) => (b ? "true" : "false")).join(", ")}})`;
  }
  if (typeKey === "string[]") {
    const arr = Array.isArray(val) ? val.map((x) => String(x)) : [String(val)];
    const escaped = arr.map((s) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
    return `vector<string>({${escaped.join(", ")}})`;
  }
  if (typeKey === "int[][]") {
    const arr = Array.isArray(val) ? val as unknown[][] : [val];
    const inner = arr.map((row) => {
      const r = Array.isArray(row) ? row.map((x) => Number(x)) : [Number(row)];
      return `vector<int>({${r.join(", ")}})`;
    });
    return `vector<vector<int>>({${inner.join(", ")}})`;
  }
  return "/* unsupported type */";
}

function toJavaLiteral(val: unknown, typeKey: BoilerplateTypeKey): string {
  if (typeKey === "void") return "null";
  if (typeKey === "object") return "null";
  if (typeKey === "int" || typeKey === "long") return String(Number(val));
  if (typeKey === "double") return String(Number(val)) + (Number.isInteger(Number(val)) ? "D" : "D");
  if (typeKey === "boolean") return val ? "true" : "false";
  if (typeKey === "string") return `"${String(val).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  if (typeKey === "int[]") {
    const arr = Array.isArray(val) ? val.map((x) => Number(x)) : [Number(val)];
    return `new int[]{${arr.join(", ")}}`;
  }
  if (typeKey === "long[]") {
    const arr = Array.isArray(val) ? val.map((x) => Number(x)) : [Number(val)];
    return `new long[]{${arr.map((x) => x + "L").join(", ")}}`;
  }
  if (typeKey === "double[]") {
    const arr = Array.isArray(val) ? val.map((x) => Number(x)) : [Number(val)];
    return `new double[]{${arr.join(", ")}}`;
  }
  if (typeKey === "boolean[]") {
    const arr = Array.isArray(val) ? val.map((x) => !!x) : [!!val];
    return `new boolean[]{${arr.map((b) => (b ? "true" : "false")).join(", ")}}`;
  }
  if (typeKey === "string[]") {
    const arr = Array.isArray(val) ? val.map((x) => String(x)) : [String(val)];
    const escaped = arr.map((s) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
    return `new String[]{${escaped.join(", ")}}`;
  }
  if (typeKey === "int[][]") {
    const arr = Array.isArray(val) ? val as unknown[][] : [val];
    const inner = arr.map((row) => {
      const r = Array.isArray(row) ? row.map((x) => Number(x)) : [Number(row)];
      return `new int[]{${r.join(", ")}}`;
    });
    return `new int[][]{${inner.join(", ")}}`;
  }
  return "null";
}

function cppCompareExpr(returnType: BoilerplateTypeKey, resultVar: string, expectedLiteral: string): string {
  if (returnType === "void") return "true";
  if (LITERAL_TYPE_KEYS.includes(returnType)) return `${resultVar} == ${expectedLiteral}`;
  return `${resultVar} == ${expectedLiteral}`;
}

function javaCompareExpr(returnType: BoilerplateTypeKey, resultVar: string, expectedLiteral: string): string {
  if (returnType === "void") return "true";
  if (returnType === "int[]" || returnType === "long[]" || returnType === "double[]" || returnType === "boolean[]")
    return `java.util.Arrays.equals(${resultVar}, ${expectedLiteral})`;
  if (returnType === "string[]" || returnType === "int[][]")
    return `java.util.Arrays.deepEquals(${resultVar}, ${expectedLiteral})`;
  if (returnType === "string") return `java.util.Objects.equals(${resultVar}, ${expectedLiteral})`;
  return `(${resultVar} == ${expectedLiteral})`;
}

/** Returns C++ code that prints the value of resultVar in JSON-like form to std::cout (no newline). */
function cppSerializeToOutput(returnType: BoilerplateTypeKey, resultVar: string): string {
  if (returnType === "void") return `std::cout << "null";`;
  if (returnType === "int" || returnType === "long") return `std::cout << ${resultVar};`;
  if (returnType === "double") return `std::cout << std::fixed << ${resultVar};`;
  if (returnType === "boolean") return `std::cout << (${resultVar} ? "true" : "false");`;
  if (returnType === "string") return `std::cout << "\\"" << ${resultVar} << "\\"";`;
  if (returnType === "int[]")
    return `{ std::cout << "["; for (size_t _i=0;_i<${resultVar}.size();_i++) { if(_i) std::cout << ","; std::cout << ${resultVar}[_i]; } std::cout << "]"; }`;
  if (returnType === "long[]")
    return `{ std::cout << "["; for (size_t _i=0;_i<${resultVar}.size();_i++) { if(_i) std::cout << ","; std::cout << ${resultVar}[_i]; } std::cout << "]"; }`;
  if (returnType === "double[]")
    return `{ std::cout << "["; for (size_t _i=0;_i<${resultVar}.size();_i++) { if(_i) std::cout << ","; std::cout << std::fixed << ${resultVar}[_i]; } std::cout << "]"; }`;
  if (returnType === "boolean[]")
    return `{ std::cout << "["; for (size_t _i=0;_i<${resultVar}.size();_i++) { if(_i) std::cout << ","; std::cout << (${resultVar}[_i] ? "true" : "false"); } std::cout << "]"; }`;
  if (returnType === "string[]")
    return `{ std::cout << "["; for (size_t _i=0;_i<${resultVar}.size();_i++) { if(_i) std::cout << ","; std::cout << "\\"" << ${resultVar}[_i] << "\\""; } std::cout << "]"; }`;
  if (returnType === "int[][]")
    return `{ std::cout << "["; for (size_t _r=0;_r<${resultVar}.size();_r++) { if(_r) std::cout << ","; std::cout << "["; for (size_t _c=0;_c<${resultVar}[_r].size();_c++) { if(_c) std::cout << ","; std::cout << ${resultVar}[_r][_c]; } std::cout << "]"; } std::cout << "]"; }`;
  return `std::cout << "null";`;
}

/** Returns Java code that prints the value of resultVar in JSON-like form (single line). */
function javaSerializeToOutput(returnType: BoilerplateTypeKey, resultVar: string): string {
  if (returnType === "void") return `System.out.print("null");`;
  if (returnType === "int" || returnType === "long" || returnType === "double")
    return `System.out.print(String.valueOf(${resultVar}));`;
  if (returnType === "boolean") return `System.out.print(${resultVar} ? "true" : "false");`;
  if (returnType === "string") return `System.out.print("\\"" + ${resultVar}.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"") + "\\"");`;
  if (returnType === "int[]" || returnType === "long[]" || returnType === "double[]" || returnType === "boolean[]")
    return `System.out.print(java.util.Arrays.toString(${resultVar}).replace(" ", ""));`;
  if (returnType === "int[][]")
    return `System.out.print(java.util.Arrays.deepToString(${resultVar}).replace(" ", ""));`;
  if (returnType === "string[]")
    return `{ StringBuilder _sb = new StringBuilder("["); for (int _i = 0; _i < ${resultVar}.length; _i++) { if (_i > 0) _sb.append(","); _sb.append("\\"").append(${resultVar}[_i].replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"")).append("\\""); } _sb.append("]"); System.out.print(_sb.toString()); }`;
  return `System.out.print("null");`;
}

function signatureUsesLiteralTypesOnly(sig: BoilerplateSignature): boolean {
  for (const p of sig.parameters) {
    if (!LITERAL_TYPE_KEYS.includes(p.type)) return false;
  }
  return LITERAL_TYPE_KEYS.includes(sig.returnType);
}

/** Build one test case block for C++: declare args, call function, emit __CASE__/__OUTPUT__ or __ERROR__ (no verdicts, no early exit). */
function buildCppTestCaseBlock(
  sig: BoilerplateSignature,
  tc: SerializedTestCase,
  index: number
): string {
  const CASE = JUDGE_OUTPUT_MARKERS.CASE;
  const OUTPUT = JUDGE_OUTPUT_MARKERS.OUTPUT;
  const ERROR = JUDGE_OUTPUT_MARKERS.ERROR;
  if (!signatureUsesLiteralTypesOnly(sig)) {
    return `    { // Test ${index + 1}: unsupported types (e.g. ListNode/TreeNode) skipped\n    }`;
  }
  let args: unknown[];
  try {
    const parsedInput = JSON.parse(tc.input) as unknown;
    args = Array.isArray(parsedInput) ? parsedInput : [parsedInput];
  } catch {
    return `    { // Test ${index + 1}: invalid JSON skipped\n    }`;
  }
  const paramTypes = sig.parameters.map((p) => p.type);
  const paramNames = sig.parameters.map((p) => p.name);
  const lines: string[] = [];
  for (let i = 0; i < paramTypes.length; i++) {
    const t = paramTypes[i];
    const name = paramNames[i] || `arg${i}`;
    const literal = toCppLiteral(args[i], t);
    const cppType = t === "int[]" ? "vector<int>" : t === "long[]" ? "vector<long long>" : t === "double[]" ? "vector<double>" : t === "boolean[]" ? "vector<bool>" : t === "string[]" ? "vector<string>" : t === "int[][]" ? "vector<vector<int>>" : t === "int" ? "int" : t === "long" ? "long long" : t === "double" ? "double" : t === "boolean" ? "bool" : "string";
    lines.push(`    ${cppType} ${name} = ${literal};`);
  }
  const retType = sig.returnType;
  const resultVar = "result";
  const cppRetType = retType === "int[]" ? "vector<int>" : retType === "long[]" ? "vector<long long>" : retType === "double[]" ? "vector<double>" : retType === "boolean[]" ? "vector<bool>" : retType === "string[]" ? "vector<string>" : retType === "int[][]" ? "vector<vector<int>>" : retType === "int" ? "int" : retType === "long" ? "long long" : retType === "double" ? "double" : retType === "boolean" ? "bool" : retType === "string" ? "string" : "void";
  const argList = paramNames.join(", ");
  lines.push(`    std::cout << "${CASE}${index}" << std::endl;`);
  if (retType === "void") {
    lines.push(`    try { ${sig.functionName}(${argList}); std::cout << "${OUTPUT}"; std::cout << "null" << std::endl; } catch (const std::exception& e) { std::cout << "${ERROR}" << e.what() << std::endl; } catch (...) { std::cout << "${ERROR}unknown exception" << std::endl; }`);
  } else {
    lines.push(`    ${cppRetType} ${resultVar};`);
    lines.push(`    try { ${resultVar} = ${sig.functionName}(${argList}); std::cout << "${OUTPUT}"; ${cppSerializeToOutput(retType, resultVar)} std::cout << std::endl; } catch (const std::exception& e) { std::cout << "${ERROR}" << e.what() << std::endl; } catch (...) { std::cout << "${ERROR}unknown exception" << std::endl; }`);
  }
  return `    { // Test ${index + 1}\n${lines.join("\n")}\n    }`;
}

/** Build one test case block for Java: declare args, call static method, emit markers. */
function buildJavaTestCaseBlock(
  sig: BoilerplateSignature,
  tc: SerializedTestCase,
  index: number
): string {
  const CASE = JUDGE_OUTPUT_MARKERS.CASE;
  const OUTPUT = JUDGE_OUTPUT_MARKERS.OUTPUT;
  const ERROR = JUDGE_OUTPUT_MARKERS.ERROR;
  if (!signatureUsesLiteralTypesOnly(sig)) {
    return `        { // Test ${index + 1}: unsupported types (e.g. ListNode/TreeNode) skipped\n        }`;
  }
  let args: unknown[];
  try {
    const parsedInput = JSON.parse(tc.input) as unknown;
    args = Array.isArray(parsedInput) ? parsedInput : [parsedInput];
  } catch {
    return `        { // Test ${index + 1}: invalid JSON skipped\n        }`;
  }
  const paramTypes = sig.parameters.map((p) => p.type);
  const paramNames = sig.parameters.map((p) => p.name);
  const lines: string[] = [];
  for (let i = 0; i < paramTypes.length; i++) {
    const t = paramTypes[i];
    const name = paramNames[i] || `arg${i}`;
    const literal = toJavaLiteral(args[i], t);
    const javaType = t === "int[]" ? "int[]" : t === "long[]" ? "long[]" : t === "double[]" ? "double[]" : t === "boolean[]" ? "boolean[]" : t === "string[]" ? "String[]" : t === "int[][]" ? "int[][]" : t === "int" || t === "long" ? t : t === "double" ? "double" : t === "boolean" ? "boolean" : "String";
    lines.push(`            ${javaType} ${name} = ${literal};`);
  }
  const retType = sig.returnType;
  const resultVar = "result";
  const javaRetType = retType === "int[]" ? "int[]" : retType === "long[]" ? "long[]" : retType === "double[]" ? "double[]" : retType === "boolean[]" ? "boolean[]" : retType === "string[]" ? "String[]" : retType === "int[][]" ? "int[][]" : retType === "int" || retType === "long" ? retType : retType === "double" ? "double" : retType === "boolean" ? "boolean" : retType === "string" ? "String" : "void";
  const argList = paramNames.join(", ");
  lines.push(`            System.out.println("${CASE}${index}");`);
  if (retType === "void") {
    lines.push(
      `            try { ${sig.className}.${sig.functionName}(${argList}); System.out.println("${OUTPUT}null"); } catch (Throwable e) { System.out.println("${ERROR}" + e.toString()); }`
    );
  } else {
    lines.push(`            ${javaRetType} ${resultVar};`);
    lines.push(
      `            try { ${resultVar} = ${sig.className}.${sig.functionName}(${argList}); System.out.print("${OUTPUT}"); ${javaSerializeToOutput(
        retType,
        resultVar
      )} System.out.println(); } catch (Throwable e) { System.out.println("${ERROR}" + e.toString()); }`
    );
  }
  return `        { // Test ${index + 1}\n${lines.join("\n")}\n        }`;
}

/**
 * Test case as passed to the judge.
 * - input: JSON array string of arguments in parameter order (e.g. "[[2,7,11,15], 9]")
 * - expectedOutput: JSON string of expected return value (e.g. "[0, 1]")
 */
export interface SerializedTestCase {
  input: string;
  expectedOutput: string;
}

/** Standard verdict strings for judge output */
export const VERDICT = {
  ACCEPTED: "ACCEPTED",
  WRONG_ANSWER: "WRONG_ANSWER",
  RUNTIME_ERROR: "RUNTIME_ERROR",
  TIME_LIMIT_EXCEEDED: "TIME_LIMIT_EXCEEDED",
} as const;

function usesListNode(sig: BoilerplateSignature): boolean {
  return (
    sig.parameters.some((p) => p.type === "ListNode") ||
    sig.returnType === "ListNode"
  );
}

function usesTreeNode(sig: BoilerplateSignature): boolean {
  return (
    sig.parameters.some((p) => p.type === "TreeNode") ||
    sig.returnType === "TreeNode"
  );
}

/**
 * C++ judge: main() loops over test cases, builds arguments from parsed data,
 * calls user function, and emits per-testcase markers (__CASE__/__OUTPUT__/__ERROR__).
 * Verdict is computed outside the program by the worker.
 */
function buildCppJudge(
  sig: BoilerplateSignature,
  testCases: SerializedTestCase[]
): string {
  const listNodeStruct = usesListNode(sig)
    ? "\nstruct ListNode { int val; ListNode *next; ListNode() : val(0), next(nullptr) {} ListNode(int x) : val(x), next(nullptr) {} ListNode(int x, ListNode *next) : val(x), next(next) {} };\n"
    : "";
  const treeNodeStruct = usesTreeNode(sig)
    ? "\nstruct TreeNode { int val; TreeNode *left; TreeNode *right; TreeNode() : val(0), left(nullptr), right(nullptr) {} TreeNode(int x) : val(x), left(nullptr), right(nullptr) {} TreeNode(int x, TreeNode *l, TreeNode *r) : val(x), left(l), right(r) {} };\n"
    : "";

  const testCaseBlocks = testCases
    .map((tc, i) => buildCppTestCaseBlock(sig, tc, i))
    .join("\n\n");

  return `#include <bits/stdc++.h>
using namespace std;${listNodeStruct}${treeNodeStruct}
/*
 * Judge: runs each test case, prints __CASE__<i> then __OUTPUT__<result> or __ERROR__<msg>.
 * Verdict is computed outside by parsing stdout.
 */
${USER_CODE_PLACEHOLDER}

int main() {
${testCaseBlocks}
    return 0;
}`;
}

function buildJavaJudge(
  sig: BoilerplateSignature,
  testCases: SerializedTestCase[]
): string {
  const listNodeClass = usesListNode(sig)
    ? "\nclass ListNode { int val; ListNode next; ListNode() {} ListNode(int val) { this.val = val; } ListNode(int val, ListNode next) { this.val = val; this.next = next; } }\n"
    : "";
  const treeNodeClass = usesTreeNode(sig)
    ? "\nclass TreeNode { int val; TreeNode left, right; TreeNode() {} TreeNode(int val) { this.val = val; } TreeNode(int val, TreeNode l, TreeNode r) { this.val = val; left = l; right = r; } }\n"
    : "";

  const testCaseBlocks = testCases
    .map((tc, i) => buildJavaTestCaseBlock(sig, tc, i))
    .join("\n\n");

  return `import java.util.*;
${listNodeClass}${treeNodeClass}
/*
 * Judge: loops over test cases, calls ${sig.className}.${sig.functionName}(...) for each input,
 * and emits per-testcase markers (__CASE__/__OUTPUT__/__ERROR__). Verdict is computed outside.
 */
${USER_CODE_PLACEHOLDER}

public class Main {
    public static void main(String[] args) {
${testCaseBlocks}
    }
}`;
}

/**
 * JS judge: wrap in try/catch, JSON.parse test cases, call user function,
 * and emit per-testcase markers (__CASE__/__OUTPUT__/__ERROR__). Verdict is computed outside.
 */
function buildJsJudge(
  sig: BoilerplateSignature,
  testCases: SerializedTestCase[]
): string {
  const testCasesJson = JSON.stringify(testCases);

  return `/**
* Judge harness: loads test cases, invokes user function, and emits per-testcase output.
* User code does not touch I/O; execution is deterministic.
 */
${USER_CODE_PLACEHOLDER}

(function() {
    const MARKERS = { CASE: "${JUDGE_OUTPUT_MARKERS.CASE}", OUTPUT: "${JUDGE_OUTPUT_MARKERS.OUTPUT}", ERROR: "${JUDGE_OUTPUT_MARKERS.ERROR}" };
    const testCases = ${testCasesJson};
    for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        console.log(MARKERS.CASE + i);
        try {
            const args = JSON.parse(tc.input);
            const actual = ${sig.functionName}(...(Array.isArray(args) ? args : [args]));
            console.log(MARKERS.OUTPUT + JSON.stringify(actual));
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            console.log(MARKERS.ERROR + msg);
        }
    }
})();
`;
}

/**
 * Python judge: call user function (no class), emit per-testcase markers, catch exceptions.
 */
function buildPythonJudge(
  sig: BoilerplateSignature,
  testCases: SerializedTestCase[]
): string {
  const testCasesEscaped = JSON.stringify(testCases)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');

  const functionName = toSnakeCase(sig.functionName);

  return `"""
Judge harness: loads test cases, calls user function, and emits per-testcase output.
User code never calls input(); judge controls execution.
"""
import json

${USER_CODE_PLACEHOLDER}

CASE = "${JUDGE_OUTPUT_MARKERS.CASE}"
OUTPUT = "${JUDGE_OUTPUT_MARKERS.OUTPUT}"
ERROR = "${JUDGE_OUTPUT_MARKERS.ERROR}"

if __name__ == "__main__":
    test_cases = json.loads("${testCasesEscaped}")
    for index, tc in enumerate(test_cases):
        print(f"{CASE}{index}")
        try:
            args = json.loads(tc["input"])
            actual = ${functionName}(*(args if isinstance(args, list) else [args]))
            serialized = json.dumps(actual, sort_keys=True, separators=(",", ":"))
            print(f"{OUTPUT}{serialized}")
        except Exception as e:
            print(f"{ERROR}{str(e)}")
`;
}

const judgeBuilders: Record<
  Language,
  (
    sig: BoilerplateSignature,
    testCases: SerializedTestCase[]
  ) => string
> = {
  cpp: buildCppJudge,
  java: buildJavaJudge,
  js: buildJsJudge,
  python: buildPythonJudge,
};

/**
 * Remove user debug logging so it does not pollute judge stdout parsing.
 * Keep harness marker logs intact (they are emitted outside user code).
 */
function stripUserLogging(language: Language, userCode: string): string {
  const lines = userCode.split("\n");

  const filtered = lines.filter((line) => {
    const text = line.trim();

    if (language === "js") {
      return !/\bconsole\.(log|info|debug|warn|error)\s*\(/.test(text);
    }

    if (language === "python") {
      return !/^print\s*\(/.test(text);
    }

    if (language === "cpp") {
      return !/\b(?:std::)?(?:cout|cerr|clog)\s*<</.test(text);
    }

    if (language === "java") {
      return !/\bSystem\.out\.(?:print|println|printf)\s*\(/.test(text);
    }

    return true;
  });

  return filtered.join("\n");
}

/**
 * Generate full judge program for each language: injects user code, embeds test cases,
 * runs tests, and emits per-testcase markers only. Verdicts are computed by the worker.
 */
export function generateJudgeBoilerplate(
  signature: BoilerplateSignature,
  userCode: string,
  testCases: SerializedTestCase[]
): Record<Language, string> {
  const result: Record<string, string> = {};
  for (const lang of LANGUAGES) {
    const harness = judgeBuilders[lang](signature, testCases);
    const sanitizedUserCode = stripUserLogging(lang, userCode).trim();
    result[lang] = harness.replace(USER_CODE_PLACEHOLDER, sanitizedUserCode);
  }
  return result as Record<Language, string>;
}

// --- Manual inputs for local run (edit these and run: pnpm run judge-boilerplate) ---
export const MANUAL_SIGNATURE: BoilerplateSignature = {
  functionName: "twoSum",
  returnType: "int[]",
  parameters: [
    { name: "nums", type: "int[]" },
    { name: "target", type: "int" },
  ],
  className: "Solution",
  useClassWrapper: true,
};

export const MANUAL_TEST_CASES: SerializedTestCase[] = [
  { input: "[[2,7,11,15], 9]", expectedOutput: "[0, 1]" },
  { input: "[[3,2,4], 6]", expectedOutput: "[1, 2]" },
  { input: "[[3,3], 6]", expectedOutput: "[0, 1]" },
];

export const SAMPLE_USER_CODE = `
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement), i];
    map.set(nums[i], i);
  }
  return [];
}
`;

