/*---------------------------------------------------------
 *  Author: Benjamin R. Bray
 *  License: MIT (see LICENSE in project root for details)
 *--------------------------------------------------------*/

import { 
	createMathSchema, mathPlugin, mathSerializer,
	makeBlockMathInputRule, makeInlineMathInputRule,
	REGEX_INLINE_MATH_DOLLARS, REGEX_BLOCK_MATH_DOLLARS, mathBackspaceCmd, insertMathCmd
} from "@benrbray/prosemirror-math";

// ProseMirror imports
import { DOMParser, Slice } from "prosemirror-model";
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

function initEditor(){
	// get editor element
	let editorElt = document.getElementById("editor");
	if(!editorElt){ throw Error("missing #editor element"); }

	// plugins
	let plugins:ProsePlugin[] = [
		mathPlugin,
		// mathSelectPlugin, // as of (03/27/20), the selection plugin is not ready for serious use
		keymap({
			"Mod-Space" : insertMathCmd(editorSchema.nodes.math_inline),
			"Backspace": chainCommands(deleteSelection, mathBackspaceCmd, joinBackward, selectNodeBackward),
			// below is the default keymap
			"Enter" : chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock),
			"Ctrl-Enter": chainCommands(newlineInCode, createParagraphNear, splitBlock),
			"Delete": chainCommands(deleteSelection, joinForward, selectNodeForward)
		}),
		inputRules({ rules: [ inlineMathInputRule, blockMathInputRule ] })
	];

	// create ProseMirror state
	let state = EditorState.create({
		schema: editorSchema,
		doc: DOMParser.fromSchema(editorSchema).parse(document.getElementById("editor-content") as HTMLElement),
		plugins: plugins
	})

	// create ProseMirror view
	let view = new EditorView(editorElt, { 
		state,
		clipboardTextSerializer: (slice) => { return mathSerializer.serializeSlice(slice) },
	});

	(window as any).view = view;
}