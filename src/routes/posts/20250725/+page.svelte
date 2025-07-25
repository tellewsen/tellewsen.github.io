<script>
	import Timestamp from '$lib/Timestamp.svelte';
	export let data;
</script>

<article>
	<h1>{data.metadata.title}</h1>
	<small><Timestamp iso={data.metadata.date} /></small>
	<hr />
	<p>
		The site got a few new utils today. Most of it is just thrown together by Copilot and ChatGPT to
		get a better feel of what different models are capable of. They can at least do simple stuff,
		but making it correct on the first attempt usually fails, and anything slightly complicated
		rarely works well.
	</p>
	<p>
		I also updated the nav bar, making it its own component instead of just having a nav tag on the
		layout page.
	</p>
</article>
