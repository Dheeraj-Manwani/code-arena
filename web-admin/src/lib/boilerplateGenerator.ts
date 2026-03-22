/**
 * Generates boilerplate code for DSA problems from a structured signature.
 * Maps a single canonical signature (function name, return type, parameters)
 * to C++, Java, JavaScript, and Python starter code.
 */

import type { Language } from "@/schema/language.schema";
import { LANGUAGES } from "@/schema/language.schema";

/** Canonical type keys used in the form; mapped to language-specific types below */
export const BOILERPLATE_TYPE_OPTIONS = [
    { value: "int", label: "int" },
    { value: "long", label: "long" },
    { value: "double", label: "double" },
    { value: "boolean", label: "boolean" },
    { value: "string", label: "string" },
    { value: "int[]", label: "int[]" },
    { value: "long[]", label: "long[]" },
    { value: "double[]", label: "double[]" },
    { value: "boolean[]", label: "boolean[]" },
    { value: "string[]", label: "string[]" },
    { value: "int[][]", label: "int[][] (2D)" },
    { value: "ListNode", label: "ListNode" },
    { value: "TreeNode", label: "TreeNode" },
    { value: "void", label: "void" },
    { value: "object", label: "object" },
] as const;

export type BoilerplateTypeKey = (typeof BOILERPLATE_TYPE_OPTIONS)[number]["value"];

/** Per-language type mapping */
const TYPE_MAP: Record<Language, Record<BoilerplateTypeKey, string>> = {
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
    /** Function or method name (camelCase); Python will use snake_case variant */
    functionName: string;
    /** Canonical return type key */
    returnType: BoilerplateTypeKey;
    /** Ordered list of parameters */
    parameters: BoilerplateParam[];
    /** Class name for Java/C++ (e.g. "Solution") */
    className: string;
    /** If true, wrap in a class for Java/C++; standalone function for JS/Python */
    useClassWrapper: boolean;
}

/** Convert camelCase to snake_case for Python */
function toSnakeCase(s: string): string {
    if (!s.trim()) return s;
    return s
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase()
        .replace(/^_/, "");
}

/** Get language-specific type string */
function getType(lang: Language, typeKey: BoilerplateTypeKey): string {
    return TYPE_MAP[lang][typeKey] ?? "void";
}

/** Format parameter list for a language */
function formatParams(lang: Language, params: BoilerplateParam[]): string {
    return params
        .map((p) => {
            const typeStr = getType(lang, p.type);
            if (lang === "python") return `${p.name}: ${typeStr}`;
            if (lang === "cpp" || lang === "java") return `${typeStr} ${p.name}`;
            return p.name; // JS: untyped in signature often
        })
        .join(", ");
}

/** Generate C++ boilerplate */
function generateCpp(sig: BoilerplateSignature): string {
    const ret = getType("cpp", sig.returnType);
    const params = formatParams("cpp", sig.parameters);
    const methodName = sig.functionName;

    const methodDecl = `${ret} ${methodName}(${params})`;
    const listNodeStruct =
        sig.parameters.some((p) => p.type === "ListNode") || sig.returnType === "ListNode"
            ? "\n// Definition for singly-linked list.\nstruct ListNode {\n    int val;\n    ListNode *next;\n    ListNode() : val(0), next(nullptr) {}\n    ListNode(int x) : val(x), next(nullptr) {}\n    ListNode(int x, ListNode *next) : val(x), next(next) {}\n};\n\n"
            : "";
    const treeNodeStruct =
        sig.parameters.some((p) => p.type === "TreeNode") || sig.returnType === "TreeNode"
            ? "\n// Definition for a binary tree node.\nstruct TreeNode {\n    int val;\n    TreeNode *left;\n    TreeNode *right;\n    TreeNode() : val(0), left(nullptr), right(nullptr) {}\n    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n};\n\n"
            : "";

    if (sig.useClassWrapper) {
        return `#include <bits/stdc++.h>
using namespace std;${listNodeStruct}${treeNodeStruct}class ${sig.className} {
public:
    ${methodDecl} {
        // Your code here
    }
};`;
    }
    return `#include <bits/stdc++.h>
using namespace std;${listNodeStruct}${treeNodeStruct}${methodDecl} {
    // Your code here
}`;
}

