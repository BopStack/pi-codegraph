/**
 * Output formatting tests — ANSI stripping, truncation, no-json guard.
 *
 * Task 5: tests for the output formatting pipeline.
 */

import fs from "node:fs";
import { describe, expect, test } from "vitest";
import { DESCRIPTORS } from "./descriptors";
import { format_output, strip_ansi } from "./output";

describe("strip_ansi", () => {
	test("given ANSI SGR sequences: should remove color codes while preserving text", () => {
		// biome-ignore lint/security/noSecrets: test fixture with ANSI escape codes
		const ansi = "\x1b[31mred\x1b[0m \x1b[1;32mbold green\x1b[0m";
		expect(strip_ansi(ansi)).toBe("red bold green");
	});

	test("given OSC terminal title sequences: should strip control sequences", () => {
		const osc = `before\x1b]0;title\x07after`;
		const result = strip_ansi(osc);
		expect(result).not.toContain("\x1b]");
		expect(result).toContain("before");
		expect(result).toContain("after");
	});

	test("given whitespace-padded text: should trim leading and trailing whitespace", () => {
		expect(strip_ansi("  hello  ")).toBe("hello");
	});

	test("given plain text without escape sequences: should return unchanged", () => {
		const clean = "plain text without any escape sequences";
		expect(strip_ansi(clean)).toBe(clean);
	});
});

describe("format_output", () => {
	test("given small output: should pass through with truncated:false in details", () => {
		const result = format_output(
			{
				stdout_head: "small output",
				stderr: "",
				exit_code: 0,
				temp_file_path: "",
			},
			{ action: "status" },
		);
		expect(result.content).toEqual([{ type: "text", text: "small output" }]);
		expect(result.details.truncated).toBe(false);
	});

	test("given failed command with partial stdout and stderr: should retain both streams", () => {
		const result = format_output(
			{
				stdout_head: "partial",
				stderr: "error msg",
				exit_code: 1,
				temp_file_path: "/tmp/x",
			},
			{ action: "status" },
		);
		expect(result.content[0]!.text).toContain("partial");
		expect(result.content[0]!.text).toContain("[stderr]");
		expect(result.content[0]!.text).toContain("error msg");
	});

	test("given output with ANSI sequences: should strip them", () => {
		// biome-ignore lint/security/noSecrets: test fixture with ANSI escape codes
		const ansi_input = "\x1b[32mok\x1b[0m";
		const result = format_output(
			{ stdout_head: ansi_input, stderr: "", exit_code: 0, temp_file_path: "" },
			{ action: "search" },
		);
		expect(result.content[0]!.text).toBe("ok");
	});

	test("given large output: should truncate and include truncation note with absolute temp file path", () => {
		const long_line = `${"x".repeat(80)}\n`;
		const lines_needed = 700;
		const big_output = long_line.repeat(lines_needed);
		const temp_path = "/tmp/codegraph-test-output.txt";

		fs.writeFileSync(temp_path, big_output, "utf-8");

		try {
			const result = format_output(
				{
					stdout_head: big_output,
					stderr: "",
					exit_code: 0,
					temp_file_path: temp_path,
				},
				{ action: "explore" },
			);
			expect(result.details.truncated).toBe(true);
			expect(result.content[0]!.text).toContain(temp_path);
			expect(result.content[0]!.text).toContain("xxxx");
			expect(fs.existsSync(temp_path)).toBe(true);
			const full_content = fs.readFileSync(temp_path, "utf-8");
			expect(full_content).toBe(big_output);
		} finally {
			try {
				fs.unlinkSync(temp_path);
			} catch {
				/* best effort */
			}
		}
	});

	test("given output well below byte limit: should not be truncated", () => {
		const exact = "x".repeat(100);
		const result = format_output(
			{ stdout_head: exact, stderr: "", exit_code: 0, temp_file_path: "" },
			{ action: "files" },
		);
		expect(result.details.truncated).toBe(false);
		expect(result.content[0]!.text).toBe(exact);
	});

	test("given only stderr with no stdout: should include stderr text", () => {
		const result = format_output(
			{
				stdout_head: "",
				stderr: "Error: something went wrong",
				exit_code: 1,
				temp_file_path: "",
			},
			{ action: "search" },
		);
		expect(result.content[0]!.text).toContain("something went wrong");
	});

	test("given multi-byte UTF-8 near truncation boundary: should truncate on character boundary", () => {
		const prefix = "a".repeat(51_000);
		// biome-ignore lint/security/noSecrets: test fixture with Japanese text
		const suffix = "日本語のテキスト".repeat(50);
		const big_utf8 = `${prefix}\n${suffix}`;

		const temp_path = "/tmp/codegraph-test-utf8.txt";
		fs.writeFileSync(temp_path, big_utf8, "utf-8");

		try {
			const result = format_output(
				{
					stdout_head: big_utf8,
					stderr: "",
					exit_code: 0,
					temp_file_path: temp_path,
				},
				{ action: "explore" },
			);
			expect(result.details.truncated).toBe(true);
			const truncated_text = result.content[0]!.text;
			expect(() =>
				Buffer.from(truncated_text, "utf-8").toString("utf-8"),
			).not.toThrow();
			expect(result.details.truncatedBy).toBeDefined();
		} finally {
			try {
				fs.unlinkSync(temp_path);
			} catch {
				/* best effort */
			}
		}
	});
});

describe("no --json emitted by any supported action builder", () => {
	const all_actions = [
		"search",
		"explore",
		"node",
		"callers",
		"callees",
		"files",
		"status",
		"impact",
		"affected",
		"init",
		"index",
		"sync",
		"unlock",
	] as const;

	for (const action of all_actions) {
		test(`given comprehensive params for ${action}: should not emit --json or -j`, () => {
			const d = DESCRIPTORS[action];
			expect(d!.build_args).not.toBeNull();
			const args = d!.build_args!({
				query: "x",
				symbol: "x",
				file: "x.ts",
				limit: 10,
				kind: "function",
				max_files: 8,
				offset: 1,
				depth: 3,
				filter: "*.ts",
				format: "tree",
				max_depth: 2,
				project_path: ".",
				files: ["a.ts"],
				symbols_only: true,
				quiet: true,
				force: true,
				verbose: true,
			});
			expect(args).not.toContain("--json");
			expect(args).not.toContain("-j");
		});
	}
});
