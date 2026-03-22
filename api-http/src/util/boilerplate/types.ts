/**
 * Shared types and type-mapping for boilerplate generation.
 * Used by both user boilerplate (editor) and judge boilerplate (execution).
 * Do not duplicate this logic elsewhere.
 */

import type { Language } from "../../schema/language.schema";
import { LANGUAGES } from "../../schema/language.schema";

/** Canonical type keys; mapped to language-specific types in TYPE_MAP */
export const BOILERPLATE_TYPE_KEYS = [
  "int",
  "long",
  "double",
  "boolean",
  "string",
  "int[]",
  "long[]",
  "double[]",
  "boolean[]",
  "string[]",
  "int[][]",
  "ListNode",
  "TreeNode",
  "void",
  "object", // For constructors/class instances (e.g. LRU Cache)
] as const;

export type BoilerplateTypeKey = (typeof BOILERPLATE_TYPE_KEYS)[number];

/** Per-language type mapping (single source of truth) */
export const TYPE_MAP: Record<Language, Record<BoilerplateTypeKey, string>> = {
  cpp: {
    int: "int",
    long: "long long",
    double: "double",
    boolean: "bool",
    string: "string",
    "int[]": "vector<int>",
    "long[]": "vector<long long>",
    "double[]": "vector<double>",
    "boolean[]": "vector<bool>",
    "string[]": "vector<string>",
    "int[][]": "vector<vector<int>>",
    ListNode: "ListNode*",
    TreeNode: "TreeNode*",
    void: "void",
    object: "void*",
  },
  java: {
    int: "int",
    long: "long",
    double: "double",
    boolean: "boolean",
    string: "String",
    "int[]": "int[]",
    "long[]": "long[]",
    "double[]": "double[]",
    "boolean[]": "boolean[]",
    "string[]": "String[]",
    "int[][]": "int[][]",
    ListNode: "ListNode",
    TreeNode: "TreeNode",
    void: "void",
    object: "Object",
  },
  js: {
    int: "number",
    long: "number",
    double: "number",
    boolean: "boolean",
    string: "string",
    "int[]": "number[]",
    "long[]": "number[]",
    "double[]": "number[]",
    "boolean[]": "boolean[]",
    "string[]": "string[]",
    "int[][]": "number[][]",
    ListNode: "ListNode",
    TreeNode: "TreeNode",
    void: "void",
    object: "object",
  },
  python: {
    int: "int",
    long: "int",
    double: "float",
    boolean: "bool",
    string: "str",
    "int[]": "List[int]",
    "long[]": "List[int]",
    "double[]": "List[float]",
    "boolean[]": "List[bool]",
    "string[]": "List[str]",
    "int[][]": "List[List[int]]",
    ListNode: "Optional[ListNode]",
    TreeNode: "Optional[TreeNode]",
    void: "None",
    object: "object",
  },
};

export interface BoilerplateParam {
  name: string;
  type: BoilerplateTypeKey;
}

export interface BoilerplateSignature {
  functionName: string;
  returnType: BoilerplateTypeKey;
  parameters: BoilerplateParam[];
  className: string;
  useClassWrapper: boolean;
}

/** Get language-specific type string from canonical key */
export function getType(lang: Language, typeKey: BoilerplateTypeKey): string {
  return TYPE_MAP[lang][typeKey] ?? "void";
}

/** Format parameter list for a language (for function signature) */
export function formatParams(
  lang: Language,
  params: BoilerplateParam[]
): string {
  return params
    .map((p) => {
      const typeStr = getType(lang, p.type);
      if (lang === "python") return `${p.name}: ${typeStr}`;
      if (lang === "cpp" || lang === "java") return `${typeStr} ${p.name}`;
      return p.name;
    })
    .join(", ");
}

/** Convert camelCase to snake_case (for Python method names) */
export function toSnakeCase(s: string): string {
  if (!s.trim()) return s;
  return s
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

export { LANGUAGES };
export type { Language };
