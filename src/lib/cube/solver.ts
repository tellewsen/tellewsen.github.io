// Kociemba's two-phase algorithm.
//
// Phase 1 searches for a move sequence that reaches the subgroup
// H = <U, D, R2, L2, F2, B2>; phase 2 then solves the cube using only moves
// from H. Each phase is an IDA* search guided by pruning tables (exact
// distances in a simplified problem, which never overestimate). After the
// first solution the search keeps trying longer phase 1 sequences, since
// they often allow a much shorter phase 2, until the time budget runs out
// or the solution is short enough.
//
// Solves the 3x3 only (centers are ignored); supercube / Mastermorphix
// center orientation is meant to be handled as a separate stage on top.

import { type CubieCube, MOVE_CUBES, applyMove, multiply, solvedCube, cloneCube } from './cubie';
import {
	N_TWIST,
	N_FLIP,
	N_SLICE,
	N_PERM8,
	N_SLICE_PERM,
	SOLVED_SLICE,
	getTwist,
	setTwist,
	getFlip,
	setFlip,
	getSlice,
	setSlice,
	getCornerPerm,
	setCornerPerm,
	getUdEdgePerm,
	setUdEdgePerm,
	getSlicePerm,
	setSlicePerm
} from './coord';

const N_MOVES = 18;
// Moves that stay inside H: U U2 U' D D2 D' R2 L2 F2 B2
export const PHASE2_MOVES = [0, 1, 2, 9, 10, 11, 4, 13, 7, 16];
const N_MOVES2 = PHASE2_MOVES.length;

interface Tables {
	twistMove: Uint16Array;
	flipMove: Uint16Array;
	sliceMove: Uint16Array;
	cornerMove: Uint16Array; // phase 2 moves only
	udEdgeMove: Uint16Array; // phase 2 moves only
	slicePermMove: Uint16Array; // phase 2 moves only
	sliceTwistPrune: Int8Array;
	sliceFlipPrune: Int8Array;
	sliceCornerPrune: Int8Array;
	sliceEdgePrune: Int8Array;
}

function moveTable(
	n: number,
	moves: number[],
	set: (c: CubieCube, v: number) => void,
	get: (c: CubieCube) => number
): Uint16Array {
	const table = new Uint16Array(n * moves.length);
	for (let v = 0; v < n; v++) {
		const c = solvedCube();
		set(c, v);
		for (let j = 0; j < moves.length; j++) {
			table[v * moves.length + j] = get(multiply(c, MOVE_CUBES[moves[j]]));
		}
	}
	return table;
}

/**
 * Breadth-first distances over the product of two coordinates, from the
 * solved value of both. Entry a * nB + b.
 */
function pruneTable(
	nA: number,
	moveA: Uint16Array,
	nB: number,
	moveB: Uint16Array,
	nMoves: number,
	startA: number
): Int8Array {
	const table = new Int8Array(nA * nB).fill(-1);
	table[startA * nB] = 0;
	let filled = 1;
	for (let depth = 0; filled < table.length; depth++) {
		let added = 0;
		for (let i = 0; i < table.length; i++) {
			if (table[i] !== depth) continue;
			const a = Math.floor(i / nB);
			const b = i % nB;
			for (let m = 0; m < nMoves; m++) {
				const j = moveA[a * nMoves + m] * nB + moveB[b * nMoves + m];
				if (table[j] === -1) {
					table[j] = depth + 1;
					added++;
				}
			}
		}
		if (added === 0) break;
		filled += added;
	}
	return table;
}

let tables: Tables | null = null;

const ALL_MOVES = Array.from({ length: N_MOVES }, (_, i) => i);

/** Build lookup tables (about a second); called lazily by solve(). */
export function initTables(): void {
	if (tables) return;
	const twistMove = moveTable(N_TWIST, ALL_MOVES, setTwist, getTwist);
	const flipMove = moveTable(N_FLIP, ALL_MOVES, setFlip, getFlip);
	const sliceMove = moveTable(N_SLICE, ALL_MOVES, setSlice, getSlice);
	const cornerMove = moveTable(N_PERM8, PHASE2_MOVES, setCornerPerm, getCornerPerm);
	const udEdgeMove = moveTable(N_PERM8, PHASE2_MOVES, setUdEdgePerm, getUdEdgePerm);
	const slicePermMove = moveTable(N_SLICE_PERM, PHASE2_MOVES, setSlicePerm, getSlicePerm);
	tables = {
		twistMove,
		flipMove,
		sliceMove,
		cornerMove,
		udEdgeMove,
		slicePermMove,
		sliceTwistPrune: pruneTable(N_SLICE, sliceMove, N_TWIST, twistMove, N_MOVES, SOLVED_SLICE),
		sliceFlipPrune: pruneTable(N_SLICE, sliceMove, N_FLIP, flipMove, N_MOVES, SOLVED_SLICE),
		sliceCornerPrune: pruneTable(N_SLICE_PERM, slicePermMove, N_PERM8, cornerMove, N_MOVES2, 0),
		sliceEdgePrune: pruneTable(N_SLICE_PERM, slicePermMove, N_PERM8, udEdgeMove, N_MOVES2, 0)
	};
}

