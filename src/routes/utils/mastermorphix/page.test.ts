// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import { CENTER_SLOT } from '$lib/cube/geometry';
import Page from './+page.svelte';

async function clickPiece(container: HTMLElement, slot: number) {
	await fireEvent.click(container.querySelector(`button[data-slot="${slot}"]`)!);
}

const TOP_EDGE = CENTER_SLOT; // the two-colour piece on top (3x3 U center)

describe('/utils/mastermorphix page', () => {
	it('tells you how to hold the puzzle, using the chosen colours', () => {
		render(Page);
		expect(screen.getByText('yellow-blue')).toBeInTheDocument(); // top edge
		expect(screen.getByText('yellow-green')).toBeInTheDocument(); // front edge
	});

	it('offers every look of the clicked spot, with the current one marked', async () => {
		const { container } = render(Page);
		await clickPiece(container, 1); // a face-center spot
		const options = container.querySelectorAll('.option');
		expect(options).toHaveLength(16);
		const active = screen.getByRole('button', { pressed: true });
		expect(active.getAttribute('aria-label')).toMatch(/face center$/);
	});

	it('reports a duplicated piece after picking a tip for a second spot', async () => {
		const { container } = render(Page);
		await clickPiece(container, 1);
		await fireEvent.click(screen.getByRole('button', { name: 'yellow-green-blue tip, way 1' }));
		expect(screen.getByText('The yellow-green-blue tip appears 2 times.')).toBeInTheDocument();
	});

	it('explains that a lone quarter-turned edge is impossible', async () => {
		const { container } = render(Page);
		await clickPiece(container, TOP_EDGE);
		await fireEvent.click(screen.getByRole('button', { name: 'yellow-blue edge, way 2' }));
		expect(screen.getByText(/is probably a quarter turn off/)).toBeInTheDocument();
	});

	it('solves a half-turned edge', async () => {
		const { container } = render(Page);
		await clickPiece(container, TOP_EDGE);
		await fireEvent.click(screen.getByRole('button', { name: 'yellow-blue edge, way 3' }));
		await fireEvent.click(await screen.findByRole('button', { name: 'Solve' }));
		await screen.findByText(/moves\./, {}, { timeout: 30_000 });
		await fireEvent.click(screen.getByRole('button', { name: '⏭' }));
		expect(screen.getByText(/Solved!/)).toBeInTheDocument();
	}, 40_000);
});
