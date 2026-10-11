<script lang="ts">
	import 'katex/dist/katex.min.css';
	import {
		EARTH,
		daysSinceJ2000,
		dayLength,
		hourAngle,
		sunPosition,
		sunState,
		toHorizon,
		type Orbit,
		type Vec3
	} from '#lib/sun/sun.ts';
	import SkyDome from '#lib/sun/SkyDome.svelte';
	import YearChart from '#lib/sun/YearChart.svelte';
	import AnalemmaChart from '#lib/sun/AnalemmaChart.svelte';
	import Derivation from '#lib/sun/Derivation.svelte';

	const COLORS = { helix: '#3987e5', day: '#d95926', analemma: '#199e70' };

	const PLACES = [
		{ name: 'Oslo', latitude: 59.91, longitude: 10.75, tz: 1 },
		{ name: 'Tromsø', latitude: 69.65, longitude: 18.96, tz: 1 },
		{ name: 'Greenwich', latitude: 51.48, longitude: 0, tz: 0 },
		{ name: 'Quito (equator)', latitude: -0.18, longitude: -78.47, tz: -5 },
		{ name: 'Sydney', latitude: -33.87, longitude: 151.21, tz: 10 },
		{ name: 'North Pole', latitude: 90, longitude: 0, tz: 0 }
	];

	let latitude = 59.91;
	let longitude = 10.75;
	/** Clock offset from UT, hours (standard time; no daylight saving). */
	let tz = 1;
	let year = new Date().getUTCFullYear();
	let day = Math.floor((Date.now() - Date.UTC(year, 0, 1)) / 86_400_000);
	/** Clock time, minutes after local midnight. */
	let minutes = 12 * 60;
	let obliquity = EARTH.obliquity;
	let eccentricity = EARTH.eccentricity;
	let showHelix = true;
	let showDay = true;
	let showAnalemma = true;

	$: daysInYear = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000;
	$: if (day > daysInYear - 1) day = daysInYear - 1;
	/** Turns of the year helix; equal to the number of days for the real sky. */
	let turns = 365;
	$: if (turns > daysInYear) turns = daysInYear;

	$: lat = clamp(Number(latitude) || 0, -90, 90);
	$: lon = clamp(Number(longitude) || 0, -180, 180);
	$: obs = { latitude: lat, longitude: lon };
	$: orbit = { obliquity: Number(obliquity), eccentricity: Number(eccentricity) } as Orbit;

	function clamp(v: number, lo: number, hi: number) {
		return Math.max(lo, Math.min(hi, v));
	}

	/** UT instant for a day of the year and a local clock time. */
	function instant(d: number, min: number): Date {
		return new Date(Date.UTC(year, 0, 1 + d) + (min - tz * 60) * 60_000);
	}

	function pickPlace(p: (typeof PLACES)[number]) {
		latitude = p.latitude;
		longitude = p.longitude;
		tz = p.tz;
	}

	function resetOrbit() {
		obliquity = EARTH.obliquity;
		eccentricity = EARTH.eccentricity;
	}

	// The year as a helix: the orbit advances over the year while the sky
	// spins `turns` times. With turns = days in the year this is the real sky.
	$: helix = ((): Vec3[] => {
		const steps = turns * 72;
		const n0 = daysSinceJ2000(instant(0, 0));
		const pts: Vec3[] = [];
		for (let k = 0; k <= steps; k++) {
			const s = k / steps;
			const st = sunState(n0 + s * daysInYear, orbit);
			const clock = (s * turns * 24) % 24;
			pts.push(toHorizon(hourAngle(clock - tz, lon, st.eot), st.delta, lat));
		}
		return pts;
	})();

	$: dayPath = Array.from(
		{ length: 145 },
		(_, k) => sunPosition(instant(day, k * 10), obs, orbit).vec
	);
	$: yearAtClock = Array.from({ length: daysInYear }, (_, d) =>
		sunPosition(instant(d, minutes), obs, orbit)
	);
	$: analemma = yearAtClock.map((p) => p.vec);
	$: now = sunPosition(instant(day, minutes), obs, orbit);
	$: length = dayLength(lat, now.delta);
	$: solarNoon = 12 * 60 + tz * 60 - lon * 4 - now.eot;

	$: delta = yearAtClock.map((p) => p.delta);
	$: eotSeries = [
		{ name: 'Equation of time', color: COLORS.helix, values: yearAtClock.map((p) => p.eot) },
		{
			name: 'Eccentricity part (L − λ)',
			color: COLORS.day,
			values: yearAtClock.map((p) => p.eotEccentricity),
			minor: true
		},
		{
			name: 'Tilt part (λ − α)',
			color: COLORS.analemma,
			values: yearAtClock.map((p) => p.eotObliquity),
			minor: true
		}
	];

	function hhmm(min: number): string {
		const m = ((Math.round(min) % 1440) + 1440) % 1440;
		return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
	}

	function mmss(min: number): string {
		const s = Math.round(Math.abs(min) * 60);
		return `${min < 0 ? '−' : '+'}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
	}

	function hoursMinutes(h: number): string {
		const m = Math.round(h * 60);
		return `${Math.floor(m / 60)} h ${m % 60} min`;
	}

	$: dateText = instant(day, 0).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC'
	});
	$: tzText = `UTC${tz >= 0 ? '+' : '−'}${Math.abs(tz)}`;
</script>

<svelte:head>
	<title>Sun path — ellewsen.no</title>
</svelte:head>

<section class="sun">
	<div class="section-label">// utils / sun</div>

	<p class="intro">
		The path of the sun across your sky through a day and a year. Each day the sun moves along a
		circle, and over a year those circles join into a helix that winds up and down between the
		tropics. If you look at the same clock time every day you get a figure-8, the analemma. The full
		derivation is below the charts. Drag the dome to turn it.
	</p>

	<div class="card controls">
		<div class="places">
			{#each PLACES as p (p.name)}
				<button
					type="button"
					class="chip"
					class:on={lat === p.latitude && lon === p.longitude}
					on:click={() => pickPlace(p)}>{p.name}</button
				>
			{/each}
		</div>
		<div class="fields">
			<label>
				<span>Latitude °</span>
				<input type="number" min="-90" max="90" step="0.01" bind:value={latitude} />
			</label>
			<label>
				<span>Longitude °E</span>
				<input type="number" min="-180" max="180" step="0.01" bind:value={longitude} />
			</label>
			<label>
				<span>Clock UTC±h</span>
				<input type="number" min="-12" max="14" step="0.5" bind:value={tz} />
			</label>
			<label>
				<span>Year</span>
				<input type="number" min="1950" max="2100" step="1" bind:value={year} />
			</label>
		</div>
		<label class="slider">
			<span>Date <b>{dateText}</b></span>
			<input type="range" min="0" max={daysInYear - 1} step="1" bind:value={day} />
		</label>
		<label class="slider">
			<span>Clock time <b>{hhmm(minutes)}</b> {tzText}</span>
			<input type="range" min="0" max="1435" step="5" bind:value={minutes} />
		</label>
	</div>

	<div class="card dome-card">
		<div class="toggles">
			<label class="toggle"
				><input type="checkbox" bind:checked={showDay} /><span
					class="swatch"
					style:background={COLORS.day}
				></span>This day</label
			>
			<label class="toggle"
				><input type="checkbox" bind:checked={showHelix} /><span
					class="swatch"
					style:background={COLORS.helix}
				></span>Whole year (helix)</label
			>
			<label class="toggle"
				><input type="checkbox" bind:checked={showAnalemma} /><span
					class="swatch"
					style:background={COLORS.analemma}
				></span>Analemma at {hhmm(minutes)}</label
			>
			<span class="toggle"><span class="sun-dot"></span>Sun now</span>
			<span class="toggle"
				><span class="swatch" style:background="#6e7681"></span>Celestial equator</span
			>
		</div>
		<SkyDome
			latitude={lat}
			helix={showHelix ? helix : []}
			dayPath={showDay ? dayPath : []}
			analemma={showAnalemma ? analemma : []}
			analemmaIndex={day}
			sun={now.vec}
		/>
		<p class="hint">
			Faint lines are below the horizon or on the far side of the dome. The grey axis through you
			points at the celestial pole, and every daily circle is centred on it.
		</p>
	</div>

	<div class="stats">
		<div class="card stat">
			<div class="stat-label">Altitude</div>
			<div class="stat-value">{now.altitude.toFixed(1)}°</div>
		</div>
		<div class="card stat">
			<div class="stat-label">Azimuth</div>
			<div class="stat-value">{now.azimuth.toFixed(1)}°</div>
		</div>
		<div class="card stat">
			<div class="stat-label">Declination <span class="sym">δ</span></div>
			<div class="stat-value">{now.delta.toFixed(2)}°</div>
		</div>
		<div class="card stat">
			<div class="stat-label">Equation of time</div>
			<div class="stat-value">{mmss(now.eot)}</div>
		</div>
		<div class="card stat">
			<div class="stat-label">Solar noon</div>
			<div class="stat-value">{hhmm(solarNoon)}</div>
		</div>
		<div class="card stat">
			<div class="stat-label">Day length</div>
			<div class="stat-value">
				{length === 24 ? 'midnight sun' : length === 0 ? 'polar night' : hoursMinutes(length)}
			</div>
		</div>
	</div>

	<div class="card what-if">
		<div class="what-if-head">
			<span>What if? Change the orbit</span>
			<button type="button" on:click={resetOrbit}>Reset to Earth</button>
		</div>
		<label class="slider">
			<span>Axial tilt ε <b>{Number(obliquity).toFixed(2)}°</b></span>
			<input type="range" min="0" max="45" step="0.01" bind:value={obliquity} />
		</label>
		<label class="slider">
			<span>Eccentricity e <b>{Number(eccentricity).toFixed(4)}</b></span>
			<input type="range" min="0" max="0.2" step="0.0001" bind:value={eccentricity} />
		</label>
		<label class="slider">
			<span
				>Helix turns per year <b>{turns}</b>
				{turns === daysInYear ? '(real: one per day)' : '(spaced out to show the spiral)'}</span
			>
			<input type="range" min="4" max={daysInYear} step="1" bind:value={turns} />
		</label>
	</div>

	<div class="card">
		<YearChart
			series={[{ name: 'Declination', color: COLORS.helix, values: delta }]}
			{year}
			selected={day}
			label="Declination δ (°): sin δ = sin ε sin λ"
			format={(v) => `${v.toFixed(2)}°`}
			on:pick={(e) => (day = e.detail)}
		/>
	</div>
	<div class="card" id="eot-chart">
		<YearChart
			series={eotSeries}
			{year}
			selected={day}
			label="Equation of time (min): sundial ahead of clock"
			format={mmss}
			on:pick={(e) => (day = e.detail)}
		/>
	</div>
	<div class="card">
		<AnalemmaChart
			eot={eotSeries[0].values}
			{delta}
			{year}
			selected={day}
			color={COLORS.analemma}
			on:pick={(e) => (day = e.detail)}
		/>
	</div>

	<div class="card">
		<Derivation />
	</div>
</section>

<style>
	.sun {
		padding: 56px 0;
	}
	.intro {
		color: var(--muted);
		font-size: 13px;
		max-width: 680px;
	}
	.card {
		margin-bottom: 16px;
	}
	.places {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 14px;
	}
	.chip {
		background: transparent;
	}
	.chip.on {
		border-color: var(--accent);
		color: var(--accent);
	}
	.fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
		gap: 10px;
		margin-bottom: 14px;
	}
	.fields label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 11px;
		color: var(--muted);
	}
	.fields input {
		width: 100%;
	}
	.slider {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 12px;
		color: var(--muted);
		margin-bottom: 10px;
	}
	.slider b {
		color: var(--bright);
		font-weight: 600;
	}
	.slider input {
		padding: 0;
		accent-color: var(--accent);
	}
	.toggles {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 18px;
		font-size: 12px;
		margin-bottom: 8px;
	}
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--text);
	}
	.toggle input {
		accent-color: var(--accent);
	}
	.swatch {
		display: inline-block;
		width: 12px;
		height: 3px;
		border-radius: 2px;
	}
	.sun-dot {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #f2cc60;
	}
	.hint {
		font-size: 11px;
		color: var(--muted);
		margin: 8px 0 0;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 10px;
		margin-bottom: 16px;
	}
	.stats .card {
		margin: 0;
		padding: 12px 14px;
	}
	.stat-label {
		font-size: 10px;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	/* Uppercasing would turn δ into Δ. */
	.sym {
		text-transform: none;
	}
	.stat-value {
		font-size: 16px;
		color: var(--bright);
		font-variant-numeric: tabular-nums;
	}
	.what-if-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		font-size: 13px;
		color: var(--bright);
		margin-bottom: 10px;
	}
</style>
