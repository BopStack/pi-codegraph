/**
 * CodeGraph CLI runner — streaming spawn with temp-file capture.
 *
 * Task 5: replaces `execFileSync` (2 MiB cap) with `spawn` that captures
 * full stdout and stderr to a temp file while keeping a bounded in-memory head.
 * No shell interpolation. No 2 MiB cap.
 */

import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Shape returned by the streaming runner. */
export type RunnerResult = {
	stdout_head: string
	stderr: string
	exit_code: number
	temp_file_path: string
}

/** Minimal type shape for spawn() result so `as unknown as` avoids @types/node version-specific narrowing. */
type ChildProcessHandle = {
	stdout: { on: (event: 'data', cb: (chunk: Buffer) => void) => void } | null
	stderr: { on: (event: 'data', cb: (chunk: Buffer) => void) => void } | null
	kill: (signal?: NodeJS.Signals | number) => boolean
	on: ((event: 'error', cb: (err: NodeJS.ErrnoException) => void) => void) &
		((event: 'close', cb: (code: number | null) => void) => void)
}

/**
 * Maximum in-memory head bytes (~3x SDK truncation limit of 50KB).
 * The full output is always captured to the temp file.
 */
const MAX_HEAD_BYTES = 150_000

/** Bytes of randomness for temp-file name uniqueness. */
const RANDOM_BYTES_LENGTH = 4

/**
 * Runs the CodeGraph CLI via streaming `spawn` — no shell interpolation.
 *
 * Captures full stdout and stderr to a unique temp file under `os.tmpdir()` and
 * accumulates a bounded in-memory stdout head for the returned text.
 *
 * On spawn failure (binary missing), resolves with descriptive text and
 * an empty temp_file_path so callers never see a thrown error.
 *
 * @param args - CLI arguments (first element is the codegraph subcommand).
 * @param cwd - Working directory. Defaults to `process.cwd()`.
 * @param signal - Abort signal used to stop an in-flight CodeGraph process.
 * @returns Promise resolving to structured runner result.
 */
export const run_codegraph = (
	args: readonly string[],
	cwd?: string,
	signal?: AbortSignal,
): Promise<RunnerResult> =>
	new Promise<RunnerResult>((resolve) => {
		const ts = Date.now()
		const rand = randomBytes(RANDOM_BYTES_LENGTH).toString('hex')
		const action = args.length > 0 && typeof args[0] === 'string' ? args[0] : 'unknown'
		const temp_file_path = join(tmpdir(), `codegraph-${action}-${ts}-${rand}.txt`)

		let stdout_head = ''
		let stderr = ''
		let aborted = false
		let settled = false

		const file_stream = createWriteStream(temp_file_path, { flags: 'w' })
		const settle = (result: RunnerResult): void => {
			if (settled) {
				return
			}
			settled = true
			file_stream.end(() => resolve(result))
		}

		const child = spawn('codegraph', args as readonly string[], {
			cwd: cwd ?? process.cwd(),
			stdio: ['ignore', 'pipe', 'pipe'],
		}) as unknown as ChildProcessHandle
		const on_abort = (): void => {
			aborted = true
			child.kill('SIGTERM')
		}

		signal?.addEventListener('abort', on_abort, { once: true })
		if (signal?.aborted) {
			on_abort()
		}

		child.stdout?.on('data', (chunk: Buffer) => {
			const str = chunk.toString('utf-8')
			stdout_head = append_bounded(stdout_head, str, MAX_HEAD_BYTES)
			file_stream.write(chunk)
		})

		child.stderr?.on('data', (chunk: Buffer) => {
			stderr += chunk.toString('utf-8')
			file_stream.write(chunk)
		})

		child.on('error', (err: NodeJS.ErrnoException) => {
			signal?.removeEventListener('abort', on_abort)
			settle({
				stdout_head: `CodeGraph CLI is unavailable on PATH: ${err.message}`,
				stderr: '',
				exit_code: -1,
				temp_file_path: '',
			})
		})

		child.on('close', (code: number | null) => {
			signal?.removeEventListener('abort', on_abort)
			if (aborted) {
				settle({
					stdout_head: 'CodeGraph execution was cancelled.',
					stderr,
					exit_code: -1,
					temp_file_path,
				})
				return
			}
			settle({
				stdout_head,
				stderr,
				exit_code: code ?? -1,
				temp_file_path,
			})
		})
	})

/**
 * Appends `chunk` to `accum` without exceeding `max_bytes`.
 */
const append_bounded = (accum: string, chunk: string, max_bytes: number): string => {
	const combined = accum + chunk
	if (combined.length <= max_bytes) {
		return combined
	}
	return combined.slice(0, max_bytes)
}
