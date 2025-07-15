<script lang="ts">
	export let iso: string;
	export let dateStyle = 'full';
	export let timeStyle = 'short';
	let local = '';

	import { onMount } from 'svelte';
	onMount(() => {
		const d = new Date(iso);
		local = d.toLocaleString(undefined, {
			dateStyle: dateStyle,
			timeStyle: timeStyle
		});
	});
</script>

<time datetime={iso}>
	{#if local}
		{local}
	{:else}
		{iso}
	{/if}
</time>
