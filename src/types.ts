import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

////////////////////////////////////////////////////////////

export type ProseCommand = (
	state:EditorState, 
	dispatch?:((tr:Transaction)=>void)|undefined, 
	view?:EditorView
) => boolean;