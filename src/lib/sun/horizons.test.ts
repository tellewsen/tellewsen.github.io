import { describe, it, expect } from 'vitest';
import { sunPosition, wrap180, DEG } from './sun';
import fixture from './horizons.fixture.json';

// Checks the model against JPL Horizons (airless apparent positions) for
// four sites through 2026, plus Oslo in 1960 and 2045. Measured worst cases
// when the fixture was fetched: declination 0.009°, altitude 0.011°, hour
// angle 0.010° (2.4 s of time). The low-precision formulas leave out
// nutation and aberration, which accounts for most of that.
const TOL = 0.015;

const groups = Map.groupBy(fixture.rows, (r) => `${r.site} ${r.utc.slice(0, 4)}`);

describe('agreement with JPL Horizons', () => {
	for (const [name, rows] of groups) {
		it(`${name}: ${rows.length} dates within ${TOL}°`, () => {
			for (const r of rows) {
				const p = sunPosition(new Date(r.utc), r);
				const at = `${r.site} ${r.utc}`;
				expect(Math.abs(p.delta - r.dec), `declination at ${at}`).toBeLessThan(TOL);
				expect(Math.abs(wrap180(p.H - r.hourAngle)), `hour angle at ${at}`).toBeLessThan(TOL);
				expect(Math.abs(p.altitude - r.elevation), `altitude at ${at}`).toBeLessThan(TOL);
				// Azimuth error grows as 1/cos(altitude) towards the zenith.
				const azTol = TOL / Math.cos(r.elevation * DEG);
				expect(Math.abs(wrap180(p.azimuth - r.azimuth)), `azimuth at ${at}`).toBeLessThan(azTol);
			}
		});
	}
});
