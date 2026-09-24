// Runs the solver off the main thread so building tables and searching
// don't freeze the page.
import type { CubieCube } from './cubie';
import { initTables, solveBest, type SolveOptions } from './solver';

export type SolverRequest =
	| { type: 'init' }
	| { type: 'solve'; id: number; cubes: CubieCube[]; options?: SolveOptions; budgetMs?: number };
export type SolverResponse =
	{ type: 'ready' } | { type: 'solved'; id: number; moves: number[]; index: number };

self.onmessage = (e: MessageEvent<SolverRequest>) => {
	const msg = e.data;
	if (msg.type === 'init') {
		initTables();
		self.postMessage({ type: 'ready' } satisfies SolverResponse);
	} else {
		const { moves, index } = solveBest(msg.cubes, msg.options, msg.budgetMs);
		self.postMessage({ type: 'solved', id: msg.id, moves, index } satisfies SolverResponse);
	}
};
