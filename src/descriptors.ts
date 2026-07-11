/**
 * CodeGraph action descriptor table — single source of truth for
 * every supported action's purpose, parameters, CLI mapping,
 * render label, safety classification, and argument builder.
 *
 * Tasks 2-3 add real `build_args` functions; this task seeds the
 * table with metadata and a null `build_args` sentinel for every
 * non-help action.
 */

/**
 * Describes one action the codegraph tool can execute.
 */
export type ActionDescriptor = {
	/** Action name (the `action` field value). */
	action: string
	/** CodeGraph CLI command, if any. Empty string for plugin-generated actions. */
	cli_command: string
	/** Required parameter names. */
	required: readonly string[]
	/** Optional parameter names. */
	optional: readonly string[]
	/** Human-readable label for rendering. */
	render_label: string
	/**
	 * Safety classification:
	 *   - "safe"   — read-only code intelligence
	 *   - "caution" — index maintenance with potential side-effects
	 */
	safety: 'safe' | 'caution'
	/**
	 * Builds CLI args from action-first parameters.
	 * Null means this action is not yet wired to execution.
	 */
	build_args: ((params: Record<string, unknown>) => readonly string[]) | null
}

/**
 * All supported codegraph actions with their metadata.
 *
 * Non-help actions have `build_args: null` until Tasks 2-3 wire them.
 */
