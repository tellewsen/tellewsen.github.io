<script lang="ts">
	import { type GameState, type Ruleset } from '$lib/tenk/state';
	import {
		initialMatchState,
		addOpponent,
		removeOpponent,
		updateOpponentScore,
		type MatchState
	} from '$lib/tenk/match';
	import { getRollAdvice, type RollAdvice, type BasicBankOption } from '$lib/tenk/recommend';

	const PIP_LAYOUTS: Record<number, string[]> = {
		1: ['mc'],
		2: ['tl', 'br'],
		3: ['tl', 'mc', 'br'],
		4: ['tl', 'tr', 'bl', 'br'],
		5: ['tl', 'tr', 'mc', 'bl', 'br'],
		6: ['tl', 'ml', 'bl', 'tr', 'mr', 'br']
	};

	let match: MatchState = initialMatchState('basic');
	let advice: RollAdvice | null = null;
	let selectedOption: BasicBankOption | null = null;
	let currentRoll: (number | null)[] = Array(6).fill(null);

	function setRuleset(ruleset: Ruleset) {
		match = { ...initialMatchState(ruleset), opponents: match.opponents };
		resetRollInput();
	}

	function allDiceEntered(roll: (number | null)[], n: number): roll is number[] {
		return roll.slice(0, n).every((d) => d !== null);
	}

	function expandCounts(counts: number[]): number[] {
		const faces: number[] = [];
		counts.forEach((count, idx) => {
			for (let i = 0; i < count; i++) faces.push(idx + 1);
		});
		return faces;
	}

	function maybeAdvise() {
		const n = match.self.diceRemaining;
		if (!allDiceEntered(currentRoll, n)) {
			advice = null;
			selectedOption = null;
			return;
		}
		advice = getRollAdvice(match.self, currentRoll.slice(0, n) as number[]);
		selectedOption = null;
	}

	function handleDieClick(index: number) {
		const current = currentRoll[index];
		currentRoll[index] = current === null ? 1 : (current % 6) + 1;
		currentRoll = [...currentRoll];
		maybeAdvise();
	}

	function handleRollRemaining() {
		const n = match.self.diceRemaining;
		currentRoll = currentRoll.map((d, i) => (i < n ? Math.floor(Math.random() * 6) + 1 : null));
		maybeAdvise();
	}

	function resetRollInput() {
		currentRoll = Array(6).fill(null);
		advice = null;
		selectedOption = null;
	}

	function applySelf(next: GameState) {
		match = { ...match, self: next };
		resetRollInput();
	}

	function handleBustAcknowledge() {
		if (advice?.kind === 'bust') applySelf(advice.onAcknowledge);
	}

	function handleBasicOptionClick(option: BasicBankOption) {
		selectedOption = option;
	}

	function handleForcedStop() {
		if (advice?.kind === 'houseruleForced') applySelf(advice.onStop);
	}

	function handleForcedReroll() {
		if (advice?.kind === 'houseruleForced') applySelf(advice.onReroll);
	}

	function handleOptionStop() {
		if (selectedOption) applySelf(selectedOption.onStop);
	}

	function handleOptionReroll() {
		if (selectedOption) applySelf(selectedOption.onReroll);
	}

	function handleAddOpponent() {
		match = addOpponent(match, `Player ${match.opponents.length + 2}`);
	}

	function handleRemoveOpponent(index: number) {
		match = removeOpponent(match, index);
	}

	function handleOpponentScoreChange(index: number, value: string) {
		const score = Number(value);
		if (!Number.isNaN(score)) match = updateOpponentScore(match, index, score);
	}

	function handleNewGame() {
		match = initialMatchState(match.self.ruleset);
		resetRollInput();
	}
</script>

<svelte:head>
	<title>10,000 solver — ellewsen.no</title>
</svelte:head>

