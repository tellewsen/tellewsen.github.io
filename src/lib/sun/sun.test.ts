import { describe, it, expect } from 'vitest';
import {
	EARTH,
	daysSinceJ2000,
	sunState,
	sunPosition,
	eccentricAnomaly,
	trueAnomaly,
	toHorizon,
	altAz,
	dayLength
} from './sun';

const oslo = { latitude: 59.91, longitude: 10.75 };

describe('Kepler', () => {
	it('solves E − e sin E = M', () => {
		for (const e of [0, 0.0167, 0.3, 0.9]) {
			for (const M of [0.1, 1, 2, 3, 4, 6]) {
				const E = eccentricAnomaly(M, e);
				expect(E - e * Math.sin(E)).toBeCloseTo(M, 10);
			}
		}
	});

	it('matches the series ν ≈ M + 2e sin M + 5/4 e² sin 2M for small e', () => {
		const e = 0.0167;
		for (const M of [0.5, 1.5, 2.5, 4]) {
			const series = M + 2 * e * Math.sin(M) + 1.25 * e * e * Math.sin(2 * M);
			expect(trueAnomaly(M, e)).toBeCloseTo(series, 4); // next term is O(e³)
		}
	});
});

describe('sunState', () => {
	it('has the sun at its northern limit at the June solstice', () => {
		const s = sunState(daysSinceJ2000(new Date('2026-06-21T08:24Z')));
		expect(s.delta).toBeCloseTo(23.44, 1);
		expect(s.lambda).toBeCloseTo(90, 1);
	});

	it('crosses the equator at the March equinox', () => {
		const s = sunState(daysSinceJ2000(new Date('2026-03-20T14:46Z')));
		expect(Math.abs(s.delta)).toBeLessThan(0.02);
	});

	it('reproduces the equation of time extremes', () => {
		// Almanac values: about −14.2 min on 11 Feb, +16.4 min on 3 Nov.
		expect(sunState(daysSinceJ2000(new Date('2026-02-11T12:00Z'))).eot).toBeCloseTo(-14.2, 0);
		expect(sunState(daysSinceJ2000(new Date('2026-11-03T12:00Z'))).eot).toBeCloseTo(16.4, 0);
	});

	it('splits the equation of time into eccentricity and tilt parts', () => {
		for (const day of [10, 80, 150, 220, 300]) {
			const s = sunState(daysSinceJ2000(new Date(Date.UTC(2026, 0, day))));
			expect(s.eotEccentricity + s.eotObliquity).toBeCloseTo(s.eot, 6);
		}
	});

	it('has no equation of time and no declination without tilt or eccentricity', () => {
		const s = sunState(1234.5, { obliquity: 0, eccentricity: 0 });
		expect(s.delta).toBeCloseTo(0, 10);
		expect(s.eot).toBeCloseTo(0, 10);
	});

	it('keeps only the half-year tilt term in the equation of time with a circular orbit', () => {
		const s = sunState(daysSinceJ2000(new Date('2026-05-05T12:00Z')), {
			...EARTH,
			eccentricity: 0
		});
		const y = Math.tan((EARTH.obliquity * Math.PI) / 360) ** 2;
		const l = (s.lambda * Math.PI) / 180;
		const series = ((y * Math.sin(2 * l) - 0.5 * y * y * Math.sin(4 * l)) * 180 * 4) / Math.PI;
		expect(s.eotEccentricity).toBeCloseTo(0, 10);
		expect(s.eot).toBeCloseTo(series, 1); // next term is y³/3 sin 6λ
	});
});

describe('horizon frame', () => {
	it('puts a body on the celestial pole at altitude = latitude, due north', () => {
		const { altitude, azimuth } = altAz(toHorizon(37, 90, 59.91));
		expect(altitude).toBeCloseTo(59.91, 8);
		expect(azimuth).toBeCloseTo(0, 6);
	});

	it('rises in the east and sets in the west', () => {
		expect(altAz(toHorizon(-90, 0, 45)).azimuth).toBeCloseTo(90, 8);
		expect(altAz(toHorizon(90, 0, 45)).azimuth).toBeCloseTo(270, 8);
	});

	it('gives the noon altitude 90° − φ + δ at the June solstice in Oslo', () => {
		// Solar noon in Oslo ≈ 12:00 − 10.75°·4 min − EoT(≈ −1.7 min) UT.
		const p = sunPosition(new Date('2026-06-21T11:19Z'), oslo);
		expect(p.altitude).toBeCloseTo(90 - 59.91 + 23.44, 1);
		expect(p.azimuth).toBeCloseTo(180, 0);
	});
});

describe('dayLength', () => {
	it('is about 12 h at the equinox', () => {
		expect(dayLength(59.91, 0)).toBeGreaterThan(12);
		expect(dayLength(59.91, 0)).toBeLessThan(12.3);
	});

	it('is 18 h 50 min on midsummer in Oslo', () => {
		expect(dayLength(59.91, 23.44)).toBeCloseTo(18.83, 1);
	});

	it('handles midnight sun and polar night', () => {
		expect(dayLength(78, 20)).toBe(24);
		expect(dayLength(78, -20)).toBe(0);
	});
});
