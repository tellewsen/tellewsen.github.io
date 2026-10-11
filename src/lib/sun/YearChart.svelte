<script lang="ts" context="module">
	export interface Series {
		name: string;
		color: string;
		values: number[];
		/** Thinner line for component series. */
		minor?: boolean;
	}
</script>

<script lang="ts">
	// One-axis line chart over the days of a year, with a crosshair tooltip.
	// Click to pick a day.
	import { createEventDispatcher } from 'svelte';

	export let series: Series[];
	export let year: number;
	export let selected = -1;
	export let label: string;
	export let format: (v: number) => string;
	export let height = 220;

	const dispatch = createEventDispatcher<{ pick: number }>();
	const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
	const M = { l: 44, r: 12, t: 10, b: 24 };

	let width = 600;
	let hover = -1;

	$: days = series[0]?.values.length ?? 365;
	$: all = series.flatMap((s) => s.values);
	$: ticks = niceTicks(Math.min(...all), Math.max(...all));
	$: lo = ticks[0];
	$: hi = ticks[ticks.length - 1];
	$: x = (i: number) => M.l + (i / (days - 1)) * (width - M.l - M.r);
	$: y = (v: number) => M.t + ((hi - v) / (hi - lo)) * (height - M.t - M.b);
	$: monthStarts = MONTHS.map((_, m) => (Date.UTC(year, m, 1) - Date.UTC(year, 0, 1)) / 86_400_000);

	function niceTicks(min: number, max: number): number[] {
		if (max - min < 1e-9) [min, max] = [min - 1, max + 1];
		const raw = (max - min) / 5;
		const mag = 10 ** Math.floor(Math.log10(raw));
		const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? raw;
		const out: number[] = [];
		for (let v = Math.floor(min / step) * step; v <= max + step * 0.999; v += step)
			out.push(Math.round(v * 1e6) / 1e6);
		return out;
	}

	/** Arrow keys step the picked day, so the chart doubles as a date slider. */
	function onKey(e: KeyboardEvent) {
		const step = { ArrowLeft: -1, ArrowRight: 1, PageDown: -30, PageUp: 30 }[e.key];
		if (!step) return;
		e.preventDefault();
		dispatch('pick', (((selected + step) % days) + days) % days);
	}

	function path(values: number[], x: (i: number) => number, y: (v: number) => number): string {
		return values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
	}

	function dayAt(e: PointerEvent): number {
		const svg = e.currentTarget as SVGSVGElement;
		const px = e.clientX - svg.getBoundingClientRect().left;
		const i = Math.round(((px - M.l) / (width - M.l - M.r)) * (days - 1));
		return Math.max(0, Math.min(days - 1, i));
	}

	function dateLabel(i: number): string {
		return new Date(Date.UTC(year, 0, 1 + i)).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		});
	}
</script>

<figure class="chart">
	<figcaption>{label}</figcaption>
	{#if series.length > 1}
		<ul class="legend">
			{#each series as s (s.name)}
				<li><span class="swatch" style:background={s.color}></span>{s.name}</li>
			{/each}
		</ul>
	{/if}
	<div class="plot" bind:clientWidth={width}>
		<svg
			{width}
			{height}
			role="slider"
			tabindex="0"
			aria-label={label}
			aria-valuemin={0}
			aria-valuemax={days - 1}
			aria-valuenow={selected}
			aria-valuetext={dateLabel(selected)}
			on:keydown={onKey}
			on:pointermove={(e) => (hover = dayAt(e))}
			on:pointerleave={() => (hover = -1)}
			on:click={(e) => dispatch('pick', dayAt(e as unknown as PointerEvent))}
		>
			{#each ticks as t (t)}
				<line class="grid" class:zero={t === 0} x1={M.l} x2={width - M.r} y1={y(t)} y2={y(t)} />
				<text class="tick" x={M.l - 6} y={y(t)} text-anchor="end" dominant-baseline="middle"
					>{t}</text
				>
			{/each}
			{#each monthStarts as d, m (m)}
				<text class="tick" x={x(d + 15)} y={height - 6} text-anchor="middle">{MONTHS[m]}</text>
			{/each}
			{#each series as s (s.name)}
				<path
					d={path(s.values, x, y)}
					stroke={s.color}
					stroke-width={s.minor ? 1.5 : 2}
					fill="none"
				/>
			{/each}
			{#if selected >= 0 && selected < days}
				<line class="selected" x1={x(selected)} x2={x(selected)} y1={M.t} y2={height - M.b} />
			{/if}
			{#if hover >= 0}
				<line class="cross" x1={x(hover)} x2={x(hover)} y1={M.t} y2={height - M.b} />
				{#each series as s (s.name)}
					<circle
						cx={x(hover)}
						cy={y(s.values[hover])}
						r="4"
						fill={s.color}
						stroke="var(--bg2)"
						stroke-width="2"
					/>
				{/each}
			{/if}
		</svg>
		{#if hover >= 0}
			<div
				class="tooltip"
				style:left="{Math.min(x(hover) + 12, width - 190)}px"
				style:top="{M.t + 4}px"
			>
				<div class="tt-date">{dateLabel(hover)}</div>
				{#each series as s (s.name)}
					<div class="tt-row">
						<span class="swatch" style:background={s.color}></span>
						<span class="tt-name">{s.name}</span>
						<span class="tt-val">{format(s.values[hover])}</span>
					</div>
				{/each}
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
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		list-style: none;
		font-size: 11px;
		color: var(--muted);
		margin-bottom: 6px;
	}
	.swatch {
		display: inline-block;
		width: 10px;
		height: 3px;
		border-radius: 2px;
		margin-right: 6px;
		vertical-align: middle;
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
		stroke-width: 1;
	}
	.grid.zero {
		stroke: var(--dim);
	}
	.tick {
		fill: var(--muted);
		font-size: 10px;
		font-family: var(--mono);
	}
	.selected {
		stroke: var(--muted);
		stroke-width: 1;
	}
	.cross {
		stroke: var(--text);
		stroke-width: 1;
		opacity: 0.5;
	}
	.tooltip {
		position: absolute;
		pointer-events: none;
		background: var(--surface);
		border: 1px solid var(--dim);
		border-radius: 4px;
		padding: 6px 10px;
		font-size: 11px;
		min-width: 170px;
	}
	.tt-date {
		color: var(--bright);
		margin-bottom: 2px;
	}
	.tt-row {
		display: flex;
		align-items: center;
		gap: 4px;
		color: var(--muted);
	}
	.tt-name {
		flex: 1;
	}
	.tt-val {
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
</style>
