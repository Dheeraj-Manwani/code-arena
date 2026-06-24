/**
 * JUDGE BOILERPLATE — Execution-facing code.
 * Wraps user's submitted code, runs each test case, compares the result to the
 * expected output *inside the harness*, and emits structured markers. The worker
 * only tallies PASS/FAIL/ERROR markers — it does not need the expected outputs.
 *
 * Output format (per test case):
 *   __CASE__<index>
 *   __OUTPUT__<json-serialized actual result>   (omitted when the call throws)
 *   __PASS__ | __FAIL__ | __ERROR__<message>
 *
 * Correctness:
 *   - The harness builds an `expected` literal from the test case's expectedOutput
 *     and compares it against the user's result. Floating-point types (double /
 *     double[]) compare with an epsilon tolerance (issues.md §7.2).
 *   - User stdout is redirected to a sink *only around the user call*, so debug
 *     prints never pollute the marker stream (issues.md §7.1). No source-level
 *     stripping of print/log statements is done.
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
  PASS: "__PASS__",
  FAIL: "__FAIL__",
  ERROR: "__ERROR__",
} as const;

/** Tolerance for floating-point comparisons (issues.md §7.2). */
const FLOAT_EPSILON = "1e-6";

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

/**
 * C++ boolean expression comparing `resultVar` to `expectedVar` for the given
 * return type. double/double[] use an epsilon tolerance; void/object can't be
 * compared meaningfully so they pass on successful execution.
 */
function cppCompareCode(returnType: BoilerplateTypeKey, resultVar: string, expectedVar: string): string {
  if (returnType === "void" || returnType === "object") return "true";
  if (returnType === "double") return `(std::fabs(${resultVar} - ${expectedVar}) < ${FLOAT_EPSILON})`;
  if (returnType === "double[]")
    return `([&]() -> bool { if (${resultVar}.size() != ${expectedVar}.size()) return false; for (size_t _k = 0; _k < ${resultVar}.size(); ++_k) if (std::fabs(${resultVar}[_k] - ${expectedVar}[_k]) >= ${FLOAT_EPSILON}) return false; return true; }())`;
  // int, long, boolean, string, int[]/long[]/boolean[]/string[]/int[][] — operator== / vector== / std::string== all work.
  return `(${resultVar} == ${expectedVar})`;
}

/**
 * Java boolean expression comparing `resultVar` to `expectedVar`. double/double[]
 * use epsilon; arrays use Arrays.equals/deepEquals; void/object pass on success.
 */
