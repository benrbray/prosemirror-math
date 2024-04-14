# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]


## [Releases]

### [1.0.0] - 2024-04-14

* address some errors related to error handling (PR #71)
* `prosemirror-math` is now ESM-only, and no longer builds a CJS version
* export `defaultInlineMathParseRules`, `defaultBlockMathParseRules`
* use `vite` and simplify the project configuration
* removed the unused `ICursorPosObserver` interface and related code
* removed the unused `onDestroy` parameter to `MathView`

### [0.2.2] - 2021-06-24

Removed a few `console.log`s, see #25.

### [0.2.1] - 2021-06-23

Fixed security vulnerabilities caught by `npm audit`.

### [0.2] - 2021-06-23

Disable the math editor when the ProseMirror editor is in readonly mode.  See #23.