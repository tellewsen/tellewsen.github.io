<script lang="ts">
	// CSS-3D view of a Mastermorphix position: every face of every piece is a
	// clipped, transformed div. Drag to rotate the view; click a piece to
	// select it. With `only`, draws just that slot's piece, centred and
	// static, as a thumbnail.
	import { createEventDispatcher } from 'svelte';
	import type { CubieCube } from './cubie';
	import {
		type Vec,
		N_SLOTS,
		CENTER_SLOT,
		SLOT_POSITIONS,
		add,
		scale,
		dot,
		cross,
		unit
	} from './geometry';
	import { piecePolygons, type Polygon } from './morphix';

	export let cube: CubieCube;
	/** CSS colour per tetrahedron face. */
	export let colors: string[];
	export let editable = true;
	export let selected: number | null = null;
	export let highlight: number[] = [];
	export let rx = -15;
	export let ry = 0;
	export let only: number | null = null;
	/** Pixels per unit (a 3x3 cell is one unit). */
	export let px = 40;
	export let size = 320;

	const dispatch = createEventDispatcher<{ select: number }>();

	const LIGHT = unit([0.35, 0.8, 0.5]);
	const GAP = 0.95; // pieces shrunk a little so their edges show
	const LETTERS = 'URFDLB';

	interface Face {
		key: string;
		slot: number;
		transform: string;
		width: number;
		height: number;
		clip: string;
		color: string;
		label: { x: number; y: number; text: string } | null;
	}

	function shade(hex: string, factor: number): string {
		const n = parseInt(hex.slice(1), 16);
		const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * factor));
		return `rgb(${c.join(',')})`;
	}

	// World (x right, y up, z towards viewer) to CSS (y down) pixels.
	const toCss = (v: Vec, px: number): Vec => [v[0] * px, -v[1] * px, v[2] * px];

	function cssFace(
		p: Polygon,
		slot: number,
		index: number,
		label: string | null,
		palette: string[],
		px: number
	): Face {
		const pts = p.vertices.map((v) => toCss(v, px));
		const n = unit(toCss(p.normal, px));
		const e1 = unit(add(pts[1], pts[0], -1));
		const e2 = cross(n, e1);
		const local = pts.map((q) => {
			const d = add(q, pts[0], -1);
			return [dot(d, e1), dot(d, e2)];
		});
		const u0 = Math.min(...local.map((l) => l[0]));
		const v0 = Math.min(...local.map((l) => l[1]));
		const width = Math.max(...local.map((l) => l[0])) - u0;
		const height = Math.max(...local.map((l) => l[1])) - v0;
		const t = add(add(pts[0], e1, u0), e2, v0);
		const m = [...e1, 0, ...e2, 0, ...n, 0, ...t, 1].map((x) => +x.toFixed(4));
		const lit = 0.55 + 0.45 * Math.max(0, dot(p.normal, LIGHT));
		const cx = local.reduce((s, l) => s + l[0], 0) / local.length - u0;
		const cy = local.reduce((s, l) => s + l[1], 0) / local.length - v0;
		return {
			key: `${slot}-${index}`,
			slot,
			transform: `matrix3d(${m.join(',')})`,
			width,
			height,
			clip: `polygon(${local.map((l) => `${(l[0] - u0).toFixed(2)}px ${(l[1] - v0).toFixed(2)}px`).join(',')})`,
			color: p.color === null ? shade('#1b1f24', lit) : shade(palette[p.color], lit),
			label: label ? { x: cx, y: cy, text: label } : null
		};
	}

	function buildFaces(
		cube: CubieCube,
		selected: number | null,
		colors: string[],
		only: number | null,
		px: number
	): Face[] {
		const faces: Face[] = [];
		for (let slot = only ?? 0; slot < (only === null ? N_SLOTS : only + 1); slot++) {
			const { polygons } = piecePolygons(cube, slot);
			const all = polygons.flatMap((p) => p.vertices);
			const centroid = scale(
				all.reduce<Vec>((s, v) => add(s, v), [0, 0, 0]),
				1 / all.length
			);
			const offset: Vec =
				only !== null
					? scale(centroid, -1)
					: slot === selected
						? scale(unit(SLOT_POSITIONS[slot]), 0.45)
						: [0, 0, 0];
			let labelled = slot < CENTER_SLOT;
			polygons.forEach((p, i) => {
				const moved: Polygon = {
					...p,
					vertices: p.vertices.map((v) =>
						add(add(centroid, scale(add(v, centroid, -1), GAP)), offset)
					)
				};
				// Notation letter on one coloured half of each center.
				const label = !labelled && p.color !== null ? LETTERS[slot - CENTER_SLOT] : null;
				if (label) labelled = true;
				faces.push(cssFace(moved, slot, i, only === null ? label : null, colors, px));
			});
		}
		return faces;
	}

	$: faces = buildFaces(cube, selected, colors, only, px);

	let dragStart: { x: number; y: number; rx: number; ry: number } | null = null;
	let dragged = false;

	function onPointerDown(e: PointerEvent) {
		if (only !== null) return;
		dragStart = { x: e.clientX, y: e.clientY, rx, ry };
		dragged = false;
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp, { once: true });
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragStart) return;
		const dx = e.clientX - dragStart.x;
		const dy = e.clientY - dragStart.y;
		if (Math.abs(dx) + Math.abs(dy) > 4) dragged = true;
		ry = dragStart.ry + dx * 0.5;
		rx = Math.max(-90, Math.min(90, dragStart.rx - dy * 0.5));
	}

	function onPointerUp() {
		dragStart = null;
		window.removeEventListener('pointermove', onPointerMove);
	}

	function onFaceClick(slot: number) {
		if (dragged || !editable) return;
		dispatch('select', slot);
	}
