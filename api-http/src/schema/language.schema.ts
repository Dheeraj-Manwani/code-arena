import { z } from "zod";

/** Supported programming language values */
const LANGUAGE_VALUES = ["cpp", "java", "js", "python"] as const;

/** Supported programming languages for code submission */
export const LanguageEnum = z.enum(LANGUAGE_VALUES);
export type Language = z.infer<typeof LanguageEnum>;

/** Language values as a readonly array for iteration */
export const LANGUAGES: readonly Language[] = LANGUAGE_VALUES;

/** Default language when none is selected */
export const DEFAULT_LANGUAGE: Language = "cpp";

/** Configuration for each language (label for UI, Monaco editor language id, Judge0 id) */
export interface LanguageConfig {
  label: string;
  monacoLang: string;
  id: number;
}

export const LANGUAGE_CONFIG: Record<Language, LanguageConfig> = {
  cpp: { label: "C++ (GCC 9.2.0)", monacoLang: "cpp", id: 54 },
  java: { label: "Java (OpenJDK 13.0.1)", monacoLang: "java", id: 62 },
  js: { label: "JavaScript (Node.js 12.14.0)", monacoLang: "javascript", id: 63 },
  python: { label: "Python3 (3.8.1)", monacoLang: "python", id: 71 },
} as const;

/** Boilerplate placeholder templates for each language */
export const BOILERPLATE_PLACEHOLDER: Record<Language, string> = {
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}',
  java: 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}',
  js: 'const readline = require("readline");\n\n// Your code here',
  python: '# Your code here\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()',
} as const;

/** Boilerplate map type - keys are Language values */
export type BoilerplateMap = Partial<Record<Language, string>>;
