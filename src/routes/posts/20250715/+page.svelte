<script>
	import Timestamp from '$lib/Timestamp.svelte';
	export let data;
</script>

<article>
	<h1>{data.metadata.title}</h1>
	<small><Timestamp iso={data.metadata.date} /></small>
	<hr />
	<p>
		The site now has a <a href="/utils/qr">QR code generator</a> in the utils section. It uses the
		npm package <a href="https://www.npmjs.com/package/qrcode">qrcode</a>. Maybe I'll write my own
		one at some point just to understand the algorithm.
	</p>
</article>
