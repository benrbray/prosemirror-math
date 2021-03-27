# `prosemirror-math`

## Overview

This project provides schema and plugins for writing mathematics using ProseMirror.  Written in TypeScript, with math rendering handled by [KaTeX](https://katex.org/).  Bundle locally with `parcel index.html`.

The important files in this project are:

* `src/math-schema.ts`: A minimal ProseMirror schema supporting inline and display math nodes.
* `src/math-nodeview.ts`: A `NodeView` responsible for rendering and editing math nodes.
* `style/math.css`: Contains all necessary styling for math nodes to display correctly.  This file can easily be modified to achieve your desired appearance.

To test locally, clone the repository and run

```
> npm install
> npm run dev
```

A local development server should become available at `http://localhost:1234`.

## Examples

Unlike other editors, this plugin **treats math as part of the text itself**, rather than as an "atom" that can only be edited through a dialog box.  For example, inline math nodes can be edited directly by bringing the cursor inside of them:

![edit inline math](img/prosemirror-math_inline.gif)

Display math supports multiline editing, as shown below:

![edit display math](img/prosemirror-math_display.gif)

To create a new math expression, simply enclose LaTeX math notation in dollar signs, like `$x+y=5$`.  When you finish typing, a new math node will be automatically created:

![create inline math](img/prosemirror-math_insert-inline.gif)

To start a display math block, create a blank line and type `$$` followed by a space.  A multiline editor will appear.  To exit the block, press `Ctrl-Space` or navigate away the mouse or arrow keys.

![create display math](img/prosemirror-math_insert-display.gif)

## Usage

See the full example in `src/index.ts`.  At a minimum, you need to include:

1. The `math_inline` and `math_display` schema found in `src/math-schema.ts`
2. The `mathPlugin` ProseMirror plugin found in `src/math-plugin.ts`

There are also several optional features you can enable:

3. (work in progress) Use `mathBackspace` to backspace "into" a math node, rather than deleting the entire node.
4. *(work in progress--may be quite slow!)* Use the `mathSelectPlugin` to make math node selections less visually jarring.
5. Use `mathInputRules` to automatically create new math blocks when typing:
	- Create a new inline math node by typing a dollar-sign-delimited expression like `$\int_a^b f(x) dx$` followed by a space.
	- Create a new block math node by typing `$$` followed by a space.

## Interacting with Math Nodes

This section describes the expected behavior of math nodes created with `prosemirror-math`.  Since ProseMirror relies on `contenteditable`, which behaves differently in each browser, you might experience buggy behavior in your browser of choice.  If you notice something unusual, please file a bug report!

When the cursor is immediately to the left of a math node...

* Pressing `RIGHT` should expand the math node and place the cursor in the LEFTMOST inner position

When the cursor is immediately to the right of a math node...

* Pressing `LEFT` should expand the math node and place the cursor in the RIGHTMOST inner position

When the cursor is inside an INLINE math node...

* Pressing `UP` (or `LEFT` when the cursor is the LEFTMOST inner position) should close the math node and place the cursor immediately BEFORE the node
* Pressing `DOWN` (or `RIGHT` when the cursor is in the RIGHTMOST inner position) should close the math node and place the cursor immediately AFTER the node
* Pressing `ENTER`, `CTRL+ENTER`, or `ESC` should close the math node and place the cursor immediately AFTER the node

When the cursor is inside a BLOCK math node...

* Pressing `LEFT` when the cursor is in the LEFTMOST inner position should close the math node and place the cursor immediately BEFORE the unexpanded node
* Pressing `RIGHT` when the cursor is in the RIGHTMOST inner position should close the math node and place the cursor immediately AFTER the unexpanded node
* Pressing `UP` when the cursor is on the TOPMOST inner line should close the math node and place the cursor immediately BEFORE the unexpanded node
* Pressing `DOWN` when the cursor is in the BOTTOMMOST inner line should close the math node and place the cursor immediately AFTER the unexpanded math node
* Pressing `ENTER` should create a new line
* Pressing `CTRL+ENTER` or `ESC` should close the math node and place the cursor immediately AFTER the node

## TODO

In no particular order:

- [ ] Encapsulate available math plugins to an `options` object passed on initialization
- [ ] Wrap nodeViews + katexMacros as a ProseMirror plugin object
- [ ] Test in FireFox, Safari, Edge
- [ ] Smart backspace for block math
- [ ] Delete empty math block on backspace
- [ ] Support a render callback function, allowing use of MathJax / MathLive instead of KaTeX
- [ ] Write as many tests as possible