function javaCompareCode(returnType: BoilerplateTypeKey, resultVar: string, expectedVar: string): string {
  if (returnType === "void" || returnType === "object") return "true";
  if (returnType === "double") return `(Math.abs(${resultVar} - ${expectedVar}) < ${FLOAT_EPSILON})`;
  if (returnType === "double[]")
    return `(${resultVar}.length == ${expectedVar}.length && java.util.stream.IntStream.range(0, ${resultVar}.length).allMatch(_k -> Math.abs(${resultVar}[_k] - ${expectedVar}[_k]) < ${FLOAT_EPSILON}))`;
  if (returnType === "int[]" || returnType === "long[]" || returnType === "boolean[]" || returnType === "string[]")
    return `java.util.Arrays.equals(${resultVar}, ${expectedVar})`;
  if (returnType === "int[][]") return `java.util.Arrays.deepEquals(${resultVar}, ${expectedVar})`;
  if (returnType === "string") return `java.util.Objects.equals(${resultVar}, ${expectedVar})`;
  return `(${resultVar} == ${expectedVar})`;
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

const CPP_TYPE_MAP: Partial<Record<BoilerplateTypeKey, string>> = {
  int: "int", long: "long long", double: "double", boolean: "bool", string: "string",
  "int[]": "vector<int>", "long[]": "vector<long long>", "double[]": "vector<double>",
  "boolean[]": "vector<bool>", "string[]": "vector<string>", "int[][]": "vector<vector<int>>",
};
const cppType = (t: BoilerplateTypeKey): string => CPP_TYPE_MAP[t] ?? "void";

/** Parse a test case's JSON expected output; fall back to the raw string on parse failure. */
function parseExpected(tc: SerializedTestCase): unknown {
  try {
    return JSON.parse(tc.expectedOutput);
  } catch {
    return tc.expectedOutput;
  }
}

/**
 * Build one test case block for C++: declare args + expected, call the user
 * function (with user stdout suppressed), compare to expected, and emit
 * __CASE__/__OUTPUT__/__PASS__/__FAIL__/__ERROR__. No verdict strings, no early exit.
 */
function buildCppTestCaseBlock(
  sig: BoilerplateSignature,
  tc: SerializedTestCase,
  index: number
): string {
  const { CASE, OUTPUT, PASS, FAIL, ERROR } = JUDGE_OUTPUT_MARKERS;
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
    lines.push(`    ${cppType(t)} ${name} = ${toCppLiteral(args[i], t)};`);
  }
  const retType = sig.returnType;
  const argList = paramNames.join(", ");
  lines.push(`    std::cout << "${CASE}${index}" << std::endl;`);
  // Suppress user stdout only around the user call so debug prints never pollute markers.
  const redirect = `std::streambuf* _old = std::cout.rdbuf(); std::ostringstream _sink;`;
  // void/object can't be compared meaningfully — pass on successful execution.
  if (retType === "void" || retType === "object") {
    lines.push(`    { ${redirect}
      try { std::cout.rdbuf(_sink.rdbuf()); ${sig.functionName}(${argList}); std::cout.rdbuf(_old); std::cout << "${OUTPUT}null" << std::endl; std::cout << "${PASS}" << std::endl; }
      catch (const std::exception& e) { std::cout.rdbuf(_old); std::cout << "${ERROR}" << e.what() << std::endl; }
      catch (...) { std::cout.rdbuf(_old); std::cout << "${ERROR}unknown exception" << std::endl; } }`);
  } else {
    lines.push(`    ${cppType(retType)} expected = ${toCppLiteral(parseExpected(tc), retType)};`);
    lines.push(`    ${cppType(retType)} result;`);
    lines.push(`    { ${redirect}
      try { std::cout.rdbuf(_sink.rdbuf()); result = ${sig.functionName}(${argList}); std::cout.rdbuf(_old); std::cout << "${OUTPUT}"; ${cppSerializeToOutput(retType, "result")} std::cout << std::endl; std::cout << (${cppCompareCode(retType, "result", "expected")} ? "${PASS}" : "${FAIL}") << std::endl; }
      catch (const std::exception& e) { std::cout.rdbuf(_old); std::cout << "${ERROR}" << e.what() << std::endl; }
      catch (...) { std::cout.rdbuf(_old); std::cout << "${ERROR}unknown exception" << std::endl; } }`);
  }
  return `    { // Test ${index + 1}\n${lines.join("\n")}\n    }`;
}

const JAVA_TYPE_MAP: Partial<Record<BoilerplateTypeKey, string>> = {
  int: "int", long: "long", double: "double", boolean: "boolean", string: "String",
  "int[]": "int[]", "long[]": "long[]", "double[]": "double[]", "boolean[]": "boolean[]",
  "string[]": "String[]", "int[][]": "int[][]",
};
const javaType = (t: BoilerplateTypeKey): string => JAVA_TYPE_MAP[t] ?? "void";

/**
 * Build one test case block for Java: declare args + expected, call the static
 * method (with user stdout suppressed), compare to expected, and emit markers.
 */
