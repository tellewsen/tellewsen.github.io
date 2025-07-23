<script>
	import Timestamp from '$lib/Timestamp.svelte';
	export let data;
</script>

<article>
	<h1>{data.metadata.title}</h1>
	<small><Timestamp iso={data.metadata.date} /></small>
	<hr />
	<p>
		There is now an <a href="/utils/cidr">IP Range Calculator</a> in the utils section. I need this from
		time to time, and I always end up on some garbage site with a white background and ads everywhere,
		so here is a simple one that doesn't give you a migraine.
	</p>
</article>
