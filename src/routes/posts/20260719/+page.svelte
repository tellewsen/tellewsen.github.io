<script>
	import Timestamp from '$lib/Timestamp.svelte';
	export let data;
</script>

<article>
	<h1>{data.metadata.title}</h1>
	<small><Timestamp iso={data.metadata.date} /></small>
	<hr />
	<p>
		A while back I read a KTH bachelor's thesis on solving Scandinavian Yatzy optimally with
		backward-induction dynamic programming, and wanted to try building one myself. That turned into
		a CPU solver and a Windows desktop app that gives live move recommendations while you play a
		real game.
	</p>
	<p>
		This week I compiled the same solver to WebAssembly, so there's now a <a href="/utils/yatzy"
			>browser version</a
		> too. No install, runs entirely client-side. Solo mode only, since the desktop app's vs-Computer
		mode needs a win-probability table that's too big to ship to a page. You can also click any scorecard
		row to enter a score you already wrote down on paper, so it works fine jumping into a game that's
		already a few turns in.
	</p>
	<p>Built with Claude Code, same as the last redesign.</p>
</article>
