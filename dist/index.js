'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var prosemirrorState = require('prosemirror-state');
var prosemirrorView = require('prosemirror-view');
var prosemirrorTransform = require('prosemirror-transform');
var prosemirrorKeymap = require('prosemirror-keymap');
var prosemirrorCommands = require('prosemirror-commands');
var katex = require('katex');
var prosemirrorModel = require('prosemirror-model');
var prosemirrorInputrules = require('prosemirror-inputrules');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var katex__default = /*#__PURE__*/_interopDefaultLegacy(katex);

/**
 * A ProseMirror command for determining whether to exit a math block, based on
 * specific conditions.  Normally called when the user has
 *
 * @param outerView The main ProseMirror EditorView containing this math node.
 * @param dir Used to indicate desired cursor position upon closing a math node.
 *     When set to -1, cursor will be placed BEFORE the math node.
 *     When set to +1, cursor will be placed AFTER the math node.
 * @param borderMode An exit condition based on cursor position and direction.
 * @param requireEmptySelection When TRUE, only exit the math node when the
 *    (inner) selection is empty.
 * @returns A new ProseMirror command based on the input configuration.
 */
function collapseMathCmd(outerView, dir, requireOnBorder, requireEmptySelection = true) {
    // create a new ProseMirror command based on the input conditions
    return (innerState, dispatch) => {
        // get selection info
        let outerState = outerView.state;
        let { to: outerTo, from: outerFrom } = outerState.selection;
        let { to: innerTo, from: innerFrom } = innerState.selection;
        // only exit math node when selection is empty
        if (requireEmptySelection && innerTo !== innerFrom) {
            return false;
        }
        let currentPos = (dir > 0) ? innerTo : innerFrom;
        // when requireOnBorder is TRUE, collapse only when cursor
        // is about to leave the bounds of the math node
        if (requireOnBorder) {
            // (subtract two from nodeSize to account for start and end tokens)
            let nodeSize = innerState.doc.nodeSize - 2;
            // early return if exit conditions not met
            if (dir > 0 && currentPos < nodeSize) {
                return false;
            }
            if (dir < 0 && currentPos > 0) {
                return false;
            }
        }
        // all exit conditions met, so close the math node by moving the cursor outside
        if (dispatch) {
            // set outer selection to be outside of the nodeview
            let targetPos = (dir > 0) ? outerTo : outerFrom;
            outerView.dispatch(outerState.tr.setSelection(prosemirrorState.TextSelection.create(outerState.doc, targetPos)));
            // must return focus to the outer view, otherwise no cursor will appear
            outerView.focus();
        }
        return true;
    };
}

/*---------------------------------------------------------
 *  Author: Benjamin R. Bray
 *  License: MIT (see LICENSE in project root for details)
 *--------------------------------------------------------*/
