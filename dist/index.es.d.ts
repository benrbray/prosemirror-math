/*---------------------------------------------------------
*  Author: Benjamin R. Bray
*  License: MIT (see LICENSE in project root for details)
*--------------------------------------------------------*/
// prosemirror imports
import { MarkSpec, NodeSpec, Schema, SchemaSpec, NodeType, Mark, Slice, MarkType, Fragment } from "prosemirror-model";
import { Node as ProseNode } from "prosemirror-model";
import { EditorState, Transaction, PluginKey } from "prosemirror-state";
import { Plugin as ProsePlugin } from "prosemirror-state";
import { NodeView, EditorView, Decoration } from "prosemirror-view";
// katex
import { KatexOptions } from "katex";
import { Command } from "prosemirror-commands";
import { Command as ProseCommand } from "prosemirror-commands";
/*---------------------------------------------------------
*  Author: Benjamin R. Bray
*  License: MIT (see LICENSE in project root for details)
*--------------------------------------------------------*/
import { InputRule } from "prosemirror-inputrules";
////////////////////////////////////////////////////////////
interface IMathPluginState {
    macros: {
        [cmd: string]: string;
    };
    /** A list of currently active `NodeView`s, in insertion order. */
    activeNodeViews: MathView[];
    /**
     * Used to determine whether to place the cursor in the front- or back-most
     * position when expanding a math node, without overriding the default arrow
     * key behavior.
     */
    prevCursorPos: number;
}
/**
 * Returns a function suitable for passing as a field in `EditorProps.nodeViews`.
 * @param displayMode TRUE for block math, FALSE for inline math.
 * @see https://prosemirror.net/docs/ref/#view.EditorProps.nodeViews
 */
declare function createMathView(displayMode: boolean): (node: ProseNode, view: EditorView, getPos: boolean | (() => number)) => MathView;
declare const mathPlugin: ProsePlugin<IMathPluginState, any>;
//// INLINE MATH NODEVIEW //////////////////////////////////
interface ICursorPosObserver {
    /** indicates on which side cursor should appear when this node is selected */
    cursorSide: "start" | "end";
    /**  */
    updateCursorPos(state: EditorState): void;
}
interface IMathViewOptions {
    /** Dom element name to use for this NodeView */
    tagName?: string;
    /** Whether to render this node as display or inline math. */
    katexOptions?: KatexOptions;
}
declare class MathView implements NodeView, ICursorPosObserver {
    // nodeview params
    private _node;
    private _outerView;
    private _getPos;
    // nodeview dom
    dom: HTMLElement;
    private _mathRenderElt;
    private _mathSrcElt;
    private _innerView;
    // internal state
    cursorSide: "start" | "end";
    private _katexOptions;
    private _tagName;
    private _isEditing;
    private _onDestroy;
    private _mathPluginKey;
    // == Lifecycle ===================================== //
    /**
     * @param onDestroy Callback for when this NodeView is destroyed.
     *     This NodeView should unregister itself from the list of ICursorPosObservers.
     *
     * Math Views support the following options:
     * @option displayMode If TRUE, will render math in display mode, otherwise in inline mode.
     * @option tagName HTML tag name to use for this NodeView.  If none is provided,
     *     will use the node name with underscores converted to hyphens.
     */
    constructor(node: ProseNode, view: EditorView, getPos: (() => number), options: IMathViewOptions | undefined, mathPluginKey: PluginKey<IMathPluginState>, onDestroy?: (() => void));
    destroy(): void;
    /**
     * Ensure focus on the inner editor whenever this node has focus.
     * This helps to prevent accidental deletions of math blocks.
     */
    ensureFocus(): void;
    // == Updates ======================================= //
    update(node: ProseNode, decorations: Decoration[]): boolean;
    updateCursorPos(state: EditorState): void;
    // == Events ===================================== //
    selectNode(): void;
    deselectNode(): void;
    stopEvent(event: Event): boolean;
    ignoreMutation(): boolean;
    // == Rendering ===================================== //
    renderMath(): void;
    // == Inner Editor ================================== //
    dispatchInner(tr: Transaction): void;
    openEditor(): void;
    /**
     * Called when the inner ProseMirror editor should close.
     *
     * @param render Optionally update the rendered math after closing. (which
     *    is generally what we want to do, since the user is done editing!)
     */
    closeEditor(render?: boolean): void;
}
////////////////////////////////////////////////////////////////////////////////
// infer generic `Nodes` and `Marks` type parameters for a SchemaSpec
type SchemaSpecNodeT<Spec> = Spec extends SchemaSpec<infer N, infer _> ? N : never;
type SchemaSpecMarkT<Spec> = Spec extends SchemaSpec<infer _, infer M> ? M : never;
type SchemaNodeT<S> = S extends Schema<infer N, infer _> ? N : never;
type SchemaMarkT<S> = S extends Schema<infer _, infer M> ? M : never;
////////////////////////////////////////////////////////////
/**
 * Borrowed from ProseMirror typings, modified to exclude OrderedMaps in spec,
 * in order to help with the schema-building functions below.
 *
 * NOTE:  TypeScript's typings for the spread operator { ...a, ...b } are only
 * an approximation to the true type, and have difficulty with optional fields.
 * So, unlike the SchemaSpec type, the `marks` field is NOT optional here.
 *
 * function example<T extends string>(x: { [name in T]: string; } | null) {
 *     const s = { ...x }; // inferred to have type `{}`.
 * }
 *
 * @see https://github.com/microsoft/TypeScript/issues/10727
 */
