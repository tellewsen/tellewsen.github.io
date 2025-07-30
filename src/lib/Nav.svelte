<script lang="ts">
	export let active: string = '';
</script>

<nav class="nav">
	<a href="/" class:active={active === '/'}>Home</a>
	<a href="/posts" class:active={active === '/posts'}>Posts</a>
	<a href="/utils" class:active={active === '/utils'}>Utilities</a>
</nav>

<style>
	.nav {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		border-bottom: 1px solid #ddd;
	}

	.nav a {
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		transition: background-color 0.3s;
	}

	.nav a:hover {
		background-color: #e0e0e0;
	}

	.nav a.active {
		background-color: #007acc;
		color: white;
	}
</style>
