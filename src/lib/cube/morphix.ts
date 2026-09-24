// The Mastermorphix: a 3x3 mechanism with a tetrahedral outer shape.
//
// Each piece is its 3x3 cell (bounded only by the internal cut planes at
// ±0.5) clipped by the four planes of a tetrahedron. Everything else is
// derived from that geometry:
//   - 4 corners are tips (3 colours), 4 sit in the middle of a tetrahedron
//     face ("triangles", 1 colour, twist invisible),
//   - the 12 edges have 1 colour each, so edges of the same colour are
//     interchangeable (their flip is still visible from the shape),
//   - the 6 centers straddle a tetrahedron edge (2 colours), so their
//     orientation is fully visible — as on a supercube.
// A position "looks solved" when every slot shows the same coloured
// surfaces as in the solved puzzle, which is weaker than the underlying
// 3x3 being solved.

import { type CubieCube, cloneCube, permutationParity, CORNER_NAMES, EDGE_NAMES } from './cubie';
import {
	type Vec,
	type Mat,
	N_SLOTS,
	EDGE_SLOT,
	CENTER_SLOT,
	SLOT_POSITIONS,
	slotKind,
	pieceAt,
	apply,
	add,
	scale,
	dot,
	cross,
	unit,
	norm
} from './geometry';
import { slotName } from './facelet';

/** Outward normals of the tetrahedron's faces; index = colour. */
export const TETRA_NORMALS: Vec[] = [
	[-1, -1, -1],
	[-1, 1, 1],
	[1, -1, 1],
	[1, 1, -1]
];
// Tetrahedron faces are the planes n·p = TETRA_SIZE. Between 1.5 and 2.5
// every piece reaches the surface and each edge shows exactly one colour.
const TETRA_SIZE = 2.25;

export interface Polygon {
	vertices: Vec[]; // counter-clockwise seen from outside
	normal: Vec; // unit, outward
	color: number | null; // tetrahedron face, or null for a cut surface
}

interface HalfSpace {
	n: Vec; // n·p <= d
	d: number;
	color: number | null;
}

function solve3(a: Vec[], b: number[]): Vec | null {
	const det = dot(a[0], cross(a[1], a[2]));
	if (Math.abs(det) < 1e-9) return null;
	// Cramer's rule via the adjugate.
	const c0 = cross(a[1], a[2]);
	const c1 = cross(a[2], a[0]);
	const c2 = cross(a[0], a[1]);
	return scale(add(add(scale(c0, b[0]), c1, b[1]), c2, b[2]), 1 / det);
}

/** Faces of the bounded convex polyhedron {p : n·p <= d for all}. */
function convexPolyhedron(spaces: HalfSpace[]): Polygon[] {
	const eps = 1e-7;
	const inside = (p: Vec) => spaces.every((h) => dot(h.n, p) <= h.d + eps);
	const vertices: Vec[] = [];
	for (let i = 0; i < spaces.length; i++) {
		for (let j = i + 1; j < spaces.length; j++) {
			for (let k = j + 1; k < spaces.length; k++) {
				const p = solve3(
					[spaces[i].n, spaces[j].n, spaces[k].n],
					[spaces[i].d, spaces[j].d, spaces[k].d]
				);
				if (p && inside(p) && !vertices.some((q) => norm(add(p, q, -1)) < 1e-6)) vertices.push(p);
			}
		}
	}
	const polygons: Polygon[] = [];
	for (const h of spaces) {
		const on = vertices.filter((p) => Math.abs(dot(h.n, p) - h.d) < 1e-6);
		if (on.length < 3) continue;
		const normal = unit(h.n);
		const c = scale(
			on.reduce<Vec>((s, p) => add(s, p), [0, 0, 0]),
			1 / on.length
		);
		const e1 = unit(add(on[0], c, -1));
		const e2 = cross(normal, e1);
		const angle = (p: Vec) => {
			const d = add(p, c, -1);
			return Math.atan2(dot(d, e2), dot(d, e1));
		};
		polygons.push({ vertices: on.sort((p, q) => angle(p) - angle(q)), normal, color: h.color });
	}
	return polygons;
}

function homeShape(slot: number): Polygon[] {
	const pos = SLOT_POSITIONS[slot];
	const spaces: HalfSpace[] = [];
	for (let a = 0; a < 3; a++) {
		const e: Vec = [0, 0, 0];
		e[a] = 1;
		// Only the internal cuts bound a piece; the outside is the tetrahedron.
		if (pos[a] >= 0) spaces.push({ n: scale(e, -1), d: pos[a] === 0 ? 0.5 : -0.5, color: null });
		if (pos[a] <= 0) spaces.push({ n: e, d: pos[a] === 0 ? 0.5 : -0.5, color: null });
	}
	TETRA_NORMALS.forEach((n, color) => spaces.push({ n, d: TETRA_SIZE, color }));
	return convexPolyhedron(spaces);
}

/** Each piece's shape in its home slot. */
export const PIECE_SHAPES: Polygon[][] = Array.from({ length: N_SLOTS }, (_, s) => homeShape(s));

