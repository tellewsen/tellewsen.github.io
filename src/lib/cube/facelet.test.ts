import { describe, it, expect } from 'vitest';
import { solvedCube, applyMoves, parseMoves, randomCube } from './cubie';
import {
	type Facelets,
	toFacelets,
	fromFacelets,
	blankFacelets,
	CORNER_FACELETS,
	EDGE_FACELETS
} from './facelet';

function messages(f: Facelets): string[] {
	const r = fromFacelets(f);
	return r.ok ? [] : r.errors.map((e) => e.message);
}

describe('facelets', () => {
	it('solved cube has each face in its own colour', () => {
		const f = toFacelets(solvedCube());
		for (let i = 0; i < 54; i++) expect(f[i]).toBe(Math.floor(i / 9));
	});

	it('round-trips random cubes', () => {
		for (let i = 0; i < 50; i++) {
			const c = randomCube();
			const parsed = fromFacelets(toFacelets(c));
			expect(parsed).toEqual({ ok: true, cube: c });
		}
	});

	it('blank cube keeps only centers painted', () => {
		const f = blankFacelets();
		expect(f.filter((c) => c !== null)).toEqual([0, 1, 2, 3, 4, 5]);
		expect(fromFacelets(f)).toEqual({
			ok: false,
			errors: [{ message: '48 stickers left to paint.', facelets: [] }]
		});
	});

	it('reports wrong colour counts and still pinpoints the bad piece', () => {
		const f = toFacelets(solvedCube());
		f[0] = 1; // U1: the white sticker of the top-back-left corner, painted red
		expect(messages(f)).toEqual([
			'There are 8 white stickers, expected 9.',
			'There are 10 red stickers, expected 9.',
			'The top-back-left corner is red-orange-blue, but no corner has those colours.',
			'Missing corner: white-orange-blue.'
		]);
		const r = fromFacelets(f);
		if (!r.ok) expect(r.errors[2].facelets).toEqual(CORNER_FACELETS[2]);
	});

	it('names every copy of a duplicated piece and the piece it displaced', () => {
		const f = toFacelets(solvedCube());
		// Repaint the top-back-left corner as a second top-front-right corner.
		const cols = CORNER_FACELETS[0].map((i) => f[i]);
		CORNER_FACELETS[2].forEach((i, n) => (f[i] = cols[n]));
		// ...which leaves colour counts off too; only look at the piece errors.
		const pieceErrors = messages(f).filter((m) => !m.startsWith('There are'));
		expect(pieceErrors).toEqual([
			'The white-red-green corner appears 2 times: top-front-right and top-back-left.',
			'Missing corner: white-orange-blue.'
		]);
		const r = fromFacelets(f);
		if (!r.ok) {
			const dup = r.errors.find((e) => e.message.includes('appears'))!;
			expect(dup.facelets).toEqual([...CORNER_FACELETS[0], ...CORNER_FACELETS[2]]);
		}
	});

	it('names edge slots and lists several missing edges', () => {
		const f = toFacelets(solvedCube());
		// Top-right and top-front edges both painted as the top-left edge.
		for (const slot of [0, 1])
			EDGE_FACELETS[slot].forEach((i, n) => (f[i] = f[EDGE_FACELETS[2][n]]));
		const pieceErrors = messages(f).filter((m) => !m.startsWith('There are'));
		expect(pieceErrors).toEqual([
			'The white-orange edge appears 3 times: top-right, top-front and top-left.',
			'Missing edges: white-red and white-green.'
		]);
	});

	it('detects a single twisted corner', () => {
		const f = toFacelets(applyMoves(solvedCube(), parseMoves('R U F')));
		const [a, b, c] = CORNER_FACELETS[0];
		[f[a], f[b], f[c]] = [f[c], f[a], f[b]];
		const r = fromFacelets(f);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors[0].message).toMatch(/twisted/);
	});

	it('detects a single flipped edge', () => {
		const f = toFacelets(solvedCube());
		const [a, b] = EDGE_FACELETS[1];
		[f[a], f[b]] = [f[b], f[a]];
		const r = fromFacelets(f);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors[0].message).toMatch(/flipped/);
	});

	it('detects two swapped edges (parity)', () => {
		const f = toFacelets(solvedCube());
		const [a1, b1] = EDGE_FACELETS[0];
		const [a2, b2] = EDGE_FACELETS[1];
		[f[a1], f[a2]] = [f[a2], f[a1]];
		[f[b1], f[b2]] = [f[b2], f[b1]];
		const r = fromFacelets(f);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors[0].message).toMatch(/swapped/);
	});

	it('detects impossible corner colours', () => {
		const f = toFacelets(solvedCube());
		// White and yellow swapped on one corner: white-red-green -> yellow-red-green
		// and the matching DFR corner gets white; counts stay at 9 each.
		const [u] = CORNER_FACELETS[0];
		const [d] = CORNER_FACELETS[4];
		[f[u], f[d]] = [f[d], f[u]];
		expect(messages(f)).toEqual([
			'The top-front-right corner is yellow-red-green, but no corner has those colours.',
			'The bottom-front-right corner is white-green-red, but no corner has those colours.',
			'Missing corners: white-red-green and yellow-green-red.'
		]);
	});
});
