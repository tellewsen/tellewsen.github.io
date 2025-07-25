<script lang="ts">
	let jwt: string = '';
	let header: object | null = null;
	let payload: object | null = null;
	let error: string | null = null;

	function base64UrlDecode(str: string): string {
		// Fix padding and URL-safe characters
		str = str.replace(/-/g, '+').replace(/_/g, '/');
		while (str.length % 4 !== 0) {
			str += '=';
		}
		const bin = atob(str);
		const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
		return new TextDecoder().decode(bytes);
	}

	function decodeJwt() {
		error = null;
		header = null;
		payload = null;

		const parts = jwt.split('.');
		if (parts.length !== 3) {
			error = 'Invalid JWT format (must have 3 parts)';
			return;
		}

		try {
			header = JSON.parse(base64UrlDecode(parts[0]));
			payload = JSON.parse(base64UrlDecode(parts[1]));
		} catch (e) {
			error = 'Failed to decode JWT: ' + (e as Error).message;
		}
	}
</script>

<h2>JWT Decoder</h2>

<textarea bind:value={jwt} placeholder="Paste your JWT here..."></textarea>
<button on:click={decodeJwt}>Decode</button>

{#if error}
	<p style="color: red;">{error}</p>
{/if}

{#if header}
	<h3>Header</h3>
	<pre>{JSON.stringify(header, null, 2)}</pre>
{/if}

{#if payload}
	<h3>Payload</h3>
	<pre>{JSON.stringify(payload, null, 2)}</pre>
{/if}

<style>
	textarea {
		width: 100%;
		height: 100px;
		font-family: monospace;
		margin-bottom: 1rem;
	}

	pre {
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		white-space: pre-wrap;
	}
</style>
