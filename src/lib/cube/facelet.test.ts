import { describe, it, expect } from 'vitest';
import { solvedCube, applyMoves, parseMoves, randomCube } from './cubie';
import { toFacelets, fromFacelets, blankFacelets, CORNER_FACELETS, EDGE_FACELETS } from './facelet';

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
		expect(fromFacelets(f)).toEqual({ ok: false, errors: ['48 stickers left to paint.'] });
	});

	it('reports wrong colour counts', () => {
		const f = toFacelets(solvedCube());
		f[0] = 1;
		const r = fromFacelets(f);
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.errors).toContain('There are 8 white stickers, expected 9.');
			expect(r.errors).toContain('There are 10 red stickers, expected 9.');
		}
	});

	it('detects a single twisted corner', () => {
		const f = toFacelets(applyMoves(solvedCube(), parseMoves('R U F')));
		const [a, b, c] = CORNER_FACELETS[0];
		[f[a], f[b], f[c]] = [f[c], f[a], f[b]];
		const r = fromFacelets(f);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors[0]).toMatch(/twisted/);
	});

	it('detects a single flipped edge', () => {
		const f = toFacelets(solvedCube());
		const [a, b] = EDGE_FACELETS[1];
		[f[a], f[b]] = [f[b], f[a]];
		const r = fromFacelets(f);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors[0]).toMatch(/flipped/);
	});

	it('detects two swapped edges (parity)', () => {
		const f = toFacelets(solvedCube());
		const [a1, b1] = EDGE_FACELETS[0];
		const [a2, b2] = EDGE_FACELETS[1];
		[f[a1], f[a2]] = [f[a2], f[a1]];
		[f[b1], f[b2]] = [f[b2], f[b1]];
		const r = fromFacelets(f);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors[0]).toMatch(/swapped/);
	});

	it('detects impossible corner colours', () => {
		const f = toFacelets(solvedCube());
		// White and yellow swapped on one corner: white-red-green -> yellow-red-green
		// and the matching DFR corner gets white; counts stay at 9 each.
		const [u] = CORNER_FACELETS[0];
		const [d] = CORNER_FACELETS[4];
		[f[u], f[d]] = [f[d], f[u]];
		const r = fromFacelets(f);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors[0]).toMatch(/No corner has the colours yellow-red-green/);
	});
});
