<script lang="ts">
	// Canvas view of the observer's sky as a unit sphere: x = east, y = north,
	// z = up. Drag (or use the arrow keys) to turn the view.
	import { onMount } from 'svelte';
	import { toHorizon, type Vec3 } from './sun';

	export let latitude: number;
	export let helix: Vec3[] = [];
	export let dayPath: Vec3[] = [];
	export let analemma: Vec3[] = [];
	export let sun: Vec3 | null = null;
	/** Index into `analemma` of the selected day. */
	export let analemmaIndex = -1;
	/** View yaw: 180 looks south, 0 looks north. */
	export let yaw = 205;
	/** View elevation above the horizon plane, degrees. */
	export let pitch = 22;

	const COLORS = {
		helix: '#3987e5',
		day: '#d95926',
		analemma: '#199e70',
		equator: '#6e7681',
		grid: '#30363d',
		ground: 'rgba(17, 20, 24, 0.72)',
		label: '#cdd9e5',
		muted: '#6e7681'
	};

	let canvas: HTMLCanvasElement;
	let wrap: HTMLDivElement;
	let width = 600;
	let height = 440;
	let drag: { x: number; y: number; yaw: number; pitch: number } | null = null;

	const D = Math.PI / 180;

	function project(v: Vec3, cx: number, cy: number, r: number) {
		const a = yaw * D;
		const b = pitch * D;
		const x1 = v[0] * Math.cos(a) - v[1] * Math.sin(a);
		const y1 = v[0] * Math.sin(a) + v[1] * Math.cos(a);
		return {
			x: cx + r * x1,
			y: cy - r * (y1 * Math.sin(b) + v[2] * Math.cos(b)),
			// −1 nearest the viewer, +1 farthest.
			depth: y1 * Math.cos(b) - v[2] * Math.sin(b)
		};
	}

	/** Strokes a polyline in depth-faded buckets, one path per bucket. */
	function strokeFaded(
		ctx: CanvasRenderingContext2D,
		pts: Vec3[],
		color: string,
		alpha: number,
		lineWidth: number,
		above: boolean,
		closed: boolean,
		cx: number,
		cy: number,
		r: number
	) {
		const BUCKETS = 6;
		const paths: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D());
		const proj = pts.map((p) => project(p, cx, cy, r));
		const last = closed ? pts.length : pts.length - 1;
		for (let i = 0; i < last; i++) {
			const j = (i + 1) % pts.length;
			const up = pts[i][2] + pts[j][2] >= 0;
			if (up !== above) continue;
			const p = proj[i];
			const q = proj[j];
			const depth = (p.depth + q.depth) / 2;
			const k = Math.min(BUCKETS - 1, Math.floor(((1 - depth) / 2) * BUCKETS));
			paths[k].moveTo(p.x, p.y);
			paths[k].lineTo(q.x, q.y);
		}
		ctx.strokeStyle = color;
		ctx.lineWidth = lineWidth;
		for (let k = 0; k < BUCKETS; k++) {
			ctx.globalAlpha = alpha * (above ? 1 : 0.3) * (0.3 + (0.7 * (k + 0.5)) / BUCKETS);
			ctx.stroke(paths[k]);
		}
		ctx.globalAlpha = 1;
	}

	function circle(fn: (t: number) => Vec3, steps = 180): Vec3[] {
		return Array.from({ length: steps }, (_, i) => fn((i / steps) * 2 * Math.PI));
	}

	function draw() {
		const ctx = canvas?.getContext('2d');
		if (!ctx) return;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, width, height);
		ctx.lineCap = 'round';
		const cx = width / 2;
		const cy = height * 0.56;
		const r = Math.min(width * 0.44, height * 0.46);

		const horizon = circle((t) => [Math.cos(t), Math.sin(t), 0]);
		const equator = circle((t) => toHorizon(t / D, 0, latitude));
		const altRings = [30, 60].map((h) =>
			circle((t) => [Math.cos(h * D) * Math.cos(t), Math.cos(h * D) * Math.sin(t), Math.sin(h * D)])
		);
		const spokes = [0, 45, 90, 135].map((az) =>
			circle((t) => [Math.sin(az * D) * Math.cos(t), Math.cos(az * D) * Math.cos(t), Math.sin(t)])
		);

		const layer = (above: boolean) => {
			for (const ring of [...altRings, ...spokes])
				strokeFaded(ctx, ring, COLORS.grid, 1, 1, above, true, cx, cy, r);
			strokeFaded(ctx, equator, COLORS.equator, 0.9, 1, above, true, cx, cy, r);
			// Fade the coil as it gets denser so a full year of turns doesn't saturate.
			const helixAlpha = Math.min(0.6, 0.6 * Math.sqrt(30 / Math.max(1, helix.length / 72)));
			if (helix.length)
				strokeFaded(ctx, helix, COLORS.helix, helixAlpha, 1, above, false, cx, cy, r);
			if (analemma.length)
				strokeFaded(ctx, analemma, COLORS.analemma, 1, 2, above, true, cx, cy, r);
			if (dayPath.length) strokeFaded(ctx, dayPath, COLORS.day, 1, 2.5, above, true, cx, cy, r);
		};

		// Below-horizon parts first, then the ground covers them, then the sky.
		layer(false);
		ctx.beginPath();
		horizon.forEach((v, i) => {
			const p = project(v, cx, cy, r);
			if (i === 0) ctx.moveTo(p.x, p.y);
			else ctx.lineTo(p.x, p.y);
		});
		ctx.closePath();
		ctx.fillStyle = COLORS.ground;
		ctx.fill();
		ctx.strokeStyle = COLORS.muted;
		ctx.lineWidth = 1.5;
		ctx.stroke();
		layer(true);

		// Celestial pole axis through the observer.
		// The pole on the observer's side of the equator (the north pole at φ = 0).
		const pole = toHorizon(0, latitude >= 0 ? 90 : -90, latitude);
		const o = project([0, 0, 0], cx, cy, r);
		const pp = project(pole, cx, cy, r);
		const pn = project([-pole[0], -pole[1], -pole[2]], cx, cy, r);
		ctx.strokeStyle = COLORS.muted;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(pn.x, pn.y);
		ctx.lineTo(pp.x, pp.y);
		ctx.stroke();

		// Selected day on the analemma, then the sun on top.
		const dot = (v: Vec3, color: string, size: number) => {
			const p = project(v, cx, cy, r);
			ctx.globalAlpha = v[2] >= 0 ? 1 : 0.4;
			ctx.beginPath();
			ctx.arc(p.x, p.y, size + 2, 0, 2 * Math.PI);
			ctx.fillStyle = '#111418';
			ctx.fill();
			ctx.beginPath();
			ctx.arc(p.x, p.y, size, 0, 2 * Math.PI);
			ctx.fillStyle = color;
			ctx.fill();
			ctx.globalAlpha = 1;
		};
		if (analemma[analemmaIndex]) dot(analemma[analemmaIndex], COLORS.analemma, 4);
		if (sun) dot(sun, '#f2cc60', 7);
		ctx.beginPath();
		ctx.arc(o.x, o.y, 3, 0, 2 * Math.PI);
		ctx.fillStyle = COLORS.label;
		ctx.fill();

		ctx.font = '12px "JetBrains Mono", monospace';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const label = (v: Vec3, text: string, color: string) => {
			const p = project(v, cx, cy, r);
			ctx.fillStyle = color;
			ctx.globalAlpha = p.depth > 0.3 ? 0.55 : 1;
			ctx.fillText(text, p.x, p.y);
			ctx.globalAlpha = 1;
		};
		label([0, 1.1, 0], 'N', COLORS.label);
		label([1.1, 0, 0], 'E', COLORS.label);
		label([0, -1.1, 0], 'S', COLORS.label);
		label([-1.1, 0, 0], 'W', COLORS.label);
		label([0, 0, 1.08], 'zenith', COLORS.muted);
		label(
			[pole[0] * 1.12, pole[1] * 1.12, pole[2] * 1.12],
			latitude >= 0 ? 'celestial N pole' : 'celestial S pole',
			COLORS.muted
		);
	}

	function onPointerDown(e: PointerEvent) {
		drag = { x: e.clientX, y: e.clientY, yaw, pitch };
		wrap.setPointerCapture?.(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!drag) return;
		yaw = drag.yaw - (e.clientX - drag.x) * 0.4;
		pitch = Math.max(-15, Math.min(90, drag.pitch + (e.clientY - drag.y) * 0.3));
	}

	function onKeyDown(e: KeyboardEvent) {
		const step = { ArrowLeft: [5, 0], ArrowRight: [-5, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] }[
			e.key
		];
		if (!step) return;
		e.preventDefault();
		yaw += step[0];
		pitch = Math.max(-15, Math.min(90, pitch + step[1]));
	}

	onMount(() => {
		// Deferred a frame: resizing the canvas resizes `wrap`, which would
		// otherwise re-enter the observer in the same frame.
		const ro = new ResizeObserver(() =>
			requestAnimationFrame(() => {
				width = wrap.clientWidth;
				height = Math.round(Math.min(520, Math.max(320, width * 0.72)));
			})
		);
		ro.observe(wrap);
		return () => ro.disconnect();
	});

	$: if (canvas) {
		void [width, height, yaw, pitch, latitude, helix, dayPath, analemma, sun, analemmaIndex];
		draw();
	}
</script>

<!-- role="application": a drag/arrow-key view control, which Svelte's lint doesn't count as interactive -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions -->
<div
	class="dome"
	bind:this={wrap}
	tabindex="0"
	role="application"
	aria-label="3D view of the sky dome with the sun's paths. Drag or use the arrow keys to rotate."
	on:pointerdown={onPointerDown}
	on:pointermove={onPointerMove}
	on:pointerup={() => (drag = null)}
	on:pointercancel={() => (drag = null)}
	on:keydown={onKeyDown}
>
	<canvas bind:this={canvas} style:width="{width}px" style:height="{height}px"></canvas>
</div>

<style>
	.dome {
		width: 100%;
	}
	canvas {
		display: block;
		cursor: grab;
		touch-action: none;
		border-radius: 6px;
	}
	canvas:active {
		cursor: grabbing;
	}
	.dome:focus-visible {
		outline: 1px solid var(--accent);
	}
</style>
