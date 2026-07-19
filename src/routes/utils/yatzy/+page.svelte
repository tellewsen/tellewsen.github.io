<script lang="ts">
	import {
		initialMatchState,
		activeGameState,
		withActiveGameState,
		afterScore,
		type MatchState
	} from '$lib/yatzy/match';
	import {
		setDice,
		advanceReroll,
		applyHold,
		rollRemaining,
		scoreCategory,
		setCategoryScore,
		allDiceValid,
		isGameComplete,
		totalScore,
		bonusEarned,
		CATEGORY_NAMES,
		NUM_CATEGORIES,
		UPPER_CATEGORY_COUNT
	} from '$lib/yatzy/state';
	import { isValidScore } from '$lib/yatzy/scoreValidation';
	import { getRecommendation } from '$lib/yatzy/wasmEngine';
	import type { QueryResult } from '$lib/yatzy/parseResult';

	const PIP_LAYOUTS: Record<number, string[]> = {
		1: ['mc'],
		2: ['tl', 'br'],
		3: ['tl', 'mc', 'br'],
		4: ['tl', 'tr', 'bl', 'br'],
		5: ['tl', 'tr', 'mc', 'bl', 'br'],
		6: ['tl', 'ml', 'bl', 'tr', 'mr', 'br']
	};

	function focusOnMount(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	let match: MatchState = initialMatchState('solo');
	let lastResult: QueryResult | null = null;
	let errorMessage: string | null = null;
	let computing = false;
	let generation = 0;

	$: active = activeGameState(match);
	$: complete = isGameComplete(active);

	function setMatch(next: MatchState) {
		match = next;
		generation += 1;
	}

	let queryInFlight = false;
	let queryQueued = false;

	async function maybeQuery(): Promise<void> {
		if (queryInFlight) {
			queryQueued = true;
			return;
		}
		queryInFlight = true;
		try {
			do {
				queryQueued = false;
				const myGeneration = generation;
				const state = activeGameState(match);
				if (!allDiceValid(state.dice)) {
					lastResult = null;
					break;
				}
				computing = true;
				try {
					const result = await getRecommendation(state, state.dice as number[]);
					if (generation !== myGeneration) {
						queryQueued = true;
						continue;
					}
					lastResult = result;
					errorMessage = null;
				} catch (err) {
					if (generation !== myGeneration) {
						queryQueued = true;
						continue;
					}
					lastResult = null;
					errorMessage = err instanceof Error ? err.message : String(err);
				}
			} while (queryQueued);
		} finally {
			queryInFlight = false;
			computing = false;
		}
	}

	function handleDieClick(index: number) {
		const state = activeGameState(match);
		const dice = [...state.dice];
		const current = dice[index];
		dice[index] = current === null ? 1 : (current % 6) + 1;
		setMatch(withActiveGameState(match, setDice(state, dice)));
		void maybeQuery();
	}

	function handleDieClear(index: number) {
		const state = activeGameState(match);
		const dice = [...state.dice];
		dice[index] = null;
		setMatch(withActiveGameState(match, setDice(state, dice)));
		lastResult = null;
	}

	function handleRollRemaining() {
		const state = activeGameState(match);
		setMatch(withActiveGameState(match, setDice(state, rollRemaining(state.dice))));
		void maybeQuery();
	}

	function handleReroll() {
		const state = activeGameState(match);
		setMatch(withActiveGameState(match, advanceReroll(state)));
		lastResult = null;
	}

	function handleHold(holdValues: number[]) {
		const state = activeGameState(match);
		setMatch(withActiveGameState(match, applyHold(state, holdValues)));
		lastResult = null;
		void maybeQuery();
	}

	function handleScoreCategory(category: number, resultingScore: number) {
		const state = activeGameState(match);
		const scored = scoreCategory(state, category, resultingScore);
		setMatch(afterScore(withActiveGameState(match, scored)));
		lastResult = null;
	}

	function newGame() {
		setMatch(initialMatchState('solo'));
		lastResult = null;
		errorMessage = null;
	}

	let editingCategory: number | null = null;
	let editingValue = '';
	let editingError: string | null = null;

	function startEditingCategory(category: number) {
		editingCategory = category;
		const current = active.categoryScores[category];
		editingValue = current === null ? '' : String(current);
		editingError = null;
	}

	function cancelEditingCategory() {
		editingCategory = null;
		editingValue = '';
		editingError = null;
	}

	function commitEditingCategory() {
		if (editingCategory === null) return;
		const category = editingCategory;
		const trimmed = editingValue.trim();
		if (trimmed === '') {
			const state = activeGameState(match);
			setMatch(withActiveGameState(match, setCategoryScore(state, category, null)));
			cancelEditingCategory();
			if (allDiceValid(activeGameState(match).dice)) void maybeQuery();
			return;
		}
		const parsed = Number(trimmed);
		if (!isValidScore(category, parsed)) {
			editingError = `Not a valid score for ${CATEGORY_NAMES[category]}`;
			return;
		}
		const state = activeGameState(match);
		setMatch(withActiveGameState(match, setCategoryScore(state, category, parsed)));
		cancelEditingCategory();
		if (allDiceValid(activeGameState(match).dice)) void maybeQuery();
	}

	function handleEditingKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') commitEditingCategory();
		else if (event.key === 'Escape') cancelEditingCategory();
	}
