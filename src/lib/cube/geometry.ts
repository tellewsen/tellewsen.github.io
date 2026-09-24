// 3D geometry of the 3x3 mechanism: where each slot sits, and the rigid
// rotation that carries each piece from its home slot to where a
// CubieCube says it is. Coordinates: x = R, y = U, z = F; the core is at
// the origin and slot cells are unit cubes centred on {-1, 0, 1}^3.
//
// Shape mods (e.g. the Mastermorphix) are the same pieces with different
// outer shapes, so rendering them only needs a piece's home shape plus
// the rotation from here.

import { type CubieCube, U, R, F, D, L, B } from './cubie';
import { CORNER_COLORS, EDGE_COLORS } from './facelet';

export type Vec = [number, number, number];
/** Row-major 3x3 matrix. */
export type Mat = [Vec, Vec, Vec];

export const FACE_NORMALS: Vec[] = [];
FACE_NORMALS[U] = [0, 1, 0];
FACE_NORMALS[R] = [1, 0, 0];
FACE_NORMALS[F] = [0, 0, 1];
FACE_NORMALS[D] = [0, -1, 0];
FACE_NORMALS[L] = [-1, 0, 0];
FACE_NORMALS[B] = [0, 0, -1];

export const add = (a: Vec, b: Vec, s = 1): Vec => [
	a[0] + s * b[0],
	a[1] + s * b[1],
	a[2] + s * b[2]
];
export const scale = (a: Vec, s: number): Vec => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec, b: Vec): Vec => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0]
];
export const norm = (a: Vec) => Math.sqrt(dot(a, a));
export const unit = (a: Vec) => scale(a, 1 / norm(a));

export function apply(m: Mat, v: Vec): Vec {
	return [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
}

export function matMul(a: Mat, b: Mat): Mat {
	const col = (j: number): Vec => [b[0][j], b[1][j], b[2][j]];
	return a.map((row) => [dot(row, col(0)), dot(row, col(1)), dot(row, col(2))]) as Mat;
}

export const IDENTITY: Mat = [
	[1, 0, 0],
	[0, 1, 0],
	[0, 0, 1]
];

/** The rotation taking each u[n] to v[n] (both orthonormal, same handedness). */
function basisChange(u: Vec[], v: Vec[]): Mat {
	const m: Mat = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0]
	];
	for (let n = 0; n < 3; n++) {
		for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m[r][c] += v[n][r] * u[n][c];
	}
	return m;
}

/** Quarter turn clockwise as seen looking at the face from outside. */
export function faceTurn(face: number, quarterTurns = 1): Mat {
	const a = FACE_NORMALS[face];
	// Clockwise from outside is -90° about the outward axis.
	const cw = (v: Vec): Vec => add(cross(v, a), a, dot(a, v));
	const cols = [
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, 1]
	].map((e) => {
		let v = e as Vec;
		for (let i = 0; i < ((quarterTurns % 4) + 4) % 4; i++) v = cw(v);
		return v;
	});
	return [0, 1, 2].map((r) => [cols[0][r], cols[1][r], cols[2][r]]) as Mat;
}

// Slots, in one list: corners 0-7, edges 8-19, centers 20-25 (same order as
// the CubieCube arrays and face indices).
export const N_SLOTS = 26;
export const CORNER_SLOT = 0;
export const EDGE_SLOT = 8;
export const CENTER_SLOT = 20;
export type SlotKind = 'corner' | 'edge' | 'center';

export function slotKind(slot: number): SlotKind {
	return slot < EDGE_SLOT ? 'corner' : slot < CENTER_SLOT ? 'edge' : 'center';
}

function slotFaces(slot: number): number[] {
	const kind = slotKind(slot);
	if (kind === 'corner') return CORNER_COLORS[slot];
	if (kind === 'edge') return EDGE_COLORS[slot - EDGE_SLOT];
	return [slot - CENTER_SLOT];
}

/** Cell centre of a slot, e.g. URF -> (1, 1, 1). */
export const SLOT_POSITIONS: Vec[] = Array.from({ length: N_SLOTS }, (_, s) =>
	slotFaces(s).reduce<Vec>((p, f) => add(p, FACE_NORMALS[f]), [0, 0, 0])
);

/**
 * Where the piece in `slot` came from (its home slot) and how it has been
 * rotated. Its current shape is its home shape transformed by `rotation`
 * (about the core, so no translation is needed).
 */
export function pieceAt(cube: CubieCube, slot: number): { home: number; rotation: Mat } {
	const kind = slotKind(slot);
	if (kind === 'center') {
		const f = slot - CENTER_SLOT;
		return { home: slot, rotation: faceTurn(f, cube.ct[f]) };
	}
	const isCorner = kind === 'corner';
	const i = isCorner ? slot : slot - EDGE_SLOT;
	const j = isCorner ? cube.cp[i] : cube.ep[i];
	const o = isCorner ? cube.co[i] : cube.eo[i];
	const colors = isCorner ? CORNER_COLORS : EDGE_COLORS;
	const n = colors[0].length;
	// Sticker k of piece j ends up on facelet (k + o) % n of slot i.
	const u = colors[j].map((f) => FACE_NORMALS[f]);
	const v = colors[i].map((_, k) => FACE_NORMALS[colors[i][(k + o) % n]]);
	if (n === 2) {
		u.push(cross(u[0], u[1]));
		v.push(cross(v[0], v[1]));
	}
	return { home: isCorner ? j : j + EDGE_SLOT, rotation: basisChange(u, v) };
}
