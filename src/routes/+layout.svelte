<nav class="nav">
	<a href="/">Home</a>
	<a href="/posts">Posts</a>
	<a href="/utils">Utilities</a>
	<a href="/about">About</a>
</nav>

<slot />

<style>
	:global(body) {
		width: 50%;
		margin: auto;
	}
	.nav {
		width: 50%;
		align-items: center;
		margin: auto;
	}
</style>
