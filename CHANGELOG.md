# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

* Display math now shows a preview pane.  Inline math previews may be supported in the future. 
* Added an `initialText` parameter to `insertMathCmd`

**Breaking Changes**

* Added new `isBlockMath` argument to `MathView` constructor
* `mathPlugin` and `mathPluginSpec` are now functions that accept an `options` parameter
* The `mathPlugin` state now has an extra flag indicating whether previews are enabled

## [Releases]

### [0.2.2] - 2021-06-24

Removed a few `console.log`s, see #25.

### [0.2.1] - 2021-06-23

Fixed security vulnerabilities caught by `npm audit`.

### [0.2] - 2021-06-23

Disable the math editor when the ProseMirror editor is in readonly mode.  See #23.