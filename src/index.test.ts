/**
 * CodeGraph Extension Tests — Single Tool Contract
 */

import type { ExtensionAPI, ToolDefinition } from '@earendil-works/pi-coding-agent'
import { describe, expect, test } from 'vitest'
import { DESCRIPTORS } from './descriptors'
import registerCodegraphExtension from './index'

type RegisteredCommand = {
	name: string
	options: Record<string, unknown>
}

const create_mock_pi = (): {
	pi: ExtensionAPI
	registered_tools: Map<string, ToolDefinition>
	registered_commands: RegisteredCommand[]
} => {
	const registered_tools = new Map<string, ToolDefinition>()
	const registered_commands: RegisteredCommand[] = []

	const pi = {
		on(_event: string, _handler: unknown): void {
			/* captured guidance handler tests are added below */
		},
		registerTool(def: ToolDefinition): void {
			registered_tools.set(def.name, def)
		},
		registerCommand(name: string, options: Record<string, unknown>): void {
			registered_commands.push({ name, options })
		},
	} as ExtensionAPI

	return { pi, registered_tools, registered_commands }
}

describe('codegraph tool registration contract', () => {
	test('given codegraph extension: should register exactly one tool named codegraph', () => {
		const { pi, registered_tools } = create_mock_pi()

		registerCodegraphExtension(pi)

		expect(registered_tools.size).toBe(1)
		expect(registered_tools.has('codegraph')).toBe(true)
	})

	test('given codegraph extension: should not register legacy tool names', () => {
		const { pi, registered_tools } = create_mock_pi()
		const legacy_names = [
			'codegraph_search',
			'codegraph_context',
			'codegraph_files',
			'codegraph_status',
		]

		registerCodegraphExtension(pi)

		for (const name of legacy_names) {
			expect(registered_tools.has(name)).toBe(false)
		}
	})

	test('given codegraph extension: should not register /codegraph command', () => {
		const { pi, registered_commands } = create_mock_pi()

		registerCodegraphExtension(pi)

		const codegraph_commands = registered_commands.filter((c) => c.name === 'codegraph')
		expect(codegraph_commands).toHaveLength(0)
	})

	test('given codegraph tool: should have promptSnippet naming codegraph', () => {
		const { pi, registered_tools } = create_mock_pi()

		registerCodegraphExtension(pi)

		const tool = registered_tools.get('codegraph')
		expect(tool).toBeDefined()
		expect(tool!.promptSnippet).toBeDefined()
		expect(tool!.promptSnippet).toContain('codegraph')
	})

	test('given codegraph tool: should have promptGuidelines naming codegraph and every supported action', () => {
		const { pi, registered_tools } = create_mock_pi()

		registerCodegraphExtension(pi)

		const tool = registered_tools.get('codegraph')
		expect(tool).toBeDefined()
		expect(tool!.promptGuidelines).toBeDefined()
		expect(tool!.promptGuidelines!.length).toBeGreaterThan(5)

		const joined = tool!.promptGuidelines!.join('\n')
		expect(joined).toContain('codegraph')

		// Every supported action must be named at least once.
		const supported = Object.keys(DESCRIPTORS)
		for (const action of supported) {
			expect(joined).toContain(action)
		}
	})
})

describe('codegraph tool action routing', () => {
	test('given action help: should return text listing supported actions and unsupported boundary', async () => {
		const { pi, registered_tools } = create_mock_pi()

		registerCodegraphExtension(pi)

		const tool = registered_tools.get('codegraph')
		expect(tool).toBeDefined()

		const result = await tool!.execute(
			'test_id',
			{ action: 'help' },
			undefined,
			undefined,
			undefined as unknown as never,
		)
		const text = (result.content as Array<{ type: string; text: string }>)
			.map((c) => c.text)
			.join('\n')

		expect(text).toContain('action')
		expect(text).toContain('help')
		expect(text).toContain('search')
		expect(text).toContain('explore')
		expect(text).toContain('node')
		expect(text).toContain('callers')
		expect(text).toContain('callees')
		expect(text).toContain('files')
		expect(text).toContain('status')
		expect(text).toContain('impact')
		expect(text).toContain('affected')
		expect(text).toContain('init')
		expect(text).toContain('index')
		expect(text).toContain('sync')
		expect(text).toContain('unlock')
	})

	test('given unknown action: should return boundary text without throwing', async () => {
		const { pi, registered_tools } = create_mock_pi()

		registerCodegraphExtension(pi)

		const tool = registered_tools.get('codegraph')
		expect(tool).toBeDefined()

		const result = await tool!.execute(
			'test_id',
			{ action: 'nonexistent_action' },
			undefined,
			undefined,
			undefined as unknown as never,
		)
		const text = (result.content as Array<{ type: string; text: string }>)
			.map((c) => c.text)
			.join('\n')

		expect(text).toContain('help')
		expect(text.length).toBeGreaterThan(0)
	})

	test('given action omitted: should return boundary text without throwing', async () => {
		const { pi, registered_tools } = create_mock_pi()

		registerCodegraphExtension(pi)

		const tool = registered_tools.get('codegraph')
		expect(tool).toBeDefined()

		const result = await tool!.execute(
			'test_id',
			{} as Record<string, unknown>,
			undefined,
			undefined,
			undefined as unknown as never,
		)
		const text = (result.content as Array<{ type: string; text: string }>)
			.map((c) => c.text)
			.join('\n')

		expect(text).toContain('help')
		expect(text.length).toBeGreaterThan(0)
	})

	test('given action init with force and root path: should return guard text without executing', async () => {
		const { pi, registered_tools } = create_mock_pi()

		registerCodegraphExtension(pi)

		const tool = registered_tools.get('codegraph')
		expect(tool).toBeDefined()

		// Force-init of root is blocked by the safety guard (never executes real CLI)
		const result = await tool!.execute(
			'test_id',
			{ action: 'init', project_path: '/', force: true },
			undefined,
			undefined,
			undefined as unknown as never,
		)
		const text = (result.content as Array<{ type: string; text: string }>)
			.map((c) => c.text)
			.join('\n')

		expect(text).toContain('force')
		expect(text).not.toContain('not yet implemented')
	})
})
