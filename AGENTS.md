# Agent Instructions

## Package Manager

Use **pnpm 11.3.0** with Node.js >= 22.19.0.

## Commands

| Task | Command |
|------|---------|
| Full gate | `pnpm check` |
| Tests | `pnpm test` |
| Typecheck | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Single test file | `pnpm vitest run src/router.test.ts` |

## Prerequisites

- CodeGraph CLI on `PATH` for live integration checks (`npm install -g @colbymchenry/codegraph`)
- Run `codegraph init && codegraph index` to create the local index

## Project Layout

- `src/index.ts` — extension entrypoint; exports `register_codegraph_extension`
- Tests are colocated as `*.test.ts` alongside source files
- One registered tool: `codegraph` (action-first, 14 supported actions)

## Key Conventions

- snake_case for variables, functions, filenames; PascalCase for types
- No `any`; prefer types over interfaces
- No default exports except `src/index.ts` (Pi extension contract)
- Files under 500 LOC

## External References

| Need | File |
|------|------|
| Action usage | `README.md` |
| API contract | `src/descriptors.ts` |
| Unsupported actions | `src/unsupported.ts` |
