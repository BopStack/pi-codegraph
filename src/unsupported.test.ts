/**
 * Unsupported action boundary tests.
 *
 * Every unsupported action must return specific boundary text naming
 * the action, a reason, and a safe alternative, and must never invoke
 * `run_codegraph`.
 */

import { describe, expect, test, vi } from "vitest";
import { route_action } from "./router";
import { run_codegraph } from "./run";
import { render_unsupported, UNSUPPORTED } from "./unsupported";

// Mock run_codegraph so we can assert it is never called.
vi.mock("./run", () => ({
	run_codegraph: vi.fn().mockResolvedValue({
		stdout_head: "SHOULD NOT BE CALLED",
		stderr: "",
		exit_code: 0,
		temp_file_path: "",
	}),
}));

/** Every unsupported action from the spec table. */
const UNSUPPORTED_ACTIONS = [
	"uninit",
	"uninstall",
	"daemon",
	"daemons",
	"install",
	"install_config",
	"telemetry",
	"upgrade",
	"upgrade_check",
	"version",
];

describe("UNSUPPORTED catalog", () => {
	test("given spec table: should contain all expected unsupported actions", () => {
		for (const action of UNSUPPORTED_ACTIONS) {
			expect(
				UNSUPPORTED[action],
				`missing entry for "${action}"`,
			).toBeDefined();
		}
	});

	test("given any unsupported entry: should have non-empty reason and safe_alternative", () => {
		for (const [action, entry] of Object.entries(UNSUPPORTED)) {
			expect(
				entry.reason,
				`"${action}" reason must be a non-empty string`,
			).toBeTruthy();
			expect(typeof entry.reason, `"${action}" reason must be a string`).toBe(
				"string",
			);
			expect(
				entry.safe_alternative,
				`"${action}" safe_alternative must be a non-empty string`,
			).toBeTruthy();
			expect(
				typeof entry.safe_alternative,
				`"${action}" safe_alternative must be a string`,
			).toBe("string");
		}
	});
});

describe("render_unsupported", () => {
	for (const action of UNSUPPORTED_ACTIONS) {
		test(`given "${action}": should name the action, reason, and safe alternative`, () => {
			const text = render_unsupported(action);
			const entry = UNSUPPORTED[action]!;

			expect(text).toContain(action);
			expect(text).toContain(entry.reason);
			expect(text).toContain(entry.safe_alternative);
			expect(text).toContain("help");
			expect(text.length).toBeGreaterThan(0);
		});
	}

	test("given truly unknown action: should return generic boundary text", () => {
		const text = render_unsupported("nonexistent_xyz");
		expect(text).toContain("nonexistent_xyz");
		expect(text).toContain("help");
		expect(text).toContain("not supported");
	});
});

describe("route_action for unsupported actions", () => {
	for (const action of UNSUPPORTED_ACTIONS) {
		test(`given "${action}": should return boundary text without invoking run_codegraph`, async () => {
			vi.clearAllMocks();

			const result = await route_action({ action });
			const items = result.content as
				| Array<{ type: string; text: string }>
				| undefined;
			const text = items?.[0]?.text ?? "";

			expect(text).toContain(action);
			expect(text.length).toBeGreaterThan(0);
			expect(run_codegraph).not.toHaveBeenCalled();
		});
	}

	test('given "daemon" with extra params: should still return boundary text without running', async () => {
		vi.clearAllMocks();

		const result = await route_action({ action: "daemon", subcommand: "stop" });
		const items = result.content as
			| Array<{ type: string; text: string }>
			| undefined;
		const text = items?.[0]?.text ?? "";

		expect(text).toContain("daemon");
		expect(run_codegraph).not.toHaveBeenCalled();
	});

	test('given "upgrade_check": should return boundary text without running', async () => {
		vi.clearAllMocks();

		const result = await route_action({ action: "upgrade_check" });
		const items = result.content as
			| Array<{ type: string; text: string }>
			| undefined;
		const text = items?.[0]?.text ?? "";

		expect(text).toContain("upgrade_check");
		expect(run_codegraph).not.toHaveBeenCalled();
	});
});
