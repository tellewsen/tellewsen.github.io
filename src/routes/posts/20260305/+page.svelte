<script>
	import Timestamp from '$lib/Timestamp.svelte';
	export let data;
</script>

<article>
	<h1>{data.metadata.title}</h1>
	<small><Timestamp iso={data.metadata.date} /></small>
	<hr />
	<p>
		The site got a visual overhaul. The old design was functional but pretty bare — default fonts,
		light background, no real aesthetic to speak of. The new one goes for a dark terminal look:
		JetBrains Mono throughout, a green accent borrowed from GitHub's contribution graph, subtle
		scanlines and a grid overlay in the background.
	</p>
	<p>
		I used Claude for most of it. Started in the web interface to get the homepage looking the way
		I wanted, then used Claude Code to port it into the SvelteKit codebase and roll it out to the
		rest of the pages. I've been more optimistic about LLMs for coding lately — it's starting to
		feel less like fighting the tool and more like just getting things done.
	</p>
</article>
