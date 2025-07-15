<script lang="ts">
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';

	let input = '';
	let dataUrl = '';
	let error = '';

	$: generateQRCode();

	function generateQRCode() {
		if (!input) {
			dataUrl = '';
			error = '';
			return;
		}

		QRCode.toDataURL(input)
			.then((url) => {
				dataUrl = url;
				error = '';
			})
			.catch((err) => {
				dataUrl = '';
				error = '❌ Could not generate QR code: ' + err.message;
			});
	}
</script>

<div class="container">
	<h1>QR Code Generator</h1>
	<input type="text" bind:value={input} placeholder="Enter text or URL" />
	<br />
	<button on:click={generateQRCode}>Generate</button>
	{#if error}
		<p class="error">{error}</p>
	{:else if dataUrl}
		<div>
			<img src={dataUrl} alt="QR Code" />
		</div>
	{/if}
</div>

<style>
	.error {
		color: red;
		margin-top: 0.5rem;
	}
	.container {
		max-width: 500px;
		/* margin: 2rem auto; */
		/* text-align: center; */
		font-family: sans-serif;
	}

	input {
		padding: 0.5rem;
		width: 80%;
		margin-bottom: 1rem;
	}

	button {
		padding: 0.5rem 1rem;
		margin-bottom: 1rem;
	}

	img {
		margin-top: 1rem;
		border: 1px solid #ccc;
		padding: 0.5rem;
	}
</style>