/** Tetrahedron colours shown by a piece (by home slot), in index order. */
export function pieceColors(home: number): number[] {
	return PIECE_SHAPES[home]
		.flatMap((p) => (p.color === null ? [] : [p.color]))
		.sort((a, b) => a - b);
}

export type PieceKind = 'tip' | 'triangle' | 'edge' | 'center';

export function pieceKind(home: number): PieceKind {
	const kind = slotKind(home);
	if (kind === 'corner') return pieceColors(home).length === 3 ? 'tip' : 'triangle';
	return kind;
}

export function pieceName(home: number, colorNames: string[]): string {
	return `${pieceColors(home)
		.map((c) => colorNames[c])
		.join('-')} ${pieceKind(home)}`;
}

/** The colour group of an edge piece (edges within a group look identical). */
export function edgeGroup(edge: number): number {
	return pieceColors(edge + EDGE_SLOT)[0];
}

/** Edge pieces (0..11) of each colour. */
export const EDGE_GROUPS: number[][] = [0, 1, 2, 3].map((g) =>
	Array.from({ length: 12 }, (_, e) => e).filter((e) => edgeGroup(e) === g)
);

/** The polygons of the piece in `slot`, where they are in `cube`. */
export function piecePolygons(
	cube: CubieCube,
	slot: number
): { home: number; polygons: Polygon[] } {
	const { home, rotation } = pieceAt(cube, slot);
	return { home, polygons: PIECE_SHAPES[home].map((p) => rotatePolygon(p, rotation)) };
}

function rotatePolygon(p: Polygon, m: Mat): Polygon {
	return {
		vertices: p.vertices.map((v) => apply(m, v)),
		normal: apply(m, p.normal),
		color: p.color
	};
}

const round = (x: number) => Math.round(x * 1e4) / 1e4;
const pointKey = (v: Vec) => v.map(round).join(',');

/** What a slot looks like from outside: its coloured surfaces. */
export function slotLook(cube: CubieCube, slot: number): string {
	return piecePolygons(cube, slot)
		.polygons.filter((p) => p.color !== null)
		.map((p) => `${p.color}:${p.vertices.map(pointKey).sort().join(' ')}`)
		.sort()
		.join('|');
}

const SOLVED_LOOKS = (() => {
	const solved: CubieCube = {
		cp: [0, 1, 2, 3, 4, 5, 6, 7],
		co: [0, 0, 0, 0, 0, 0, 0, 0],
		ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
		eo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		ct: [0, 0, 0, 0, 0, 0]
	};
	return Array.from({ length: N_SLOTS }, (_, s) => slotLook(solved, s));
})();

export function looksSolved(cube: CubieCube): boolean {
	return SOLVED_LOOKS.every((look, s) => slotLook(cube, s) === look);
}

export function looksSame(a: CubieCube, b: CubieCube): boolean {
	return Array.from({ length: N_SLOTS }, (_, s) => s).every(
		(s) => slotLook(a, s) === slotLook(b, s)
	);
}

// --- Editing, for entering a position piece by piece ---------------------

export function setCorner(cube: CubieCube, slot: number, piece: number): CubieCube {
	const c = cloneCube(cube);
	c.cp[slot] = piece;
	return c;
}

export function twistCorner(cube: CubieCube, slot: number): CubieCube {
	const c = cloneCube(cube);
	c.co[slot] = (c.co[slot] + 1) % 3;
	return c;
}

export function setEdgeColor(cube: CubieCube, slot: number, group: number): CubieCube {
	const c = cloneCube(cube);
	c.ep[slot - EDGE_SLOT] = EDGE_GROUPS[group][0];
	return c;
}

export function flipEdge(cube: CubieCube, slot: number): CubieCube {
	const c = cloneCube(cube);
	c.eo[slot - EDGE_SLOT] ^= 1;
	return c;
}

export function turnCenter(cube: CubieCube, slot: number): CubieCube {
	const c = cloneCube(cube);
	const f = slot - CENTER_SLOT;
	c.ct[f] = (c.ct[f] + 1) % 4;
	return c;
}

// --- Checking an entered position ----------------------------------------

export interface MorphixError {
	message: string;
	slots: number[];
}

export type MorphixCheck =
	{ ok: true; candidates: CubieCube[] } | { ok: false; errors: MorphixError[] };

/** Where a slot is, e.g. "top-front-right", holding the puzzle as shown. */
export function slotLabel(slot: number): string {
	const kind = slotKind(slot);
	if (kind === 'corner') return slotName(CORNER_NAMES[slot]);
	if (kind === 'edge') return slotName(EDGE_NAMES[slot - EDGE_SLOT]);
	return slotName('URFDLB'[slot - CENTER_SLOT]);
}

const list = (items: string[]) =>
	items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

function permutations<T>(items: T[]): T[][] {
	if (items.length <= 1) return [items];
	return items.flatMap((x, i) =>
		permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [x, ...rest])
	);
}

