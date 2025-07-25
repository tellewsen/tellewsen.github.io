<script lang="ts">
	let uuids: string[] = [];
	let count: number = 1;
	let useUppercase = false;

	function generateUuid(): string {
		// Use crypto.getRandomValues for secure random UUIDs
		const bytes = crypto.getRandomValues(new Uint8Array(16));

		// Set version 4
		bytes[6] = (bytes[6] & 0x0f) | 0x40;
		// Set variant (RFC 4122)
		bytes[8] = (bytes[8] & 0x3f) | 0x80;

		const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0'));

		const uuid = `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
		return useUppercase ? uuid.toUpperCase() : uuid.toLowerCase();
	}

	function generate() {
		uuids = Array.from({ length: count }, () => generateUuid());
	}

	function copyToClipboard(uuid: string) {
		navigator.clipboard.writeText(uuid).then(() => {
			alert('Copied to clipboard!');
		});
	}
</script>

<title>UUID Generator (v4)</title>
<h1>UUID Generator (v4)</h1>

<div>
	<label
		>How many UUIDs? (1–100)
		<input type="number" bind:value={count} min="1" max="100" /></label
	>
</div>

<div>
	<label><input type="checkbox" bind:checked={useUppercase} /> Use uppercase</label>
</div>

<button on:click={generate}>Generate</button>

{#if uuids.length > 0}
	<div style="margin-top: 1rem;">
		{#each uuids as uuid}
			<div class="uuid-box">
				<span>{uuid}</span>
				<button on:click={() => copyToClipboard(uuid)}>Copy</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.uuid-box {
		padding: 0.5rem;
		margin: 0.25rem 0;
		border: 1px dashed #ccc;
		border-radius: 4px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-family: monospace;
	}

	button {
		margin-left: 0.5rem;
	}
</style>
