<script lang="ts">
	import { page } from '$app/stores';

	$: path = $page.url.pathname;
</script>

<nav>
	<a href="/" class="nav-logo">ae<span>.</span></a>
	<ul class="nav-links">
		<li><a href="/" class:active={path === '/'}>~/home</a></li>
		<li><a href="/posts" class:active={path.startsWith('/posts')}>~/posts</a></li>
		<li><a href="/utils" class:active={path.startsWith('/utils')}>~/utils</a></li>
	</ul>
</nav>

<style>
	nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 28px 0 24px;
		border-bottom: 1px solid var(--border);
		flex-wrap: wrap;
		gap: 12px;
	}

	.nav-logo {
		font-family: var(--sans);
		font-size: 15px;
		font-weight: 700;
		color: var(--bright);
		text-decoration: none;
		letter-spacing: 0.02em;
	}

	.nav-logo span { color: var(--accent); }

	.nav-links {
		display: flex;
		gap: 4px;
		list-style: none;
	}

	.nav-links a {
		color: var(--muted);
		text-decoration: none;
		font-size: 12px;
		padding: 5px 10px;
		border: 1px solid transparent;
		border-radius: 4px;
		transition: all 0.15s ease;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.nav-links a:hover {
		color: var(--accent);
		border-color: var(--accent);
		background: rgba(57,211,83,0.06);
	}

	.nav-links a.active {
		color: var(--accent);
		border-color: var(--border);
		background: var(--surface);
	}
</style>
