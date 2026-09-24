<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Morphix3D from '$lib/cube/Morphix3D.svelte';
	import SolutionSteps from '$lib/cube/SolutionSteps.svelte';
	import { type CubieCube, applyMoves, randomCube, solvedCube } from '$lib/cube/cubie';
	import { CENTER_SLOT, SLOT_POSITIONS, pieceAt, slotKind } from '$lib/cube/geometry';
	import { checkMorphix, pieceColors, pieceName, slotLook, slotOptions } from '$lib/cube/morphix';
	import { createSolverClient, type SolverClient } from '$lib/cube/solverClient';

	const PRESETS: Record<string, string> = {
		red: '#d32f2f',
		orange: '#ff6d00',
		yellow: '#ffd500',
		green: '#089b48',
		blue: '#0b4fb3',
		purple: '#7b3fbf',
		pink: '#ff5fa2',
		white: '#f4f4f4',
		black: '#3a3a3a',
		silver: '#b8bcc2',
		gold: '#d4a017'
	};
	const STORAGE_KEY = 'mastermorphix-colors';
	const LAYER_WORDS = ['top', 'right', 'front', 'bottom', 'left', 'back'];
	// Tips are much bigger than the other pieces; scale thumbnails to fit.
	const THUMB_PX = { corner: 24, edge: 36, center: 48 };

	let colorNames = ['red', 'yellow', 'green', 'blue'];
	$: colors = colorNames.map((n) => PRESETS[n]);

	let cube: CubieCube = solvedCube();
	let selected: number | null = null;
	let rx = -15;
	let ry = 0;

	let solver: SolverClient | null = null;
	let ready = false;
	let solving = false;
	let requestId = 0;
	let focusedError: number | null = null;

	let solution: { start: CubieCube; moves: number[] } | null = null;
	let step = 0;

	$: check = checkMorphix(cube, colorNames);
	$: errors = check.ok ? [] : check.errors;
	$: if (focusedError !== null && focusedError >= errors.length) focusedError = null;
	$: highlight = solution
		? []
		: focusedError !== null
			? errors[focusedError].slots
			: errors.flatMap((e) => e.slots);
	$: shown = solution ? applyMoves(solution.start, solution.moves.slice(0, step)) : cube;
	$: options = selected === null ? [] : slotOptions(cube, selected);
	$: currentLook = selected === null ? '' : slotLook(cube, selected);
	$: optionLabels = labelOptions(options, selected, colorNames);
	$: optionView = selected === null ? { rx: 0, ry: 0 } : outsideView(selected);
	$: centerName = (face: number) =>
		pieceColors(CENTER_SLOT + face)
			.map((c) => colorNames[c])
			.join('-');

	onMount(async () => {
		try {
			const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
			if (Array.isArray(saved) && saved.length === 4 && saved.every((n) => n in PRESETS)) {
				colorNames = saved;
			}
		} catch {
			// Storage unavailable; keep the defaults.
		}
		solver = await createSolverClient();
		await solver.ready;
		ready = true;
	});

	onDestroy(() => solver?.destroy());

	function setColorName(index: number, name: string) {
		colorNames[index] = name;
		colorNames = colorNames;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(colorNames));
		} catch {
			// Not remembered, which is fine.
		}
	}

	function edit(next: CubieCube) {
		requestId++;
		solving = false;
		cube = next;
	}

	function reset(next: CubieCube) {
		solution = null;
		step = 0;
		selected = null;
		edit(next);
	}

	async function handleSolve() {
		if (!check.ok || !solver) return;
		const candidates = check.candidates;
		solving = true;
		selected = null;
		const id = ++requestId;
		const { moves, index } = await solver.solve(
			candidates,
			{ centers: true, timeoutMs: 500 },
			1500
		);
		if (id !== requestId) return;
		solving = false;
		solution = { start: candidates[index], moves };
		step = 0;
	}

	// View angles that look straight at a slot from outside (front kept
	// downwards when looking at the top), so every coloured side it can show
	// is visible, whatever the main view is.
	function outsideView(slot: number): { rx: number; ry: number } {
		const [x, y, z] = SLOT_POSITIONS[slot];
		const deg = 180 / Math.PI;
		return { rx: -Math.atan2(y, Math.hypot(x, z)) * deg, ry: -Math.atan2(x, z) * deg };
	}

	// "red tip", or "red tip, way 2" when one piece fits a spot several ways.
	function labelOptions(options: CubieCube[], slot: number | null, names: string[]): string[] {
		if (slot === null) return [];
		const bases = options.map((o) => pieceName(pieceAt(o, slot).home, names));
		return bases.map((b, k) => {
			const same = bases.filter((x) => x === b).length;
			return same > 1 ? `${b}, way ${bases.slice(0, k + 1).filter((x) => x === b).length}` : b;
		});
	}

	function describeMove(m: number): string {
		const face = Math.floor(m / 3);
		const layer = `${LAYER_WORDS[face]} layer (${centerName(face)} edge)`;
		const power = m % 3;
		if (power === 1) return `turn the ${layer} a quarter turn twice (either way)`;
		return `turn the ${layer} a quarter turn ${power === 0 ? 'clockwise' : 'counter-clockwise'}, looking at that edge`;
	}
