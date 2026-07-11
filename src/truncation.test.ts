import { describe, expect, test } from "vitest";
import { format_bytes, truncate_head } from "./truncation";

describe("truncate_head", () => {
	test("given content below limits: should pass it through unchanged", () => {
		expect(truncate_head("a\nb", { maxLines: 2, maxBytes: 10 })).toMatchObject({
			content: "a\nb",
			truncated: false,
		});
	});

	test("given excess lines: should retain only head lines", () => {
		expect(truncate_head("a\nb\nc", { maxLines: 2 })).toMatchObject({
			content: "a\nb",
			truncated: true,
			truncatedBy: "lines",
			outputLines: 2,
		});
	});

	test("given multibyte content exceeding bytes: should preserve UTF-8 boundaries", () => {
		const result = truncate_head("ééé", { maxBytes: 5 });
		expect(result.content).toBe("éé");
		expect(result.outputBytes).toBe(4);
		expect(result.truncatedBy).toBe("bytes");
	});
});

describe("format_bytes", () => {
	test("given byte-unit boundaries: should format each unit", () => {
		expect(format_bytes(1)).toBe("1B");
		expect(format_bytes(1024)).toBe("1.0KB");
		expect(format_bytes(1024 * 1024)).toBe("1.0MB");
		expect(format_bytes(1024 * 1024 * 1024)).toBe("1.0GB");
	});
});