export const DESCRIPTORS: Record<string, ActionDescriptor> = {
	help: {
		action: 'help',
		cli_command: '',
		required: [],
		optional: [],
		render_label: 'Help',
		safety: 'safe',
		build_args: null,
	},
	search: {
		action: 'search',
		cli_command: 'query',
		required: ['query'],
		optional: ['limit', 'kind', 'project_path'],
		render_label: 'Search',
		safety: 'safe',
		build_args: (params) => {
			const args: string[] = ['query']
			if (typeof params.query === 'string' && params.query.length > 0) {
				args.push(params.query)
			}
			if (typeof params.limit === 'number') {
				args.push('--limit', String(params.limit))
			}
			if (typeof params.kind === 'string' && params.kind.length > 0) {
				args.push('--kind', params.kind)
			}
			if (typeof params.project_path === 'string' && params.project_path.length > 0) {
				args.push('--path', params.project_path)
			}
			return args
		},
	},
	explore: {
		action: 'explore',
		cli_command: 'explore',
		required: ['query'],
		optional: ['max_files', 'project_path'],
		render_label: 'Explore',
		safety: 'safe',
		build_args: (params) => {
			const args: string[] = ['explore']
			if (typeof params.query === 'string' && params.query.length > 0) {
				args.push(params.query)
			}
			if (typeof params.max_files === 'number') {
				args.push('--max-files', String(params.max_files))
			}
			if (typeof params.project_path === 'string' && params.project_path.length > 0) {
				args.push('--path', params.project_path)
			}
			return args
		},
	},
	node: {
		action: 'node',
		cli_command: 'node',
		required: [],
		optional: ['symbol', 'file', 'offset', 'limit', 'symbols_only', 'project_path'],
		render_label: 'Node',
		safety: 'safe',
		build_args: (params) => {
			const args: string[] = ['node']
			if (typeof params.file === 'string' && params.file.length > 0) {
				args.push('--file', params.file)
			} else if (typeof params.symbol === 'string' && params.symbol.length > 0) {
				args.push(params.symbol)
			}
			if (typeof params.offset === 'number') {
				args.push('--offset', String(params.offset))
			}
			if (typeof params.limit === 'number') {
				args.push('--limit', String(params.limit))
			}
			if (params.symbols_only === true) {
				args.push('--symbols-only')
			}
			if (typeof params.project_path === 'string' && params.project_path.length > 0) {
				args.push('--path', params.project_path)
			}
			return args
		},
	},
	callers: {
		action: 'callers',
		cli_command: 'callers',
		required: ['symbol'],
		optional: ['limit', 'project_path'],
		render_label: 'Callers',
		safety: 'safe',
		build_args: (params) => {
			const args: string[] = ['callers']
			if (typeof params.symbol === 'string' && params.symbol.length > 0) {
				args.push(params.symbol)
			}
			if (typeof params.limit === 'number') {
				args.push('--limit', String(params.limit))
			}
			if (typeof params.project_path === 'string' && params.project_path.length > 0) {
				args.push('--path', params.project_path)
			}
			return args
		},
	},
	callees: {
		action: 'callees',
		cli_command: 'callees',
		required: ['symbol'],
		optional: ['limit', 'project_path'],
		render_label: 'Callees',
		safety: 'safe',
		build_args: (params) => {
			const args: string[] = ['callees']
			if (typeof params.symbol === 'string' && params.symbol.length > 0) {
				args.push(params.symbol)
			}
			if (typeof params.limit === 'number') {
				args.push('--limit', String(params.limit))
			}
			if (typeof params.project_path === 'string' && params.project_path.length > 0) {
				args.push('--path', params.project_path)
			}
			return args
		},
	},
	files: {
		action: 'files',
		cli_command: 'files',
		required: [],
		optional: ['filter', 'format', 'max_depth', 'project_path', 'pattern', 'no_metadata'],
		render_label: 'Files',
		safety: 'safe',
		build_args: (params) => {
			const args: string[] = ['files']
			if (typeof params.filter === 'string' && params.filter.length > 0) {
				args.push('--filter', params.filter)
			}
			if (typeof params.format === 'string' && params.format.length > 0) {
				args.push('--format', params.format)
			}
			if (typeof params.max_depth === 'number') {
				args.push('--max-depth', String(params.max_depth))
			}
			if (typeof params.pattern === 'string' && params.pattern.length > 0) {
				args.push('--pattern', params.pattern)
			}
			if (params.no_metadata === true) {
				args.push('--no-metadata')
			}
			if (typeof params.project_path === 'string' && params.project_path.length > 0) {
				args.push('--path', params.project_path)
			}
			return args
		},
	},
	status: {
		action: 'status',
		cli_command: 'status',
		required: [],
		optional: ['project_path'],
		render_label: 'Status',
		safety: 'safe',
		build_args: (params) => {
			const args: string[] = ['status']
			if (typeof params.project_path === 'string' && params.project_path.length > 0) {
				args.push(params.project_path)
			}
			return args
		},
	},
	impact: {
		action: 'impact',
		cli_command: 'impact',
		required: ['symbol'],
		optional: ['depth', 'project_path'],
		render_label: 'Impact',
		safety: 'safe',
		build_args: (params) => {
			const args: string[] = ['impact']
			if (typeof params.symbol === 'string' && params.symbol.length > 0) {
				args.push(params.symbol)
			}
			if (typeof params.depth === 'number') {
				args.push('--depth', String(params.depth))
			}
			if (typeof params.project_path === 'string' && params.project_path.length > 0) {
				args.push('--path', params.project_path)
			}
			return args
		},
	},
	affected: {
		action: 'affected',
		cli_command: 'affected',
		required: ['files'],
		optional: ['depth', 'filter', 'project_path', 'quiet'],
		render_label: 'Affected',
		safety: 'safe',
		build_args: (params) => {
			const args: string[] = ['affected']
			const files = Array.isArray(params.files)
				? params.files.filter((f): f is string => typeof f === 'string' && f.length > 0)
				: []
			args.push(...files)
			if (typeof params.depth === 'number') {
				args.push('--depth', String(params.depth))
			}
			if (typeof params.filter === 'string' && params.filter.length > 0) {
				args.push('--filter', params.filter)
			}
			if (typeof params.project_path === 'string' && params.project_path.length > 0) {
				args.push('--path', params.project_path)
			}
			if (params.quiet === true) {
				args.push('--quiet')
			}
			return args
		},
	},
	init: {
		action: 'init',
		cli_command: 'init',
		required: ['project_path'],
		optional: ['force', 'verbose'],
		render_label: 'Init',
		safety: 'caution',
		build_args: (params) => {
			const args: string[] = ['init']
			if (typeof params.project_path === 'string' && params.project_path.length > 0) {
				args.push(params.project_path)
			}
			if (params.force === true) {
				args.push('-f')
			}
			if (params.verbose === true) {
				args.push('-v')
			}
			return args
		},
	},
	index: {
		action: 'index',
		cli_command: 'index',
		required: ['project_path'],
		optional: ['force', 'quiet', 'verbose'],
		render_label: 'Index',
		safety: 'caution',
		build_args: (params) => {
			const args: string[] = ['index']
			if (typeof params.project_path === 'string' && params.project_path.length > 0) {
				args.push(params.project_path)
			}
			if (params.force === true) {
				args.push('-f')
			}
			if (params.quiet === true) {
				args.push('-q')
			}
			if (params.verbose === true) {
				args.push('-v')
			}
			return args
		},
	},
	sync: {
		action: 'sync',
		cli_command: 'sync',
		required: [],
		optional: ['project_path', 'quiet'],
		render_label: 'Sync',
		safety: 'safe',
		build_args: (params) => {
			const args: string[] = ['sync']
			if (typeof params.project_path === 'string' && params.project_path.length > 0) {
				args.push(params.project_path)
			}
			if (params.quiet === true) {
				args.push('-q')
			}
			return args
		},
	},
	unlock: {
		action: 'unlock',
		cli_command: 'unlock',
		required: [],
		optional: ['project_path'],
		render_label: 'Unlock',
		safety: 'caution',
		build_args: (params) => {
			const args: string[] = ['unlock']
			if (typeof params.project_path === 'string' && params.project_path.length > 0) {
				args.push(params.project_path)
			}
			return args
		},
	},
}
