<script lang="ts">
	let input: string = '';
	let output: string = '';
	let mode: 'encode' | 'decode' = 'encode';
	let error: string | null = null;

	// Safer UTF-8 encode/decode than raw atob/btoa
	function base64Encode(str: string): string {
		const utf8 = new TextEncoder().encode(str);
		const bin = String.fromCharCode(...utf8);
		return btoa(bin);
	}

	function base64Decode(str: string): string {
		const bin = atob(str);
		const bytes = Uint8Array.from(bin, (char) => char.charCodeAt(0));
		return new TextDecoder().decode(bytes);
	}

	function run() {
		try {
			error = null;
			if (mode === 'encode') {
				output = base64Encode(input);
			} else {
				output = base64Decode(input);
			}
		} catch (e) {
			output = '';
			error = 'Invalid input for decoding.';
		}
	}
</script>

<title>Base64 Encoder / Decoder</title>
<h2>Base64 Encoder / Decoder</h2>

<div>
	<label>
		<input type="radio" bind:group={mode} value="encode" />
		Encode
	</label>
	<label>
		<input type="radio" bind:group={mode} value="decode" />
		Decode
	</label>
</div>

<textarea bind:value={input} placeholder="Enter your text here..."></textarea>
<button on:click={run}>Run</button>

{#if error}
	<p style="color: red;">{error}</p>
{/if}

{#if output}
	<h3>Result</h3>
	<textarea readonly bind:value={output}></textarea>
{/if}

<style>
	textarea {
		width: 100%;
		height: 120px;
		font-family: monospace;
		margin-bottom: 1rem;
	}
</style>
