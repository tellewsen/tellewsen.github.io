<script lang="ts">
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';

	let text = '';
	let qrCodeDataUrl: string = '';

	const generateQRCode = async () => {
		if (text.trim()) {
			qrCodeDataUrl = await QRCode.toDataURL(text);
		} else {
			qrCodeDataUrl = '';
		}
	};
</script>

<div class="container">
	<h1>QR Code Generator</h1>
	<input type="text" bind:value={text} placeholder="Enter text or URL" />
	<br />
	<button on:click={generateQRCode}>Generate</button>

	{#if qrCodeDataUrl}
		<div>
			<img src={qrCodeDataUrl} alt="QR Code" />
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 500px;
		margin: 2rem auto;
		text-align: center;
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
