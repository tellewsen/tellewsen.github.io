<script>
	import Timestamp from '$lib/Timestamp.svelte';
	export let data;
</script>

<article>
	<h1>{data.metadata.title}</h1>
	<small><Timestamp iso={data.metadata.date} /></small>
	<hr />
	<p>Started doing some boot.dev and OverTheWire's Bandit game lately.</p>
	<p>
		I paid for boot.dev. It's a bit expensive, and I don't really care about most of the
		gamification stuff, but the streak is kind of fun and does make me keep going. It's a good
		introduction to programming in general, and the intro to new languages is pretty good
	</p>
	<p>
		Bandit is also fun. It's basically: ssh in, run some commands you have to look up, and get the
		password for the next level. It's a bit more terminal-focused than boot.dev, which is nice. I
		like that it's more hands-on and less tutorial-y.
	</p>
	<p>Anyway, both are good. More terminal reps, less tutorial coma.</p>
</article>
