<script>
	import Timestamp from '$lib/Timestamp.svelte';
</script>

<h1>A qr code appears!</h1>

<p><Timestamp iso="2025-07-15T09:30:05+02:00" /></p>

<div>
	The site now has a <a href="/utils/qr">QR code generator</a> in the utils section. It uses the npm
	package <a href="https://www.npmjs.com/package/qrcode">qrcode</a>. Maybe I'll write my own one at
	some point just to understand the algorithm.
</div>
