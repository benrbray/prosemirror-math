/*---------------------------------------------------------
 *  Author: Benjamin R. Bray
 *  License: MIT (see LICENSE in project root for details)
 *--------------------------------------------------------*/

// prosemirror imports
import { Node as ProseNode } from "prosemirror-model";
import { EditorState, Transaction, TextSelection, NodeSelection } from "prosemirror-state";
import { NodeView, EditorView, Decoration } from "prosemirror-view";
import { StepMap } from "prosemirror-transform";
import { keymap } from "prosemirror-keymap";
import { newlineInCode, chainCommands, deleteSelection, liftEmptyBlock, Command } from "prosemirror-commands";

// katex
import katex, { ParseError, KatexOptions } from "katex";
import { nudgeCursorBackCmd, nudgeCursorForwardCmd } from "./commands/move-cursor-cmd";
import { collapseMathCmd } from "./commands/collapse-math-cmd";

//// INLINE MATH NODEVIEW //////////////////////////////////

export interface ICursorPosObserver {
	/** indicates on which side cursor should appear when this node is selected */
	cursorSide: "start" | "end";
	/**  */
	updateCursorPos(state: EditorState): void;
}

interface IMathViewOptions {
	/** Dom element name to use for this NodeView */
	tagName?: string;
	/** Whether to render this node as display or inline math. */
	katexOptions?:KatexOptions;
}

export class MathView implements NodeView, ICursorPosObserver {

	// nodeview params
	private _node: ProseNode;
	private _outerView: EditorView;
	private _getPos: (() => number);

	// nodeview dom
	dom: HTMLElement;
	private _mathRenderElt: HTMLElement | undefined;
	private _mathSrcElt: HTMLElement | undefined;
	private _innerView: EditorView | undefined;

	// internal state
	cursorSide: "start" | "end";
	private _katexOptions: KatexOptions;
	private _tagName: string;
	private _isEditing: boolean;
	private _onDestroy: (() => void) | undefined;

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
	constructor(node: ProseNode, view: EditorView, getPos: (() => number), options: IMathViewOptions = {}, onDestroy?: (() => void)) {
		// store arguments
		this._node = node;
		this._outerView = view;
		this._getPos = getPos;
		this._onDestroy = onDestroy && onDestroy.bind(this);

		// editing state
		this.cursorSide = "start";
		this._isEditing = false;

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

		this._mathSrcElt = document.createElement("span");
		this._mathSrcElt.classList.add("math-src");
		this.dom.appendChild(this._mathSrcElt);

		// ensure 
		this.dom.addEventListener("click", () => this.ensureFocus());

		// render initial content
		this.renderMath();
	}

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

	update(node: ProseNode, decorations: Decoration[]) {
		if (!node.sameMarkup(this._node)) return false
		this._node = node;

		if (this._innerView) {
			let state = this._innerView.state;

			let start = node.content.findDiffStart(state.doc.content)
			if (start != null) {
				let diff = node.content.findDiffEnd(state.doc.content as any);
				if (diff) {
					let { a: endA, b: endB } = diff;
					let overlap = start - Math.min(endA, endB)
					if (overlap > 0) { endA += overlap; endB += overlap }
					this._innerView.dispatch(
						state.tr
							.replace(start, endB, node.slice(start, endA))
							.setMeta("fromOutside", true))
				}
			}
		}

		if (!this._isEditing) {
			this.renderMath();
		}

		return true;
	}

	updateCursorPos(state: EditorState): void {
		const pos = this._getPos();
		const size = this._node.nodeSize;
		const inPmSelection =
			(state.selection.from < pos + size)
			&& (pos < state.selection.to);

		if (!inPmSelection) {
			this.cursorSide = (pos < state.selection.from) ? "end" : "start";
		}
	}

	// == Events ===================================== //

	selectNode() {
		this.dom.classList.add("ProseMirror-selectednode");
		if (!this._isEditing) { this.openEditor(); }
	}

	deselectNode() {
		this.dom.classList.remove("ProseMirror-selectednode");
		if (this._isEditing) { this.closeEditor(); }
	}

