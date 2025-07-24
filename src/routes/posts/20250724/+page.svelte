<script>
	import Timestamp from '$lib/Timestamp.svelte';
	export let data;
</script>

<article>
	<h1>{data.metadata.title}</h1>
	<small><Timestamp iso={data.metadata.date} /></small>
	<hr />
	<p>
		The <a href="/utils/cidr">IP Range Calculator</a> from yesterday now supports ipv6.
	</p>
</article>
