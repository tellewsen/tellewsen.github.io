<script lang="ts">
	import Timestamp from '$lib/Timestamp.svelte';
	export let data;
</script>

<h1>All Posts</h1>

{#each data.posts as post}
	<a href={`/posts/${post.slug}`}>
		<h2>{post.title}</h2>
	</a>
	<small><Timestamp iso={post.date} /></small>
	<p>{post.summary}</p>
{/each}
