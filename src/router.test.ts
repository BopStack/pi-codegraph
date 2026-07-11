/**
 * Router and build_args tests — code-intelligence action execution.
 *
 * Tests build_args CLI arg mappings against verified `codegraph 1.3.1` flags,
 * confirms no `--json` emission, and verifies friendly text for missing fields.
 */

import os from "node:os";
import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { describe, expect, test, vi } from "vitest";
import { DESCRIPTORS } from "./descriptors";
import { route_action } from "./router";

/** Extracts the first text item from a route_action result (for test assertions). */
const text_from = (result: AgentToolResult<unknown>): string => {
	const items = result.content as
		| Array<{ type: string; text: string }>
		| undefined;
	return items?.[0]?.text ?? "";
};

// Mock run_codegraph so tests don't execute real CLI.
vi.mock("./run", () => ({
	run_codegraph: vi.fn().mockResolvedValue({
		stdout_head: "mocked output",
		stderr: "",
		exit_code: 0,
		temp_file_path: "/tmp/mocked-codegraph.txt",
	}),
}));

// Mock format_output to pass through the runner result as text.
vi.mock("./output", () => ({
	format_output: vi.fn(
		(runner: {
			stdout_head: string;
			stderr: string;
			exit_code: number;
			temp_file_path: string;
		}) => ({
			content: [
				{ type: "text", text: runner.stdout_head || runner.stderr || "" },
			],
			details: { truncated: false, exit_code: runner.exit_code },
		}),
	),
	strip_ansi: vi.fn((s: string) => s),
}));

// --- build_args pure-function tests ---

describe("build_args: search", () => {
	const descriptor = DESCRIPTORS.search!;

	test("given query only: should emit query subcommand with query arg", () => {
		const args = descriptor.build_args!({ query: "login" });
		expect(args).toEqual(["query", "login"]);
	});

	test("given query + limit: should emit --limit", () => {
		const args = descriptor.build_args!({ query: "login", limit: 5 });
		expect(args).toEqual(["query", "login", "--limit", "5"]);
	});

	test("given query + limit + kind: should emit all flags", () => {
		const args = descriptor.build_args!({
			query: "login",
			limit: 5,
			kind: "function",
		});
		expect(args).toEqual([
			"query",
			"login",
			"--limit",
			"5",
			"--kind",
			"function",
		]);
	});

	test("given project_path: should emit --path flag", () => {
		const args = descriptor.build_args!({ query: "x", project_path: "/proj" });
		expect(args).toEqual(["query", "x", "--path", "/proj"]);
	});
});

describe("build_args: explore", () => {
	const descriptor = DESCRIPTORS.explore!;

	test("given query only: should emit explore subcommand with query arg", () => {
		const args = descriptor.build_args!({ query: "login" });
		expect(args).toEqual(["explore", "login"]);
	});

	test("given query + max_files: should emit --max-files", () => {
		const args = descriptor.build_args!({ query: "auth", max_files: 15 });
		expect(args).toEqual(["explore", "auth", "--max-files", "15"]);
	});

	test("given project_path: should emit --path flag", () => {
		const args = descriptor.build_args!({ query: "x", project_path: "/proj" });
		expect(args).toEqual(["explore", "x", "--path", "/proj"]);
	});
});

describe("build_args: node (file mode)", () => {
	const descriptor = DESCRIPTORS.node!;

	test("given file only: should emit node --file", () => {
		const args = descriptor.build_args!({ file: "src/login.ts" });
		expect(args).toEqual(["node", "--file", "src/login.ts"]);
	});

	test("given file + offset + limit: should emit --offset and --limit", () => {
		const args = descriptor.build_args!({
			file: "src/login.ts",
			offset: 50,
			limit: 30,
		});
		expect(args).toEqual([
			"node",
			"--file",
			"src/login.ts",
			"--offset",
			"50",
			"--limit",
			"30",
		]);
	});

	test("given file + symbols_only: should emit --symbols-only", () => {
		const args = descriptor.build_args!({
			file: "src/login.ts",
			symbols_only: true,
		});
		expect(args).toEqual(["node", "--file", "src/login.ts", "--symbols-only"]);
	});

	test("given project_path: should emit --path flag", () => {
		const args = descriptor.build_args!({
			file: "x.ts",
			project_path: "/proj",
		});
		expect(args).toEqual(["node", "--file", "x.ts", "--path", "/proj"]);
	});
});