</script>

<svelte:head>
	<title>Master Pyramorphix solver — ellewsen.no</title>
</svelte:head>

<section class="morphix-page">
	<div class="section-label">// utils / mastermorphix</div>

	<p class="intro">
		Master Pyramorphix (Mastermorphix) solver. It turns like a 3x3 <a href="/utils/cube"
			>Rubik's cube</a
		>, just with a different shape. Hold yours with the <strong>{centerName(0)}</strong> edge on top
		and the
		<strong>{centerName(2)}</strong> edge facing you. The two-colour edges never leave their place, they
		only rotate, so this fixes which way is which.
	</p>
	<p class="intro">
		Then click each piece on the model and pick what that spot looks like on your puzzle. Pieces do
		move around: a tip spot can hold any tip or a flat face center, and side pieces swap with each
		other. Drag the model to see the other sides.
	</p>

	<div class="card colors-card">
		<span class="hint">Your puzzle's colours:</span>
		{#each colorNames as name, i}
			<select
				aria-label="Colour {i + 1}"
				value={name}
				on:change={(e) => setColorName(i, e.currentTarget.value)}
			>
				{#each Object.keys(PRESETS) as preset}
					<option value={preset}>{preset}</option>
				{/each}
			</select>
		{/each}
	</div>

	<Morphix3D
		cube={shown}
		{colors}
		editable={!solution}
		{selected}
		{highlight}
		bind:rx
		bind:ry
		on:select={(e) => (selected = e.detail === selected ? null : e.detail)}
	/>

	<div class="card actions-card">
		<div class="row">
			<button type="button" class="btn btn-secondary" on:click={() => (ry -= 90)}
				>◀ Turn view</button
			>
			<button type="button" class="btn btn-secondary" on:click={() => (rx = rx < 0 ? 30 : -15)}
				>{rx < 0 ? 'Show bottom' : 'Show top'}</button
			>
			<button type="button" class="btn btn-secondary" on:click={() => (ry += 90)}
				>Turn view ▶</button
			>
		</div>
		<div class="row">
			<button type="button" class="btn btn-secondary" on:click={() => reset(solvedCube())}
				>Solved</button
			>
			<button
				type="button"
				class="btn btn-secondary"
				on:click={() => reset(randomCube(Math.random, true))}>Random</button
			>
		</div>
	</div>

	{#if !solution}
		<div class="card edit-card">
			{#if selected === null}
				<p class="hint">Click a piece on the model to change it.</p>
			{:else}
				<p class="hint">
					Now <strong>{pieceName(pieceAt(cube, selected).home, colorNames)}</strong>. Pick the one
					that looks like this spot on your puzzle, looking straight at it from outside:
				</p>
				<div class="options">
					{#each options as option, k}
						{@const active = slotLook(option, selected) === currentLook}
						<button
							type="button"
							class="option"
							class:option-active={active}
							aria-label={optionLabels[k]}
							aria-pressed={active}
							title={optionLabels[k]}
							on:click={() => edit(option)}
						>
							<Morphix3D
								cube={option}
								{colors}
								only={selected}
								rx={optionView.rx}
								ry={optionView.ry}
								px={THUMB_PX[slotKind(selected)]}
								size={88}
							/>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<div class="card solve-card">
		{#if solution}
			<SolutionSteps moves={solution.moves} bind:step describe={describeMove} />
			<button type="button" class="btn btn-secondary" on:click={() => (solution = null)}
				>Edit puzzle</button
			>
		{:else if !check.ok}
			<ul class="errors">
				{#each errors as error, i}
					<li>
						{#if error.slots.length}
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
					Each letter names a layer by its two-colour edge: U (top), D (bottom), F (front), B
					(back), R (right), L (left). The letters are shown on the model's edges.
				</li>
				<li>A letter alone means a quarter turn clockwise, as seen looking at that edge.</li>
				<li>' (prime) means counter-clockwise; 2 means two quarter turns.</li>
				<li>
					Keep holding the puzzle the same way the whole time — it will change shape as you turn.
				</li>
			</ul>
		</details>
	</div>
</section>

<style>
	.morphix-page {
		padding: 56px 0;
	}
	.intro {
		color: var(--muted);
		font-size: 13px;
		max-width: 640px;
	}
	.intro strong,
	.hint strong {
		color: var(--bright);
	}
	.card {
		margin-bottom: 16px;
	}
	.colors-card {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		align-items: center;
		margin-top: 20px;
	}
	select {
		font-family: var(--mono);
		font-size: 12px;
		background: var(--bg);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 4px 6px;
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
	.options {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.option {
		padding: 0;
		background: var(--bg);
		border: 2px solid var(--border);
		border-radius: 6px;
		cursor: pointer;
	}
	.option:hover {
		border-color: var(--muted);
	}
	.option-active,
	.option-active:hover {
		border-color: var(--accent);
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
