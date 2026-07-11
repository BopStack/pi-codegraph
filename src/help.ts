/**
 * Help action — builds a comprehensive Markdown help page derived
 * from the descriptor table and unsupported-action catalog.
 *
 * Single source of truth: supported actions come from DESCRIPTORS,
 * unsupported actions come from UNSUPPORTED.  No hand-maintained
 * action list that can drift from the real action set.
 */

import { type ActionDescriptor, DESCRIPTORS } from "./descriptors";
import { UNSUPPORTED } from "./unsupported";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a one-line CLI preview for an action. */
const cli_preview = (desc: ActionDescriptor): string => {
	if (desc.cli_command.length === 0) {
		return "`codegraph` (plugin-generated)";
	}
	return `\`codegraph ${desc.cli_command}\``;
};

/** Lookup table mapping action names to short example calls. */
const ACTION_EXAMPLES: Record<string, string> = {
	help: '`codegraph({ action: "help" })`',
	search:
		'`codegraph({ action: "search", query: "useState", kind: "function" })`',
	explore:
		'`codegraph({ action: "explore", query: "auth session", max_files: 8 })`',
	node: '`codegraph({ action: "node", file: "src/index.ts", offset: 1, limit: 120 })`',
	callers: '`codegraph({ action: "callers", symbol: "render_help" })`',
	callees: '`codegraph({ action: "callees", symbol: "render_help" })`',
	files: '`codegraph({ action: "files", filter: "*.ts", max_depth: 2 })`',
	status: '`codegraph({ action: "status" })`',
	impact: '`codegraph({ action: "impact", symbol: "render_help", depth: 2 })`',
	affected: '`codegraph({ action: "affected", files: ["src/help.ts"] })`',
	init: '`codegraph({ action: "init", project_path: "/app" })`',
	index: '`codegraph({ action: "index", project_path: "/app" })`',
	sync: '`codegraph({ action: "sync" })`',
	unlock: '`codegraph({ action: "unlock" })`',
};

/** Builds a short example call for an action. */
const action_example = (desc: ActionDescriptor): string => {
	return (
		ACTION_EXAMPLES[desc.action] ??
		`\`codegraph({ action: "${desc.action}" })\``
	);
};

/** Comma-separated list of required params, or "(none)". */
const required_list = (desc: ActionDescriptor): string =>
	desc.required.length > 0 ? desc.required.join(", ") : "(none)";

/** Comma-separated list of optional params, or "(none)". */
const optional_list = (desc: ActionDescriptor): string =>
	desc.optional.length > 0 ? desc.optional.join(", ") : "(none)";

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

const decision_tree = (): string => {
	return [
		"## Quick Decision Tree",
		"",
		"| Need to ... | Use action |",
		"|---|---|",
		"| Understand or edit code? | `explore` |",
		"| Get exact symbol or file source? | `node` |",
		"| Discover a symbol name first? | `search` (CLI: `query`) |",
		"| Inspect indexed project structure? | `files` |",
		"| Find incoming callers? | `callers` |",
		"| Find outgoing callees? | `callees` |",
		"| Estimate blast radius for a symbol? | `impact` |",
		"| Find tests affected by changed files? | `affected` |",
		"| Check index health? | `status` |",
		"| Repair the index? | `init`, `index`, `sync`, or `unlock` depending on the error |",
		"| Unsure which action fits? | `help` |",
		"",
	].join("\n");
};

const supported_reference = (): string => {
	const entries = Object.values(DESCRIPTORS).sort((a, b) =>
		a.action.localeCompare(b.action),
	);

	let out = "## Supported Action Reference\n\n";
	out += "| Action | CLI | Required | Optional | Safety | Example |\n";
	out += "|---|---|---|---|---|---|\n";

	for (const desc of entries) {
		const cli = cli_preview(desc);
		const req = required_list(desc);
		const opt = optional_list(desc);
		const safety = desc.safety === "caution" ? "⚠ caution" : "safe";
		const ex = action_example(desc);
		out += `| \`${desc.action}\` | ${cli} | ${req} | ${opt} | ${safety} | ${ex} |\n`;
	}

	out += "\n";
	out +=
		'> **Note:** `action: "search"` renders and runs as the CLI command `codegraph query`.\n';
	out += "> Action names that differ from CLI names are noted above.\n";

	return out;
};

const unsupported_reference = (): string => {
	const entries = Object.entries(UNSUPPORTED).sort(([a], [b]) =>
		a.localeCompare(b),
	);

	let out = "## Unsupported Action Reference\n\n";
	out +=
		"These actions are out of scope for the agent tool (per ADR 3 — destructive, interactive, setup/admin, or package-management).\n\n";
	out += "| Action | Reason | Safe Alternative |\n";
	out += "|---|---|---|\n";

	for (const [action, entry] of entries) {
		out += `| \`${action}\` | ${entry.reason} | ${entry.safe_alternative} |\n`;
	}

	return out;
};

const workflow_examples = (): string => {
	return [
		"## Preferred Workflow Examples",
		"",
		"### 1. Explore an unfamiliar area",
		"",
		"```",
		'codegraph({ action: "status" })               // Check index health',
		'codegraph({ action: "explore", query: "..." }) // Get source + call paths',
		'codegraph({ action: "node", file: "..." })     // Read exact file/symbol',
		"```",
		"",
		"### 2. Trace dependencies before a change",
		"",
		"```",
		'codegraph({ action: "search", query: "..." })       // Discover symbol',
		'codegraph({ action: "callers", symbol: "..." })     // Incoming deps',
		'codegraph({ action: "callees", symbol: "..." })     // Outgoing deps',
		'codegraph({ action: "impact", symbol: "..." })      // Blast radius',
		"```",
		"",
		"### 3. Find affected tests after edits",
		"",
		"```",
		'codegraph({ action: "sync" })                        // Refresh index',
		'codegraph({ action: "affected", files: ["src/..."])  // Find test files',
		"```",
		"",
	].join("\n");
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Renders the comprehensive help page for the codegraph tool.
 *
 * Derives supported actions from `DESCRIPTORS` and unsupported actions
 * from `UNSUPPORTED` so the help page cannot drift from the real action set.
 *
 * @returns Markdown help text with decision tree, supported/unsupported
 *          references, and preferred workflow examples.
 */
export const render_help = (): string => {
	return [
		"# CodeGraph Tool Help",
		"",
		"All `codegraph` calls require an `action` field.  This page helps you choose the right one.",
		"",
		decision_tree(),
		"",
		supported_reference(),
		"",
		unsupported_reference(),
		"",
		workflow_examples(),
		"",
	].join("\n");
};