/** Generate Java boilerplate */
function generateJava(sig: BoilerplateSignature): string {
    const ret = getType("java", sig.returnType);
    const params = formatParams("java", sig.parameters);
    const methodName = sig.functionName;

    const listNodeClass =
        sig.parameters.some((p) => p.type === "ListNode") || sig.returnType === "ListNode"
            ? "\n// Definition for singly-linked list.\npublic class ListNode {\n    int val;\n    ListNode next;\n    ListNode() {}\n    ListNode(int val) { this.val = val; }\n    ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n}\n\n"
            : "";
    const treeNodeClass =
        sig.parameters.some((p) => p.type === "TreeNode") || sig.returnType === "TreeNode"
            ? "\n// Definition for a binary tree node.\npublic class TreeNode {\n    int val;\n    TreeNode left;\n    TreeNode right;\n    TreeNode() {}\n    TreeNode(int val) { this.val = val; }\n    TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }\n}\n\n"
            : "";

    if (sig.useClassWrapper) {
        return `import java.util.*;${listNodeClass}${treeNodeClass}public class ${sig.className} {
    public ${ret} ${methodName}(${params}) {
        // Your code here
    }
}`;
    }
    return `import java.util.*;${listNodeClass}${treeNodeClass}public class ${sig.className} {
    public static ${ret} ${methodName}(${params}) {
        // Your code here
    }
}`;
}

/** Generate JavaScript boilerplate */
function generateJs(sig: BoilerplateSignature): string {
    const params = sig.parameters.map((p) => p.name).join(", ");
    const methodName = sig.functionName;

    const listNodeComment =
        sig.parameters.some((p) => p.type === "ListNode") || sig.returnType === "ListNode"
            ? "\n/** Definition for singly-linked list.\n * function ListNode(val, next) { this.val = (val===undefined ? 0 : val); this.next = (next===undefined ? null : next); }\n */\n\n"
            : "";
    const treeNodeComment =
        sig.parameters.some((p) => p.type === "TreeNode") || sig.returnType === "TreeNode"
            ? "\n/** Definition for a binary tree node.\n * function TreeNode(val, left, right) { this.val = (val===undefined ? 0 : val); this.left = (left===undefined ? null : left); this.right = (right===undefined ? null : right); }\n */\n\n"
            : "";

    return `${listNodeComment}${treeNodeComment}/**
 * @return {${getType("js", sig.returnType)}}
 */
function ${methodName}(${params}) {
    // Your code here
}`;
}

/** Generate Python boilerplate */
function generatePython(sig: BoilerplateSignature): string {
    const params = formatParams("python", sig.parameters);
    const methodName = toSnakeCase(sig.functionName);

    const listNodeImport =
        sig.parameters.some((p) => p.type === "ListNode") || sig.returnType === "ListNode"
            ? "from typing import List, Optional\n\n# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\n\n"
            : "from typing import List, Optional\n\n";
    const treeNodeImport =
        sig.parameters.some((p) => p.type === "TreeNode") || sig.returnType === "TreeNode"
            ? "# Definition for a binary tree node.\n# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\n\n"
            : "";

    const returnAnnotation = sig.returnType === "void" ? "" : ` -> ${getType("python", sig.returnType)}`;
    const paramList = params ? `self, ${params}` : "self";
    return `${listNodeImport}${treeNodeImport}class Solution:\n    def ${methodName}(${paramList})${returnAnnotation}:\n        # Your code here\n        pass`;
}




const generators: Record<Language, (sig: BoilerplateSignature) => string> = {
    cpp: generateCpp,
    java: generateJava,
    js: generateJs,
    python: generatePython,
};

/**
 * Generate boilerplate code for all supported languages from a single signature.
 */
export function generateBoilerplate(signature: BoilerplateSignature): Record<string, string> {
    const result: Record<string, string> = {};
    for (const lang of LANGUAGES) {
        result[lang] = generators[lang](signature);
    }
    return result;
}
