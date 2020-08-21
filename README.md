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

1. The schema in `src/math-schema.ts`
2. The plugin in `src/math-plugin.ts`

## TODO

- [ ] Encapsulate available math plugins to an `options` object passed on initialization
- [ ] Wrap nodeViews + katexMacros as a ProseMirror plugin object
- [ ] Test in FireFox, Safari, Edge
- [ ] Smart backspace for block math
- [ ] Delete empty math block on backspace
- [ ] Support a render callback function, allowing use of MathJax / MathLive instead of KaTeX
- [ ] Write as many tests as possible