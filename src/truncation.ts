// biome-ignore-all lint: Vendored host-compatible truncation constants and byte-boundary arithmetic.

/** Default truncation limits matching both Pi and OMP defaults. */
export const DEFAULT_MAX_BYTES = 50 * 1024;
export const DEFAULT_MAX_LINES = 3000;

export type TruncationResult = {
	content: string;
	truncated: boolean;
	truncatedBy: "lines" | "bytes" | null;
	totalLines: number;
	totalBytes: number;
	outputLines: number;
	outputBytes: number;
};

/**
 * Truncates content to the first N lines and M bytes, UTF-8 boundary safe.
 * Mirrors the behavior of Pi/OMP's truncateHead for the head-only case.
 */
export function truncate_head(
	content: string,
	options: { maxBytes?: number; maxLines?: number } = {},
): TruncationResult {
	const max_bytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
	const max_lines = options.maxLines ?? DEFAULT_MAX_LINES;

	const total_bytes = Buffer.byteLength(content, "utf-8");
	const total_lines = content.split("\n").length;

	if (total_bytes <= max_bytes && total_lines <= max_lines) {
		return {
			content,
			truncated: false,
			truncatedBy: null,
			totalLines: total_lines,
			totalBytes: total_bytes,
			outputLines: total_lines,
			outputBytes: total_bytes,
		};
	}

	let lines = content.split("\n").slice(0, max_lines);
	let text = lines.join("\n");
	let output_bytes = Buffer.byteLength(text, "utf-8");

	if (output_bytes > max_bytes) {
		const buffer = Buffer.from(text, "utf-8");
		let cut = max_bytes;
		while (cut > 0 && (buffer[cut]! & 0xc0) === 0x80) {
			cut--;
		}
		text = buffer.subarray(0, cut).toString("utf-8");
		lines = text.split("\n");
		output_bytes = Buffer.byteLength(text, "utf-8");
	}

	const truncated_by: "lines" | "bytes" =
		total_lines > max_lines && total_bytes <= max_bytes ? "lines" : "bytes";

	return {
		content: text,
		truncated: true,
		truncatedBy: truncated_by,
		totalLines: total_lines,
		totalBytes: total_bytes,
		outputLines: lines.length,
		outputBytes: output_bytes,
	};
}

/** Formats byte count as human-readable string (replaces formatSize). */
export function format_bytes(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes}B`;
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)}KB`;
	}
	if (bytes < 1024 * 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
	}
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}
