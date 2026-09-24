// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

async function selectPiece(name: string) {
	const select = screen.getByLabelText('Selected piece') as HTMLSelectElement;
	const option = [...select.options].find((o) => o.textContent === name)!;
	await fireEvent.change(select, { target: { value: option.value } });
}

describe('/utils/mastermorphix page', () => {
	it('tells you how to hold the puzzle, using the chosen colours', () => {
		render(Page);
		expect(screen.getByText('yellow-blue')).toBeInTheDocument(); // top center
		expect(screen.getByText('yellow-green')).toBeInTheDocument(); // front center
	});

	it('reports a duplicated piece after changing a corner', async () => {
		render(Page);
		await selectPiece('top-front-left corner');
		expect(screen.getByText(/holds the/).textContent).toMatch(/triangle/);
		await fireEvent.click(screen.getByRole('button', { name: 'yellow-green-blue tip' }));
		expect(
			screen.getByText('The yellow-green-blue tip appears 2 times: top-front-right and top-front-left.')
		).toBeInTheDocument();
	});

	it('explains that a lone quarter-turned center is impossible', async () => {
		render(Page);
		await selectPiece('top center');
		await fireEvent.click(screen.getByRole('button', { name: 'Turn' }));
		expect(screen.getByText(/a center is probably a quarter turn off/)).toBeInTheDocument();
	});

	it('solves a half-turned center', async () => {
		render(Page);
		await selectPiece('top center');
		await fireEvent.click(screen.getByRole('button', { name: 'Turn' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Turn' }));
		await fireEvent.click(await screen.findByRole('button', { name: 'Solve' }));
		await screen.findByText(/moves\./, {}, { timeout: 30_000 });
		await fireEvent.click(screen.getByRole('button', { name: '⏭' }));
		expect(screen.getByText(/Solved!/)).toBeInTheDocument();
	}, 40_000);
});