describe("build_args: node (symbol mode)", () => {
	const descriptor = DESCRIPTORS.node!;

	test("given symbol only: should emit node with symbol arg", () => {
		const args = descriptor.build_args!({ symbol: "main" });
		expect(args).toEqual(["node", "main"]);
	});

	test("given symbol takes precedence when no file: should emit node with symbol arg", () => {
		const args = descriptor.build_args!({ symbol: "main", offset: 10 });
		expect(args).toEqual(["node", "main", "--offset", "10"]);
	});
});

describe("build_args: callers", () => {
	const descriptor = DESCRIPTORS.callers!;

	test("given symbol: should emit callers subcommand with symbol arg", () => {
		const args = descriptor.build_args!({ symbol: "login" });
		expect(args).toEqual(["callers", "login"]);
	});

	test("given symbol + limit: should emit --limit", () => {
		const args = descriptor.build_args!({ symbol: "login", limit: 10 });
		expect(args).toEqual(["callers", "login", "--limit", "10"]);
	});

	test("given project_path: should emit --path flag", () => {
		const args = descriptor.build_args!({ symbol: "x", project_path: "/proj" });
		expect(args).toEqual(["callers", "x", "--path", "/proj"]);
	});
});

describe("build_args: callees", () => {
	const descriptor = DESCRIPTORS.callees!;

	test("given symbol: should emit callees subcommand with symbol arg", () => {
		const args = descriptor.build_args!({ symbol: "login" });
		expect(args).toEqual(["callees", "login"]);
	});

	test("given symbol + limit: should emit --limit", () => {
		const args = descriptor.build_args!({ symbol: "login", limit: 10 });
		expect(args).toEqual(["callees", "login", "--limit", "10"]);
	});
});

describe("build_args: files", () => {
	const descriptor = DESCRIPTORS.files!;

	test("given no optional params: should emit files alone", () => {
		const args = descriptor.build_args!({});
		expect(args).toEqual(["files"]);
	});

	test("given filter: should emit --filter", () => {
		const args = descriptor.build_args!({ filter: "*.ts" });
		expect(args).toEqual(["files", "--filter", "*.ts"]);
	});

	test("given format: should emit --format", () => {
		const args = descriptor.build_args!({ format: "tree" });
		expect(args).toEqual(["files", "--format", "tree"]);
	});

	test("given max_depth: should emit --max-depth", () => {
		const args = descriptor.build_args!({ max_depth: 3 });
		expect(args).toEqual(["files", "--max-depth", "3"]);
	});

	test("given project_path: should emit --path flag", () => {
		const args = descriptor.build_args!({ project_path: "/proj" });
		expect(args).toEqual(["files", "--path", "/proj"]);
	});
});

describe("build_args: status", () => {
	const descriptor = DESCRIPTORS.status!;

	test("given no optional params: should emit status alone", () => {
		const args = descriptor.build_args!({});
		expect(args).toEqual(["status"]);
	});

	test("given project_path: should emit project_path as positional arg", () => {
		const args = descriptor.build_args!({ project_path: "/proj" });
		expect(args).toEqual(["status", "/proj"]);
	});
});

describe("build_args: impact", () => {
	const descriptor = DESCRIPTORS.impact!;

	test("given symbol only: should emit impact subcommand with symbol arg", () => {
		const args = descriptor.build_args!({ symbol: "login" });
		expect(args).toEqual(["impact", "login"]);
	});

	test("given symbol + depth: should emit --depth", () => {
		const args = descriptor.build_args!({ symbol: "login", depth: 3 });
		expect(args).toEqual(["impact", "login", "--depth", "3"]);
	});

	test("given project_path: should emit --path flag", () => {
		const args = descriptor.build_args!({ symbol: "x", project_path: "/proj" });
		expect(args).toEqual(["impact", "x", "--path", "/proj"]);
	});
});

describe("build_args: affected", () => {
	const descriptor = DESCRIPTORS.affected!;

	test("given files array: should emit affected with file args", () => {
		const args = descriptor.build_args!({ files: ["src/a.ts", "src/b.ts"] });
		expect(args).toEqual(["affected", "src/a.ts", "src/b.ts"]);
	});

	test("given files + depth: should emit --depth", () => {
		const args = descriptor.build_args!({ files: ["a.ts"], depth: 3 });
		expect(args).toEqual(["affected", "a.ts", "--depth", "3"]);
	});

	test("given files + filter: should emit --filter", () => {
		const args = descriptor.build_args!({
			files: ["a.ts"],
			filter: "*.test.ts",
		});
		expect(args).toEqual(["affected", "a.ts", "--filter", "*.test.ts"]);
	});

	test("given files + quiet: should emit --quiet", () => {
		const args = descriptor.build_args!({ files: ["a.ts"], quiet: true });
		expect(args).toEqual(["affected", "a.ts", "--quiet"]);
	});

	test("given project_path: should emit --path flag", () => {
		const args = descriptor.build_args!({
			files: ["a.ts"],
			project_path: "/proj",
		});
		expect(args).toEqual(["affected", "a.ts", "--path", "/proj"]);
	});
});