class MathView {
    // == Lifecycle ===================================== //
    /**
     * @param isBlockMath Set to TRUE for block math, FALSE for inline math.
     *     Currently, only affects the math preview pane.
     * @param onDestroy Callback for when this NodeView is destroyed.
     *     This NodeView should unregister itself from the list of ICursorPosObservers.
     *
     * Math Views support the following options:
     * @option displayMode If TRUE, will render math in display mode, otherwise in inline mode.
     * @option tagName HTML tag name to use for this NodeView.  If none is provided,
     *     will use the node name with underscores converted to hyphens.
     */
    constructor(node, view, getPos, options = {}, isBlockMath, mathPluginKey) {
        // store arguments
        this._node = node;
        this._outerView = view;
        this._getPos = getPos;
        this._isBlockMath = isBlockMath;
        this._mathPluginKey = mathPluginKey;
        // editing state
        this.cursorSide = "start";
        this._editorActive = false;
        this._renderActive = true;
        // options
        this._katexOptions = Object.assign({ globalGroup: true, throwOnError: false }, options.katexOptions);
        this._tagName = options.tagName || this._node.type.name.replace("_", "-");
        // create dom representation of nodeview
        this.dom = document.createElement(this._tagName);
        this.dom.classList.add("math-node");
        this._mathRenderElt = document.createElement("span");
        this._mathRenderElt.textContent = "";
        this._mathRenderElt.classList.add("math-render");
        this.dom.appendChild(this._mathRenderElt);
        // wrapper for the math source code
        this._mathSrcElt = document.createElement("span");
        this._mathSrcElt.classList.add("math-src");
        this.dom.appendChild(this._mathSrcElt);
        // ensure 
        this.dom.addEventListener("click", () => this.ensureFocus());
        // render initial content
        this.renderMath();
    }
    /**
     * Destroy the NodeView, leaving it in an invalid state.
     */
    destroy() {
        // close the inner editor without rendering
        this.closeEditor(false);
        // clean up dom elements
        if (this._mathRenderElt) {
            this._mathRenderElt.remove();
            delete this._mathRenderElt;
        }
        if (this._mathSrcElt) {
            this._mathSrcElt.remove();
            delete this._mathSrcElt;
        }
        this.dom.remove();
    }
    /**
     * Ensure focus on the inner editor whenever this node has focus.
     * This helps to prevent accidental deletions of math blocks.
     */
    ensureFocus() {
        if (this._innerView && this._outerView.hasFocus()) {
            this._innerView.focus();
        }
    }
    // == Updates ======================================= //
    update(node, decorations) {
        if (!node.sameMarkup(this._node))
            return false;
        this._node = node;
        if (this._innerView) {
            let state = this._innerView.state;
            let start = node.content.findDiffStart(state.doc.content);
            if (start != null) {
                let diff = node.content.findDiffEnd(state.doc.content);
                if (diff) {
                    let { a: endA, b: endB } = diff;
                    let overlap = start - Math.min(endA, endB);
                    if (overlap > 0) {
                        endA += overlap;
                        endB += overlap;
                    }
                    this._innerView.dispatch(state.tr
                        .replace(start, endB, node.slice(start, endA))
                        .setMeta("fromOutside", true));
                }
            }
        }
        if (this._renderActive) {
            this.renderMath();
        }
        return true;
    }
    // == Events ===================================== //
    selectNode() {
        if (!this._outerView.editable) {
            return;
        }
        this.dom.classList.add("ProseMirror-selectednode");
        if (!this._editorActive) {
            this.openEditor();
        }
    }
    deselectNode() {
        this.dom.classList.remove("ProseMirror-selectednode");
        if (this._editorActive) {
            this.closeEditor();
        }
    }
    stopEvent(event) {
        return (this._innerView !== undefined)
            && (event.target !== undefined)
            && this._innerView.dom.contains(event.target);
    }
    ignoreMutation() { return true; }
    // == Rendering ===================================== //
    renderMath() {
        if (!this._mathRenderElt) {
            return;
        }
        // get tex string to render
        let content = this._node.content.content;
        let texString = "";
        if (content.length > 0 && content[0].textContent !== null) {
            texString = content[0].textContent.trim();
        }
        // empty math?
        if (texString.length < 1) {
            this.dom.classList.add("empty-math");
            // clear rendered math, since this node is in an invalid state
            while (this._mathRenderElt.firstChild) {
                this._mathRenderElt.firstChild.remove();
            }
            // do not render empty math
            return;
        }
        else {
            this.dom.classList.remove("empty-math");
        }
        // render katex, but fail gracefully
        try {
            katex__default['default'].render(texString, this._mathRenderElt, this._katexOptions);
            this._mathRenderElt.classList.remove("parse-error");
            this.dom.setAttribute("title", "");
        }
        catch (err) {
            if (err instanceof katex.ParseError) {
                console.error(err);
                this._mathRenderElt.classList.add("parse-error");
                this.dom.setAttribute("title", err.toString());
            }
            else {
                throw err;
            }
        }
    }
    // == Inner Editor ================================== //
    dispatchInner(tr) {
        if (!this._innerView) {
            return;
        }
        let { state, transactions } = this._innerView.state.applyTransaction(tr);
        this._innerView.updateState(state);
        if (!tr.getMeta("fromOutside")) {
            let outerTr = this._outerView.state.tr, offsetMap = prosemirrorTransform.StepMap.offset(this._getPos() + 1);
            for (let i = 0; i < transactions.length; i++) {
                let steps = transactions[i].steps;
                for (let j = 0; j < steps.length; j++) {
                    let mapped = steps[j].map(offsetMap);
                    if (!mapped) {
                        throw Error("step discarded!");
                    }
                    outerTr.step(mapped);
                }
            }
            if (outerTr.docChanged)
                this._outerView.dispatch(outerTr);
        }
    }
    /**
     * Mark the render pane as active.  CSS controls actual visibility.
     * @param isPreview If TRUE, we are currently in preview mode.
     */
    showRender(isPreview) {
        var _a, _b;
        if (isPreview) {
            (_a = this._mathRenderElt) === null || _a === void 0 ? void 0 : _a.classList.add("math-preview");
        }
        else {
            (_b = this._mathRenderElt) === null || _b === void 0 ? void 0 : _b.classList.remove("math-preview");
        }
        this._renderActive = true;
    }
    /**
     * Mark the render pane as inactive.  CSS controls actual visibility.
     */
    hideRender() {
        var _a;
        (_a = this._mathRenderElt) === null || _a === void 0 ? void 0 : _a.classList.remove("math-preview");
        this._renderActive = false;
    }
    openEditor() {
        if (this._innerView) {
            throw Error("inner view should not exist!");
        }
        // create a nested ProseMirror view
        this._innerView = new prosemirrorView.EditorView(this._mathSrcElt, {
            state: prosemirrorState.EditorState.create({
                doc: this._node,
                plugins: [prosemirrorKeymap.keymap({
                        "Tab": (state, dispatch) => {
                            if (dispatch) {
                                dispatch(state.tr.insertText("\t"));
                            }
                            return true;
                        },
                        "Backspace": prosemirrorCommands.chainCommands(prosemirrorCommands.deleteSelection, (state, dispatch, tr_inner) => {
                            // default backspace behavior for non-empty selections
                            if (!state.selection.empty) {
                                return false;
                            }
                            // default backspace behavior when math node is non-empty
                            if (this._node.textContent.length > 0) {
                                return false;
                            }
                            // otherwise, we want to delete the empty math node and focus the outer view
                            this._outerView.dispatch(this._outerView.state.tr.insertText(""));
                            this._outerView.focus();
                            return true;
                        }),
                        "Ctrl-Backspace": (state, dispatch, tr_inner) => {
                            // delete math node and focus the outer view
                            this._outerView.dispatch(this._outerView.state.tr.insertText(""));
                            this._outerView.focus();
                            return true;
                        },
                        "Enter": prosemirrorCommands.chainCommands(prosemirrorCommands.newlineInCode, collapseMathCmd(this._outerView, +1, false)),
                        "Ctrl-Enter": collapseMathCmd(this._outerView, +1, false),
                        "ArrowLeft": collapseMathCmd(this._outerView, -1, true),
                        "ArrowRight": collapseMathCmd(this._outerView, +1, true),
                        "ArrowUp": collapseMathCmd(this._outerView, -1, true),
                        "ArrowDown": collapseMathCmd(this._outerView, +1, true),
                    })]
            }),
            dispatchTransaction: this.dispatchInner.bind(this)
        });
        // focus element
        let innerState = this._innerView.state;
        this._innerView.focus();
        // request plugin state
        const maybeState = this._mathPluginKey.getState(this._outerView.state);
        if (maybeState === null || maybeState === undefined) {
            console.error("[prosemirror-math] Error:  Unable to fetch math plugin state from key.");
        }
        // get most recent cursor position from outer editor
        const maybePos = maybeState === null || maybeState === void 0 ? void 0 : maybeState.prevCursorPos;
        let prevCursorPos = maybePos !== null && maybePos !== void 0 ? maybePos : 0;
        // compute position that cursor should appear within the expanded math node
        let innerPos = (prevCursorPos <= this._getPos()) ? 0 : this._node.nodeSize - 2;
        this._innerView.dispatch(innerState.tr.setSelection(prosemirrorState.TextSelection.create(innerState.doc, innerPos)));
        this._editorActive = true;
        // optionally activate preview window
        let showPreview = this._isBlockMath && (maybeState === null || maybeState === void 0 ? void 0 : maybeState.enableBlockPreview);
        if (showPreview) {
            this.showRender(true);
        }
        else {
            this.hideRender();
        }
    }
    /**
     * Called when the inner ProseMirror editor should close.
     *
     * @param render Optionally update the rendered math after closing. (which
     *    is generally what we want to do, since the user is done editing!)
     */
    closeEditor(render = true) {
        if (this._innerView) {
            this._innerView.destroy();
            this._innerView = undefined;
        }
        if (render) {
            this.renderMath();
        }
        this._editorActive = false;
        this.showRender(false);
    }
}

