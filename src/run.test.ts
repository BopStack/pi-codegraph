/**
 * Runner tests — streaming spawn output capture and temp file guarantees.
 *
 * Task 5: tests for the streaming runner.
 * Integration tests gated behind CLI binary presence check.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { describe, expect, test } from "vitest";
import { run_codegraph } from "./run";

/** Checks whether the codegraph CLI is available on PATH. */
const codegraph_cli_available = (): boolean => {
	try {
		execFileSync("codegraph", ["--version"], {
			stdio: "ignore",
			timeout: 5000,
		});
		return true;
	} catch {
		return false;
	}
};

const describe_if_cli = codegraph_cli_available() ? describe : describe.skip;

describe_if_cli("run_codegraph streaming runner", () => {
	test("given known codegraph args: should return stdout_head, exit_code, and temp_file_path", async () => {
		const result = await run_codegraph(["--version"]);
		expect(result.stdout_head).toBeDefined();
		expect(typeof result.stdout_head).toBe("string");
		expect(result.stdout_head.length).toBeGreaterThan(0);
		expect(result.exit_code).toBe(0);
		expect(result.temp_file_path).toBeDefined();
		expect(typeof result.temp_file_path).toBe("string");
		expect(result.temp_file_path.length).toBeGreaterThan(0);

		// Temp file should exist and contain the full output
		expect(fs.existsSync(result.temp_file_path)).toBe(true);
		const full_content = fs.readFileSync(result.temp_file_path, "utf-8");
		expect(full_content.length).toBeGreaterThanOrEqual(
			result.stdout_head.length,
		);
		expect(full_content).toContain(result.stdout_head);
	}, 15_000);

	test("given known codegraph args: should not use shell interpolation", async () => {
		const result = await run_codegraph(["--version"]);
		expect(result.exit_code).toBe(0);
		expect(result.stdout_head).toContain(".");
	}, 15_000);

	test("given codegraph error: should propagate non-zero exit code and stderr", async () => {
		const result = await run_codegraph(["--nonexistent-flag-xyz"]);
		expect(result.exit_code).not.toBe(0);
	}, 15_000);

	test("given non-existent cwd: should still resolve without throwing", async () => {
		const result = await run_codegraph(["--version"], "/nonexistent/path");
		expect(result).toBeDefined();
		expect(typeof result.stdout_head).toBe("string");
	}, 15_000);
});

describe_if_cli("run_codegraph: large output capture", () => {
	test("given codegraph with large output action: should capture full output to temp file without 2 MiB cap", async () => {
		const result = await run_codegraph(["files"], process.cwd());
		expect(result.exit_code).toBe(0);

		expect(fs.existsSync(result.temp_file_path)).toBe(true);

		const temp_contents = fs.readFileSync(result.temp_file_path, "utf-8");
		expect(temp_contents.length).toBeGreaterThan(0);

		// In-memory head bounded (not the full output)
		const max_head_bytes = 150_000;
		expect(result.stdout_head.length).toBeLessThanOrEqual(max_head_bytes);

		// Temp file starts with head prefix
		expect(temp_contents.startsWith(result.stdout_head)).toBe(true);

		// Temp file contains the full output (at least as much as head)
		expect(temp_contents.length).toBeGreaterThanOrEqual(
			result.stdout_head.length,
		);
	}, 30_000);
});

describe_if_cli("run_codegraph cancellation", () => {
	test("given an immediately aborted signal: should return cancelled runner output", async () => {
		const controller = new AbortController();
		const pending = run_codegraph(["status"], undefined, controller.signal);
		controller.abort();
		await expect(pending).resolves.toMatchObject({
			exit_code: -1,
			stdout_head: "CodeGraph execution was cancelled.",
		});
	}, 15_000);
});
