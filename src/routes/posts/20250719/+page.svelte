<script>
	import Timestamp from '$lib/Timestamp.svelte';
	export let data;
</script>

<article>
	<h1>{data.metadata.title}</h1>
	<small><Timestamp iso={data.metadata.date} /></small>
	<hr />
	<p>
		There is now a <a href="/utils/bmi">BMI calculator</a> in the utils section. I use the formula
		and thresholds described in the
		<a href="https://en.wikipedia.org/wiki/Body_mass_index">Wikipedia article</a> for adults.
	</p>
</article>