// --- build_args pure-function tests: maintenance actions ---

describe("build_args: init", () => {
	const descriptor = DESCRIPTORS.init!;

	test("given project_path: should emit init with project_path", () => {
		const args = descriptor.build_args!({ project_path: "/proj" });
		expect(args).toEqual(["init", "/proj"]);
	});

	test("given project_path + force: should emit -f flag", () => {
		const args = descriptor.build_args!({ project_path: "/proj", force: true });
		expect(args).toEqual(["init", "/proj", "-f"]);
	});

	test("given project_path + verbose: should emit -v flag", () => {
		const args = descriptor.build_args!({
			project_path: "/proj",
			verbose: true,
		});
		expect(args).toEqual(["init", "/proj", "-v"]);
	});
});

describe("build_args: index", () => {
	const descriptor = DESCRIPTORS.index!;

	test("given project_path: should emit index with project_path", () => {
		const args = descriptor.build_args!({ project_path: "/proj" });
		expect(args).toEqual(["index", "/proj"]);
	});

	test("given project_path + force: should emit -f flag", () => {
		const args = descriptor.build_args!({ project_path: "/proj", force: true });
		expect(args).toEqual(["index", "/proj", "-f"]);
	});

	test("given project_path + quiet: should emit -q flag", () => {
		const args = descriptor.build_args!({ project_path: "/proj", quiet: true });
		expect(args).toEqual(["index", "/proj", "-q"]);
	});

	test("given project_path + verbose: should emit -v flag", () => {
		const args = descriptor.build_args!({
			project_path: "/proj",
			verbose: true,
		});
		expect(args).toEqual(["index", "/proj", "-v"]);
	});
});

describe("build_args: sync", () => {
	const descriptor = DESCRIPTORS.sync!;

	test("given no optional params: should emit sync alone", () => {
		const args = descriptor.build_args!({});
		expect(args).toEqual(["sync"]);
	});

	test("given project_path: should emit project_path as positional arg", () => {
		const args = descriptor.build_args!({ project_path: "/proj" });
		expect(args).toEqual(["sync", "/proj"]);
	});

	test("given quiet: should emit -q flag", () => {
		const args = descriptor.build_args!({ quiet: true });
		expect(args).toEqual(["sync", "-q"]);
	});
});

describe("build_args: unlock", () => {
	const descriptor = DESCRIPTORS.unlock!;

	test("given project_path: should emit unlock with project_path", () => {
		const args = descriptor.build_args!({ project_path: "." });
		expect(args).toEqual(["unlock", "."]);
	});

	test("given no params: should emit unlock alone", () => {
		const args = descriptor.build_args!({});
		expect(args).toEqual(["unlock"]);
	});
});

// --- route_action execution tests ---

describe("route_action: execution", () => {
	test("given wired action: should execute via run_codegraph and return text content", async () => {
		const result = await route_action({
			action: "status",
			project_path: "/proj",
		});
		expect(result.content).toEqual([{ type: "text", text: "mocked output" }]);
		expect(result.details).toBeDefined();
	});

	test("given wired search action with optional params: should execute normally", async () => {
		const result = await route_action({
			action: "search",
			query: "login",
			limit: 5,
		});
		expect(result.content).toEqual([{ type: "text", text: "mocked output" }]);
	});

	test("given action help: should return help text", async () => {
		expect(text_from(await route_action({ action: "help" }))).toContain("help");
	});

	test("given unknown action: should return boundary text", async () => {
		expect(text_from(await route_action({ action: "nonexistent" }))).toContain(
			"help",
		);
	});

	test("given action init with non-home project_path: should execute via run_codegraph (now wired in Task 3)", async () => {
		const result = await route_action({
			action: "init",
			project_path: "/tmp/my-project",
		});
		expect(result.content).toEqual([{ type: "text", text: "mocked output" }]);
		expect(result.details).toBeDefined();
	});
});

// --- missing required field tests ---