</script>

<svelte:head>
	<title>Yatzy solver — ellewsen.no</title>
</svelte:head>

<section class="yatzy">
	<div class="section-label">// utils / yatzy</div>

	<p class="intro">
		Optimal-play Yatzy assistant. Roll physical dice and enter the values below (click a die to
		cycle 1–6, × to clear), or use "Roll remaining" to simulate a roll. Runs the same solver as my
		<a href="https://github.com/tellewsen/optimal-yatzy">desktop app</a>, compiled to WebAssembly —
		everything happens in your browser, nothing is sent anywhere.
	</p>

	{#if errorMessage}
		<div class="error-banner">{errorMessage}</div>
	{/if}

	<div class="card dice-card">
		<div class="dice-row">
			{#each active.dice as value, i (i)}
				<div class="die-wrapper">
					<button
						type="button"
						class="die"
						class:die-empty={value === null}
						on:click={() => handleDieClick(i)}
					>
						{#if value !== null}
							{#each PIP_LAYOUTS[value] as pos}
								<span class="pip pip-{pos}"></span>
							{/each}
						{/if}
					</button>
					{#if value !== null}
						<button
							type="button"
							class="die-clear"
							aria-label="Clear die"
							on:click={() => handleDieClear(i)}>×</button
						>
					{/if}
				</div>
			{/each}
		</div>

		<div class="dice-actions">
			<div class="reroll-dots" aria-label={`Rerolls left: ${active.rerollsLeft}`}>
				{#each [0, 1] as i}
					<span class="reroll-dot" class:reroll-dot-filled={i < active.rerollsLeft}></span>
				{/each}
			</div>
			<button type="button" class="btn btn-secondary" on:click={handleRollRemaining} disabled={complete}
				>Roll remaining</button
			>
			<button
				type="button"
				class="btn btn-secondary"
				on:click={handleReroll}
				disabled={complete || !lastResult || !lastResult.isRerollDecision}>Reroll</button
			>
			<button type="button" class="btn btn-secondary" on:click={newGame}>New game</button>
		</div>
	</div>

	<div class="card recommendation-card">
		{#if complete}
			<p class="final-total">🎉 Game complete! Final score: {totalScore(active)}</p>
		{:else if computing}
			<div class="computing-row"><span class="computing-die"></span>Computing recommendation…</div>
		{:else if lastResult === null}
			<p class="hint">Enter all five dice to see recommendations.</p>
		{:else if lastResult.isRerollDecision}
			{#each lastResult.rerollOptions as opt, index (opt.holdValues.join(','))}
				<button
					type="button"
					class="option-card"
					class:best-option={index === 0}
					on:click={() => handleHold(opt.holdValues)}
				>
					{#if index === 0}<span class="best-badge">★ Best move</span>{/if}
					<span class="option-text"
						>Hold [{opt.holdValues.join(',')}]{opt.holdValues.length === 5
							? ' (stop rerolling)'
							: ''} — expected value {opt.expectedValue.toFixed(2)}</span
					>
				</button>
			{/each}
		{:else}
			{#each lastResult.categoryOptions as opt, index (opt.category)}
				<button
					type="button"
					class="option-card"
					class:best-option={index === 0}
					on:click={() => handleScoreCategory(opt.category, opt.resultingScore)}
				>
					{#if index === 0}<span class="best-badge">★ Best move</span>{/if}
					<span class="option-text"
						>{opt.categoryName} — score {opt.resultingScore} (expected value {opt.expectedValue.toFixed(
							2
						)})</span
					>
				</button>
			{/each}
		{/if}
	</div>

	{#snippet scoreRow(cat: number)}
		<div class="score-row score-row-editable">
			<span>{CATEGORY_NAMES[cat]}</span>
			{#if editingCategory === cat}
				<span class="score-edit-wrapper">
					<input
						class="score-edit-input"
						type="text"
						inputmode="numeric"
						bind:value={editingValue}
						on:keydown={handleEditingKeydown}
						on:blur={commitEditingCategory}
						use:focusOnMount
					/>
					{#if editingError}<span class="score-edit-error">{editingError}</span>{/if}
				</span>
			{:else}
				<button type="button" class="score-value-button" on:click={() => startEditingCategory(cat)}>
					{active.categoryScores[cat] === null ? '—' : active.categoryScores[cat]}
				</button>
			{/if}
		</div>
	{/snippet}

	<div class="card scorecard-card">
		<div class="section-label">// scorecard</div>
		{#each Array(UPPER_CATEGORY_COUNT) as _, cat (cat)}
			{@render scoreRow(cat)}
		{/each}
		<div class="score-row total-row">
			<strong>Upper total</strong>
			<span
				>{active.upperTotal} ({bonusEarned(active)
					? 'bonus earned (+50)'
					: `${active.upperTotal}/63 for bonus`})</span
			>
		</div>
		{#each Array(NUM_CATEGORIES - UPPER_CATEGORY_COUNT) as _, i (i + UPPER_CATEGORY_COUNT)}
			{@render scoreRow(i + UPPER_CATEGORY_COUNT)}
		{/each}
		<div class="score-row total-row">
			<strong>Grand total</strong>
			<span>{totalScore(active)}</span>
		</div>
	</div>
</section>

<style>
	.yatzy {
		padding: 56px 0;
	}

	.intro {
		color: var(--muted);
		font-size: 13px;
		max-width: 640px;
	}

	.error-banner {
		background: rgba(247, 129, 102, 0.12);
		border: 1px solid var(--accent3);
		color: var(--accent3);
		padding: 10px 14px;
		border-radius: 6px;
		margin-bottom: 16px;
		font-size: 13px;
	}

	.card {
		margin-bottom: 16px;
	}

	.dice-row {
		display: flex;
		gap: 10px;
		margin-bottom: 14px;
	}

	.die-wrapper {
		position: relative;
	}

	.die {
		width: 48px;
		height: 48px;
		border-radius: 8px;
		background: var(--bg2);
		border: 2px solid var(--border);
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(3, 1fr);
		padding: 6px;
		cursor: pointer;
	}

	.die.die-empty {
		border-style: dashed;
		background: transparent;
	}

	.die:hover {
		border-color: var(--accent);
	}

	.pip {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--bright);
		align-self: center;
		justify-self: center;
	}

	.pip-tl { grid-row: 1; grid-column: 1; }
	.pip-tr { grid-row: 1; grid-column: 3; }
	.pip-ml { grid-row: 2; grid-column: 1; }
	.pip-mc { grid-row: 2; grid-column: 2; }
	.pip-mr { grid-row: 2; grid-column: 3; }
	.pip-bl { grid-row: 3; grid-column: 1; }
	.pip-br { grid-row: 3; grid-column: 3; }

	.die-clear {
		position: absolute;
		top: -6px;
		right: -6px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 1px solid var(--border);
		background: var(--bg2);
		color: var(--muted);
		font-size: 11px;
		line-height: 1;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.die-clear:hover {
		border-color: var(--accent3);
		color: var(--accent3);
	}

	.dice-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.reroll-dots {
		display: inline-flex;
		gap: 4px;
		margin-right: 4px;
	}

	.reroll-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--dim);
	}

	.reroll-dot-filled {
		background: var(--accent);
	}

	.option-card {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		text-align: left;
		padding: 8px 12px;
		margin: 4px 0;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--bg2);
		font-size: 13px;
	}

	.option-card:hover {
		border-color: var(--accent2);
	}

	.option-card.best-option {
		border-color: var(--accent);
		background: rgba(57, 211, 83, 0.06);
	}

	.best-badge {
		flex-shrink: 0;
		font-size: 11px;
		font-weight: 700;
		color: var(--accent);
		white-space: nowrap;
	}

	.hint {
		color: var(--muted);
		font-size: 13px;
	}

	.computing-row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--muted);
	}

	.computing-die {
		width: 14px;
		height: 14px;
		border-radius: 4px;
		background: var(--accent);
		animation: computing-pulse 1s ease-in-out infinite;
	}

	@keyframes computing-pulse {
		0%, 100% { opacity: 0.4; transform: scale(0.9); }
		50% { opacity: 1; transform: scale(1.1); }
	}

	.final-total {
		font-size: 14px;
		color: var(--bright);
	}

	.score-row {
		display: flex;
		justify-content: space-between;
		padding: 3px 0;
		font-size: 13px;
	}

	.score-row.total-row {
		border-top: 1px solid var(--border);
		margin-top: 6px;
		padding-top: 6px;
	}

	.score-row-editable {
		align-items: center;
	}

	.score-value-button {
		background: transparent;
		border: 1px solid transparent;
		border-radius: 4px;
		color: inherit;
		font-family: inherit;
		font-size: 13px;
		padding: 2px 8px;
		cursor: pointer;
	}

	.score-value-button:hover {
		border-color: var(--border);
		background: var(--bg2);
	}

	.score-edit-wrapper {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.score-edit-input {
		width: 64px;
		font-size: 13px;
		padding: 2px 6px;
	}

	.score-edit-error {
		font-size: 11px;
		color: var(--accent3);
	}
</style>
