# @bopstack/pi-codegraph

[![npm](https://img.shields.io/npm/v/@bopstack/pi-codegraph)](https://www.npmjs.com/package/@bopstack/pi-codegraph)
[![CI](https://github.com/bopstack/pi-codegraph/actions/workflows/ci.yml/badge.svg)](https://github.com/bopstack/pi-codegraph/actions/workflows/ci.yml)

Semantic code understanding for [Pi](https://github.com/earendil-works/pi-coding-agent) and [Oh My Pi](https://github.com/earendil-works/omp) via [CodeGraph](https://github.com/colbymchenry/codegraph) — a single `codegraph` tool with action-first usage. No slash command. No JSON wrapping. Text-first output.

Package installs expose both `pi.extensions` and `omp.extensions`; load explicitly with `pi -e .` or `omp -e .`.

## Install

```bash
# Install the extension
pi install npm:@bopstack/pi-codegraph

# Or with npm directly
npm install @bopstack/pi-codegraph
```

## Quick start

```bash
# Install the CodeGraph CLI (once per machine)
npm install -g @colbymchenry/codegraph

# Initialize and index your project
codegraph init
codegraph index
```

## Local development

```bash
git clone https://github.com/bopstack/pi-codegraph.git
cd pi-codegraph
pnpm install

# Load the extension from source
pi -e .
# or
omp -e .

# Quality gates
pnpm check     # biome check + typecheck + tests
pnpm test       # vitest run (170 tests, 8 suites)
pnpm typecheck  # tsc --noEmit
pnpm lint       # biome lint
```

Requires Node.js >= 22.19.0 and pnpm >= 11.3.0. The CodeGraph CLI must be on `PATH` for live integration checks.

## Usage

One tool: `codegraph`. Every call requires an `action` field:

```ts
codegraph({ action: "explore", query: "auth session", max_files: 8 })
```

Pi renders calls as their implied CLI command:

```text
codegraph explore "auth session" --max-files 8
```

Output is always plain text — no JSON envelope, no structured wrapping. Large results are truncated with a path to the full output.

## Supported actions

### Read & explore

| Action | Purpose | Short example |
|--------|---------|---------------|
| `explore` | Natural-language question or symbol survey | `codegraph({ action: "explore", query: "how does auth work" })` |
| `node` | Exact symbol or file with line numbers and dependents | `codegraph({ action: "node", file: "src/index.ts", limit: 120 })` |
| `search` | Discover symbol names by keyword | `codegraph({ action: "search", query: "login", kind: "function" })` |
| `files` | Browse indexed project file structure | `codegraph({ action: "files", filter: "*.ts", max_depth: 3 })` |

### Dependency & impact analysis

| Action | Purpose | Short example |
|--------|---------|---------------|
| `callers` | Who calls a symbol (incoming) | `codegraph({ action: "callers", symbol: "authenticate" })` |
| `callees` | What a symbol calls (outgoing) | `codegraph({ action: "callees", symbol: "authenticate" })` |
| `impact` | Blast-radius estimation for a symbol | `codegraph({ action: "impact", symbol: "config", depth: 3 })` |
| `affected` | Tests affected by changed files | `codegraph({ action: "affected", files: ["src/auth.ts"], depth: 2 })` |

### Index maintenance

| Action | Purpose | Short example |
|--------|---------|---------------|
| `status` | Index health and stats | `codegraph({ action: "status" })` |
| `sync` | Incremental refresh after file changes | `codegraph({ action: "sync" })` |
| `index` | Full re-index | `codegraph({ action: "index", project_path: "." })` |
| `init` | Initialize index in a new project | `codegraph({ action: "init", project_path: "." })` |
| `unlock` | Clear a stale index lock | `codegraph({ action: "unlock", project_path: "." })` |

### Meta

| Action | Purpose | Short example |
|--------|---------|---------------|
| `help` | Full action reference with decision tree | `codegraph({ action: "help" })` |

## Unsupported actions

Destructive, interactive, install, and package-management actions are out of scope. The tool returns boundary text with a safe human CLI alternative for each:

`uninit`, `uninstall`, `daemon`, `daemons`, `install`, `install_config`, `telemetry`, `upgrade`, `upgrade_check`, `version`

## No slash command

This extension does not register a `/codegraph` command. Use the `codegraph` tool with an `action` field instead.

## License

[MIT](./LICENSE) — Copyright (c) 2026 Bopstack