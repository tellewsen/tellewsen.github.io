<script lang="ts">
	// CSS-3D view of a 3x3 from its 54 facelets. Drag to rotate the view;
	// click a sticker to paint it (the parent decides what that means).
	import { createEventDispatcher } from 'svelte';
	import { FACES } from './cubie';
	import { isCenter, type Facelets } from './facelet';

	export let facelets: Facelets;
	export let colors: string[];
	export let colorNames: string[];
	export let editable = true;
	export let rx = -25;
	export let ry = -35;

	const dispatch = createEventDispatcher<{ paint: number }>();

	const FACE_LABELS = ['Up', 'Right', 'Front', 'Down', 'Left', 'Back'];

	let dragStart: { x: number; y: number; rx: number; ry: number } | null = null;
	let dragged = false;

	function onPointerDown(e: PointerEvent) {
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

	function onStickerClick(index: number) {
		if (dragged || !editable || isCenter(index)) return;
		dispatch('paint', index);
	}
</script>

<div class="scene" on:pointerdown={onPointerDown} role="presentation">
	<div class="cube" style="transform: rotateX({rx}deg) rotateY({ry}deg)">
		{#each FACES as face, f}
			<div class="face face-{face}">
				{#each Array(9) as _, k}
					{@const i = f * 9 + k}
					{@const c = facelets[i]}
					<button
						type="button"
						class="sticker"
						class:unpainted={c === null}
						style:background={c === null ? null : colors[c]}
						disabled={!editable || isCenter(i)}
						aria-label="{FACE_LABELS[f]} face, sticker {k + 1}, {c === null ? 'unpainted' : colorNames[c]}"
						on:click={() => onStickerClick(i)}
					></button>
				{/each}
			</div>
		{/each}
	</div>
</div>

<style>
	.scene {
		--size: 210px;
		width: var(--size);
		height: var(--size);
		margin: 60px auto;
		perspective: 900px;
		touch-action: none;
		cursor: grab;
		user-select: none;
	}
	.cube {
		position: relative;
		width: 100%;
		height: 100%;
		transform-style: preserve-3d;
	}
	.face {
		position: absolute;
		inset: 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
		padding: 4px;
		background: #050607;
		border-radius: 8px;
		backface-visibility: hidden;
	}
	.face-U {
		transform: rotateX(90deg) translateZ(calc(var(--size) / 2));
	}
	.face-D {
		transform: rotateX(-90deg) translateZ(calc(var(--size) / 2));
	}
	.face-F {
		transform: translateZ(calc(var(--size) / 2));
	}
	.face-B {
		transform: rotateY(180deg) translateZ(calc(var(--size) / 2));
	}
	.face-R {
		transform: rotateY(90deg) translateZ(calc(var(--size) / 2));
	}
	.face-L {
		transform: rotateY(-90deg) translateZ(calc(var(--size) / 2));
	}
	.sticker {
		border: none;
		border-radius: 5px;
		padding: 0;
		cursor: pointer;
	}
	.sticker:disabled {
		cursor: inherit;
	}
	.sticker.unpainted {
		background: var(--dim);
	}
	.sticker:not(:disabled):hover {
		filter: brightness(1.15);
		outline: 2px solid var(--accent2);
		outline-offset: -2px;
	}
</style>
