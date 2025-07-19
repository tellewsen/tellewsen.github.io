<script>
	import Timestamp from '$lib/Timestamp.svelte';
	export let data;
</script>

<article>
	<h1>{data.metadata.title}</h1>
	<small><Timestamp iso={data.metadata.date} /></small>
	<hr />
	<p>
		The site got a <a href="/utils/qr">QR code generator</a> yesterday. However, pretty much everyone
		wants to stuff a logo or something in their codes, so now you can do that here as well. At the moment
		it's quite stupid, so if you upload something with transparent parts you're going to get something
		ugly.
	</p>
</article>