<section class="tenk">
	<div class="section-label">// utils / tenk</div>

	<p class="intro">
		Optimal-play assistant for "10,000" (Terning 10 000 / Cows). Roll physical dice and enter the
		values below (click a die to cycle 1–6), or use "Roll remaining" to simulate a roll. Runs
		entirely in your browser — nothing is sent anywhere.
	</p>

	<div class="card ruleset-card">
		<button
			type="button"
			class="btn btn-secondary"
			class:btn-active={match.self.ruleset === 'basic'}
			on:click={() => setRuleset('basic')}>Basic</button
		>
		<button
			type="button"
			class="btn btn-secondary"
			class:btn-active={match.self.ruleset === 'houserule'}
			on:click={() => setRuleset('houserule')}>House rule</button
		>
	</div>

	<div class="card rules-card">
		<details open>
			<summary>How to play — {match.self.ruleset === 'basic' ? 'Basic' : 'House rule'}</summary>
			{#if match.self.ruleset === 'basic'}
				<ul class="rules-list">
					<li>Roll all 6 dice. A single 1 scores 100 pts, a single 5 scores 50 pts.</li>
					<li>
						Three of a kind: three 1s = 1000 pts, otherwise value × 100. Four, five, or six of a
						kind doubles the value again for each extra die beyond three.
					</li>
					<li>
						Three pairs = 1500 pts. A straight (1-2-3-4-5-6) = 2000 pts — both need a genuine fresh
						6-dice roll.
					</li>
					<li>
						Each throw, choose which scoring dice to bank — you can leave some unbanked and reroll
						them chasing a bigger combo.
					</li>
					<li>After banking, either stop (keep your turn total) or reroll the remaining dice.</li>
					<li>
						If a reroll scores nothing, you bust — the whole turn's points are lost, not just that
						throw.
					</li>
					<li>
						Bank all 6 dice in one turn ("hot dice") and you get to roll all 6 fresh again, keeping
						the points you've banked so far.
					</li>
					<li>
						You need 1000+ points in a single turn to get "on the board" the first time. After that,
						any turn total counts.
					</li>
				</ul>
			{:else}
				<ul class="rules-list">
					<li>
						Roll all 6 dice. Every scoring die must be banked each throw — you can't choose to leave
						points behind to chase a bigger combo.
					</li>
					<li>
						Same scoring as basic: single 1 = 100, single 5 = 50, three of a kind = value × 100
						(three 1s = 1000, doubling again per extra die), three pairs = 1500, straight = 2000.
						Two different three-of-a-kinds in one roll (e.g. three 2s + three 5s) score as both
						totals added together, then doubled.
					</li>
					<li>
						Throw 1's kept dice can combine with throw 2: reroll the leftover dice, and the two
						throws are re-scored together as one set — e.g. one kept 1 plus two more 1s on throw 2
						scores as a triple (1000 pts), not 100 + 200.
					</li>
					<li>From throw 3 onward, no more combining — each throw scores entirely on its own.</li>
					<li>Same bust, hot dice, and 1000-to-get-on-the-board rules as basic.</li>
				</ul>
			{/if}
		</details>
	</div>

	{#if match.self.cyclePhase === 'combining' && match.self.keptForCombining}
		<div class="card kept-dice-card">
			<div class="kept-label">Kept from throw 1 — combines with this roll:</div>
			<div class="dice-row">
				{#each expandCounts(match.self.keptForCombining) as face, i (i)}
					<div class="die die-kept" aria-label={`Kept die, value ${face}`}>
						{#each PIP_LAYOUTS[face] as pos}
							<span class="pip pip-{pos}"></span>
						{/each}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="card dice-card">
		<div class="dice-row">
			{#each Array(match.self.diceRemaining) as _, i (i)}
				<button
					type="button"
					class="die"
					class:die-empty={currentRoll[i] === null}
					aria-label={currentRoll[i] === null
						? `Die ${i + 1}, empty`
						: `Die ${i + 1}, value ${currentRoll[i]}`}
					on:click={() => handleDieClick(i)}
				>
					{#if currentRoll[i] !== null}
						{#each PIP_LAYOUTS[currentRoll[i] as number] as pos}
							<span class="pip pip-{pos}"></span>
						{/each}
					{/if}
				</button>
			{/each}
		</div>
		<div class="dice-actions">
			<button type="button" class="btn btn-secondary" on:click={handleRollRemaining}
				>Roll remaining</button
			>
			<button type="button" class="btn btn-secondary" on:click={resetRollInput}>Clear</button>
			<button type="button" class="btn btn-secondary" on:click={handleNewGame}>New game</button>
		</div>
	</div>

	<div class="card recommendation-card">
		{#if advice === null}
			<p class="hint">Enter all {match.self.diceRemaining} dice to see a recommendation.</p>
		{:else if advice.kind === 'bust'}
			<p class="bust-message">Bust! This turn's points are forfeited.</p>
			<button type="button" class="btn btn-secondary" on:click={handleBustAcknowledge}
				>Continue</button
			>
		{:else if advice.kind === 'basicOptions'}
			{#if !selectedOption}
				{#each advice.options as option, index (option.banked.join(','))}
					<button
						type="button"
						class="option-card"
						class:best-option={index === 0}
						on:click={() => handleBasicOptionClick(option)}
					>
						{#if index === 0}<span class="best-badge">★ Best move</span>{/if}
						<span class="option-text">
							Bank {option.diceUsed}
							{option.diceUsed === 1 ? 'die' : 'dice'} for {option.points} pts (expected value {option.expectedValue.toFixed(
								1
							)})
						</span>
					</button>
				{/each}
			{:else}
				<p class="hint">
					Banked {selectedOption.points} pts. Turn total: {match.self.turnScore +
						selectedOption.points}.
				</p>
				<button
					type="button"
					class="option-card"
					class:best-option={selectedOption.recommend === 'stop'}
					on:click={handleOptionStop}
				>
					Stop — bank {match.self.turnScore + selectedOption.points} pts (EV {selectedOption.stopEV.toFixed(
						1
					)})
				</button>
				<button
					type="button"
					class="option-card"
					class:best-option={selectedOption.recommend === 'reroll'}
					on:click={handleOptionReroll}
				>
					Reroll remaining dice (EV {selectedOption.rerollEV.toFixed(1)})
				</button>
			{/if}
		{:else}
			<p class="hint">Mandatory bank: {advice.points} pts ({advice.diceUsed} dice).</p>
			<button
				type="button"
				class="option-card"
				class:best-option={advice.recommend === 'stop'}
				on:click={handleForcedStop}
			>
				Stop — bank turn (EV {advice.stopEV.toFixed(1)})
			</button>
			<button
				type="button"
				class="option-card"
				class:best-option={advice.recommend === 'reroll'}
				on:click={handleForcedReroll}
			>
				Reroll remaining dice (EV {advice.rerollEV.toFixed(1)})
			</button>
		{/if}
	</div>

	<div class="card status-card">
		<div class="score-row">
			<strong>Total score</strong><span>{match.self.totalScore} / 10,000</span>
		</div>
		<div class="score-row">
			<strong>On the board</strong><span
				>{match.self.onBoard ? 'yes' : 'no (need 1000+ in one turn)'}</span
			>
		</div>
		<div class="score-row">
			<strong>Turn score so far</strong><span>{match.self.turnScore}</span>
		</div>
	</div>

	<div class="card opponents-card">
		<div class="section-label">// opponents</div>
		{#each match.opponents as opponent, index (index)}
			<div class="score-row">
				<span>{opponent.name}</span>
				<span class="opponent-controls">
					<input
						type="number"
						inputmode="numeric"
						value={opponent.score}
						on:input={(e) => handleOpponentScoreChange(index, e.currentTarget.value)}
					/>
					<button
						type="button"
						class="die-clear"
						aria-label={`Remove ${opponent.name}`}
						on:click={() => handleRemoveOpponent(index)}>×</button
					>
				</span>
			</div>
		{/each}
		<button type="button" class="btn btn-secondary" on:click={handleAddOpponent}
			>Add opponent</button
		>
	</div>

	<div class="card history-card">
		<div class="section-label">// turn history</div>
		{#if match.self.turnHistory.length === 0}
			<p class="hint">No completed turns yet.</p>
		{:else}
			<ol class="history-list">
				{#each match.self.turnHistory as banked, index (index)}
					<li>Turn {index + 1}: {banked} pts</li>
				{/each}
			</ol>
		{/if}
	</div>
</section>

<style>
	.tenk {
		padding: 56px 0;
	}
	.intro {
		color: var(--muted);
		font-size: 13px;
		max-width: 640px;
	}
	.card {
		margin-bottom: 16px;
	}
	.ruleset-card {
		display: flex;
		gap: 8px;
	}
	.btn-active {
		border-color: var(--accent);
		color: var(--accent);
	}
	.rules-card summary {
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
	.rules-list li {
		margin-bottom: 6px;
	}
	.kept-dice-card {
		background: var(--bg2);
	}
	.kept-label {
		font-size: 12px;
		color: var(--muted);
		margin-bottom: 8px;
	}
	.die-kept {
		width: 48px;
		height: 48px;
		border-radius: 8px;
		background: var(--bg);
		border: 2px solid var(--border);
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(3, 1fr);
		padding: 6px;
		opacity: 0.7;
	}
	.die-kept .pip {
		background: var(--muted);
	}
	.dice-row {
		display: flex;
		gap: 10px;
		margin-bottom: 14px;
		flex-wrap: wrap;
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
	.pip-tl {
		grid-row: 1;
		grid-column: 1;
	}
	.pip-tr {
		grid-row: 1;
		grid-column: 3;
	}
	.pip-ml {
		grid-row: 2;
		grid-column: 1;
	}
	.pip-mc {
		grid-row: 2;
		grid-column: 2;
	}
	.pip-mr {
		grid-row: 2;
		grid-column: 3;
	}
	.pip-bl {
		grid-row: 3;
		grid-column: 1;
	}
	.pip-br {
		grid-row: 3;
		grid-column: 3;
	}
	.dice-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
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
	.bust-message {
		font-size: 14px;
		color: var(--accent3);
		margin-bottom: 8px;
	}
	.score-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 3px 0;
		font-size: 13px;
		gap: 8px;
	}
	.opponent-controls {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.score-row input {
		width: 72px;
		font-size: 13px;
		padding: 2px 6px;
	}
	.die-clear {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 1px solid var(--border);
		background: var(--bg2);
		color: var(--muted);
		font-size: 11px;
		line-height: 1;
		padding: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.die-clear:hover {
		border-color: var(--accent3);
		color: var(--accent3);
	}
	.history-list {
		font-size: 13px;
		color: var(--muted);
		padding-left: 18px;
		margin: 0;
	}
</style>
