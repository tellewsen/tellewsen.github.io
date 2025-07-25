<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;

	let canvasWidth = 0;
	let canvasHeight = 0;
	const padding = 50;

	const heightRange: [number, number] = [140, 200]; // cm
	const weightRange: [number, number] = [40, 140]; // kg

	const hoverBMI = writable<number | null>(null);
	const hoverHeight = writable<number | null>(null);
	const hoverWeight = writable<number | null>(null);

	function computeBMI(heightCm: number, weightKg: number): number {
		const heightM = heightCm / 100;
		return weightKg / (heightM * heightM);
	}

	function getColorForBMI(bmi: number): string {
		if (bmi < 18.5) return '#ADD8E6'; // Underweight
		if (bmi < 25) return '#90EE90'; // Normal
		if (bmi < 30) return '#FFD580'; // Overweight
		return '#FF7F7F'; // Obese
	}

	function drawAxes(ctx: CanvasRenderingContext2D, w: number, h: number) {
		const plotWidth = w - 2 * padding;
		const plotHeight = h - 2 * padding;

		ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
		ctx.fillStyle = 'rgba(255, 255, 255, 0.87)';
		ctx.lineWidth = 1;
		ctx.font = '12px sans-serif';
		ctx.textAlign = 'left';

		// Y Axis (Weight)
		for (let i = 0; i <= 10; i++) {
			const weight = weightRange[0] + (i / 10) * (weightRange[1] - weightRange[0]);
			const y = h - padding - (i / 10) * plotHeight;
			ctx.beginPath();
			ctx.moveTo(padding - 5, y);
			ctx.lineTo(padding, y);
			ctx.stroke();
			ctx.fillText(`${Math.round(weight)} kg`, 5, y + 4);
		}

		// X Axis (Height)
		for (let i = 0; i <= 10; i++) {
			const hCm = heightRange[0] + (i / 10) * (heightRange[1] - heightRange[0]);
			const x = padding + (i / 10) * plotWidth;
			ctx.beginPath();
			ctx.moveTo(x, h - padding);
			ctx.lineTo(x, h - padding + 5);
			ctx.stroke();
			ctx.fillText(`${Math.round(hCm)} cm`, x - 15, h - padding + 20);
		}

		// Labels
		ctx.save();
		ctx.translate(15, h / 2);
		ctx.rotate(-Math.PI / 2);
		ctx.textAlign = 'center';
		ctx.fillText('Weight (kg)', 0, 0);
		ctx.restore();

		ctx.textAlign = 'center';
		ctx.fillText('Height (cm)', w / 2, h - 10);
	}

	function drawLegend(ctx: CanvasRenderingContext2D, w: number, h: number) {
		const boxSize = 15;
		const lineHeight = 22;
		const paddingInner = 10;

		const legendItems = [
			{ label: 'Underweight (<18.5)', color: '#ADD8E6' },
			{ label: 'Normal (18.5–24.9)', color: '#90EE90' },
			{ label: 'Overweight (25–29.9)', color: '#FFD580' },
			{ label: 'Obese (30+)', color: '#FF7F7F' }
		];

		const legendWidth = 180;
		const legendHeight = legendItems.length * lineHeight + paddingInner * 2;
		const x = w - legendWidth - padding; // top-right inside canvas
		const y = padding;

		// Background box
		ctx.fillStyle = 'rgba(20, 20, 20, 0.85)';
		ctx.fillRect(x, y, legendWidth, legendHeight);
		ctx.strokeStyle = '#555';
		ctx.strokeRect(x, y, legendWidth, legendHeight);

		// Text & swatches
		ctx.font = '12px sans-serif';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';

		legendItems.forEach((item, i) => {
			const yOffset = y + paddingInner + i * lineHeight;
			ctx.fillStyle = item.color;
			ctx.fillRect(x + paddingInner, yOffset, boxSize, boxSize);
			ctx.fillStyle = 'rgba(255, 255, 255, 0.87)';
			ctx.fillText(item.label, x + paddingInner + boxSize + 6, yOffset + boxSize / 2);
		});
	}

	function render() {
		if (!ctx) return;

		ctx.clearRect(0, 0, canvasWidth, canvasHeight);

		const plotWidth = canvasWidth - 2 * padding;
		const plotHeight = canvasHeight - 2 * padding;

		for (let py = 0; py < plotHeight; py++) {
			const weight = weightRange[0] + (weightRange[1] - weightRange[0]) * (py / plotHeight);
			for (let px = 0; px < plotWidth; px++) {
				const heightCm = heightRange[0] + (heightRange[1] - heightRange[0]) * (px / plotWidth);
				const bmi = computeBMI(heightCm, weight);
				ctx.fillStyle = getColorForBMI(bmi);
				ctx.fillRect(padding + px, canvasHeight - padding - py, 1, 1);
			}
		}

		drawAxes(ctx, canvasWidth, canvasHeight);
		drawLegend(ctx, canvasWidth, canvasHeight);
	}

	function handleMouseMove(e: MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;

		const plotWidth = canvasWidth - 2 * padding;
		const plotHeight = canvasHeight - 2 * padding;

		if (mx < padding || mx > canvasWidth - padding || my < padding || my > canvasHeight - padding) {
			hoverBMI.set(null);
			hoverHeight.set(null);
			hoverWeight.set(null);
			return;
		}

		const relX = (mx - padding) / plotWidth;
		const relY = (canvasHeight - padding - my) / plotHeight;

		const h = heightRange[0] + relX * (heightRange[1] - heightRange[0]);
		const w = weightRange[0] + relY * (weightRange[1] - weightRange[0]);
		const bmi = computeBMI(h, w);

		hoverBMI.set(bmi);
		hoverHeight.set(h);
		hoverWeight.set(w);
	}

	onMount(() => {
		const resizeObserver = new ResizeObserver(() => {
			canvasWidth = canvas.clientWidth;
			canvasHeight = canvas.clientHeight;
			canvas.width = canvasWidth;
			canvas.height = canvasHeight;
			ctx = canvas.getContext('2d');
			render();
		});

		resizeObserver.observe(canvas);
		canvas.addEventListener('mousemove', handleMouseMove);

		return () => {
			resizeObserver.disconnect();
		};
	});
