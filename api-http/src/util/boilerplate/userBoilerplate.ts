/**
 * USER BOILERPLATE — Editor-facing code only.
 * Always function-based; no class wrapper (except Java: one class with static method only).
 * No main, no test case loop, no I/O parsing.
 * Output is shown in the editor; implementation is left to the user.
 */

import type { Language } from "../../schema/language.schema";
import { LANGUAGES } from "../../schema/language.schema";
import type { BoilerplateSignature } from "./types";
import {
  getType,
  formatParams,
  toSnakeCase,
} from "./types";

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

function generateCpp(sig: BoilerplateSignature): string {
  const ret = getType("cpp", sig.returnType);
  const params = formatParams("cpp", sig.parameters);
  const methodDecl = `${ret} ${sig.functionName}(${params})`;
  const listNodeStruct = usesListNode(sig)
    ? "\n// Definition for singly-linked list.\nstruct ListNode {\n    int val;\n    ListNode *next;\n    ListNode() : val(0), next(nullptr) {}\n    ListNode(int x) : val(x), next(nullptr) {}\n    ListNode(int x, ListNode *next) : val(x), next(next) {}\n};\n\n"
    : "";
  const treeNodeStruct = usesTreeNode(sig)
    ? "\n// Definition for a binary tree node.\nstruct TreeNode {\n    int val;\n    TreeNode *left;\n    TreeNode *right;\n    TreeNode() : val(0), left(nullptr), right(nullptr) {}\n    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n};\n\n"
    : "";

  return `#include <bits/stdc++.h>
using namespace std;${listNodeStruct}${treeNodeStruct}${methodDecl} {
    // Your code here
}`;
}

function generateJava(sig: BoilerplateSignature): string {
  const ret = getType("java", sig.returnType);
  const params = formatParams("java", sig.parameters);
  const listNodeClass = usesListNode(sig)
    ? "\n// Definition for singly-linked list.\npublic class ListNode {\n    int val;\n    ListNode next;\n    ListNode() {}\n    ListNode(int val) { this.val = val; }\n    ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n}\n\n"
    : "";
  const treeNodeClass = usesTreeNode(sig)
    ? "\n// Definition for a binary tree node.\npublic class TreeNode {\n    int val;\n    TreeNode left;\n    TreeNode right;\n    TreeNode() {}\n    TreeNode(int val) { this.val = val; }\n    TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }\n}\n\n"
    : "";

  return `import java.util.*;\n${listNodeClass}${treeNodeClass}public class ${sig.className} {
    public static ${ret} ${sig.functionName}(${params}) {
        // Your code here
    }
}`;
}

/** JS: plain function only (no class). */
function generateJs(sig: BoilerplateSignature): string {
  const params = sig.parameters.map((p) => p.name).join(", ");
  const listNodeComment = usesListNode(sig)
    ? "\n/** Definition for singly-linked list.\n * function ListNode(val, next) { this.val = (val===undefined ? 0 : val); this.next = (next===undefined ? null : next); }\n */\n\n"
    : "";
  const treeNodeComment = usesTreeNode(sig)
    ? "\n/** Definition for a binary tree node.\n * function TreeNode(val, left, right) { this.val = (val===undefined ? 0 : val); this.left = (left===undefined ? null : left); this.right = (right===undefined ? null : right); }\n */\n\n"
    : "";

  return `${listNodeComment}${treeNodeComment}/**
 * @return {${getType("js", sig.returnType)}}
 */
function ${sig.functionName}(${params}) {
    // Your code here
}`;
}

/** Python: top-level function only (no class). */
function generatePython(sig: BoilerplateSignature): string {
  const params = formatParams("python", sig.parameters);
  const functionName = toSnakeCase(sig.functionName);
  const listNodeImport = usesListNode(sig)
    ? "from typing import List, Optional\n\n# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\n\n"
    : "from typing import List, Optional\n\n";
  const treeNodeImport = usesTreeNode(sig)
    ? "# Definition for a binary tree node.\n# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\n\n"
    : "";

  const returnAnnotation =
    sig.returnType === "void" ? "" : ` -> ${getType("python", sig.returnType)}`;
  return `${listNodeImport}${treeNodeImport}def ${functionName}(${params})${returnAnnotation}:
    # Your code here
    pass`;
}

const generators: Record<
  Language,
  (sig: BoilerplateSignature) => string
> = {
  cpp: generateCpp,
  java: generateJava,
  js: generateJs,
  python: generatePython,
};

/**
 * Generate user-facing boilerplate for all supported languages.
 * Editor-only: function/method signature, no main, no I/O.
 */
export function generateUserBoilerplate(
  signature: BoilerplateSignature
): Record<Language, string> {
  const result: Record<string, string> = {};
  for (const lang of LANGUAGES) {
    result[lang] = generators[lang](signature);
  }
  return result as Record<Language, string>;
}
