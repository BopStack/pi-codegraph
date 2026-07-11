/**
 * Help action tests — comprehensive coverage of the help page
 * and prompt teaching coverage.
 */

import { describe, expect, test } from "vitest";
import { DESCRIPTORS } from "./descriptors";
import { render_help } from "./help";
import { UNSUPPORTED } from "./unsupported";

/** Every action name in the descriptor table. */
const SUPPORTED_ACTIONS = Object.keys(DESCRIPTORS);

/** Every action name in the unsupported catalog. */
const UNSUPPORTED_ACTIONS = Object.keys(UNSUPPORTED);

const RE_STATUS_EXPLORE_NODE = /status[\s\S]*explore[\s\S]*node/i;
const RE_SEARCH_CALLERS_IMPACT = /search[\s\S]*callers[\s\S]*impact/i;
const RE_SYNC_AFFECTED = /sync[\s\S]*affected/i;
const RE_SEARCH_QUERY = /search[\s\S]*query/i;

describe("help page content", () => {
	const help_text = render_help();
	test("given help page: should contain quick decision tree", () => {
		expect(help_text).toContain("Quick Decision Tree");
		expect(help_text).toContain("explore");
		expect(help_text).toContain("node");
		expect(help_text).toContain("search");
		expect(help_text).toContain("files");
		expect(help_text).toContain("callers");
		expect(help_text).toContain("callees");
		expect(help_text).toContain("impact");
		expect(help_text).toContain("affected");
		expect(help_text).toContain("status");
		expect(help_text).toContain("init");
		expect(help_text).toContain("index");
		expect(help_text).toContain("sync");
		expect(help_text).toContain("unlock");
	});

	test("given help page: should contain every supported action name in supported reference", () => {
		// Find the supported reference section boundaries.
		const supported_section_start = help_text.indexOf("Supported");
		expect(supported_section_start).toBeGreaterThan(-1);

		for (const action of SUPPORTED_ACTIONS) {
			expect(help_text).toContain(`\`${action}\``);
		}
	});

	test("given help page: should name every unsupported action in unsupported reference", () => {
		const unsupported_section_start = help_text.indexOf("Unsupported");
		expect(unsupported_section_start).toBeGreaterThan(-1);

		for (const action of UNSUPPORTED_ACTIONS) {
			expect(help_text).toContain(`\`${action}\``);
		}
	});

	test("given help page: should contain three preferred-workflow examples", () => {
		// Workflow 1: status → explore → node
		expect(help_text).toMatch(RE_STATUS_EXPLORE_NODE);

		// Workflow 2: search → callers/callees → impact
		expect(help_text).toMatch(RE_SEARCH_CALLERS_IMPACT);

		// Workflow 3: sync → affected
		expect(help_text).toMatch(RE_SYNC_AFFECTED);
	});

	test("given help page: should note search renders as codegraph query", () => {
		expect(help_text).toMatch(RE_SEARCH_QUERY);
	});
});
