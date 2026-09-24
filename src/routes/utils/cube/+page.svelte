<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Cube3D from '$lib/cube/Cube3D.svelte';
	import SolutionSteps from '$lib/cube/SolutionSteps.svelte';
	import { type CubieCube, applyMoves, randomCube, solvedCube } from '$lib/cube/cubie';
	import {
		type Facelets,
		blankFacelets,
		toFacelets,
		fromFacelets,
		COLOR_NAMES
	} from '$lib/cube/facelet';
	import { createSolverClient, type SolverClient } from '$lib/cube/solverClient';

	const COLORS = ['#f4f4f4', '#d32f2f', '#089b48', '#ffd500', '#ff6d00', '#0b4fb3'];
	const FACE_WORDS = ['top', 'right', 'front', 'bottom', 'left', 'back'];

	let facelets: Facelets = blankFacelets();
	let selected: number | null = 0;
	let rx = -25;
	let ry = -35;

	let solver: SolverClient | null = null;
	let ready = false;
	let solving = false;
	let requestId = 0;
	let pendingStart: CubieCube | null = null;

	// Error whose stickers are highlighted alone (hovered/focused); otherwise
	// the stickers of every error are highlighted.
	let focusedError: number | null = null;

	let solution: { start: CubieCube; moves: number[] } | null = null;
	let step = 0;

	$: parsed = fromFacelets(facelets);
	$: errors = parsed.ok ? [] : parsed.errors;
	$: if (focusedError !== null && focusedError >= errors.length) focusedError = null;
	$: highlight = solution
		? []
		: focusedError !== null
			? errors[focusedError].facelets
			: errors.flatMap((e) => e.facelets);
	$: shown = solution
		? toFacelets(applyMoves(solution.start, solution.moves.slice(0, step)))
		: facelets;

	onMount(async () => {
		solver = await createSolverClient();
		await solver.ready;
		ready = true;
	});

	onDestroy(() => solver?.destroy());

	// Any edit makes an in-flight solve stale.
	function cancelSolve() {
		requestId++;
		solving = false;
	}

	function paint(index: number) {
		cancelSolve();
		facelets[index] = selected;
		facelets = facelets;
	}

	function setFacelets(next: Facelets) {
		cancelSolve();
		clearSolution();
		facelets = next;
	}

	async function handleSolve() {
		if (!parsed.ok) return;
		const cube = parsed.cube;
		solving = true;
		pendingStart = cube;
		const id = ++requestId;
		const { moves } = await solver!.solve([cube]);
		if (id === requestId) showSolution(moves);
	}

	function showSolution(moves: number[]) {
		if (!pendingStart) return;
		solving = false;
		solution = { start: pendingStart, moves };
		step = 0;
	}

	function clearSolution() {
		solution = null;
		step = 0;
	}

	function describeMove(m: number): string {
		const face = FACE_WORDS[Math.floor(m / 3)];
		const power = m % 3;
		if (power === 1) return `turn the ${face} face a quarter turn twice (either way)`;
		return `turn the ${face} face a quarter turn ${power === 0 ? 'clockwise' : 'counter-clockwise'}`;
	}
</script>

<svelte:head>
	<title>Cube solver — ellewsen.no</title>
</svelte:head>

