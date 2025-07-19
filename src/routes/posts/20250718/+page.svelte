<script>
	import Timestamp from '$lib/Timestamp.svelte';
	export let data;
</script>

<article>
	<h1>{data.metadata.title}</h1>
	<small><Timestamp iso={data.metadata.date} /></small>
	<hr />
	<p>
		The <a href="/utils/qr">QR code generator</a> now supports "wifi mode". Basically you input the
		ssid, password, etc. and you get a qr code you scan to connect to your wifi. I've tried to give
		us the bare minimum specified in section 7 of the
		<a href="https://www.wi-fi.org/system/files/WPA3%20Specification%20v3.5.pdf"
			>WPA 3 specification</a
		>.
	</p>
</article>
