# Repository Guidelines

## Project Structure & Module Organization

`universal-cloak.middleware.js` contains the entire middleware as a JavaScript ES module. Its exported `onRequest(body, ctx)` hook clones request bodies and transforms selected instruction text and tool descriptions. Internal helpers, `cloakText` and `cloakContent`, handle strings and content arrays.

The supported request shapes include `messages`, `system`, `instructions`, both system-instruction key spellings, and several tool-description layouts. There are currently no separate source, test, asset, or generated-output directories.

## Build, Test, and Development Commands

No package manifest, dependency installation, build pipeline, or development server is configured.

- `node --input-type=module --check < universal-cloak.middleware.js` checks syntax while treating the file as an ES module.
- Load the file through the consuming application's middleware mechanism to verify integration. The host must support ES modules and `structuredClone`.

Keep the middleware directly consumable unless a change explicitly requires additional tooling.

## Coding Style & Naming Conventions

Follow the existing two-space indentation, double-quoted strings, semicolons, and camelCase function and variable names. Keep the public `onRequest` export stable and retain the `.middleware.js` filename convention.

Use type guards before accessing optional request fields. Preserve the cloning boundary and existing object-spread patterns so transformations do not mutate caller-owned data. Represent the inserted zero-width space explicitly as `\u200b` in source. No formatter or linter is configured; match surrounding code.

## Testing Guidelines

No automated testing framework or coverage threshold is configured. For behavioral changes, validate representative request fixtures in the host or an ES-module harness.

Check strings and content arrays, every supported instruction location, and all tool-description variants. Include malformed or missing fields, non-string content, short words, and non-Latin text. Assert that the original input remains unchanged and that user messages, tool names, and unrelated payload fields retain their values.

## Commit & Pull Request Guidelines

This checkout has no Git metadata, so no historical commit convention can be established. Use concise, imperative commit subjects, such as `Fix handling of empty content parts`.

Pull requests should explain the affected request shape, include a minimal before-and-after payload, link relevant issues, and report syntax and behavioral validation. Explain any changes to exported hooks or runtime requirements.
