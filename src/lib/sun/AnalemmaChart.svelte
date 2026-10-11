<script lang="ts">
	// The analemma in its own coordinates: equation of time (how far the sun is
	// ahead of or behind the clock) against declination. Click to pick a day.
	import { createEventDispatcher } from 'svelte';

	export let eot: number[];
	export let delta: number[];
	export let year: number;
	export let selected = -1;
	export let color = '#199e70';
	export let height = 320;

	const dispatch = createEventDispatcher<{ pick: number }>();
	const MONTHS = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	];
	const M = { l: 44, r: 16, t: 12, b: 34 };

	let width = 400;
	let hover = -1;

	$: xMax = Math.max(20, Math.ceil(Math.max(...eot.map(Math.abs)) / 5) * 5);
	$: yMax = Math.max(10, Math.ceil(Math.max(...delta.map(Math.abs)) / 10) * 10);
	$: x = (v: number) => M.l + ((v + xMax) / (2 * xMax)) * (width - M.l - M.r);
	$: y = (v: number) => M.t + ((yMax - v) / (2 * yMax)) * (height - M.t - M.b);
	$: xTicks = range(-xMax, xMax, 5);
	$: yTicks = range(-yMax, yMax, yMax > 20 ? 10 : 5);
	$: d =
		eot.map((v, i) => `${i ? 'L' : 'M'}${x(v).toFixed(1)},${y(delta[i]).toFixed(1)}`).join('') +
		'Z';
	$: monthStarts = MONTHS.map((_, m) => (Date.UTC(year, m, 1) - Date.UTC(year, 0, 1)) / 86_400_000);

	function range(a: number, b: number, step: number): number[] {
		const out = [];
		for (let v = a; v <= b; v += step) out.push(v);
		return out;
	}

	/** Arrow keys step the picked day, so the chart doubles as a date slider. */
	function onKey(e: KeyboardEvent) {
		const step = { ArrowLeft: -1, ArrowRight: 1, PageDown: -30, PageUp: 30 }[e.key];
		if (!step) return;
		e.preventDefault();
		dispatch('pick', (((selected + step) % eot.length) + eot.length) % eot.length);
	}

	function nearest(e: PointerEvent): number {
		const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
		const px = e.clientX - r.left;
		const py = e.clientY - r.top;
		let best = -1;
		let bestD = 18 ** 2;
		eot.forEach((v, i) => {
			const dd = (x(v) - px) ** 2 + (y(delta[i]) - py) ** 2;
			if (dd < bestD) [best, bestD] = [i, dd];
		});
		return best;
	}

	function dateLabel(i: number): string {
		return new Date(Date.UTC(year, 0, 1 + i)).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		});
	}

	function mmss(min: number): string {
		const s = Math.round(Math.abs(min) * 60);
		return `${min < 0 ? '−' : '+'}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
	}
</script>

<figure class="chart">
	<figcaption>Analemma: equation of time vs declination</figcaption>
	<div class="plot" bind:clientWidth={width}>
		<svg
			{width}
			{height}
			role="slider"
			tabindex="0"
			aria-label="Analemma: equation of time against declination through the year"
			aria-valuemin={0}
			aria-valuemax={eot.length - 1}
			aria-valuenow={selected}
			aria-valuetext={dateLabel(selected)}
			on:keydown={onKey}
			on:pointermove={(e) => (hover = nearest(e))}
			on:pointerleave={() => (hover = -1)}
			on:click={(e) => {
				const i = nearest(e as unknown as PointerEvent);
				if (i >= 0) dispatch('pick', i);
			}}
		>
			{#each xTicks as t (t)}
				<line class="grid" class:zero={t === 0} x1={x(t)} x2={x(t)} y1={M.t} y2={height - M.b} />
				<text class="tick" x={x(t)} y={height - M.b + 14} text-anchor="middle">{t}</text>
			{/each}
			{#each yTicks as t (t)}
				<line class="grid" class:zero={t === 0} x1={M.l} x2={width - M.r} y1={y(t)} y2={y(t)} />
				<text class="tick" x={M.l - 6} y={y(t)} text-anchor="end" dominant-baseline="middle"
					>{t}°</text
				>
			{/each}
			<text class="axis" x={(M.l + width - M.r) / 2} y={height - 4} text-anchor="middle"
				>sun ahead of clock (min) →</text
			>
			<path {d} stroke={color} stroke-width="2" fill="none" />
			{#each monthStarts as i, m (m)}
				{#if eot[i] !== undefined}
					<circle cx={x(eot[i])} cy={y(delta[i])} r="2.5" fill="var(--text)" />
					<text
						class="month"
						x={x(eot[i]) + (eot[i] >= 0 ? 7 : -7)}
						y={y(delta[i])}
						text-anchor={eot[i] >= 0 ? 'start' : 'end'}
						dominant-baseline="middle">{MONTHS[m]}</text
					>
				{/if}
			{/each}
			{#if eot[selected] !== undefined}
				<circle
					cx={x(eot[selected])}
					cy={y(delta[selected])}
					r="6"
					fill="#f2cc60"
					stroke="var(--bg2)"
					stroke-width="2"
				/>
			{/if}
			{#if hover >= 0}
				<circle
					cx={x(eot[hover])}
					cy={y(delta[hover])}
					r="5"
					fill={color}
					stroke="var(--bg2)"
					stroke-width="2"
				/>
			{/if}
		</svg>
		{#if hover >= 0}
			<div
				class="tooltip"
				style:left="{Math.min(x(eot[hover]) + 12, width - 160)}px"
				style:top="{Math.max(0, y(delta[hover]) - 50)}px"
			>
				<div class="tt-date">{dateLabel(hover)}</div>
				<div>equation of time <b>{mmss(eot[hover])}</b></div>
				<div>declination <b>{delta[hover].toFixed(2)}°</b></div>
			</div>
		{/if}
	</div>
</figure>

<style>
	.chart {
		margin: 0;
	}
	figcaption {
		font-size: 12px;
		color: var(--bright);
		margin-bottom: 4px;
	}
	.plot {
		position: relative;
	}
	svg {
		display: block;
		cursor: crosshair;
	}
	svg:focus-visible {
		outline: 1px solid var(--accent);
	}
	.grid {
		stroke: var(--border);
	}
	.grid.zero {
		stroke: var(--dim);
	}
	.tick,
	.axis {
		fill: var(--muted);
		font-size: 10px;
		font-family: var(--mono);
	}
	.month {
		fill: var(--text);
		font-size: 10px;
		font-family: var(--mono);
	}
	.tooltip {
		position: absolute;
		pointer-events: none;
		background: var(--surface);
		border: 1px solid var(--dim);
		border-radius: 4px;
		padding: 6px 10px;
		font-size: 11px;
		color: var(--muted);
		white-space: nowrap;
	}
	.tooltip b {
		color: var(--text);
		font-weight: 500;
	}
	.tt-date {
		color: var(--bright);
	}
</style>
