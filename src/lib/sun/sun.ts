// Position of the sun in the sky from a two-body Kepler orbit plus Earth's
// axial tilt. Every step here is written out on the /utils/sun page; the
// numbered comments match the numbered sections there.
//
// Accuracy for the real Earth is ~0.01° in direction and a few seconds in
// the equation of time over 1950–2050, which is far below what the plots
// can show. Ignored: nutation, aberration, the Moon's pull, refraction
// (except in day length).

export const DEG = Math.PI / 180;
const DAY_MS = 86_400_000;
const J2000 = Date.UTC(2000, 0, 1, 12);
export const TROPICAL_YEAR = 365.2422;

export interface Orbit {
	/** Axial tilt ε, degrees. */
	obliquity: number;
	/** Orbital eccentricity e. */
	eccentricity: number;
}

export const EARTH: Orbit = { obliquity: 23.4393, eccentricity: 0.016709 };

/** Days (fractional) since J2000.0 = 2000-01-01 12:00 UT. */
export function daysSinceJ2000(date: Date): number {
	return (date.getTime() - J2000) / DAY_MS;
}

function wrap360(deg: number): number {
	return ((deg % 360) + 360) % 360;
}

/** Wraps to (−180, 180]. */
export function wrap180(deg: number): number {
	const d = wrap360(deg);
	return d > 180 ? d - 360 : d;
}

/** §2 Solve Kepler's equation E − e·sin E = M for E (radians). */
export function eccentricAnomaly(M: number, e: number): number {
	let E = M + e * Math.sin(M);
	for (let i = 0; i < 8; i++) {
		const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
		E -= dE;
		if (Math.abs(dE) < 1e-12) break;
	}
	return E;
}

/** §2 True anomaly ν (radians) from the mean anomaly M. */
export function trueAnomaly(M: number, e: number): number {
	const E = eccentricAnomaly(M, e);
	return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
}

export interface SunState {
	/** Mean anomaly M, degrees. */
	M: number;
	/** Mean longitude L = ϖ + M, degrees: where a uniformly moving sun would be. */
	L: number;
	/** Ecliptic longitude λ = ϖ + ν, degrees. */
	lambda: number;
	/** Right ascension α, degrees [0, 360). */
	alpha: number;
	/** Declination δ, degrees. */
	delta: number;
	/** Equation of time (apparent − mean solar time), minutes. */
	eot: number;
	/** Part of the equation of time caused by the eccentricity, L − λ, minutes. */
	eotEccentricity: number;
	/** Part of the equation of time caused by the tilt, λ − α, minutes. */
	eotObliquity: number;
}

/** §1–§4 The sun's place on the celestial sphere, n days after J2000. */
export function sunState(n: number, orbit: Orbit = EARTH): SunState {
	const e = orbit.eccentricity;
	const eps = orbit.obliquity * DEG;
	// §1 Mean anomaly and longitude of perihelion (both J2000, per day).
	const M = wrap360(357.5291 + 0.98560028 * n);
	const perihelion = 282.9404 + 4.70935e-5 * n;
	const L = wrap360(perihelion + M);
	// §2 Kepler: where the sun actually is along the ecliptic.
	const lambda = wrap360(perihelion + trueAnomaly(M * DEG, e) / DEG);
	// §3 Rotate from ecliptic to equatorial coordinates (tilt ε about the x axis).
	const l = lambda * DEG;
	const alpha = wrap360(Math.atan2(Math.cos(eps) * Math.sin(l), Math.cos(l)) / DEG);
	const delta = Math.asin(Math.sin(eps) * Math.sin(l)) / DEG;
	// §4 Equation of time: 1° of hour angle is 4 minutes.
	const eotEccentricity = wrap180(L - lambda) * 4;
	const eotObliquity = wrap180(lambda - alpha) * 4;
	return {
		M,
		L,
		lambda,
		alpha,
		delta,
		eot: wrap180(L - alpha) * 4,
		eotEccentricity,
		eotObliquity
	};
}

/**
 * §4 Local hour angle of the sun, degrees in (−180, 180]: 0 at local solar
 * noon, positive in the afternoon. `utHours` is UT since midnight of the
 * day that n falls on.
 */
export function hourAngle(utHours: number, longitude: number, eotMinutes: number): number {
	return wrap180(15 * (utHours - 12) + longitude + eotMinutes / 4);
}

/** Unit vector in the observer's frame: x = east, y = north, z = up. */
export type Vec3 = [number, number, number];

/** §5 Rotate (hour angle, declination) into the horizon frame at latitude φ. */
export function toHorizon(H: number, delta: number, latitude: number): Vec3 {
	const h = H * DEG;
	const d = delta * DEG;
	const p = latitude * DEG;
	return [
		-Math.cos(d) * Math.sin(h),
		Math.cos(p) * Math.sin(d) - Math.sin(p) * Math.cos(d) * Math.cos(h),
		Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(h)
	];
}

/** Altitude above the horizon and azimuth (0 = north, 90 = east), degrees. */
export function altAz(v: Vec3): { altitude: number; azimuth: number } {
	return {
		altitude: Math.asin(Math.max(-1, Math.min(1, v[2]))) / DEG,
		azimuth: wrap360(Math.atan2(v[0], v[1]) / DEG)
	};
}

export interface Observer {
	latitude: number;
	longitude: number;
}

export interface SunPosition extends SunState {
	H: number;
	vec: Vec3;
	altitude: number;
	azimuth: number;
}

/** Where the sun is in the sky for an observer at an instant. */
export function sunPosition(date: Date, obs: Observer, orbit: Orbit = EARTH): SunPosition {
	const n = daysSinceJ2000(date);
	const s = sunState(n, orbit);
	const ut = (((date.getTime() % DAY_MS) + DAY_MS) % DAY_MS) / 3_600_000;
	const H = hourAngle(ut, obs.longitude, s.eot);
	const vec = toHorizon(H, s.delta, obs.latitude);
	return { ...s, H, vec, ...altAz(vec) };
}

/** Standard altitude of the sun's centre at rise/set: refraction + radius. */
export const RISE_ALTITUDE = -0.833;

/**
 * §6 Day length in hours from cos H₀ = (sin h₀ − sin φ sin δ) / (cos φ cos δ).
 * 24 under the midnight sun, 0 in polar night.
 */
export function dayLength(latitude: number, delta: number): number {
	const p = latitude * DEG;
	const d = delta * DEG;
	const c =
		(Math.sin(RISE_ALTITUDE * DEG) - Math.sin(p) * Math.sin(d)) / (Math.cos(p) * Math.cos(d));
	if (c <= -1) return 24;
	if (c >= 1) return 0;
	return (2 * Math.acos(c)) / DEG / 15;
}
