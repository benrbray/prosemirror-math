import { EditorState, TextSelection, Transaction, Command } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

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
export function collapseMathCmd(
	outerView: EditorView,
	dir: (1|-1),
	requireOnBorder: boolean,
	requireEmptySelection: boolean = true,
): Command {
	// create a new ProseMirror command based on the input conditions
	return (innerState: EditorState, dispatch: ((tr: Transaction) => void)|undefined) => {
		// get selection info
		let outerState: EditorState = outerView.state;
		let { to : outerTo, from : outerFrom } = outerState.selection;
		let { to : innerTo, from : innerFrom } = innerState.selection;

		// only exit math node when selection is empty
		if(requireEmptySelection && innerTo !== innerFrom) { return false; }
		let currentPos: number = (dir > 0) ? innerTo : innerFrom;

		// when requireOnBorder is TRUE, collapse only when cursor
		// is about to leave the bounds of the math node
		if(requireOnBorder) {
			// (subtract two from nodeSize to account for start and end tokens)
			let nodeSize = innerState.doc.nodeSize - 2;

			// early return if exit conditions not met
			if(dir > 0 && currentPos < nodeSize) { return false; }
			if(dir < 0 && currentPos > 0)        { return false; }
		}

		// all exit conditions met, so close the math node by moving the cursor outside
		if(dispatch) {
			// set outer selection to be outside of the nodeview
			let targetPos: number = (dir > 0) ? outerTo : outerFrom;

			/**
			 * On Firefox, the cursor is invisible and the first IME composition will be broken.
			 * Probably because the cursor is at the start/end of the outer node, not inside it.
			 * Should move the selection one step further for exiting block math nodes.
			 * On Chrome/Safari it works fine, but maybe we should do this for all browsers.
			 * Doesn't seem to have any negative effects.
			 */
			if (innerState.doc.type.name === "math_display") {
				targetPos += dir;
			}

			/**
			 * https://forums.zotero.org/discussion/100416/note-editor-cant-continue-to-use-input-method-editor-after-entering-inline-math
			 * https://forums.zotero.org/discussion/101947/crash-when-writing-math-together-with-chinese-input-%E4%B8%80%E8%B5%B7%E5%86%99%E6%95%B0%E5%AD%A6%E5%85%AC%E5%BC%8F%E5%92%8C%E4%B8%AD%E6%96%87%E6%97%B6%E5%B4%A9%E6%BA%83
			 * https://forums.zotero.org/discussion/118104/inability-to-input-chinese-characters-after-latex-formula-rendering-in-notes
			 * 
			 * Fix for Firefox bug with exiting math nodes with arrow keys:
			 * Step 1:
			 * Move the focus out before the selection change triggers MathView#deselectNode
			 * (which will destroy the inner view)
			 * Otherwise, the IME composition will be broken.
			 * In browser, the IME composition falls back to the system input target.
			 * In Zotero, the IME composition loses the target and freezes/quits Zotero.
			 * Should do this for all browsers, as anyway we need to move the focus out.
			 */
			if (!outerView.hasFocus()) outerView.focus();

			outerView.dispatch(
				outerState.tr.setSelection(
					TextSelection.create(outerState.doc, targetPos)
				)
			);

			/**
			 * Fix for Firefox bug with exiting math nodes with arrow keys:
			 * Step 2:
			 * Now you can input with a non-latin IME,
			 * but the composition is converted to a normal text.
			 * To fix this, we need to move the focus to some specific element, e.g. a button,
			 * and then move it back to the outer view.
			 * (No idea why this works, but a div doesn't work.)
			 * Only Gecko (Firefox/Zotero) needs this, so we check the user agent.
			 */
			if (window.navigator.userAgent.includes("Gecko")) {
				const tmpBtn = document.createElement("button");
				document.body.append(tmpBtn);
				tmpBtn.focus();
				tmpBtn.remove();
				outerView.focus();
			}
		}
		
		return true;
	}
}