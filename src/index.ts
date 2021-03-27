/*---------------------------------------------------------
 *  Author: Benjamin R. Bray
 *  License: MIT (see LICENSE in project root for details)
 *--------------------------------------------------------*/

// core functionality
export { MathView, ICursorPosObserver } from "./math-nodeview";
export { mathPlugin } from "./math-plugin";
export { mathSchemaSpec, createMathSchema } from "./math-schema";

// recommended plugins
export { mathBackspace } from "./plugins/math-backspace";
export * from "./plugins/math-inputrules";

// optional / experimental plugins
export { mathSelectPlugin } from "./plugins/math-select";