// biome-ignore-all lint: Runtime compatibility adapter accepts both host renderer signatures.

/** CLI-like render hooks for Pi and Oh My Pi. */

import type {
	AgentToolResult,
	Theme,
	ToolRenderResultOptions,
} from '@earendil-works/pi-coding-agent'
import { Text } from '@earendil-works/pi-tui'
import { DESCRIPTORS } from './descriptors'
import { UNSUPPORTED } from './unsupported'

type ToolResult = AgentToolResult<Record<string, unknown>>

type PiRenderContext = {
	args: Record<string, unknown>
	invalidate: () => void
	lastComponent?: Text
}

const format_part = (part: string): string => (part.includes(' ') ? `"${part}"` : part)

/** Renders a CLI-like action preview across Pi and OMP renderer signatures. */
export const render_call = (...all_args: unknown[]): Text => {
	const args = all_args[0] as Record<string, unknown>
	const arg1 = all_args[1] as Record<string, unknown>
	const arg2 = all_args[2] as Record<string, unknown>
	const is_pi = typeof arg1?.fg === 'function'
	const theme = (is_pi ? arg1 : arg2) as unknown as Theme
	const last_component = is_pi
		? (all_args[2] as { lastComponent?: Text } | undefined)?.lastComponent
		: undefined
	const action = typeof args.action === 'string' ? args.action : ''
	const descriptor = DESCRIPTORS[action]
	const text = last_component ?? new Text('', 0, 0)

	if (!descriptor) {
		const label = action.length > 0 ? action : '(unknown)'
		text.setText(theme.fg('dim', `codegraph <unknown: ${label}>`))
		return text
	}

	const parts = descriptor.build_args?.(args) ?? [
		descriptor.cli_command || descriptor.render_label.toLowerCase(),
	]
	const segments = [theme.fg('toolTitle', theme.bold('codegraph'))]
	for (const [index, part] of parts.entries()) {
		const display = format_part(part)
		if (index === 0) {
			segments.push(theme.fg('accent', display))
		} else if (part.startsWith('--') || part.startsWith('-')) {
			segments.push(theme.fg('muted', display))
		} else {
			segments.push(display)
		}
	}
	text.setText(segments.join(' '))
	return text
}

const extract_text = (result: ToolResult): string =>
	result.content.map((content) => ('text' in content ? (content.text ?? '') : '')).join('\n')

/** Renders a tool result across Pi and OMP renderer signatures. */
export const render_result = (...all_args: unknown[]): Text => {
	const result = all_args[0] as ToolResult
	const options = all_args[1] as ToolRenderResultOptions
	const theme = all_args[2] as Theme
	const arg3 = all_args[3] as Record<string, unknown> | undefined
	const is_pi_context = typeof arg3?.invalidate === 'function'
	const context = is_pi_context ? (arg3 as unknown as PiRenderContext) : undefined
	const args = is_pi_context ? (context?.args ?? {}) : (arg3 ?? {})
	const last_component = context?.lastComponent
	const action = typeof args.action === 'string' ? args.action : ''
	const content_text = extract_text(result)
	const text = last_component ?? new Text('', 0, 0)

	if (action.length > 0 && UNSUPPORTED[action] !== undefined) {
		text.setText(
			theme.fg('warning', content_text || `CodeGraph action "${action}" is unsupported.`),
		)
		return text
	}
	if (content_text.startsWith('Unknown codegraph action:')) {
		text.setText(theme.fg('error', content_text))
		return text
	}
	if (
		content_text.includes('not supported through this tool') ||
		content_text.includes('not yet implemented')
	) {
		text.setText(theme.fg('warning', content_text))
		return text
	}
	if (options.expanded) {
		text.setText(content_text)
		return text
	}
	const first_line = content_text.split('\n')[0] ?? content_text
	if (first_line.length === 0) {
		text.setText(theme.fg('dim', '(no output)'))
		return text
	}
	const line_count = content_text.split('\n').length
	text.setText(`${theme.fg('toolOutput', first_line)}${theme.fg('dim', `  [${line_count} lines]`)}`)
	return text
}