/*---------------------------------------------------------
 *  Author: Benjamin R. Bray
 *  License: MIT (see LICENSE in project root for details)
 *--------------------------------------------------------*/
// uniquely identifies the prosemirror-math plugin
const MATH_PLUGIN_KEY = new prosemirrorState.PluginKey("prosemirror-math");
/**
 * Returns a function suitable for passing as a field in `EditorProps.nodeViews`.
 * @param displayMode TRUE for block math, FALSE for inline math.
 * @see https://prosemirror.net/docs/ref/#view.EditorProps.nodeViews
 */
function createMathView(displayMode) {
    return (node, view, getPos) => {
        /** @todo is this necessary?
        * Docs says that for any function proprs, the current plugin instance
        * will be bound to `this`.  However, the typings don't reflect this.
        */
        let pluginState = MATH_PLUGIN_KEY.getState(view.state);
        if (!pluginState) {
            throw new Error("no math plugin!");
        }
        let nodeViews = pluginState.activeNodeViews;
        // set up NodeView
        let nodeView = new MathView(node, view, getPos, { katexOptions: { displayMode, macros: pluginState.macros } }, displayMode, MATH_PLUGIN_KEY);
        nodeViews.push(nodeView);
        return nodeView;
    };
}
function mathPluginSpec(options) {
    return {
        key: MATH_PLUGIN_KEY,
        state: {
            init(config, instance) {
                return {
                    macros: {},
                    activeNodeViews: [],
                    prevCursorPos: 0,
                    enableBlockPreview: options.enableBlockPreview
                };
            },
            apply(tr, value, oldState, newState) {
                // produce updated state field for this plugin
                return {
                    // these values are left unchanged
                    activeNodeViews: value.activeNodeViews,
                    macros: value.macros,
                    enableBlockPreview: value.enableBlockPreview,
                    // update with the second-most recent cursor pos
                    prevCursorPos: oldState.selection.from
                };
            },
            /** @todo (8/21/20) implement serialization for math plugin */
            // toJSON(value) { },
            // fromJSON(config, value, state){ return {}; }
        },
        props: {
            nodeViews: {
                "math_inline": createMathView(false),
                "math_display": createMathView(true)
            }
        }
    };
}
function mathPlugin(options) {
    return new prosemirrorState.Plugin(mathPluginSpec(options));
}

