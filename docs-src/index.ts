/*---------------------------------------------------------
 *  Author: Benjamin R. Bray
 *  License: MIT (see LICENSE in project root for details)
 *--------------------------------------------------------*/

import { 
	createMathSchema, mathPlugin, 
	makeBlockMathInputRule, makeInlineMathInputRule,
	REGEX_INLINE_MATH_DOLLARS, REGEX_BLOCK_MATH_DOLLARS, mathBackspace
} from "@benrbray/prosemirror-math";

// ProseMirror imports
import { DOMParser } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { EditorState, Transaction, Plugin as ProsePlugin, NodeSelection } from "prosemirror-state";
import { chainCommands, newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock, deleteSelection, joinForward, selectNodeForward, selectNodeBackward, joinBackward, Command } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { inputRules } from "prosemirror-inputrules";

////////////////////////////////////////////////////////////

/* "What?!  You're importing CSS files?"
 * 
 * Yes, my apologies, I'm using webpack to bundle this demo,
 * which uses the MiniCssExtractPlugin and HtmlWebpackPlugin
 * to bundle everything (html, css, ProseMirror, etc.) into
 * a static site that we can serve on GitHub pages.
 * 
 * So, if you are new to webpack and want a "real-world"
 * example of how to set up ProseMirror, you may find this
 * useful.  If you just want to incorporate prosemirror-math
 * into an existing project, just focus on the .ts files and
 * pay no attention to how they are glued together.  :)
 */

// library css
import "@benrbray/prosemirror-math/style/math.css";
import "prosemirror-view/style/prosemirror.css";
import "katex/dist/katex.min.css";
import "prosemirror-gapcursor/style/gapcursor.css";

// project css
import "./index.css";

////////////////////////////////////////////////////////////

window.onload = function(){
	initEditor();
}

//// SCHEMA SETUP //////////////////////////////////////////

// create editor schema containing math nodes
let editorSchema = createMathSchema();

// (CAUTION: Make sure the NodeTypes you provide to each input rule belong to
// the same schema you used to create your ProseMirror EditorView instance.  
// Otherwise, ProseMirror will produce strange errors!)
let inlineMathInputRule = makeInlineMathInputRule(REGEX_INLINE_MATH_DOLLARS, editorSchema.nodes.math_inline);
let blockMathInputRule = makeBlockMathInputRule(REGEX_BLOCK_MATH_DOLLARS, editorSchema.nodes.math_display);

//// EDITOR SETUP //////////////////////////////////////////

function insertMath(): Command {
	let mathType = editorSchema.nodes.math_inline;
	return function(state:EditorState, dispatch:((tr:Transaction)=>void)|undefined){
		let { $from } = state.selection, index = $from.index();
		if (!$from.parent.canReplaceWith(index, index, mathType)) {
			return false
		}
		if (dispatch){
			let tr = state.tr.replaceSelectionWith(mathType.create({}));
			tr = tr.setSelection(NodeSelection.create(tr.doc, $from.pos));
			dispatch(tr);
		}
		return true
	}
}

function initEditor(){
	// get editor element
	let editorElt = document.getElementById("editor");
	if(!editorElt){ throw Error("missing #editor element"); }

	// plugins
	let plugins:ProsePlugin[] = [
		mathPlugin,
		// mathSelectPlugin, // as of (03/27/20), the selection plugin is not ready for serious use
		keymap({
			"Mod-Space" : insertMath(),
			// below is the default keymap
			"Enter" : chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock),
			"Ctrl-Enter": chainCommands(newlineInCode, createParagraphNear, splitBlock),
			"Backspace": chainCommands(deleteSelection, mathBackspace, joinBackward, selectNodeBackward),
			"Delete": chainCommands(deleteSelection, joinForward, selectNodeForward)
		}),
		inputRules({ rules: [ inlineMathInputRule, blockMathInputRule ] })
	];

	// create ProseMirror state
	let state = EditorState.create({
		schema: editorSchema,
		doc: DOMParser.fromSchema(editorSchema).parse(document.getElementById("editor-content") as HTMLElement),
		plugins: plugins,
	})

	// create ProseMirror view
	let view = new EditorView(editorElt, { state })
}