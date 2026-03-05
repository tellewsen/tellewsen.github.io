<script lang="ts">
	import Timestamp from '$lib/Timestamp.svelte';
	export let data;
</script>

<svelte:head>
	<title>Posts — ellewsen.no</title>
</svelte:head>

<section class="posts">
	<div class="section-label">// posts</div>
	{#each data.posts as post}
		<a href={`/posts/${post.slug}`} class="post-card card">
			<div class="post-meta">
				<span class="post-date"><Timestamp iso={post.date} dateStyle="long" timeStyle="short" /></span>
			</div>
			<div class="post-title">{post.title}</div>
			{#if post.summary}
				<div class="post-summary">{post.summary}</div>
			{/if}
		</a>
	{/each}
</section>

<style>
	.posts {
		padding: 56px 0;
	}

	.post-card {
		display: block;
		text-decoration: none;
		margin-bottom: 12px;
	}

	.post-card:hover {
		border-color: var(--accent);
	}

	.post-meta {
		font-size: 11px;
		color: var(--muted);
		letter-spacing: 0.04em;
		margin-bottom: 6px;
	}

	.post-title {
		font-family: var(--sans);
		font-size: 16px;
		font-weight: 600;
		color: var(--bright);
		transition: color 0.15s;
	}

	.post-card:hover .post-title {
		color: var(--accent);
	}

	.post-summary {
		font-size: 12px;
		color: var(--muted);
		margin-top: 6px;
		line-height: 1.5;
	}
</style>