/**
 * Note that for some of the `ParseRule`s defined below,
 * we define a `getAttrs` function, which, other than
 * defining node attributes, can be used to describe complex
 * match conditions for a rule.
 
 * Returning `false` from `ParseRule.getAttrs` prevents the
 * rule from matching, while returning `null` indicates that
 * the default set of note attributes should be used.
 */
////////////////////////////////////////////////////////////
function getFirstMatch(root, rules) {
    for (let rule of rules) {
        let match = rule(root);
        if (match !== false) {
            return match;
        }
    }
    return false;
}
function makeTextFragment(text, schema) {
    return prosemirrorModel.Fragment.from(schema.text(text));
}
////////////////////////////////////////////////////////////
// -- Wikipedia ----------------------------------------- //
/**
 * Look for a child node that matches the following template:
 * <img src="https://wikimedia.org/api/rest_v1/media/math/render/svg/..."
 *              class="mwe-math-fallback-image-inline"
 *              alt="..." />
 */
function texFromMediaWikiFallbackImage(root) {
    var _a;
    let match = root.querySelector("img.mwe-math-fallback-image-inline[alt]");
    return ((_a = match === null || match === void 0 ? void 0 : match.getAttribute("alt")) !== null && _a !== void 0 ? _a : false);
}
/**
 * Look for a child node that matches the following template:
 * <math xmlns="http://www.w3.org/1998/Math/MathML" alttext="...">
 */