</script>

<title>BMI calculator</title>
<h2>BMI calculator</h2>

<div style="position: relative; width: 100%; max-width: 900px;">
	<canvas bind:this={canvas}></canvas>
	<div class="hover-box">
		{#if $hoverBMI !== null}
			<div><strong>BMI:</strong> {$hoverBMI.toFixed(1)}</div>
			<div><strong>Height:</strong> {$hoverHeight?.toFixed(0)} cm</div>
			<div><strong>Weight:</strong> {$hoverWeight?.toFixed(0)} kg</div>
		{:else}
			<div>Hover over chart</div>
		{/if}
	</div>
	<p>
		The calculator uses the formula and thresholds described in the
		<a href="https://en.wikipedia.org/wiki/Body_mass_index">Wikipedia article</a> for adults.
	</p>

	<p>
		Please remember that BMI is just a number to give you an idea if your weight may be unhealthy.
		It doesn't tell the whole story, and I only made this thing because I wanted to see how you can
		draw plots without using libraries. I highly reccommend reading the wikipedia article linked
		above, as it has some really interesting points around the limitations of BMI.
	</p>
	<p>
		I had never heard of the <a href="https://en.wikipedia.org/wiki/Corpulence_index"
			>Corpulence index</a
		>, which seems to be a much better measure since it scales by height cubed like you'd expect for
		people living in three dimensions. Maybe this page shows a curpulence index calculator the next
		time you visit?
	</p>
</div>

<style>
	.hover-box {
		position: absolute;
		top: 10px;
		left: 10px;
		background: rgba(20, 20, 20, 0.85);
		border: 1px solid #555;
		color: rgba(255, 255, 255, 0.87);
		padding: 6px 10px;
		font-size: 14px;
		border-radius: 4px;
		pointer-events: none;
	}

	canvas {
		width: 90%;
		height: auto;
		/* display: flex; */
		/* border: 1px solid #555; */
	}
</style>
