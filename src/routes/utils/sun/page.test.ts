// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

beforeAll(() => {
	// jsdom has no canvas or ResizeObserver; the dome just doesn't draw.
	HTMLCanvasElement.prototype.getContext = () => null;
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof ResizeObserver;
});

describe('/utils/sun page', () => {
	it('renders the derivation', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: 'The mathematics' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: '§6 What shape is it?' })).toBeInTheDocument();
	});

	it('shows the midnight sun at the North Pole in June', async () => {
		render(Page);
		await fireEvent.click(screen.getByRole('button', { name: 'North Pole' }));
		const date = screen.getByLabelText(/^Date/);
		await fireEvent.input(date, { target: { value: '171' } });
		expect(screen.getByText('midnight sun')).toBeInTheDocument();
		await fireEvent.input(date, { target: { value: '354' } });
		expect(screen.getByText('polar night')).toBeInTheDocument();
	});

	it('has no equation of time without tilt or eccentricity', async () => {
		render(Page);
		await fireEvent.input(screen.getByLabelText(/^Axial tilt/), { target: { value: '0' } });
		await fireEvent.input(screen.getByLabelText(/^Eccentricity/), { target: { value: '0' } });
		expect(
			screen.getByText('Equation of time', { selector: '.stat-label' }).nextElementSibling
		).toHaveTextContent('+0:00');
		await fireEvent.click(screen.getByRole('button', { name: 'Reset to Earth' }));
		expect(
			screen.getByText('Equation of time', { selector: '.stat-label' }).nextElementSibling
		).not.toHaveTextContent('+0:00');
	});
});
