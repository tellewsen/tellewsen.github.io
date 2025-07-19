<script>
	import Timestamp from '$lib/Timestamp.svelte';
	export let data;
</script>

<article>
	<h1>{data.metadata.title}</h1>
	<small><Timestamp iso={data.metadata.date} /></small>
	<hr />
	<p>
		Welcome to the site. Nothing special to say so far. At the moment this is just a convenient
		place to keep track of projects I've been a part of. Hopefully moving to this format will make
		adding small updates about interesting things more convenient in the future.
	</p>
</article>
