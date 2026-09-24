// Runs the solver off the main thread so building tables and searching
// don't freeze the page.
import type { CubieCube } from './cubie';
import { initTables, solve, type SolveOptions } from './solver';

export type SolverRequest =
	{ type: 'init' } | { type: 'solve'; id: number; cube: CubieCube; options?: SolveOptions };
export type SolverResponse = { type: 'ready' } | { type: 'solved'; id: number; moves: number[] };

self.onmessage = (e: MessageEvent<SolverRequest>) => {
	const msg = e.data;
	if (msg.type === 'init') {
		initTables();
		self.postMessage({ type: 'ready' } satisfies SolverResponse);
	} else {
		const moves = solve(msg.cube, msg.options);
		self.postMessage({ type: 'solved', id: msg.id, moves } satisfies SolverResponse);
	}
};