function texFromMathML_01(root) {
    var _a;
    let match = root.querySelector("math[alttext]");
    return ((_a = match === null || match === void 0 ? void 0 : match.getAttribute("alttext")) !== null && _a !== void 0 ? _a : false);
}
/**
 * Look for a child node that matches the following template:
 * <math xmlns="http://www.w3.org/1998/Math/MathML" alttext="...">
 */
function texFromMathML_02(root) {
    var _a;
    let match = root.querySelector("math annotation[encoding='application/x-tex'");
    return ((_a = match === null || match === void 0 ? void 0 : match.textContent) !== null && _a !== void 0 ? _a : false);
}
function matchWikipedia(root) {
    let match = getFirstMatch(root, [
        texFromMediaWikiFallbackImage,
        texFromMathML_01,
        texFromMathML_02
    ]);
    // TODO: if no tex string was found, but we have MathML, try to parse it
    return match;
}
/**
 * Wikipedia formats block math inside a <dl>...</dl> element, as below.
 *
 *   - Evidently no CSS class is used to distinguish inline vs block math
 *   - Sometimes the `\displaystyle` TeX command is present even in inline math
 *
 * ```html
 * <dl><dd><span class="mwe-math-element">
 *     <span class="mwe-math-mathml-inline mwe-math-mathml-ally" style="...">
 *         <math xmlns="http://www.w3.org/1998/Math/MathML" alttext="...">
 *             <semantics>
 *                 <mrow class="MJX-TeXAtom-ORD">...</mrow>
 *                 <annotation encoding="application/x-tex">...</annotation>
 *             </semantics>
 *         </math>
 *         <img src="https://wikimedia.org/api/rest_v1/media/math/render/svg/..."
 *              class="mwe-math-fallback-image-inline"
 *              alt="..." />
 *     </span>
 * </span></dd></dl>
 * ```
 */
const wikipediaBlockMathParseRule = {
    tag: "dl",
    getAttrs(p) {
        let dl = p;
        // <dl> must contain exactly one child
        if (dl.childElementCount !== 1) {
            return false;
        }
        let dd = dl.firstChild;
        if (dd.tagName !== "DD") {
            return false;
        }
        // <dd> must contain exactly one child
        if (dd.childElementCount !== 1) {
            return false;
        }
        let mweElt = dd.firstChild;
        if (!mweElt.classList.contains("mwe-math-element")) {
            return false;
        }
        // success!  proceed to `getContent` for further processing
        return null;
    },
    getContent(p, schema) {
        // search the matched element for a TeX string
        let match = matchWikipedia(p);
        // return a fragment representing the math node's children
        let texString = match || "\\text{\\color{red}(paste error)}";
        return makeTextFragment(texString, schema);
    }
};
/**
 * Parse rule for inline math content on Wikipedia of the following form:
 *
 * ```html
 * <span class="mwe-math-element">
 *     <span class="mwe-math-mathml-inline mwe-math-mathml-ally" style="...">
 *         <math xmlns="http://www.w3.org/1998/Math/MathML" alttext="...">
 *             <semantics>
 *                 <mrow class="MJX-TeXAtom-ORD">...</mrow>
 *                 <annotation encoding="application/x-tex">...</annotation>
 *             </semantics>
 *         </math>
 *         <img src="https://wikimedia.org/api/rest_v1/media/math/render/svg/..."
 *              class="mwe-math-fallback-image-inline"
 *              alt="..." />
 *     </span>
 * </span>
 * ```
 */