</script>

<div
	class="scene"
	class:thumb={only !== null}
	style:width="{size}px"
	style:height="{size}px"
	on:pointerdown={onPointerDown}
	role="presentation"
>
	<div class="puzzle" style="transform: rotateX({rx}deg) rotateY({ry}deg)">
		{#each faces as f (f.key)}
			<!-- Thumbnails sit inside a button, and buttons can't nest. -->
			<svelte:element
				this={only === null ? 'button' : 'div'}
				type={only === null ? 'button' : undefined}
				class="face"
				class:flagged={highlight.includes(f.slot)}
				class:selected={f.slot === selected}
				style:width="{f.width}px"
				style:height="{f.height}px"
				style:transform={f.transform}
				style:clip-path={f.clip}
				style:background={f.color}
				disabled={only === null ? !editable : undefined}
				data-slot={f.slot}
				tabindex="-1"
				aria-hidden="true"
				on:click={() => onFaceClick(f.slot)}
			>
				{#if f.label}
					<span class="face-letter" style:left="{f.label.x}px" style:top="{f.label.y}px"
						>{f.label.text}</span
					>
				{/if}
			</svelte:element>
		{/each}
	</div>
</div>

<style>
	.scene {
		margin: 20px auto;
		perspective: 1000px;
		touch-action: none;
		cursor: grab;
		user-select: none;
		position: relative;
	}
	.scene.thumb {
		margin: 0;
		cursor: inherit;
		pointer-events: none;
	}
	.puzzle {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 0;
		height: 0;
		transform-style: preserve-3d;
	}
	.face {
		position: absolute;
		left: 0;
		top: 0;
		transform-origin: 0 0;
		border: none;
		padding: 0;
		margin: 0;
		backface-visibility: hidden;
		cursor: pointer;
	}
	.face:disabled {
		cursor: inherit;
	}
	.face.selected {
		filter: brightness(1.2);
	}
	.face.flagged {
		animation: pulse 0.9s ease-in-out infinite alternate;
	}
	@keyframes pulse {
		from {
			filter: brightness(1);
		}
		to {
			filter: brightness(1.8) saturate(0.4);
		}
	}
	.face-letter {
		position: absolute;
		transform: translate(-50%, -50%);
		font-family: var(--mono);
		font-size: 18px;
		font-weight: 700;
		color: #fff;
		-webkit-text-stroke: 1.5px #000;
		paint-order: stroke fill;
		pointer-events: none;
	}
</style>
