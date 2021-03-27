/*---------------------------------------------------------
 *  Author: Benjamin R. Bray
 *  License: MIT (see LICENSE in project root for details)
 *--------------------------------------------------------*/

import { InputRule } from "prosemirror-inputrules";
import { NodeType } from "prosemirror-model";
import { NodeSelection } from "prosemirror-state";

////////////////////////////////////////////////////////////

// ---- Inline Input Rules ------------------------------ //

// simple input rule for inline math
export const INPUTRULE_INLINE_DOLLARS:RegExp = /\$(.+)\$/;

// negative lookbehind regex notation allows for escaped \$ delimiters
// (requires browser supporting ECMA2018 standard -- currently only Chrome / FF)
// (see https://javascript.info/regexp-lookahead-lookbehind)
export const INPUTRULE_INLINE_DOLLARS_ESCAPED:RegExp = /(?<!\\)\$(.+)(?<!\\)\$/;

// ---- Block Input Rules ------------------------------- //

// simple inputrule for block math
export const INPUTRULE_BLOCK_DOLLARS:RegExp = /^\$\$\s+$/;

////////////////////////////////////////////////////////////

export function inlineInputRule(pattern: RegExp, nodeType: NodeType, getAttrs?: (match: string[]) => any) {
	return new InputRule(pattern, (state, match, start, end) => {
		let $start = state.doc.resolve(start);
		let index = $start.index();
		let $end = state.doc.resolve(end);
		// get attrs
		let attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs
		// check if replacement valid
		if (!$start.parent.canReplaceWith(index, $end.index(), nodeType)) {
			return null;
		}
		// perform replacement
		return state.tr.replaceRangeWith(
			start, end,
			nodeType.create(attrs, nodeType.schema.text(match[1]))
		);
	});
}

export function blockInputRule(pattern: RegExp, nodeType: NodeType, getAttrs?: (match: string[]) => any) {
	return new InputRule(pattern, (state, match, start, end) => {
		let $start = state.doc.resolve(start)
		let attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs
		if (!$start.node(-1).canReplaceWith($start.index(-1), $start.indexAfter(-1), nodeType)) return null
		let tr = state.tr
			.delete(start, end)
			.setBlockType(start, start, nodeType, attrs);

		return tr.setSelection(NodeSelection.create(
			tr.doc, tr.mapping.map($start.pos - 1)
		));
	})
}