const wikipediaInlineMathParseRule = {
    tag: "span",
    getAttrs(p) {
        let span = p;
        if (!span.classList.contains("mwe-math-element")) {
            return false;
        }
        // success!  proceed to `getContent` for further processing
        return null;
    },
    getContent(p, schema) {
        // search the matched element for a TeX string
        let match = matchWikipedia(p);
        // return a fragment representing the math node's children
        let texString = match || "\\text{\\color{red}(paste error)}";
        return makeTextFragment(texString, schema);
    }
};
// -- MathJax ------------------------------------------- //
////////////////////////////////////////////////////////////
const defaultInlineMathParseRules = [
    wikipediaInlineMathParseRule,
];
const defaultBlockMathParseRules = [
    wikipediaBlockMathParseRule,
];

/*---------------------------------------------------------
 *  Author: Benjamin R. Bray
 *  License: MIT (see LICENSE in project root for details)
 *--------------------------------------------------------*/
////////////////////////////////////////////////////////////
// force typescript to infer generic type arguments for SchemaSpec
function createSchemaSpec(spec) {
    return spec;
}
// bare minimum ProseMirror schema for working with math nodes
const mathSchemaSpec = createSchemaSpec({
    nodes: {
        // :: NodeSpec top-level document node
        doc: {
            content: "block+"
        },
        paragraph: {
            content: "inline*",
            group: "block",
            parseDOM: [{ tag: "p" }],
            toDOM() { return ["p", 0]; }
        },
        math_inline: {
            group: "inline math",
            content: "text*",
            inline: true,
            atom: true,
            toDOM: () => ["math-inline", { class: "math-node" }, 0],
            parseDOM: [
                { tag: "math-inline" },
                ...defaultInlineMathParseRules
            ]
        },
        math_display: {
            group: "block math",
            content: "text*",
            atom: true,
            code: true,
            toDOM: () => ["math-display", { class: "math-node" }, 0],
            parseDOM: [
                { tag: "math-display" },
                ...defaultBlockMathParseRules
            ]
        },
        text: {
            group: "inline"
        }
    },
    marks: {
        math_select: {
            toDOM() { return ["math-select", 0]; },
            parseDOM: [{ tag: "math-select" }]
        }
    }
});
/**
 * Use the prosemirror-math default SchemaSpec to create a new Schema.
 */
function createMathSchema() {
    return new prosemirrorModel.Schema(mathSchemaSpec);
}

const mathBackspaceCmd = (state, dispatch) => {
    // check node before
    let { $from } = state.selection;
    let nodeBefore = $from.nodeBefore;
    if (!nodeBefore) {
        return false;
    }
    if (nodeBefore.type.name == "math_inline") {
        // select math node
        let index = $from.index($from.depth);
        let $beforePos = state.doc.resolve($from.posAtIndex(index - 1));
        if (dispatch) {
            dispatch(state.tr.setSelection(new prosemirrorState.NodeSelection($beforePos)));
        }
        return true;
    }
    else if (nodeBefore.type.name == "math_block") {
        /** @todo (8/1/20) implement backspace for math blocks
         * check how code blocks behave when pressing backspace
         */
        return false;
    }
    return false;
};