function buildJavaTestCaseBlock(
  sig: BoilerplateSignature,
  tc: SerializedTestCase,
  index: number
): string {
  const { CASE, OUTPUT, PASS, FAIL, ERROR } = JUDGE_OUTPUT_MARKERS;
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
    lines.push(`            ${javaType(t)} ${name} = ${toJavaLiteral(args[i], t)};`);
  }
  const retType = sig.returnType;
  const argList = paramNames.join(", ");
  lines.push(`            System.out.println("${CASE}${index}");`);
  // Suppress user stdout only around the user call so debug prints never pollute markers.
  const save = `java.io.PrintStream _real = System.out;`;
  const sink = `System.setOut(new java.io.PrintStream(new java.io.ByteArrayOutputStream()));`;
  // void/object can't be compared meaningfully — pass on successful execution.
  if (retType === "void" || retType === "object") {
    lines.push(
      `            { ${save} try { ${sink} ${sig.className}.${sig.functionName}(${argList}); System.setOut(_real); System.out.println("${OUTPUT}null"); System.out.println("${PASS}"); } catch (Throwable e) { System.setOut(_real); System.out.println("${ERROR}" + e.toString()); } }`
    );
  } else {
    lines.push(`            ${javaType(retType)} expected = ${toJavaLiteral(parseExpected(tc), retType)};`);
    lines.push(
      `            { ${save} try { ${sink} ${javaType(retType)} result = ${sig.className}.${sig.functionName}(${argList}); System.setOut(_real); System.out.print("${OUTPUT}"); ${javaSerializeToOutput(
        retType,
        "result"
      )} System.out.println(); System.out.println(${javaCompareCode(retType, "result", "expected")} ? "${PASS}" : "${FAIL}"); } catch (Throwable e) { System.setOut(_real); System.out.println("${ERROR}" + e.toString()); } }`
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
 * Judge: runs each test case, compares the result to the expected value, and prints
 * __CASE__<i>, __OUTPUT__<result>, then __PASS__/__FAIL__ (or __ERROR__<msg> on throw).
 * The worker only tallies these markers.
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
 * Judge: loops over test cases, calls ${sig.className}.${sig.functionName}(...), compares the
 * result to the expected value, and emits per-testcase markers
 * (__CASE__/__OUTPUT__/__PASS__/__FAIL__/__ERROR__). The worker only tallies them.
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

  const { CASE, OUTPUT, PASS, FAIL, ERROR } = JUDGE_OUTPUT_MARKERS;
  return `/**
* Judge harness: loads test cases, invokes the user function, compares the result
* to the expected output (numeric comparisons use an epsilon tolerance), and emits
* per-testcase markers. User stdout (console.log) is suppressed so it can't pollute
* the marker stream; markers are written straight to process.stdout.
 */
${USER_CODE_PLACEHOLDER}

(function() {
    const MARKERS = { CASE: "${CASE}", OUTPUT: "${OUTPUT}", PASS: "${PASS}", FAIL: "${FAIL}", ERROR: "${ERROR}" };
    const _emit = (s) => process.stdout.write(s + "\\n");
    // Suppress user debug output (issues.md §7.1) — markers bypass console.log.
    console.log = function() {};
    console.info = console.debug = console.warn = console.error = function() {};
    const _eq = (a, b) => {
        if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < ${FLOAT_EPSILON};
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) if (!_eq(a[i], b[i])) return false;
            return true;
        }
        if (a && b && typeof a === "object" && typeof b === "object") return JSON.stringify(a) === JSON.stringify(b);
        return a === b;
    };
    const testCases = ${testCasesJson};
    for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        _emit(MARKERS.CASE + i);
        try {
            const args = JSON.parse(tc.input);
            const actual = ${sig.functionName}(...(Array.isArray(args) ? args : [args]));
            let expected;
            try { expected = JSON.parse(tc.expectedOutput); } catch (_) { expected = tc.expectedOutput; }
            _emit(MARKERS.OUTPUT + JSON.stringify(actual));
            _emit(_eq(actual, expected) ? MARKERS.PASS : MARKERS.FAIL);
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            _emit(MARKERS.ERROR + msg);
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

  const { CASE, OUTPUT, PASS, FAIL, ERROR } = JUDGE_OUTPUT_MARKERS;
  return `"""
Judge harness: loads test cases, calls the user function, compares the result to
the expected output (numbers compare with an epsilon tolerance), and emits markers.
User stdout is redirected to a sink around the call so prints can't pollute markers.
"""
import json, io, sys
from contextlib import redirect_stdout

${USER_CODE_PLACEHOLDER}

CASE = "${CASE}"
OUTPUT = "${OUTPUT}"
PASS = "${PASS}"
FAIL = "${FAIL}"
ERROR = "${ERROR}"
_EPS = ${FLOAT_EPSILON}


def _eq(a, b):
    if isinstance(a, bool) or isinstance(b, bool):
        return a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(a - b) < _EPS
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(_eq(x, y) for x, y in zip(a, b))
    return a == b


if __name__ == "__main__":
    test_cases = json.loads("${testCasesEscaped}")
    for index, tc in enumerate(test_cases):
        print(f"{CASE}{index}")
        try:
            args = json.loads(tc["input"])
            _sink = io.StringIO()
            with redirect_stdout(_sink):
                actual = ${functionName}(*(args if isinstance(args, list) else [args]))
            try:
                expected = json.loads(tc["expectedOutput"])
            except Exception:
                expected = tc["expectedOutput"]
            serialized = json.dumps(actual, sort_keys=True, separators=(",", ":"))
            print(f"{OUTPUT}{serialized}")
            print(PASS if _eq(actual, expected) else FAIL)
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
 * Generate full judge program for each language: injects user code verbatim,
 * embeds test cases, runs tests, compares each result to the expected output, and
 * emits per-testcase PASS/FAIL/ERROR markers. The worker only tallies the markers.
 *
 * User code is NOT rewritten — debug prints are neutralised at runtime by
 * redirecting user stdout to a sink around each call (issues.md §7.1).
 */
export function generateJudgeBoilerplate(
  signature: BoilerplateSignature,
  userCode: string,
  testCases: SerializedTestCase[]
): Record<Language, string> {
  const result: Record<string, string> = {};
  for (const lang of LANGUAGES) {
    const harness = judgeBuilders[lang](signature, testCases);
    result[lang] = harness.replace(USER_CODE_PLACEHOLDER, userCode.trim());
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