describe("route_action: missing required fields", () => {
	test("given search missing query: should return friendly text naming query", async () => {
		const result = await route_action({ action: "search" });
		expect(text_from(result)).toContain("query");
		expect(text_from(result)).toContain("Example");
		expect(text_from(result)).toContain("search");
	});

	test("given explore missing query: should return friendly text naming query", async () => {
		const result = await route_action({ action: "explore", max_files: 8 });
		expect(text_from(result)).toContain("query");
		expect(text_from(result)).toContain("Example");
	});

	test("given callers missing symbol: should return friendly text naming symbol", async () => {
		const result = await route_action({ action: "callers", limit: 10 });
		expect(text_from(result)).toContain("symbol");
		expect(text_from(result)).toContain("Example");
	});

	test("given callees missing symbol: should return friendly text naming symbol", async () => {
		const result = await route_action({ action: "callees" });
		expect(text_from(result)).toContain("symbol");
		expect(text_from(result)).toContain("Example");
	});

	test("given impact missing symbol: should return friendly text naming symbol", async () => {
		const result = await route_action({ action: "impact", depth: 3 });
		expect(text_from(result)).toContain("symbol");
		expect(text_from(result)).toContain("Example");
	});

	test("given affected missing files: should return friendly text naming files", async () => {
		const result = await route_action({ action: "affected", depth: 3 });
		expect(text_from(result)).toContain("files");
		expect(text_from(result)).toContain("Example");
	});

	test("given node with no file or symbol: should return friendly text naming both", async () => {
		const result = await route_action({ action: "node", limit: 30 });
		expect(text_from(result)).toContain("file");
		expect(text_from(result)).toContain("symbol");
		expect(text_from(result)).toContain("node");
	});

	test("given status with no required fields: should run normally", async () => {
		const result = await route_action({ action: "status" });
		expect(result.content).toEqual([{ type: "text", text: "mocked output" }]);
	});

	test("given files with no required fields: should run normally", async () => {
		const result = await route_action({ action: "files" });
		expect(result.content).toEqual([{ type: "text", text: "mocked output" }]);
	});
});

// --- force guard tests ---

describe("route_action: force guard", () => {
	test("given init with force and home dir: should return guard text, not execute", async () => {
		const home = os.homedir();
		const result = await route_action({
			action: "init",
			project_path: home,
			force: true,
		});
		expect(text_from(result)).toContain("force");
		expect(text_from(result)).toContain("home");
		// Must not be mocked output (did not execute)
		expect(text_from(result)).not.toBe("mocked output");
	});

	test("given init with force and root: should return guard text", async () => {
		const result = await route_action({
			action: "init",
			project_path: "/",
			force: true,
		});
		expect(text_from(result)).toContain("force");
		expect(text_from(result)).not.toBe("mocked output");
	});

	test("given init with force and missing project_path: should return guard text", async () => {
		const result = await route_action({ action: "init", force: true });
		expect(text_from(result)).toContain("force");
		expect(text_from(result)).not.toBe("mocked output");
	});

	test("given index with force and no project_path: should return guard text", async () => {
		const result = await route_action({ action: "index", force: true });
		expect(text_from(result)).toContain("force");
		expect(text_from(result)).not.toBe("mocked output");
	});

	test("given index with force and home dir: should return guard text", async () => {
		const home = os.homedir();
		const result = await route_action({
			action: "index",
			project_path: home,
			force: true,
		});
		expect(text_from(result)).toContain("force");
		expect(text_from(result)).not.toBe("mocked output");
	});

	test("given index with force and explicit non-home path: should execute", async () => {
		const result = await route_action({
			action: "index",
			project_path: "/tmp/my-project",
			force: true,
		});
		expect(result.content).toEqual([{ type: "text", text: "mocked output" }]);
	});

	test('given index with force and relative path ".": should execute (dot is not home)', async () => {
		const result = await route_action({
			action: "index",
			project_path: ".",
			force: true,
		});
		expect(result.content).toEqual([{ type: "text", text: "mocked output" }]);
	});

	test("given sync with force param: should execute normally (ignoring force)", async () => {
		const result = await route_action({
			action: "sync",
			project_path: ".",
			force: true,
		});
		expect(result.content).toEqual([{ type: "text", text: "mocked output" }]);
	});

	test("given unlock with force param: should execute normally (ignoring force)", async () => {
		const result = await route_action({
			action: "unlock",
			project_path: ".",
			force: true,
		});
		expect(result.content).toEqual([{ type: "text", text: "mocked output" }]);
	});
});

// --- no --json across all supported actions ---

describe("no --json emitted by any supported action", () => {
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

describe("files descriptor flags", () => {
	test("given pattern and no_metadata: should emit supported files flags", () => {
		expect(
			DESCRIPTORS.files!.build_args!({ pattern: "*.ts", no_metadata: true }),
		).toEqual(["files", "--pattern", "*.ts", "--no-metadata"]);
	});
});
