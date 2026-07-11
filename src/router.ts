// biome-ignore-all lint: Router forwards the host cancellation contract through execution.

/**
 * Action router — dispatches action-first params to the correct handler.
 *
 * Executes wired code-intelligence actions via `run_codegraph`.
 * Includes a force guard that prevents destructive init/index on home/root.
 */

import os from "node:os";
import { resolve } from "node:path";
import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { DESCRIPTORS } from "./descriptors";
import { render_help } from "./help";
import { format_output } from "./output";
import { run_codegraph } from "./run";
import { render_unsupported, UNSUPPORTED } from "./unsupported";

/** Checks whether a required action parameter is present and non-empty. */
const has_param = (params: Record<string, unknown>, name: string): boolean => {
	const value = params[name];
	if (name === "files") {
		return Array.isArray(value) && value.length > 0;
	}
	if (typeof value === "string") {
		return value.length > 0;
	}
	return false;
};

/** Windows drive-letter root pattern (e.g. "C:", "D:\\"). */
const WINDOWS_ROOT_RE = /^[A-Z]:[\\/]?$/;

/**
 * Returns true when `path` is the user home directory, the filesystem
 * root, or a Windows drive-letter root. Used by the force guard to
 * prevent destructive init/index on protected paths.
 */
const is_home_or_root = (path: string): boolean => {
	const normalized = resolve(path);
	const home = resolve(os.homedir());
	return (
		normalized === home ||
		normalized === "/" ||
		WINDOWS_ROOT_RE.test(normalized)
	);
};

/**
 * Guard text returned when the force guard blocks an action.
 *
 * Never returns null when the action is blocked; null means the action
 * is allowed to proceed.
 */
const force_guard = (
	action: string,
	params: Record<string, unknown>,
): string | null => {
	if (params.force !== true) {
		return null;
	}

	const project_path =
		typeof params.project_path === "string" ? params.project_path : "";

	if (
		action === "init" &&
		(project_path.length === 0 || is_home_or_root(project_path))
	) {
		return (
			"init --force is not supported for home/root paths.\n\n" +
			"Run `codegraph init <project>` without force, or " +
			'`codegraph({ action: "init", project_path: "<path>" })`.'
		);
	}

	if (
		action === "index" &&
		(project_path.length === 0 || is_home_or_root(project_path))
	) {
		return (
			"index --force requires an explicit project path that is not home or root.\n\n" +
			"Use --force only when re-indexing a specific project directory, e.g. " +
			'`codegraph({ action: "index", project_path: ".", force: true })`.'
		);
	}

	return null;
};
/**
 * Returns friendly text naming a missing required field with an example call.
 */
const missing_param_text = (action: string, name: string): string => {
	const parts: Record<string, string> = {
		query: 'query: "auth session"',
		symbol: 'symbol: "main"',
		files: 'files: ["src/index.ts"]',
		file: 'file: "src/index.ts"',
	};
	const example = parts[name] ?? `${name}: "<value>"`;
	return (
		`CodeGraph action "${action}" is missing the required "${name}" parameter.\n\n` +
		`Example: codegraph({ action: "${action}", ${example} })`
	);
};

/**
 * Executes a wired action: validates params, builds CLI args, runs codegraph.
/**
 * Executes a wired action: validates params, builds CLI args, runs codegraph,
 * and formats the output.
 */
const execute_wired = async (
	action: string,
	descriptor: NonNullable<(typeof DESCRIPTORS)[string]>,
	params: Record<string, unknown>,
	signal?: AbortSignal,
): Promise<AgentToolResult<Record<string, unknown>>> => {
	for (const name of descriptor.required) {
		if (!has_param(params, name)) {
			return {
				content: [
					{ type: "text" as const, text: missing_param_text(action, name) },
				],
				details: {},
			};
		}
	}
	if (
		action === "node" &&
		!has_param(params, "file") &&
		!has_param(params, "symbol")
	) {
		return {
			content: [
				{
					type: "text" as const,
					text: `CodeGraph action "node" requires at least one of "file" or "symbol".\n\nExample: codegraph({ action: "node", file: "src/index.ts" })\nExample: codegraph({ action: "node", symbol: "main" })`,
				},
			],
			details: {},
		};
	}
	const args = descriptor.build_args!(params);
	const runner_result = await run_codegraph(args, undefined, signal);
	return format_output(runner_result, { action }) as AgentToolResult<
		Record<string, unknown>
	>;
};

/**
 * Routes an action-first parameter bag to the appropriate handler.
 *
 * @param params - The resolved parameters from the tool call.
 *                 `action` is required by the schema but may be
 *                 missing at runtime (treated as unknown).
 * @returns Agent tool result with text content.
 */
export const route_action = async (
	params: Record<string, unknown>,
	signal?: AbortSignal,
): Promise<AgentToolResult<Record<string, unknown>>> => {
	const action = typeof params.action === "string" ? params.action : "";
	if (action === "help") {
		return {
			content: [{ type: "text" as const, text: render_help() }],
			details: {},
		};
	}
	if (UNSUPPORTED[action]) {
		return {
			content: [{ type: "text" as const, text: render_unsupported(action) }],
			details: {},
		};
	}
	const descriptor = DESCRIPTORS[action];
	if (!descriptor) {
		const action_label = action.length > 0 ? action : "(missing action)";
		return {
			content: [
				{
					type: "text" as const,
					text: `Unknown codegraph action: "${action_label}".\n\nUse action: "help" to see the full list of supported actions.`,
				},
			],
			details: {},
		};
	}
	if (descriptor.build_args === null) {
		return {
			content: [
				{
					type: "text" as const,
					text: `CodeGraph action "${action}" is not yet implemented.\n\nUse action: "help" to see supported actions.`,
				},
			],
			details: {},
		};
	}
	const guard_text = force_guard(action, params);
	if (guard_text !== null) {
		return {
			content: [{ type: "text" as const, text: guard_text }],
			details: {},
		};
	}
	return execute_wired(action, descriptor, params, signal);
};