/*---------------------------------------------------------
 *  Author: Benjamin R. Bray
 *  License: MIT (see LICENSE in project root for details)
 *--------------------------------------------------------*/
////////////////////////////////////////////////////////////
// ---- Inline Input Rules ------------------------------ //
// simple input rule for inline math
const REGEX_INLINE_MATH_DOLLARS = /\$(.+)\$/; //new RegExp("\$(.+)\$", "i");
// negative lookbehind regex notation allows for escaped \$ delimiters
// (requires browser supporting ECMA2018 standard -- currently only Chrome / FF)
// (see https://javascript.info/regexp-lookahead-lookbehind)
const REGEX_INLINE_MATH_DOLLARS_ESCAPED = (() => {
    // attempt to create regex with negative lookbehind
    try {
        return new RegExp("(?<!\\\\)\\$(.+)(?<!\\\\)\\$");
    }
    catch (e) {
        return REGEX_INLINE_MATH_DOLLARS;
    }
})();
// ---- Block Input Rules ------------------------------- //
// simple inputrule for block math
const REGEX_BLOCK_MATH_DOLLARS = /\$\$\s+$/; //new RegExp("\$\$\s+$", "i");
////////////////////////////////////////////////////////////
function makeInlineMathInputRule(pattern, nodeType, getAttrs) {
    return new prosemirrorInputrules.InputRule(pattern, (state, match, start, end) => {
        let $start = state.doc.resolve(start);
        let index = $start.index();
        let $end = state.doc.resolve(end);
        // get attrs
        let attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs;
        // check if replacement valid
        if (!$start.parent.canReplaceWith(index, $end.index(), nodeType)) {
            return null;
        }
        // perform replacement
        return state.tr.replaceRangeWith(start, end, nodeType.create(attrs, nodeType.schema.text(match[1])));
    });
}
function makeBlockMathInputRule(pattern, nodeType, getAttrs) {
    return new prosemirrorInputrules.InputRule(pattern, (state, match, start, end) => {
        let $start = state.doc.resolve(start);
        let attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs;
        if (!$start.node(-1).canReplaceWith($start.index(-1), $start.indexAfter(-1), nodeType))
            return null;
        let tr = state.tr
            .delete(start, end)
            .setBlockType(start, start, nodeType, attrs);
        return tr.setSelection(prosemirrorState.NodeSelection.create(tr.doc, tr.mapping.map($start.pos - 1)));
    });
}

/*---------------------------------------------------------
 *  Author: Benjamin R. Bray
 *  License: MIT (see LICENSE in project root for details)
 *--------------------------------------------------------*/
////////////////////////////////////////////////////////////
/**
 * Uses the selection to determine which math_select decorations
 * should be applied to the given document.
 * @param arg Should be either a Transaction or an EditorState,
 *     although any object with `selection` and `doc` will work.
 */
const checkSelection = (arg) => {
    let { from, to } = arg.selection;
    let content = arg.selection.content().content;
    let result = [];
    content.descendants((node, pos, parent) => {
        if (node.type.name == "text") {
            return false;
        }
        if (node.type.name.startsWith("math_")) {
            result.push({
                start: Math.max(from + pos - 1, 0),
                end: from + pos + node.nodeSize - 1
            });
            return false;
        }
        return true;
    });
    return prosemirrorView.DecorationSet.create(arg.doc, result.map(({ start, end }) => prosemirrorView.Decoration.node(start, end, { class: "math-select" })));
};
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
const mathSelectPlugin = new prosemirrorState.Plugin({
    state: {
        init(config, partialState) {
            return checkSelection(partialState);
        },
        apply(tr, oldState) {
            if (!tr.selection || !tr.selectionSet) {
                return oldState;
            }
            let sel = checkSelection(tr);
            return sel;
        }
    },
    props: {
        decorations: (state) => { return mathSelectPlugin.getState(state); },
    }
});

