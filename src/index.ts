/*---------------------------------------------------------
 *  Author: Benjamin R. Bray
 *  License: MIT (see LICENSE in project root for details)
 *--------------------------------------------------------*/

// ProseMirror imports
import { DOMParser, NodeType } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { EditorState, Transaction, Plugin as ProsePlugin, NodeSelection } from "prosemirror-state";
import { InputRule, inputRules } from "prosemirror-inputrules";
import { chainCommands, newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock, deleteSelection, joinForward, selectNodeForward, selectNodeBackward, joinBackward } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";


// project imports
import mathSelectPlugin from "./plugins/math-select";
import { mathInputRules } from "./plugins/math-inputrules";
import { editorSchema } from "./math-schema";
import { MathView, ICursorPosObserver } from "./math-nodeview";
import { mathBackspace } from "./plugins/math-backspace";
import { mathPlugin } from "./math-plugin";

////////////////////////////////////////////////////////////

window.onload = function(){
	initEditor();
}

//// EDITOR SETUP //////////////////////////////////////////

function insertMath(){
	let mathType = editorSchema.nodes.inlinemath;
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
		mathSelectPlugin,
		keymap({
			"Mod-Space" : insertMath(),
			// below is the default keymap
			"Enter" : chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock),
			"Ctrl-Enter": chainCommands(newlineInCode, createParagraphNear, splitBlock),
			"Backspace": chainCommands(deleteSelection, mathBackspace, joinBackward, selectNodeBackward),
			"Delete": chainCommands(deleteSelection, joinForward, selectNodeForward)
		}),
		mathInputRules
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