interface SchemaSpecJson<N extends string = any, M extends string = any> extends SchemaSpec<N, M> {
    nodes: {
        [name in N]: NodeSpec;
    };
    marks: {
        [name in M]: MarkSpec;
    };
    topNode?: string | null;
}
// bare minimum ProseMirror schema for working with math nodes
declare const mathSchemaSpec: SchemaSpecJson<"doc" | "paragraph" | "math_inline" | "math_display" | "text", "math_select">;
/**
 * Use the prosemirror-math default SchemaSpec to create a new Schema.
 */
declare function createMathSchema(): Schema<"doc" | "paragraph" | "math_inline" | "math_display" | "text", "math_select">;
declare const mathBackspaceCmd: ProseCommand;
////////////////////////////////////////////////////////////
// ---- Inline Input Rules ------------------------------ //
// simple input rule for inline math
declare const REGEX_INLINE_MATH_DOLLARS: RegExp; //new RegExp("\$(.+)\$", "i");
// negative lookbehind regex notation allows for escaped \$ delimiters
// (requires browser supporting ECMA2018 standard -- currently only Chrome / FF)
// (see https://javascript.info/regexp-lookahead-lookbehind)
declare const REGEX_INLINE_MATH_DOLLARS_ESCAPED: RegExp;
// ---- Block Input Rules ------------------------------- //
// simple inputrule for block math
declare const REGEX_BLOCK_MATH_DOLLARS: RegExp; //new RegExp("\$\$\s+$", "i");
////////////////////////////////////////////////////////////
declare function makeInlineMathInputRule(pattern: RegExp, nodeType: NodeType, getAttrs?: (match: string[]) => any): InputRule<any>;
declare function makeBlockMathInputRule(pattern: RegExp, nodeType: NodeType, getAttrs?: (match: string[]) => any): InputRule<any>;
/**
 * Due to the internals of KaTeX, by default, selecting rendered
 * math will put a box around each individual character of a
 * math expression.  This plugin attempts to make math selections
 * slightly prettier by instead setting a background color on the node.
 *
 * (remember to use the included math.css!)
 *
 * @todo (6/13/20) math selection rectangles are not quite even with text
 */
declare const mathSelectPlugin: ProsePlugin;
////////////////////////////////////////////////////////////////////////////////
/**
 * Returns a new command that can be used to inserts a new math node at the
 * user's current document position, provided that the document schema actually
 * allows a math node to be placed there.
 *
 * @param mathNodeType An instance for either your math_inline or math_display
 *     NodeType.  Must belong to the same schema that your EditorState uses!
 */
declare function insertMathCmd(mathNodeType: NodeType): Command;
////////////////////////////////////////////////////////////////////////////////
type TypedNode<T extends string, S extends Schema<T, any>> = ProseNode<S> & {
    type: NodeType<S> & {
        name: T;
    };
};
type TypedMark<T extends string, S extends Schema<T, any>> = Mark<S> & {
    type: MarkType<S> & {
        name: T;
    };
};
type NodeSerializer<T extends string, S extends Schema<T, any>> = (node: TypedNode<T, S>) => string;
type MarkSerializer<T extends string, S extends Schema<T, any>> = (mark: TypedMark<T, S>) => string;
declare class ProseMirrorTextSerializer<S extends Schema<any, any>> {
    nodes: {
        [name: string]: NodeSerializer<string, S> | undefined;
    };
    marks: {
        [name: string]: NodeSerializer<string, S> | undefined;
    };
    constructor(fns: {
        nodes?: {
            [name in SchemaNodeT<S>]?: NodeSerializer<name, S>;
        };
        marks?: {
            [name in SchemaMarkT<S>]?: MarkSerializer<name, S>;
        };
    }, base?: ProseMirrorTextSerializer<S>);
    serializeFragment(fragment: Fragment<S>): string;
    serializeSlice(slice: Slice<S>): string;
    serializeNode(node: ProseNode<S>): string | null;
}
declare const mathSerializer: ProseMirrorTextSerializer<Schema<"doc" | "paragraph" | "math_inline" | "math_display" | "text", "math_select">>;
export { MathView, ICursorPosObserver, mathPlugin, createMathView, IMathPluginState, mathSchemaSpec, createMathSchema, mathBackspaceCmd, makeBlockMathInputRule, makeInlineMathInputRule, REGEX_BLOCK_MATH_DOLLARS, REGEX_INLINE_MATH_DOLLARS, REGEX_INLINE_MATH_DOLLARS_ESCAPED, mathSelectPlugin, insertMathCmd, mathSerializer, SchemaSpecNodeT, SchemaSpecMarkT, SchemaNodeT, SchemaMarkT };
//# sourceMappingURL=index.es.d.ts.map