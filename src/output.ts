/**
 * Output formatting — ANSI stripping, truncation, and temp-file notes.
 *
 * Task 5: text-first output with local dual-runtime truncation helpers.
 */

import {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	format_bytes,
	type TruncationResult,
	truncate_head,
} from "./truncation";

/** ASCII code for the escape character used in ANSI/OSC sequences. */
const ESCAPE_CHAR_CODE = 0x1b;

/** Escape character used for ANSI/OSC detection. */
const ESC = String.fromCharCode(ESCAPE_CHAR_CODE);
/** Matches CSI sequences like `ESC[31m` or `ESC[1;32m`. */
const ANSI_RE = new RegExp(`${ESC}\\[[0-9;]*[a-zA-Z]`, "g");

/** Matches OSC sequences like `ESC]0;title\x07`. */
const OSC_RE = new RegExp(`${ESC}\\].*?(?:\\x07|${ESC}\\\\)`, "g");

/**
 * Removes terminal escape sequences from CodeGraph CLI output.
 */
export const strip_ansi = (value: string): string =>
	value.replace(ANSI_RE, "").replace(OSC_RE, "").trim();

/** Shape returned by the streaming runner. */
export type RunnerResult = {
	stdout_head: string;
	stderr: string;
	exit_code: number;
	temp_file_path: string;
};

/** Metadata passed through to `details`. */
export type OutputMeta = {
	action: string;
	[key: string]: unknown;
};

/** Structured details from `format_output`. */
export type OutputDetails = {
	action: string;
	truncated: boolean;
	exit_code: number;
	truncatedBy?: "lines" | "bytes" | null;
	totalLines?: number;
	totalBytes?: number;
	outputLines?: number;
	outputBytes?: number;
	output_path?: string;
	bytes?: number;
	lines?: number;
	[key: string]: unknown;
};

/** Structured result from `format_output`. */
export type FormattedOutput = {
	content: Array<{ type: "text"; text: string }>;
	details: OutputDetails;
};

/**
 * Prefix for temp-file note when output is truncated.
 */
const TRUNCATION_NOTE_PREFIX = "\n\n[output truncated — full output saved to: ";

/**
 * Formats raw runner output into an agent-facing tool result.
 *
 * - Strips ANSI/OSC sequences.
 * - Truncates in-memory text via local `truncate_head`.
 * - Appends a plain-text note with the absolute temp-file path when truncated.
 * - Small output passes through with `truncated: false`.
 */
export const format_output = (
	runner: RunnerResult,
	meta: OutputMeta,
): FormattedOutput => {
	let text = runner.stdout_head;

	if (text.length === 0 && runner.stderr.length > 0) {
		text = runner.stderr;
	}

	if (runner.exit_code !== 0 && runner.stderr.length > 0 && text.length > 0) {
		text += `\n\n[stderr]\n${strip_ansi(runner.stderr)}`;
	}

	text = strip_ansi(text);

	const trunc_result: TruncationResult = truncate_head(text, {
		maxBytes: DEFAULT_MAX_BYTES,
		maxLines: DEFAULT_MAX_LINES,
	});

	let final_text = trunc_result.content;

	const details: OutputDetails = {
		...meta,
		truncated: trunc_result.truncated,
		exit_code: runner.exit_code,
	};

	if (trunc_result.truncated) {
		details.truncatedBy = trunc_result.truncatedBy;
		details.totalLines = trunc_result.totalLines;
		details.totalBytes = trunc_result.totalBytes;
		details.outputLines = trunc_result.outputLines;
		details.outputBytes = trunc_result.outputBytes;

		if (runner.temp_file_path.length > 0) {
			final_text +=
				`${TRUNCATION_NOTE_PREFIX}${runner.temp_file_path}]\n` +
				`[size: ${format_bytes(trunc_result.totalBytes)}, ` +
				`lines: ${trunc_result.totalLines}]\n`;
			details.output_path = runner.temp_file_path;
		} else {
			final_text +=
				"\n\n[warning: output truncated but temp file unavailable]\n" +
				`[size: ${format_bytes(trunc_result.totalBytes)}, ` +
				`lines: ${trunc_result.totalLines}]\n`;
		}
		details.bytes = trunc_result.totalBytes;
		details.lines = trunc_result.totalLines;
	}

	return {
		content: [{ type: "text", text: final_text }],
		details,
	};
};
