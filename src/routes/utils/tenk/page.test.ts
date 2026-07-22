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
});
