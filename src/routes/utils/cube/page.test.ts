// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

describe('/utils/cube page', () => {
	it('starts blank except centers, and asks for the rest to be painted', () => {
		render(Page);
		expect(screen.getByLabelText('Front face, sticker 5, green')).toBeDisabled();
		expect(screen.getByLabelText('Front face, sticker 1, unpainted')).toBeInTheDocument();
		expect(screen.getByText('48 stickers left to paint.')).toBeInTheDocument();
	});

	it('paints a sticker with the selected colour', async () => {
		render(Page);
		await fireEvent.click(screen.getByRole('button', { name: 'Paint red' }));
		await fireEvent.click(screen.getByLabelText('Up face, sticker 1, unpainted'));
		expect(screen.getByLabelText('Up face, sticker 1, red')).toBeInTheDocument();
		expect(screen.getByText('47 stickers left to paint.')).toBeInTheDocument();
	});

	it('explains why an impossible cube cannot be solved', async () => {
		render(Page);
		await fireEvent.click(screen.getByRole('button', { name: 'Solved' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Paint red' }));
		await fireEvent.click(screen.getByLabelText('Up face, sticker 1, white'));
		expect(screen.getByText('There are 10 red stickers, expected 9.')).toBeInTheDocument();
	});

	it('solves a random cube and steps through the solution', async () => {
		render(Page);
		await fireEvent.click(screen.getByRole('button', { name: 'Random' }));
		await fireEvent.click(await screen.findByRole('button', { name: 'Solve' }));
		const hint = await screen.findByText(/moves\./, {}, { timeout: 20_000 });
		expect(hint.textContent).toMatch(/Step 1:/);
		await fireEvent.click(screen.getByRole('button', { name: '⏭' }));
		expect(screen.getByText(/Solved!/)).toBeInTheDocument();
		expect(screen.getByLabelText('Front face, sticker 1, green')).toBeDisabled();
		expect(screen.getByLabelText('Up face, sticker 9, white')).toBeInTheDocument();
	}, 30_000);
});
