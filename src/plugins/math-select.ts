// prosemirror imports
import { EditorState, Transaction, Selection as ProseSelection, Plugin as ProsePlugin } from "prosemirror-state";
import { DecorationSet, Decoration } from "prosemirror-view";
import { Fragment, Node as ProseNode } from "prosemirror-model";

////////////////////////////////////////////////////////////

/**
 * Uses the selection to determine which math_select decorations
 * should be applied to the given document.
 * @param arg Should be either a Transaction or an EditorState,
 *     although any object with `selection` and `doc` will work.
 */
let checkSelection = (arg:{ selection:ProseSelection, doc:ProseNode }) => {
	let { from, to } = arg.selection;
	let content: Fragment = arg.selection.content().content;

	let result: { start: number, end: number }[] = [];
	console.log("selection", from, to);

	content.descendants((node: ProseNode, pos: number, parent: ProseNode) => {
		if (node.type.name == "text") { return false; }
		if (node.type.name.startsWith("math_")) {
			result.push({
				start: from + pos - 1,
				end: from + pos + node.nodeSize - 1
			})

			return false;
		}
		return true;
	})

	return DecorationSet.create(arg.doc, [
		Decoration.inline(from, to, { class: "math-select" })
	]);
}

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
const mathSelectPlugin: ProsePlugin = new ProsePlugin({
	state: {
		init(config: Object, partialState: EditorState) {
			return checkSelection(partialState);
		},
		apply(tr:Transaction, oldState: EditorState) {
			if (!tr.selection || !tr.selectionSet) { return oldState; }
			let sel = checkSelection(tr);
			console.log(sel);
			return sel;
		}
	},
	props: {
		decorations: (state:EditorState) => { return mathSelectPlugin.getState(state); },
	}
});

export default mathSelectPlugin;