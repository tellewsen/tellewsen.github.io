<script lang="ts">
	// KaTeX renders at prerender time, so the page ships plain HTML + CSS.
	import katex from 'katex';

	export let tex: string;
	/** Display (block) math instead of inline. */
	export let d = false;

	$: html = katex.renderToString(tex, { displayMode: d, throwOnError: true });
</script>

{#if d}
	<div class="display">{@html html}</div>
{:else}
	{@html html}
{/if}

<style>
	.display {
		overflow-x: auto;
		overflow-y: hidden;
		padding: 2px 0;
	}
</style>
