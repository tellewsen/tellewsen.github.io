<script lang="ts">
	import Nav from '$lib/Nav.svelte';
	import '../app.css';
</script>

<div class="shell">
	<Nav />
	<slot />
	<footer>
		<div class="footer-left">
			<span>ellewsen.no</span> — built for speed, not spectacle
		</div>
		<div class="footer-links">
			<a href="/posts">posts</a>
			<a href="/utils">utils</a>
		</div>
	</footer>
</div>

<style>
	footer {
		padding: 32px 0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px;
		border-top: 1px solid var(--border);
		margin-top: 56px;
	}

	.footer-left {
		font-size: 11px;
		color: var(--muted);
	}

	.footer-left span { color: var(--accent); }

	.footer-links {
		display: flex;
		gap: 16px;
	}

	.footer-links a {
		font-size: 11px;
		color: var(--muted);
		text-decoration: none;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		transition: color 0.15s;
	}

	.footer-links a:hover { color: var(--accent2); }
</style>
