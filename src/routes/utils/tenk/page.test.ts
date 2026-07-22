// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

describe('/utils/tenk page', () => {
	it('renders both ruleset toggle buttons, basic selected by default', () => {
		render(Page);
		const basicBtn = screen.getByRole('button', { name: 'Basic' });
		const houseruleBtn = screen.getByRole('button', { name: 'House rule' });
		expect(basicBtn.className).toContain('btn-active');
		expect(houseruleBtn.className).not.toContain('btn-active');
	});

	it('switching ruleset resets the in-progress turn and highlights the new button', async () => {
		render(Page);
		const houseruleBtn = screen.getByRole('button', { name: 'House rule' });
		await fireEvent.click(houseruleBtn);
		expect(houseruleBtn.className).toContain('btn-active');
		expect(screen.getByText('Enter all 6 dice to see a recommendation.')).toBeInTheDocument();
	});

	it('shows a hint until all dice are entered', () => {
		render(Page);
		expect(screen.getByText('Enter all 6 dice to see a recommendation.')).toBeInTheDocument();
	});

	it('clicking a die cycles its value', async () => {
		render(Page);
		const firstDie = screen.getByLabelText('Die 1, empty');
		await fireEvent.click(firstDie);
		expect(screen.getByLabelText('Die 1, value 1')).toBeInTheDocument();
	});

	it('adds and removes an opponent', async () => {
		render(Page);
		const addBtn = screen.getByRole('button', { name: 'Add opponent' });
		await fireEvent.click(addBtn);
		expect(screen.getByText('Player 2')).toBeInTheDocument();
		const removeBtn = screen.getByRole('button', { name: 'Remove Player 2' });
		await fireEvent.click(removeBtn);
		expect(screen.queryByText('Player 2')).not.toBeInTheDocument();
	});

	it('rolling all remaining dice produces a recommendation', async () => {
		render(Page);
		const rollBtn = screen.getByRole('button', { name: 'Roll remaining' });
		await fireEvent.click(rollBtn);
		expect(screen.queryByText('Enter all 6 dice to see a recommendation.')).not.toBeInTheDocument();
	});

	it('shows ruleset-specific rules text and updates it when switching', async () => {
		render(Page);
		expect(screen.getByText(/you can leave some unbanked/)).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'House rule' }));
		expect(screen.getByText(/must be banked each throw/)).toBeInTheDocument();
		expect(screen.queryByText(/you can leave some unbanked/)).not.toBeInTheDocument();
	});

	it('shows kept dice from throw 1 during the house-rule combining window', async () => {
		render(Page);
		await fireEvent.click(screen.getByRole('button', { name: 'House rule' }));

		// one scoring 1, five non-scoring dice -> partial fresh-throw score
		const dieValues = [1, 2, 3, 4, 6, 6];
		for (let i = 0; i < dieValues.length; i++) {
			const die = screen.getByLabelText(`Die ${i + 1}, empty`);
			for (let click = 0; click < dieValues[i]; click++) {
				await fireEvent.click(die);
			}
		}

		expect(
			screen.queryByText('Kept from throw 1 — combines with this roll:')
		).not.toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: /Reroll remaining dice/ }));

		expect(screen.getByText('Kept from throw 1 — combines with this roll:')).toBeInTheDocument();
		expect(screen.getByLabelText('Kept die, value 1')).toBeInTheDocument();
	});
});
