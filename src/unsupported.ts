/**
 * Unsupported-action catalog and boundary text for the codegraph tool.
 *
 * Every entry documents why an action is out of scope per ADR 3
 * and provides a safe human CLI alternative.
 */

/** Describes why an action is unsupported and what to do instead. */
export type UnsupportedEntry = {
	/** Why this action is unsupported through the agent tool. */
	reason: string;
	/** Safe alternative for a human operator at the CLI. */
	safe_alternative: string;
};

/**
 * Actions that are out of scope for the agent tool (ADR 3).
 *
 * Destructive, interactive, setup/admin, and package-management
 * commands are declined with boundary text naming the reason
 * and a safe human CLI alternative.
 */
export const UNSUPPORTED: Record<string, UnsupportedEntry> = {
	uninit: {
		reason: "Removes `.codegraph/`; destructive delete action.",
		safe_alternative: "Run `codegraph uninit` manually if you intend deletion.",
	},
	uninstall: {
		reason: "Removes agent MCP configuration; destructive remove action.",
		safe_alternative:
			"Run `codegraph uninstall` manually if you intend removal.",
	},
	daemon: {
		reason:
			"Interactive daemon management is not available through the agent tool.",
		safe_alternative: "Run `codegraph daemon` manually in a terminal.",
	},
	daemons: {
		reason:
			"Interactive daemon management is not available through the agent tool.",
		safe_alternative: "Run `codegraph daemons` manually in a terminal.",
	},
	install: {
		reason:
			"Writes MCP configuration for other agents and may prompt interactively.",
		safe_alternative:
			"Run `codegraph install` or `codegraph install --print-config <target>` manually.",
	},
	install_config: {
		reason:
			"Configures other agents rather than helping this agent understand code.",
		safe_alternative:
			"Run `codegraph install --print-config <target>` manually.",
	},
	telemetry: {
		reason:
			"Telemetry preferences and status are not code-understanding actions.",
		safe_alternative: "Run `codegraph telemetry status/on/off` manually.",
	},
	upgrade: {
		reason:
			"Package upgrade is a package-management concern, not code understanding.",
		safe_alternative: "Run `codegraph upgrade` manually.",
	},
	upgrade_check: {
		reason:
			"Upgrade checks are a package-management concern, not code understanding.",
		safe_alternative: "Run `codegraph upgrade --check` manually.",
	},
	version: {
		reason:
			"Standalone version check is an install diagnostic, not a code-understanding action.",
		safe_alternative:
			"Check the installed version with `codegraph version` if needed.",
	},
};

/**
 * Returns boundary text for an unsupported action.
 *
 * For actions in `UNSUPPORTED`, returns specific text naming the
 * action, reason, and safe alternative. For truly unknown actions,
 * returns a generic boundary message pointing to help.
 *
 * @param action - The unsupported action name.
 * @returns Plain text naming the boundary and safe alternative.
 */
export const render_unsupported = (action: string): string => {
	const entry = UNSUPPORTED[action];
	if (entry) {
		return (
			`CodeGraph action "${action}" is not supported through this tool.\n\n` +
			`Reason: ${entry.reason}\n\n` +
			`Safe alternative: ${entry.safe_alternative}\n\n` +
			`Use action: "help" to see the full list of supported actions.`
		);
	}

	// Generic fallback for truly unknown actions
	return (
		`CodeGraph action "${action}" is not supported by this tool.\n\n` +
		`Use action: "help" to see the full list of supported actions ` +
		`and safe alternatives for common unsupported ones.`
	);
};
