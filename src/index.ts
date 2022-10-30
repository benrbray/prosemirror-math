/*---------------------------------------------------------
 *  Author: Benjamin R. Bray
 *  License: MIT (see LICENSE in project root for details)
 *--------------------------------------------------------*/

// core functionality
export { MathView, ICursorPosObserver } from "./math-nodeview";
export { mathPlugin, createMathView, IMathPluginState } from "./math-plugin";
export { mathSchemaSpec, createMathSchema } from "./math-schema";

// recommended plugins
export { mathBackspaceCmd } from "./plugins/math-backspace";
export { makeBlockMathInputRule, makeInlineMathInputRule, REGEX_BLOCK_MATH_DOLLARS, REGEX_INLINE_MATH_DOLLARS, REGEX_INLINE_MATH_DOLLARS_ESCAPED } from "./plugins/math-inputrules";

// optional / experimental plugins
export { mathSelectPlugin } from "./plugins/math-select";
export { defaultInlineMathParseRules, defaultBlockMathParseRules } from "./plugins/math-paste-rules"

// commands
export { insertMathCmd } from "./commands/insert-math-cmd";

// utilities
export { mathSerializer } from "./utils/text-serializer";
export * from "./utils/types";