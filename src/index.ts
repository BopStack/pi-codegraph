// biome-ignore-all lint: Runtime compatibility adapter needs host-defined callback signatures.

/** CodeGraph extension for Pi and Oh My Pi. */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { render_call, render_result } from "./render";
import { route_action } from "./router";

const CODEGRAPH_GUIDELINES = [
	'Use `codegraph` with `action: "explore"` first for architecture questions, bug investigation, unfamiliar areas, and edit preparation because it returns relevant source and call paths in one result.',
	'Use `codegraph` with `action: "node"` when you need exact symbol source or exact file content with line numbers; pass the file path as the node target for file mode and use `offset`/`limit` for slices.',
	'Use `codegraph` with `action: "search"` to discover symbol names by name, natural language, or `kind`; this action renders/runs as CLI `codegraph query`.',
	'Use `codegraph` with `action: "files"` to inspect the indexed project structure, optionally with `filter`, `pattern`, `format`, `max_depth`, or `no_metadata`-style fields before broad filesystem browsing.',
	'Use `codegraph` with `action: "status"` before relying on CodeGraph when the index may be stale, missing, built by an older engine, or unexpectedly empty.',
	'Use `codegraph` with `action: "callers"` to find incoming dependencies: functions or methods that call a symbol.',
	'Use `codegraph` with `action: "callees"` to find outgoing dependencies: functions or methods a symbol calls.',
	'Use `codegraph` with `action: "impact"` before changing a symbol when you need symbol-level blast radius.',
	'Use `codegraph` with `action: "affected"` after source file changes to identify likely test files; pass changed file paths and optional depth/filter.',
	'Use `codegraph` with `action: "init"` only when the project has no CodeGraph index; do not expose or use home/root `--force` initialization.',
	'Use `codegraph` with `action: "index"` when a full index is needed, including re-indexing an explicit project path after `status` reports an older engine.',
	'Use `codegraph` with `action: "sync"` after file changes or when incremental refresh is enough.',
	'Use `codegraph` with `action: "unlock"` only when CodeGraph reports a stale lock blocking indexing.',
	'Use `codegraph` with `action: "help"` when unsure which action fits; help lists supported actions, unsupported boundaries, and examples.',
	"Do not use `codegraph` for setup/admin work such as installing MCP config for other agents, toggling telemetry, checking upgrades, package upgrades, daemon management, or destructive removal.",
].join("\n");

/** Registers the single CodeGraph tool with Pi and OMP. */
export default function register_codegraph_extension(pi: ExtensionAPI): void {
	const dual_target_pi = pi as unknown as {
		on: (
			event: "before_agent_start",
			handler: (event: {
				systemPrompt: string | string[];
			}) => { systemPrompt: string | string[] } | undefined,
		) => void;
	};
	dual_target_pi.on("before_agent_start", (event) => {
		const system_prompt = event.systemPrompt as string | string[];
		if (Array.isArray(system_prompt)) {
			if (system_prompt.some((block) => block.includes("Use `codegraph`"))) {
				return;
			}
			return { systemPrompt: [...system_prompt, CODEGRAPH_GUIDELINES] };
		}
		if (system_prompt.includes("Use `codegraph`")) {
			return;
		}
		return { systemPrompt: `${system_prompt}\n\n${CODEGRAPH_GUIDELINES}` };
	});

	pi.registerTool({
		name: "codegraph",
		label: "CodeGraph",
		description:
			"Code intelligence over an indexed knowledge graph. Explore source/call paths, read exact nodes/files, query symbols, inspect files, trace callers/callees/impact, find affected tests, and maintain the CodeGraph index.",
		promptSnippet:
			"Use codegraph for code intelligence: explore source/call paths, read exact nodes/files, query symbols, inspect files, trace callers/callees/impact, find affected tests, and maintain the CodeGraph index.",
		promptGuidelines: CODEGRAPH_GUIDELINES.split("\n"),
		parameters: Type.Object({
			action: Type.String({
				description: "CodeGraph action to execute (required)",
			}),
			query: Type.Optional(
				Type.String({
					description: "Natural-language or symbol/file search text",
				}),
			),
			symbol: Type.Optional(
				Type.String({
					description: "Symbol name for callers, callees, or impact",
				}),
			),
			file: Type.Optional(
				Type.String({
					description: "File path for node or symbol disambiguation",
				}),
			),
			project_path: Type.Optional(
				Type.String({ description: "CodeGraph project path (maps to --path)" }),
			),
			limit: Type.Optional(Type.Number({ description: "Max results limit" })),
			kind: Type.Optional(
				Type.String({ description: "Symbol kind filter for search" }),
			),
			max_files: Type.Optional(
				Type.Number({ description: "Max files for explore" }),
			),
			offset: Type.Optional(
				Type.Number({ description: "Line offset for node slices" }),
			),
			depth: Type.Optional(
				Type.Number({ description: "Traversal depth for impact/affected" }),
			),
			filter: Type.Optional(
				Type.String({ description: "Filter expression for files/affected" }),
			),
			format: Type.Optional(
				Type.String({ description: "Output format for files" }),
			),
			max_depth: Type.Optional(
				Type.Number({ description: "Max directory depth for files" }),
			),
			pattern: Type.Optional(
				Type.String({ description: "Glob pattern filter for files" }),
			),
			no_metadata: Type.Optional(
				Type.Boolean({ description: "Hide file metadata in files output" }),
			),
			quiet: Type.Optional(
				Type.Boolean({ description: "Suppress non-essential output" }),
			),
			verbose: Type.Optional(
				Type.Boolean({ description: "Enable verbose output" }),
			),
			symbols_only: Type.Optional(
				Type.Boolean({ description: "Show symbols only in node output" }),
			),
			files: Type.Optional(
				Type.Array(Type.String(), {
					description: "Changed file paths for affected",
				}),
			),
			force: Type.Optional(
				Type.Boolean({
					description: "Force re-index when status reports old engine",
				}),
			),
		}),
		async execute(_id, params, signal, _on_update, _ctx) {
			return route_action(params, signal);
		},
		renderCall: render_call,
		renderResult: render_result,
	});
}
