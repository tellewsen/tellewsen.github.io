<script lang="ts">
	// Move list with step-through controls. `step` is how many moves have
	// been done; the parent shows the puzzle after that many.
	import { onDestroy } from 'svelte';
	import { MOVE_NAMES } from './cubie';

	export let moves: number[];
	export let step = 0;
	export let describe: (move: number) => string;

	let playTimer: ReturnType<typeof setInterval> | null = null;

	function goTo(n: number) {
		step = Math.max(0, Math.min(moves.length, n));
		if (step === moves.length) stopPlaying();
	}

	function togglePlay() {
		if (playTimer) return stopPlaying();
		if (step === moves.length) step = 0;
		playTimer = setInterval(() => goTo(step + 1), 700);
	}

	function stopPlaying() {
		if (playTimer) clearInterval(playTimer);
		playTimer = null;
	}

	onDestroy(stopPlaying);
</script>

{#if moves.length === 0}
	<p class="hint">Already solved.</p>
{:else}
	<div class="moves" aria-label="Solution">
		{#each moves as m, i}
			<button
				type="button"
				class="move"
				class:move-done={i < step}
				class:move-next={i === step}
				on:click={() => goTo(i + 1)}>{MOVE_NAMES[m]}</button
			>
		{/each}
	</div>
	<p class="hint">
		{moves.length} moves.
		{#if step < moves.length}
			Step {step + 1}: <strong>{MOVE_NAMES[moves[step]]}</strong> — {describe(moves[step])}.
		{:else}
			Solved!
		{/if}
	</p>
	<div class="row">
		<button type="button" class="btn btn-secondary" on:click={() => goTo(0)}>⏮</button>
		<button type="button" class="btn btn-secondary" on:click={() => goTo(step - 1)}>◀ Back</button>
		<button type="button" class="btn btn-secondary" on:click={togglePlay}
			>{playTimer ? 'Pause' : 'Play'}</button
		>
		<button type="button" class="btn btn-secondary" on:click={() => goTo(step + 1)}>Next ▶</button>
		<button type="button" class="btn btn-secondary" on:click={() => goTo(moves.length)}>⏭</button>
	</div>
{/if}

<style>
	.hint {
		font-size: 13px;
		color: var(--muted);
		margin: 10px 0;
	}
	.hint strong {
		color: var(--bright);
	}
	.row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 10px;
	}
	.moves {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.move {
		min-width: 38px;
		padding: 4px 8px;
		font-family: var(--mono);
		font-size: 13px;
		background: transparent;
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 4px;
		cursor: pointer;
	}
	.move-done {
		color: var(--muted);
		border-color: transparent;
	}
	.move-next {
		border-color: var(--accent);
		color: var(--accent);
	}
</style>