////////////////////////////////////////////////////////////////////////////////
/**
 * Returns a new command that can be used to inserts a new math node at the
 * user's current document position, provided that the document schema actually
 * allows a math node to be placed there.
 *
 * @param mathNodeType An instance for either your math_inline or math_display
 *     NodeType.  Must belong to the same schema that your EditorState uses!
 */
function insertMathCmd(mathNodeType) {
    return function (state, dispatch) {
        let { $from } = state.selection, index = $from.index();
        if (!$from.parent.canReplaceWith(index, index, mathNodeType)) {
            return false;
        }
        if (dispatch) {
            let tr = state.tr.replaceSelectionWith(mathNodeType.create({}));
            tr = tr.setSelection(prosemirrorState.NodeSelection.create(tr.doc, $from.pos));
            dispatch(tr);
        }
        return true;
    };
}

class ProseMirrorTextSerializer {
    constructor(fns, base) {
        // use base serializer as a fallback
        this.nodes = Object.assign(Object.assign({}, base === null || base === void 0 ? void 0 : base.nodes), fns.nodes);
        this.marks = Object.assign(Object.assign({}, base === null || base === void 0 ? void 0 : base.marks), fns.marks);
    }
    serializeFragment(fragment) {
        // adapted from the undocumented `Fragment.textBetween` function
        // https://github.com/ProseMirror/prosemirror-model/blob/eef20c8c6dbf841b1d70859df5d59c21b5108a4f/src/fragment.js#L46
        let blockSeparator = "\n\n";
        let leafText = undefined;
        let text = "";
        let separated = true;
        let from = 0;
        let to = fragment.size;
        fragment.nodesBetween(from, to, (node, pos) => {
            var _a;
            // check if one of our custom serializers handles this node
            let serialized = this.serializeNode(node);
            if (serialized !== null) {
                text += serialized;
                return false;
            }
            if (node.isText) {
                text += ((_a = node.text) === null || _a === void 0 ? void 0 : _a.slice(Math.max(from, pos) - pos, to - pos)) || "";
                separated = !blockSeparator;
            }
            else if (node.isLeaf && leafText) {
                text += leafText;
                separated = !blockSeparator;
            }
            else if (!separated && node.isBlock) {
                text += blockSeparator;
                separated = true;
            }
        }, 0);
        return text;
    }
    serializeSlice(slice) {
        return this.serializeFragment(slice.content);
    }
    serializeNode(node) {
        // check if one of our custom serializers handles this node
        let nodeSerializer = this.nodes[node.type.name];
        if (nodeSerializer !== undefined) {
            return nodeSerializer(node);
        }
        else {
            return null;
        }
    }
}
const mathSerializer = new ProseMirrorTextSerializer({
    nodes: {
        "math_inline": (node) => `$${node.textContent}$`,
        "math_display": (node) => `\n\n$$\n${node.textContent}\n$$`
    }
});

exports.MathView = MathView;
exports.REGEX_BLOCK_MATH_DOLLARS = REGEX_BLOCK_MATH_DOLLARS;
exports.REGEX_INLINE_MATH_DOLLARS = REGEX_INLINE_MATH_DOLLARS;
exports.REGEX_INLINE_MATH_DOLLARS_ESCAPED = REGEX_INLINE_MATH_DOLLARS_ESCAPED;
exports.createMathSchema = createMathSchema;
exports.createMathView = createMathView;
exports.insertMathCmd = insertMathCmd;
exports.makeBlockMathInputRule = makeBlockMathInputRule;
exports.makeInlineMathInputRule = makeInlineMathInputRule;
exports.mathBackspaceCmd = mathBackspaceCmd;
exports.mathPlugin = mathPlugin;
exports.mathSchemaSpec = mathSchemaSpec;
exports.mathSelectPlugin = mathSelectPlugin;
exports.mathSerializer = mathSerializer;
//# sourceMappingURL=index.js.map
