// Coordinates for Kociemba's two-phase algorithm (see solver.ts for credit):
// each squeezes one aspect of a CubieCube into a small integer, so moves and
// distance estimates can be looked up in tables instead of recomputed.
//
// Phase 1 brings the cube into the subgroup H = <U, D, R2, L2, F2, B2>:
//   twist  (0..2186)  corner orientations
//   flip   (0..2047)  edge orientations
//   slice  (0..494)   which 4 slots hold the FR/FL/BL/BR edges
// Phase 2 solves within H, where only permutations are left:
//   cornerPerm (0..40319), udEdgePerm (0..40319), slicePerm (0..23)

import { type CubieCube, solvedCube } from './cubie';

export const N_TWIST = 2187;
export const N_FLIP = 2048;
export const N_SLICE = 495;
export const N_PERM8 = 40320;
export const N_SLICE_PERM = 24;

const FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320];

function binom(n: number, k: number): number {
	if (k < 0 || k > n) return 0;
	let r = 1;
	for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
	return r;
}

// Lehmer-code rank of a permutation of 0..n-1.
function rankPerm(p: number[]): number {
	let r = 0;
	for (let i = 0; i < p.length; i++) {
		let smaller = 0;
		for (let j = i + 1; j < p.length; j++) if (p[j] < p[i]) smaller++;
		r += smaller * FACT[p.length - 1 - i];
	}
	return r;
}

function unrankPerm(r: number, n: number): number[] {
	const pool = Array.from({ length: n }, (_, i) => i);
	const p: number[] = [];
	for (let i = 0; i < n; i++) {
		const f = FACT[n - 1 - i];
		p.push(pool.splice(Math.floor(r / f), 1)[0]);
		r %= f;
	}
	return p;
}

export function getTwist(c: CubieCube): number {
	let t = 0;
	for (let i = 0; i < 7; i++) t = t * 3 + c.co[i];
	return t;
}

export function setTwist(c: CubieCube, t: number): void {
	let sum = 0;
	for (let i = 6; i >= 0; i--) {
		c.co[i] = t % 3;
		sum += c.co[i];
		t = Math.floor(t / 3);
	}
	c.co[7] = (3 - (sum % 3)) % 3;
}

export function getFlip(c: CubieCube): number {
	let t = 0;
	for (let i = 0; i < 11; i++) t = t * 2 + c.eo[i];
	return t;
}

export function setFlip(c: CubieCube, t: number): void {
	let sum = 0;
	for (let i = 10; i >= 0; i--) {
		c.eo[i] = t % 2;
		sum += c.eo[i];
		t = Math.floor(t / 2);
	}
	c.eo[11] = sum % 2;
}

const isSliceEdge = (e: number) => e >= 8;

export function getSlice(c: CubieCube): number {
	let r = 0;
	let k = 0;
	for (let i = 0; i < 12; i++) {
		if (isSliceEdge(c.ep[i])) r += binom(i, ++k);
	}
	return r;
}

export function setSlice(c: CubieCube, r: number): void {
	const slots = new Array(12).fill(false);
	for (let k = 4; k >= 1; k--) {
		let p = k - 1;
		while (binom(p + 1, k) <= r) p++;
		r -= binom(p, k);
		slots[p] = true;
	}
	let slice = 8;
	let other = 0;
	for (let i = 0; i < 12; i++) c.ep[i] = slots[i] ? slice++ : other++;
}

export function getCornerPerm(c: CubieCube): number {
	return rankPerm(c.cp);
}

export function setCornerPerm(c: CubieCube, r: number): void {
	c.cp = unrankPerm(r, 8);
}

/** Only meaningful in phase 2, when edges 0..7 occupy slots 0..7. */
export function getUdEdgePerm(c: CubieCube): number {
	return rankPerm(c.ep.slice(0, 8));
}

export function setUdEdgePerm(c: CubieCube, r: number): void {
	c.ep = [...unrankPerm(r, 8), ...c.ep.slice(8)];
}

/** Only meaningful in phase 2, when edges 8..11 occupy slots 8..11. */
export function getSlicePerm(c: CubieCube): number {
	return rankPerm(c.ep.slice(8).map((e) => e - 8));
}

export function setSlicePerm(c: CubieCube, r: number): void {
	c.ep = [...c.ep.slice(0, 8), ...unrankPerm(r, 4).map((e) => e + 8)];
}

const solved = solvedCube();
export const SOLVED_SLICE = getSlice(solved);

// Center orientation, for supercubes / the Mastermorphix. Phase 1 must also
// make the R/F/L/B centers an even number of quarter turns off (phase 2 can
// only turn those faces by half turns); phase 2 then finishes all centers.
const SIDE_FACES = [1, 2, 4, 5]; // R F L B

export const N_CENTER_PARITY = 16;
export const N_CENTERS2 = 256;

export function getCenterParity(c: CubieCube): number {
	return SIDE_FACES.reduce((v, f, k) => v | ((c.ct[f] & 1) << k), 0);
}

export function setCenterParity(c: CubieCube, v: number): void {
	SIDE_FACES.forEach((f, k) => (c.ct[f] = (v >> k) & 1));
}

/** U and D centers mod 4, R/F/L/B as 0 or a half turn. Only meaningful in phase 2. */
export function getCenters2(c: CubieCube): number {
	return SIDE_FACES.reduce(
		(v, f, k) => v | (((c.ct[f] >> 1) & 1) << (4 + k)),
		c.ct[0] + 4 * c.ct[3]
	);
}

export function setCenters2(c: CubieCube, v: number): void {
	c.ct[0] = v & 3;
	c.ct[3] = (v >> 2) & 3;
	SIDE_FACES.forEach((f, k) => (c.ct[f] = ((v >> (4 + k)) & 1) * 2));
}
