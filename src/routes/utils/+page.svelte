<svelte:head>
	<title>Utilities — ellewsen.no</title>
</svelte:head>

<section class="utils">
	<div class="section-label">// utils</div>
	<div class="utils-grid">
		<a href="/utils/fnr" class="card util-card">
			<div class="util-name">fnr</div>
			<div class="util-desc">Norwegian national identifier generator</div>
		</a>
		<a href="/utils/qr" class="card util-card">
			<div class="util-name">qr</div>
			<div class="util-desc">QR code generator</div>
		</a>
		<a href="/utils/bmi" class="card util-card">
			<div class="util-name">bmi</div>
			<div class="util-desc">BMI calculator</div>
		</a>
		<a href="/utils/cidr" class="card util-card">
			<div class="util-name">cidr</div>
			<div class="util-desc">IP range calculator</div>
		</a>
		<a href="/utils/uuid" class="card util-card">
			<div class="util-name">uuid</div>
			<div class="util-desc">UUID generator (v4)</div>
		</a>
		<a href="/utils/b64" class="card util-card">
			<div class="util-name">b64</div>
			<div class="util-desc">Base64 encoder / decoder</div>
		</a>
		<a href="/utils/jwt" class="card util-card">
			<div class="util-name">jwt</div>
			<div class="util-desc">JWT decoder</div>
		</a>
	</div>
</section>

<style>
	.utils {
		padding: 56px 0;
	}

	.utils-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 12px;
	}

	.util-card {
		display: block;
		text-decoration: none;
	}

	.util-card:hover {
		border-color: var(--accent);
	}

	.util-name {
		font-family: var(--mono);
		font-size: 13px;
		font-weight: 600;
		color: var(--accent);
		margin-bottom: 6px;
		letter-spacing: 0.04em;
	}

	.util-card:hover .util-name {
		text-shadow: 0 0 8px rgba(57,211,83,0.4);
	}

	.util-desc {
		font-size: 12px;
		color: var(--muted);
		line-height: 1.4;
	}
</style>