	stopEvent(event: Event): boolean {
		return (this._innerView !== undefined)
			&& (event.target !== undefined)
			&& this._innerView.dom.contains(event.target as Node);
	}

	ignoreMutation() { return true; }

	// == Rendering ===================================== //

	renderMath() {
		if (!this._mathRenderElt) { return; }

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
			while(this._mathRenderElt.firstChild){ this._mathRenderElt.firstChild.remove(); }
			// do not render empty math
			return;
		} else {
			this.dom.classList.remove("empty-math");
		}

		// render katex, but fail gracefully
		try {
			katex.render(texString, this._mathRenderElt, this._katexOptions);
			this._mathRenderElt.classList.remove("parse-error");
			this.dom.setAttribute("title", "");
		} catch (err) {
			if (err instanceof ParseError) {
				console.error(err);
				this._mathRenderElt.classList.add("parse-error");
				this.dom.setAttribute("title", err.toString());
			} else {
				throw err;
			}
		}
	}

	// == Inner Editor ================================== //

	dispatchInner(tr: Transaction) {
		if (!this._innerView) { return; }
		let { state, transactions } = this._innerView.state.applyTransaction(tr)
		this._innerView.updateState(state)

		if (!tr.getMeta("fromOutside")) {
			let outerTr = this._outerView.state.tr, offsetMap = StepMap.offset(this._getPos() + 1)
			for (let i = 0; i < transactions.length; i++) {
				let steps = transactions[i].steps
				for (let j = 0; j < steps.length; j++) {
					let mapped = steps[j].map(offsetMap);
					if (!mapped) { throw Error("step discarded!"); }
					outerTr.step(mapped)
				}
			}
			if (outerTr.docChanged) this._outerView.dispatch(outerTr)
		}
	}

	openEditor() {
		if (this._innerView) { throw Error("inner view should not exist!"); }

		// create a nested ProseMirror view
		this._innerView = new EditorView(this._mathSrcElt, {
			state: EditorState.create({
				doc: this._node,
				plugins: [keymap({
					"Tab": (state, dispatch) => {
						if(dispatch){ dispatch(state.tr.insertText("\t")); }
						return true;
					},
					"Backspace": chainCommands(deleteSelection, (state, dispatch, tr_inner) => {
						// default backspace behavior for non-empty selections
						if(!state.selection.empty) { return false; }
						// default backspace behavior when math node is non-empty
						if(this._node.textContent.length > 0){ return false; }
						// otherwise, we want to delete the empty math node and focus the outer view
						this._outerView.dispatch(this._outerView.state.tr.insertText(""));
						this._outerView.focus();
						return true;
					}),
					"Enter": newlineInCode,
					"Ctrl-Enter" : collapseMathCmd(this._outerView, +1, false),
					"ArrowLeft"  : collapseMathCmd(this._outerView, -1, true),
					"ArrowRight" : collapseMathCmd(this._outerView, +1, true),
					"ArrowUp"    : collapseMathCmd(this._outerView, -1, true),
					"ArrowDown"  : collapseMathCmd(this._outerView, +1, true),
				})]
			}),
			dispatchTransaction: this.dispatchInner.bind(this)
		})

		// focus element
		let innerState = this._innerView.state;
		this._innerView.focus();

		// determine cursor position
		let pos: number = (this.cursorSide == "start") ? 0 : this._node.nodeSize - 2;
		this._innerView.dispatch(
			innerState.tr.setSelection(
				TextSelection.create(innerState.doc, pos)
			)
		);

		this._isEditing = true;
	}

	/**
	 * Called when the inner ProseMirror editor should close.
	 * 
	 * @param render Optionally update the rendered math after closing. (which
	 *    is generally what we want to do, since the user is done editing!)
	 */
	closeEditor(render: boolean = true) {
		if (this._innerView) {
			this._innerView.destroy();
			this._innerView = undefined;
		}

		if (render) { this.renderMath(); }
		this._isEditing = false;
	}
}