<section class="cube-page">
	<div class="section-label">// utils / cube</div>

	<p class="intro">
		Rubik's cube (3x3) solver. Hold your cube with the <strong>white</strong> center on top and the
		<strong>green</strong> center facing you, then paint the stickers to match: pick a colour and click
		stickers. Drag the cube to see the other sides. Runs entirely in your browser. Got a
		<a href="/utils/mastermorphix">Master Pyramorphix</a>? It has its own solver.
	</p>

	<div class="card palette-card">
		{#each COLORS as color, c}
			<button
				type="button"
				class="swatch"
				class:swatch-active={selected === c}
				style:background={color}
				aria-label="Paint {COLOR_NAMES[c]}"
				aria-pressed={selected === c}
				on:click={() => (selected = c)}
			></button>
		{/each}
		<button
			type="button"
			class="swatch swatch-eraser"
			class:swatch-active={selected === null}
			aria-label="Erase"
			aria-pressed={selected === null}
			on:click={() => (selected = null)}>✕</button
		>
	</div>

	<Cube3D
		facelets={shown}
		colors={COLORS}
		colorNames={COLOR_NAMES}
		editable={!solution}
		{highlight}
		bind:rx
		bind:ry
		on:paint={(e) => paint(e.detail)}
	/>

	<div class="card actions-card">
		<div class="row">
			<button type="button" class="btn btn-secondary" on:click={() => (ry -= 90)}
				>◀ Turn view</button
			>
			<button type="button" class="btn btn-secondary" on:click={() => (rx = rx < 0 ? 25 : -25)}
				>{rx < 0 ? 'Show bottom' : 'Show top'}</button
			>
			<button type="button" class="btn btn-secondary" on:click={() => (ry += 90)}
				>Turn view ▶</button
			>
		</div>
		<div class="row">
			<button type="button" class="btn btn-secondary" on:click={() => setFacelets(blankFacelets())}
				>Clear</button
			>
			<button
				type="button"
				class="btn btn-secondary"
				on:click={() => setFacelets(toFacelets(solvedCube()))}>Solved</button
			>
			<button
				type="button"
				class="btn btn-secondary"
				on:click={() => setFacelets(toFacelets(randomCube()))}>Random</button
			>
		</div>
	</div>

	<div class="card solve-card">
		{#if solution}
			<SolutionSteps moves={solution.moves} bind:step describe={describeMove} />
			<button type="button" class="btn btn-secondary" on:click={clearSolution}>Edit cube</button>
		{:else if !parsed.ok}
			<ul class="errors">
				{#each errors as error, i}
					<li>
						{#if error.facelets.length}
							<button
								type="button"
								class="error-link"
								on:mouseenter={() => (focusedError = i)}
								on:mouseleave={() => (focusedError = null)}
								on:focus={() => (focusedError = i)}
								on:blur={() => (focusedError = null)}>{error.message}</button
							>
						{:else}
							{error.message}
						{/if}
					</li>
				{/each}
			</ul>
			{#if highlight.length}
				<p class="hint">
					Problem stickers are flashing on the cube — hover an error to see only its stickers.
				</p>
			{/if}
		{:else}
			<button
				type="button"
				class="btn btn-primary"
				disabled={!ready || solving}
				on:click={handleSolve}>{solving ? 'Solving…' : ready ? 'Solve' : 'Loading solver…'}</button
			>
		{/if}
	</div>

	<div class="card">
		<details>
			<summary>Move notation</summary>
			<ul class="rules-list">
				<li>
					Letters name a face: U (up/top), D (down/bottom), F (front), B (back), R (right), L
					(left).
				</li>
				<li>
					A letter alone means turn that face a quarter turn clockwise, as seen looking at it.
				</li>
				<li>' (prime) means counter-clockwise; 2 means two quarter turns.</li>
				<li>Keep holding the cube the same way (white top, green front) the whole time.</li>
			</ul>
		</details>
	</div>
</section>

<style>
	.cube-page {
		padding: 56px 0;
	}
	.intro {
		color: var(--muted);
		font-size: 13px;
		max-width: 640px;
	}
	.intro strong {
		color: var(--bright);
	}
	.card {
		margin-bottom: 16px;
	}
	.palette-card {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		justify-content: center;
		margin-top: 20px;
	}
	.swatch {
		width: 36px;
		height: 36px;
		border-radius: 6px;
		border: 2px solid var(--border);
		cursor: pointer;
	}
	.swatch-active {
		border-color: var(--accent);
		box-shadow: 0 0 0 2px var(--accent);
	}
	.swatch-eraser {
		background: var(--dim);
		color: var(--muted);
		font-family: var(--mono);
	}
	.row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 10px;
	}
	.row:last-child {
		margin-bottom: 0;
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.errors {
		margin: 0;
		padding-left: 18px;
		font-size: 13px;
		color: var(--accent3);
	}
	.error-link {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: help;
		text-decoration: underline dotted;
	}
	.hint {
		font-size: 13px;
		color: var(--muted);
		margin: 10px 0;
	}
	.solve-card > .btn-secondary {
		margin-top: 10px;
	}
	summary {
		cursor: pointer;
		font-size: 13px;
		font-weight: 600;
		color: var(--bright);
	}
	.rules-list {
		margin: 10px 0 0;
		padding-left: 18px;
		font-size: 13px;
		color: var(--muted);
		line-height: 1.5;
	}
</style>
