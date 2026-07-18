# Repository Agent Guide

This file is the canonical instruction source for coding agents working in this repository. The Copilot instruction file points here so repository rules remain centralized.

## Instruction Priority

Use this order when instructions overlap:

1. The explicit task and maintainer direction.
2. The closest `AGENTS.md` in the target path.
3. Project-owned configuration, scripts, README files, and the dominant style of comparable sibling files.
4. The defaults in this file.

Machine-readable configuration and executable scripts are authoritative for current versions and commands. Apply defaults only to new or modified code. Do not mass-reformat legacy files or perform unrelated cleanup.

## Quality Bar

- Work at an owner-level engineering standard: identify the root cause, owning layer, affected consumers, regression risk, and validation evidence before declaring a task complete.
- Do not stop at the first failed approach or claim that a task is impossible until safe in-scope source inspection, repository search, and reasonable alternatives have been exhausted.
- Do not ask the maintainer for information that can be discovered from the repository, configured tools, or read-only checks.
- If an external prerequisite blocks validation, report the exact command, failure, and remaining unverified behavior.

## Repository Boundaries

- `apps/runtime` owns the edge redirect runtime for Cloudflare Workers, Vercel Edge Functions, and Netlify Edge Functions.
- `apps/webui` owns the Next.js management panel for editing `redirects.json`.
- The repository root owns workspace metadata and unified commands. Do not treat or deploy it as a single frontend application.
- Keep runtime and WebUI changes within their owning project unless a root workspace contract or shared behavior genuinely requires a cross-project change.

## Before Making Changes

- Confirm the repository root and inspect `git status`.
- Read the root README, the target project's README and manifest, formatting and compiler configuration, and any owning workflow before editing.
- Identify the owning layer and search for affected callers, public URLs, generated files, and documentation before changing shared behavior.
- Preserve unrelated user changes and keep the diff limited to the requested concern.
- Update stale documentation in the same diff only when it describes behavior changed by the task. Mention unrelated drift without editing it.

## Frontend Engineering Defaults

These defaults apply only when project configuration and the dominant style of comparable sibling files are silent.

### Files and Naming

- Follow the dominant component filename convention in the target directory. If none exists, use `PascalCase` for new React or Vue component files.
- Keep framework-reserved filenames such as `page.tsx`, `layout.tsx`, `route.ts`, and `index.tsx`.
- Use the dominant `camelCase` or `kebab-case` convention for ordinary TypeScript and JavaScript files. If neither dominates, use `camelCase`.
- Use `kebab-case` for new directories unless the framework requires another shape.
- Use `camelCase` for variables and functions, and `PascalCase` for types, interfaces, classes, and component symbols.
- Use `SCREAMING_SNAKE_CASE` for environment variables. Predicate booleans should start with `is`, `has`, `can`, or `should`.
- Follow the owning style system for CSS names. Without one, use `kebab-case` for global classes.

### Formatting and Imports

- Follow the nearest formatter, linter, and `.editorconfig`. This repository currently requires UTF-8, 2-space indentation, CRLF line endings, a final newline, and no unrelated line-ending rewrites.
- Without a machine-readable or dominant local rule, use double quotes, no semicolons, trailing commas where syntax permits, and K&R braces.
- Group ECMAScript imports in this order: Node built-ins, third-party dependencies, alias paths, relative paths, then CSS or other style files.
- Separate non-empty import groups with one blank line. Place `import type` in the group determined by its module source.
- Format only changed files or the owning project. Do not reformat unrelated code.

### TypeScript

- Do not add explicit `any`. Use `unknown` plus narrowing, a generic, or a precise type.
- Do not use `@ts-ignore`. Use `@ts-expect-error` only when the expected error is intentional and an adjacent comment explains why.
- Prefer guards and type refinement over non-null assertions. Use a non-null assertion only when its invariant can be proven locally.
- Follow the project's established object-type convention. If neither form dominates, use `interface` for object shapes and `type` for unions, intersections, tuples, and aliases.
- Preserve `strict` mode. Do not weaken compiler settings to make a check pass.

### Comments and Component Organization

- Add source comments only for design intent, non-obvious logic, special constraints, public contracts, or implementation reasons.
- Do not add comments that restate visible code behavior.
- Write comments for maintainers. Source comments must not mention AI identity, prompts, conversations, or generation history.
- Organize new components as behavior, structure, then presentation unless the framework or nearby components establish another order.
- In React components, keep state, derived data, handlers, and effects before the primary JSX return.

## Tooling and Validation

- Use the repository-declared pnpm version and run workspace commands from the repository root.
- Prefer the root wrapper scripts documented in `package.json` and the README over ad hoc equivalent commands.
- Use uv for Python environments or tooling if Python work is explicitly required; do not introduce Python tooling without a task-owned need.
- Start with the smallest validation owned by the changed project and run at most one resource-intensive command at a time.
- For runtime source or build changes, run `pnpm runtime:build`. Run the relevant provider-specific build when provider configuration or output changes.
- For WebUI changes, run `pnpm webui:lint` and `pnpm webui:build`.
- For redirect data or schema-related changes, run `pnpm data:validate` when its local validation input is available. It does not fetch the remote data branch, so do not describe it as fresh remote validation unless a fetch was explicitly authorized and performed.
- Run `pnpm check` when root workspace configuration, shared behavior, or both projects change.
- Always finish with `git diff --check` and inspect the final diff.
- Never describe an unrun or failed check as passed.

## Local Resource Safety

- Use short-lived, non-interactive task shells. Treat existing terminals, browsers, profiles, ports, servers, and their processes as user-owned unless task ownership is proven.
- Before starting a server, watcher, browser, or background helper, check the required port and track the task-owned process. Stop it when it is no longer needed.
- Before stopping a process, verify its command line, parent process, and task ownership. Never kill processes by a generic name.
- Run browser automation in an isolated, project-owned context unless the maintainer explicitly authorizes using an existing browser session.
- Treat out-of-memory, process-spawn, or repeated shell-startup failures as host-instability stop conditions. Cancel only task-owned heavy work and report the exact failure.

## Files, Secrets, and Git

- Do not edit generated output directly. Regenerate it through the owning build command and verify source and output agree.
- Do not create, expose, or commit secrets, `.env` files, local configuration, downloads, caches, or runtime data.
- Deployment commands, tags, releases, package publication, and other external writes require explicit maintainer authorization.
- A small, self-contained, low-risk edit may stay on the current branch when no branch or pull request was requested.
- Create a `codex/<short-slug>` branch before feature work, public behavior changes, security fixes, dependency or lockfile updates, workflow or release changes, multi-project work, destructive migrations, or pull-request work.
- Commit or push only when explicitly requested. Use an English Conventional Commit summary of no more than 20 words.
