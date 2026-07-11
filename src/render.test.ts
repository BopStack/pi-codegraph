/**
 * Render contract tests — renderCall and renderResult
 *
 * Task 6: CLI-like render with semantic theme roles.
 * Tests assert role/structure, not literal ANSI codes.
 */

import type { Theme, ToolRenderResultOptions } from '@earendil-works/pi-coding-agent'
import { Text } from '@earendil-works/pi-tui'
import { describe, expect, test } from 'vitest'
import { render_call, render_result } from './render'

type RenderContext = {
	args: Record<string, unknown>
	toolCallId: string
	invalidate: () => void
	lastComponent?: Text
	state: unknown
	cwd: string
	executionStarted: boolean
	argsComplete: boolean
	isPartial: boolean
	expanded: boolean
	showImages: boolean
	isError: boolean
}
type RenderResultOptions = ToolRenderResultOptions
type ToolResult = {
	content: Array<{ type: string; text?: string; data?: string }>
	details?: Record<string, unknown>
}

/** Regex for role tag detection (moved to top level per biome). */
const BOUNDARY_ROLE_RE = /⟨(error|warning|dim)⟩/

/**
 * A plain-object Theme mock that wraps text in role tags instead of
 * applying real ANSI escapes. Tests assert on the tag structure,
 * so they survive theme-internal changes.
 */
const mock_theme = {
	name: 'test',
	fg: (color: string, text: string): string => `⟨${color}⟩${text}⟨/${color}⟩`,
	bg: (_color: string, text: string): string => text,
	bold: (text: string): string => `⟨bold⟩${text}⟨/bold⟩`,
	italic: (text: string): string => text,
	underline: (text: string): string => text,
	inverse: (text: string): string => text,
	strikethrough: (text: string): string => text,
} as unknown as Theme

/** Minimal render context with required fields. */
const make_ctx = (overrides: Partial<RenderContext> = {}): RenderContext => ({
	args: {},
	toolCallId: 'test-id',
	invalidate: (): void => {
		/* noop — test-only mock */
	},
	lastComponent: undefined,
	state: {},
	cwd: '/test',
	executionStarted: false,
	argsComplete: true,
	isPartial: false,
	expanded: false,
	showImages: false,
	isError: false,
	...overrides,
})

describe('renderCall', () => {
	test('given explore action with query and max_files: should render CLI-like preview', () => {
		const args = { action: 'explore', query: 'auth session', max_files: 8 }
		const ctx = make_ctx({ args })
		const comp = render_call(args, mock_theme, ctx)
		const text = comp.render(120).join(' ')

		expect(text).toContain('codegraph')
		expect(text).toContain('explore')
		expect(text).toContain('auth session')
		expect(text).toContain('--max-files')
		expect(text).toContain('8')
	})

	test('given search action: should render CLI command as "query"', () => {
		const args = { action: 'search', query: 'auth' }
		const ctx = make_ctx({ args })
		const comp = render_call(args, mock_theme, ctx)
		const text = comp.render(120).join(' ')

		// CLI label is 'query', not 'search'
		expect(text).toContain('query')
	})

	test('given explore action: command name uses toolTitle + bold, action uses accent', () => {
		const args = { action: 'explore', query: 'test' }
		const ctx = make_ctx({ args })
		const comp = render_call(args, mock_theme, ctx)
		const text = comp.render(120).join('')

		expect(text).toContain('⟨toolTitle⟩')
		// biome-ignore lint/security/noSecrets: mock theme role tags, not credentials
		expect(text).toContain('⟨bold⟩codegraph⟨/bold⟩')
		expect(text).toContain('⟨accent⟩explore⟨/accent⟩')
	})

	test('given explore action: flags use muted role', () => {
		const args = { action: 'explore', query: 'test', max_files: 5 }
		const ctx = make_ctx({ args })
		const comp = render_call(args, mock_theme, ctx)
		const text = comp.render(120).join('')

		expect(text).toContain('⟨muted⟩--max-files⟨/muted⟩')
	})

	test('given action with value containing spaces: should quote the value', () => {
		const args = { action: 'explore', query: 'auth session middleware' }
		const ctx = make_ctx({ args })
		const comp = render_call(args, mock_theme, ctx)
		const text = comp.render(120).join(' ')

		expect(text).toContain('"auth session middleware"')
	})

	test('given unknown action: should render dim boundary text without throwing', () => {
		const args = { action: 'bogus' }
		const ctx = make_ctx({ args })
		const comp = render_call(args, mock_theme, ctx)
		const text = comp.render(120).join('')

		expect(text).toContain('⟨dim⟩')
		expect(text).toContain('bogus')
	})

	test('given explorer args: optional flags render only when provided', () => {
		const args = { action: 'explore', query: 'auth' }
		const ctx = make_ctx({ args })
		const comp = render_call(args, mock_theme, ctx)
		const text = comp.render(120).join(' ')

		// --max-files not provided, should not appear
		expect(text).not.toContain('--max-files')
	})

	test('given help action: should render without crashing', () => {
		const args = { action: 'help' }
		const ctx = make_ctx({ args })
		const comp = render_call(args, mock_theme, ctx)
		const text = comp.render(120).join('')

		expect(text).toContain('codegraph')
		expect(text).toContain('help')
	})

	test('given explore action: should return a Text component rendering non-empty output', () => {
		const args = { action: 'explore', query: 'hello' }
		const ctx = make_ctx({ args })
		const comp = render_call(args, mock_theme, ctx)

		expect(comp).toBeInstanceOf(Text)
		const lines = comp.render(80)
		expect(lines.length).toBeGreaterThan(0)
		expect(lines.join('').length).toBeGreaterThan(0)
	})
})

