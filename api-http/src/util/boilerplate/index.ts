/**
 * Public API for boilerplate generation.
 *
 * 1. USER BOILERPLATE — Editor-facing: function/method signature only, no main, no I/O.
 * 2. JUDGE BOILERPLATE — Execution-facing: wraps user code, runs test cases, prints verdict.
 *
 * Type mapping and shared types live in ./types (single source of truth).
 */

import type { Language } from "../../schema/language.schema";
import { generateUserBoilerplate } from "./userBoilerplate";
import {
  generateJudgeBoilerplate,
  type SerializedTestCase,
  VERDICT,
} from "./judgeBoilerplate";

export type { BoilerplateSignature, BoilerplateParam, BoilerplateTypeKey } from "./types";
export type { SerializedTestCase };

/** Normalize signature for persistence (single source of truth). */
export function toStoredSignature(boilerplateSignature: {
  functionName: string;
  returnType: string;
  parameters: Array<{ name: string; type: string }>;
  className: string;
  useClassWrapper: boolean;
}) {
  return {
    functionName: boilerplateSignature.functionName,
    returnType: boilerplateSignature.returnType,
    parameters: boilerplateSignature.parameters.filter((p) => p.name.trim() !== ""),
    className: boilerplateSignature.className,
    useClassWrapper: boilerplateSignature.useClassWrapper,
  };
}
export { VERDICT } from "./judgeBoilerplate";
export {
  BOILERPLATE_TYPE_KEYS,
  TYPE_MAP,
  getType,
  formatParams,
  toSnakeCase,
} from "./types";

/** Generate user-facing boilerplate (editor). */
export { generateUserBoilerplate };

/** Generate judge harness (execution). */
export { generateJudgeBoilerplate };

/**
 * @deprecated Use generateUserBoilerplate. Kept for backward compatibility with problem controller.
 */
export function generateBoilerplate(
  signature: Parameters<typeof generateUserBoilerplate>[0]
): Record<string, string> {
  return generateUserBoilerplate(signature) as Record<string, string>;
}
