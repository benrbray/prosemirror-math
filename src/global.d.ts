// (https://stackoverflow.com/a/53098695/1444650)
// import needed to make this a module 
import { Fragment, Node as ProseNode } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

declare module "prosemirror-model" {
	interface Fragment {
		// as of (3/31/20) official @types/prosemirror-model
		// was missing Fragment.content, so we define it here
		content: Node[];
	}
}

export type ProseCommand = (
	state:EditorState, 
	dispatch?:((tr:Transaction)=>void)|undefined, 
	view?:EditorView
) => boolean;