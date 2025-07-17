<script lang="ts">
	import QRCode from 'qrcode';

	const canvasSideLength = 512;
	let input = '';
	let value = '';

	let canvasEl: HTMLCanvasElement;
	let logoFile: File | null = null;
	let logoData: string | null = null;
	let fileInputEl: HTMLInputElement;
	let error: string | null = null;

	// Wi-Fi mode fields
	let isWifiMode = false;
	let form = {
		ssid: '',
		password: '',
		encryption: 'WPA',
		hidden: false
	};

	function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			logoFile = target.files[0];
			const reader = new FileReader();
			reader.onload = () => {
				logoData = reader.result as string;
			};
			reader.readAsDataURL(logoFile);
		}
	}

	function removeLogo() {
		logoFile = null;
		logoData = null;
		if (fileInputEl) fileInputEl.value = '';
	}

	async function generateQRCode() {
		if (isWifiMode) {
			if (!form.ssid) {
				error = 'SSID is required.';
				clearCanvas();
				return;
			}
			const enc = form.encryption === 'None' ? 'nopass' : form.encryption;
			value = `WIFI:T:${enc};S:${form.ssid};P:${form.password};${form.hidden ? 'H:true;' : ''};`;
		} else {
			value = input;
		}
		if (!value || !canvasEl) {
			clearCanvas();
			error = null;
			return;
		}
		try {
			await QRCode.toCanvas(canvasEl, value, {
				errorCorrectionLevel: 'H',
				margin: 2,
				width: canvasSideLength
			});
			error = null;

			if (logoData) {
				const ctx = canvasEl.getContext('2d');
				if (!ctx) return;

				const img = new Image();
				img.src = logoData;

				await new Promise<void>((resolve, reject) => {
					img.onload = () => resolve();
					img.onerror = reject;
				});

				const size = canvasSideLength / 4;
				const x = (canvasEl.width - size) / 2;
				const y = (canvasEl.height - size) / 2;
				ctx.drawImage(img, x, y, size, size);
			}
		} catch (err) {
			error = 'Failed to generate QR code. Try shortening the input or checking the content.';
			clearCanvas();
		}
	}

	function clearCanvas() {
		const ctx = canvasEl?.getContext('2d');
		if (ctx) ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
	}

	$: input, isWifiMode, logoData, form, generateQRCode();
</script>

<div class="container">
	<h1>QR Code Generator</h1>
	<label>
		<input type="checkbox" bind:checked={isWifiMode} />
		Wi-Fi Mode
	</label>
	{#if isWifiMode}
		<form>
			<label>
				SSID:
				<input class="input" bind:value={form.ssid} />
			</label>
			<label>
				Password:
				<input class="input" bind:value={form.password} />
			</label>
			<label>
				Encryption:
				<select class="input" bind:value={form.encryption}>
					<option value="WPA">WPA/WPA2/WPA3</option>
					<option value="WEP">WEP</option>
					<option value="None">None</option>
				</select>
			</label>
			<label>
				<input type="checkbox" bind:checked={form.hidden} />
				Hidden network
			</label>
		</form>
	{:else}
		<div>
			<input class="input" placeholder="Enter text to encode" bind:value={input} />
		</div>
	{/if}
	{#if error}
		<p class="error">{error}</p>
	{/if}

	<div class="upload-section">
		<label for="logoUpload">Upload logo:</label>
		<input
			id="logoUpload"
			type="file"
			accept="image/*"
			bind:this={fileInputEl}
			on:change={handleFileUpload}
		/>
		{#if logoData}
			<button on:click={removeLogo} class="remove-btn">Remove logo</button>
		{/if}
	</div>

	<canvas bind:this={canvasEl} width={canvasSideLength} height={canvasSideLength} class="canvas"
	></canvas>
</div>

<style>
	.error {
		color: red;
		margin: 0.5rem 0 1rem 0;
	}

	.upload-section {
		margin-bottom: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.remove-btn {
		padding: 0.3rem 0.6rem;
		border: 1px solid red;
		color: red;
		background: transparent;
		cursor: pointer;
		border-radius: 4px;
	}

	.canvas {
		border: 1px solid #ccc;
		margin-top: 1rem;
	}
</style>