/**
 * Check an entered position and turn it into concrete 3x3 states that look
 * exactly like it. Pieces that look alike can be told apart arbitrarily and
 * invisible triangle twists chosen freely, as long as the result is a
 * reachable 3x3 state; every such choice is a valid starting point for the
 * solver, and different choices can give shorter solutions.
 */
export function checkMorphix(
	input: CubieCube,
	colorNames: string[],
	maxCandidates = 4,
	rand: () => number = Math.random
): MorphixCheck {
	const errors: MorphixError[] = [];
	const name = (home: number) => pieceName(home, colorNames);

	for (let j = 0; j < 8; j++) {
		const slots = input.cp.flatMap((p, i) => (p === j ? [i] : []));
		if (slots.length > 1) {
			errors.push({
				message: `The ${name(j)} appears ${slots.length} times: ${list(slots.map(slotLabel))}.`,
				slots
			});
		}
	}
	const missingCorners = [0, 1, 2, 3, 4, 5, 6, 7].filter((j) => !input.cp.includes(j));
	if (missingCorners.length) {
		errors.push({
			message: `Missing: ${list(missingCorners.map((j) => `the ${name(j)}`))}.`,
			slots: []
		});
	}
	EDGE_GROUPS.forEach((_, g) => {
		const slots = input.ep.flatMap((p, i) => (edgeGroup(p) === g ? [i + EDGE_SLOT] : []));
		if (slots.length !== 3) {
			errors.push({
				message: `There are ${slots.length} ${colorNames[g]} edges, expected 3.`,
				slots: slots.length > 3 ? slots : []
			});
		}
	});
	if (errors.length) return { ok: false, errors };

	// Every quarter turn turns one center and makes an odd corner permutation.
	const centerTurns = input.ct.reduce((s, v) => s + v, 0);
	if ((centerTurns + permutationParity(input.cp)) % 2) {
		return {
			ok: false,
			errors: [
				{
					message:
						'This position cannot be reached by turning: a center is probably a quarter turn off, or two corner pieces are swapped.',
					slots: []
				}
			]
		};
	}

	// Edges: for each colour, every way to assign that colour's three pieces
	// to its three slots, each flipped to match what was entered.
	const perGroup = EDGE_GROUPS.map((members, g) => {
		const slots = input.ep.flatMap((p, i) => (edgeGroup(p) === g ? [i] : []));
		return permutations(members).map((perm) =>
			slots.map((i, k) => {
				const target = slotLook(input, i + EDGE_SLOT);
				const trial = cloneCube(input);
				trial.ep[i] = perm[k];
				trial.eo[i] = 0;
				if (slotLook(trial, i + EDGE_SLOT) !== target) trial.eo[i] = 1;
				return { slot: i, piece: perm[k], flip: trial.eo[i] };
			})
		);
	});
	const edgeChoices: { ep: number[]; eo: number[] }[] = [];
	const pick = (g: number, ep: number[], eo: number[]) => {
		if (g === perGroup.length) {
			if (
				permutationParity(ep) === permutationParity(input.cp) &&
				eo.reduce((s, v) => s + v, 0) % 2 === 0
			) {
				edgeChoices.push({ ep: [...ep], eo: [...eo] });
			}
			return;
		}
		for (const option of perGroup[g]) {
			for (const { slot, piece, flip } of option) {
				ep[slot] = piece;
				eo[slot] = flip;
			}
			pick(g + 1, ep, eo);
		}
	};
	pick(0, [...input.ep], [...input.eo]);
	if (!edgeChoices.length) {
		return {
			ok: false,
			errors: [
				{
					message:
						'One edge is flipped — this position cannot be reached by turning. Check which way the edges are tilted.',
					slots: []
				}
			]
		};
	}

	// Triangles' twists are invisible: pick any that make the total valid.
	const triangleSlots = input.cp.flatMap((p, i) => (pieceKind(p) === 'triangle' ? [i] : []));
	const tipTwist = input.cp.reduce((s, p, i) => (pieceKind(p) === 'tip' ? s + input.co[i] : s), 0);
	const twistChoices: number[][] = [];
	for (let v = 0; v < 27; v++) {
		const t = [v % 3, Math.floor(v / 3) % 3, Math.floor(v / 9)];
		t.push((6 - ((tipTwist + t[0] + t[1] + t[2]) % 3)) % 3);
		twistChoices.push(t);
	}

	const candidate = (e: number, t: number): CubieCube => {
		const c = cloneCube(input);
		c.ep = [...edgeChoices[e].ep];
		c.eo = [...edgeChoices[e].eo];
		triangleSlots.forEach((i, k) => (c.co[i] = twistChoices[t][k]));
		return c;
	};
	// Start with the choice closest to what was entered, then random others.
	const candidates = [candidate(0, 0)];
	const seen = new Set(['0,0']);
	const total = edgeChoices.length * twistChoices.length;
	while (candidates.length < Math.min(maxCandidates, total)) {
		const e = Math.floor(rand() * edgeChoices.length);
		const t = Math.floor(rand() * twistChoices.length);
		if (seen.has(`${e},${t}`)) continue;
		seen.add(`${e},${t}`);
		candidates.push(candidate(e, t));
	}
	return { ok: true, candidates };
}
