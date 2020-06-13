// prosemirror imports
import { Schema, Node as ProseNode } from "prosemirror-model";

////////////////////////////////////////////////////////////

export const editorSchema = new Schema({
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
			parseDOM: [{
				tag: "math-inline"
			}]
		},
		math_display: {
			group: "block math",
			content: "text*",
			atom: true,
			code: true,
			toDOM: () => ["math-display", { class: "math-node" }, 0],
			parseDOM: [{
				tag: "math-display"
			}]
		},
		text: {
			group: "inline",
			inline: true,
			toDOM(node: ProseNode) {
				console.log("hey");
				let dom = document.createTextNode((node as any).text.toUpperCase())
				return dom;
			}
		}
	},
	marks: {
		math_select: {
			toDOM() { return ["math-select", 0] },
			parseDOM: [{ tag: "math-select" }]
		}
	}
});