export interface SolveOptions {
	/** Stop once a solution this short is found (default 20). */
	targetLength?: number;
	/** Keep improving for at most this long once a solution exists. */
	timeoutMs?: number;
}

const face = (m: number) => Math.floor(m / 3);

// Skip moves that are redundant after `prev`: the same face again, or the
// opposite face in the "wrong" order (D U is the same as U D).
function allowedAfter(prev: number, m: number): boolean {
	if (prev < 0) return true;
	const fp = face(prev);
	const fm = face(m);
	return fp !== fm && fp !== fm + 3;
}

/**
 * Find a move sequence (as move indices) that solves `cube`. Returns [] for
 * an already solved cube. The cube must be valid (see fromFacelets).
 */
export function solve(cube: CubieCube, options: SolveOptions = {}): number[] {
	initTables();
	const t = tables!;
	const targetLength = options.targetLength ?? 20;
	const timeoutMs = options.timeoutMs ?? 1000;
	const start = performance.now();

	// Assigned inside the nested searches; the cast stops TS narrowing it to null.
	let best = null as number[] | null;
	const path1: number[] = [];
	const path2: number[] = [];
	let nodes = 0;
	let stop = false;

	const checkTime = () => {
		if (best && performance.now() - start > timeoutMs) stop = true;
	};

	const h1 = (slice: number, twist: number, flip: number) =>
		Math.max(t.sliceTwistPrune[slice * N_TWIST + twist], t.sliceFlipPrune[slice * N_FLIP + flip]);
	const h2 = (sp: number, cp: number, ep: number) =>
		Math.max(t.sliceCornerPrune[sp * N_PERM8 + cp], t.sliceEdgePrune[sp * N_PERM8 + ep]);

	function search2(cp: number, ep: number, sp: number, depth: number, prev: number): boolean {
		if (depth === 0) return cp === 0 && ep === 0 && sp === 0;
		if (h2(sp, cp, ep) > depth) return false;
		for (let j = 0; j < N_MOVES2; j++) {
			const m = PHASE2_MOVES[j];
			if (!allowedAfter(prev, m)) continue;
			path2.push(m);
			if (
				search2(
					t.cornerMove[cp * N_MOVES2 + j],
					t.udEdgeMove[ep * N_MOVES2 + j],
					t.slicePermMove[sp * N_MOVES2 + j],
					depth - 1,
					m
				)
			) {
				return true;
			}
			path2.pop();
		}
		return false;
	}

	function startPhase2(): void {
		let c = cloneCube(cube);
		for (const m of path1) c = applyMove(c, m);
		const cp = getCornerPerm(c);
		const ep = getUdEdgePerm(c);
		const sp = getSlicePerm(c);
		const maxLen = Math.min((best ? best.length - 1 : 30) - path1.length, 18);
		const prev = path1.length ? path1[path1.length - 1] : -1;
		for (let depth = h2(sp, cp, ep); depth <= maxLen; depth++) {
			path2.length = 0;
			if (search2(cp, ep, sp, depth, prev)) {
				best = [...path1, ...path2];
				return;
			}
		}
	}

	function search1(slice: number, twist: number, flip: number, depth: number, prev: number): void {
		if (stop) return;
		if (depth === 0) {
			// A phase 1 ending in a phase 2 move would already have reached H
			// one move earlier, so only accept quarter turns of R/F/L/B.
			const prevFace = face(prev);
			const endsInH = prev >= 0 && (prevFace === 0 || prevFace === 3 || prev % 3 === 1);
			if (h1(slice, twist, flip) === 0 && !endsInH) startPhase2();
			if ((++nodes & 0xff) === 0) checkTime();
			return;
		}
		if (h1(slice, twist, flip) > depth) return;
		for (let m = 0; m < N_MOVES; m++) {
			if (!allowedAfter(prev, m)) continue;
			path1.push(m);
			search1(
				t.sliceMove[slice * N_MOVES + m],
				t.twistMove[twist * N_MOVES + m],
				t.flipMove[flip * N_MOVES + m],
				depth - 1,
				m
			);
			path1.pop();
			if (stop) return;
			if ((++nodes & 0xfff) === 0) checkTime();
		}
	}

	const slice = getSlice(cube);
	const twist = getTwist(cube);
	const flip = getFlip(cube);
	// "Short enough" is only checked between phase 1 depths: other phase 1
	// sequences of the same length may still give a shorter total.
	for (let depth = 0; depth <= 20 && !stop; depth++) {
		if (best && (depth >= best.length || best.length <= targetLength)) break;
		search1(slice, twist, flip, depth, -1);
	}
	return best ?? [];
}