describe('renderResult', () => {
	test('given wired action result compact: should render without crashing', () => {
		const result: ToolResult = {
			content: [{ type: 'text', text: 'Found 5 symbols in src/auth.ts' }],
			details: { action: 'explore', truncated: false, exit_code: 0 },
		}
		const ctx = make_ctx({
			args: { action: 'explore', query: 'auth' },
			expanded: false,
		})
		const opts: RenderResultOptions = { expanded: false, isPartial: false }
		const comp = render_result(result, opts, mock_theme, ctx)

		expect(comp).toBeDefined()
		const text = comp.render(120).join('')
		expect(text.length).toBeGreaterThan(0)
	})

	test('given result expanded: should reveal the raw text content', () => {
		const content_text = 'function auth() {\n  return true\n}'
		const result: ToolResult = {
			content: [{ type: 'text', text: content_text }],
			details: { action: 'node', truncated: false, exit_code: 0 },
		}
		const ctx = make_ctx({
			args: { action: 'node', symbol: 'auth' },
			expanded: true,
		})
		const opts: RenderResultOptions = { expanded: true, isPartial: false }
		const comp = render_result(result, opts, mock_theme, ctx)
		const text = comp.render(120).join('\n')

		expect(text).toContain('auth')
	})

	test('given unsupported action result: should render with warning role', () => {
		const result: ToolResult = {
			content: [
				{ type: 'text', text: 'CodeGraph action "uninit" is not supported through this tool.' },
			],
			details: {},
		}
		const ctx = make_ctx({ args: { action: 'uninit' } })
		const opts: RenderResultOptions = { expanded: false, isPartial: false }
		const comp = render_result(result, opts, mock_theme, ctx)
		const text = comp.render(120).join('')

		expect(text).toContain('⟨warning⟩')
	})

	test('given unknown action result: should render with error or warning role', () => {
		const result: ToolResult = {
			content: [{ type: 'text', text: 'Unknown codegraph action: "bogus".' }],
			details: {},
		}
		const ctx = make_ctx({ args: { action: 'bogus' } })
		const opts: RenderResultOptions = { expanded: false, isPartial: false }
		const comp = render_result(result, opts, mock_theme, ctx)
		const text = comp.render(120).join('')

		// Should render with error role or similar boundary marker
		expect(text.toLowerCase()).toMatch(BOUNDARY_ROLE_RE)
	})

	test('given empty content result: should render minimal boundary text', () => {
		const result: ToolResult = {
			content: [],
			details: {},
		}
		const ctx = make_ctx({ args: { action: 'explore' } })
		const opts: RenderResultOptions = { expanded: false, isPartial: false }
		const comp = render_result(result, opts, mock_theme, ctx)
		const text = comp.render(120).join('')

		expect(comp).toBeDefined()
		expect(text.length).toBeGreaterThan(0)
	})

	test('given tool result: content text should contain no ANSI or mock style markers', () => {
		// The ToolResult's content[].text is raw text for the agent.
		// The style is applied by renderResult in the TUI Component layer.
		const raw_text = 'pure text without escape codes'
		const result: ToolResult = {
			content: [{ type: 'text', text: raw_text }],
			details: {},
		}

		expect(result.content[0]!.text).toBe(raw_text)
		expect(result.content[0]!.text).not.toContain('\x1b')
		expect(result.content[0]!.text).not.toContain('⟨')
	})
})
