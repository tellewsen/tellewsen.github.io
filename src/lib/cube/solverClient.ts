// Talks to the solver worker; falls back to solving on the main thread
// where workers aren't available (e.g. tests).
import type { CubieCube } from './cubie';
import type { SolveOptions } from './solver';
import type { SolverRequest, SolverResponse } from './solver.worker';

export interface SolveResult {
	moves: number[];
	/** Which of the given cubes the moves solve. */
	index: number;
}

export interface SolverClient {
	ready: Promise<void>;
	solve(cubes: CubieCube[], options?: SolveOptions, budgetMs?: number): Promise<SolveResult>;
	destroy(): void;
}

export async function createSolverClient(): Promise<SolverClient> {
	if (typeof Worker === 'undefined') {
		return {
			ready: Promise.resolve(),
			async solve(cubes, options, budgetMs) {
				const { solveBest } = await import('./solver');
				return solveBest(cubes, options, budgetMs);
			},
			destroy() {}
		};
	}
	const { default: SolverWorker } = await import('./solver.worker?worker');
	const worker = new SolverWorker();
	const pending = new Map<number, (r: SolveResult) => void>();
	let nextId = 0;
	let markReady: () => void;
	const ready = new Promise<void>((resolve) => (markReady = resolve));
	worker.onmessage = (e: MessageEvent<SolverResponse>) => {
		const msg = e.data;
		if (msg.type === 'ready') markReady();
		else {
			pending.get(msg.id)?.({ moves: msg.moves, index: msg.index });
			pending.delete(msg.id);
		}
	};
	worker.postMessage({ type: 'init' } satisfies SolverRequest);
	return {
		ready,
		solve(cubes, options, budgetMs) {
			const id = nextId++;
			return new Promise((resolve) => {
				pending.set(id, resolve);
				worker.postMessage({ type: 'solve', id, cubes, options, budgetMs } satisfies SolverRequest);
			});
		},
		destroy: () => worker.terminate()
	};
}
