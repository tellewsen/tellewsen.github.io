<script lang="ts">
	import moment, { type Moment } from 'moment';
	const makeFnr = (fdate: Moment, nums: string) => {
		const d = String(fdate.date()).padStart(2, '0');
		const d1 = parseInt(d[0]);
		const d2 = parseInt(d[1]);
		const m = String(fdate.month() + 1).padStart(2, '0');
		const m1 = parseInt(m[0]);
		const m2 = parseInt(m[1]);
		const i1 = parseInt(nums[0]);
		const i2 = parseInt(nums[1]);
		const i3 = parseInt(nums[2]);
		const y = String(fdate.year());
		const y1 = parseInt(y[2]);
		const y2 = parseInt(y[3]);
		const k1 =
			11 - ((3 * d1 + 7 * d2 + 6 * m1 + 1 * m2 + 8 * y1 + 9 * y2 + 4 * i1 + 5 * i2 + 2 * i3) % 11);
		const k2 =
			11 -
			((5 * d1 + 4 * d2 + 3 * m1 + 2 * m2 + 7 * y1 + 6 * y2 + 5 * i1 + 4 * i2 + 3 * i3 + 2 * k1) %
				11);
		const fnr = `${d1}${d2}${m1}${m2}${y1}${y2}${i1}${i2}${i3}${k1}${k2}`;
		if (k1 > 9 || k2 > 9) {
			return null;
		}
		return fnr;
	};
	const getValidFnrs = (fdate: Moment) => {
		const year = fdate.year();
		let start_index = 0;
		let end_index = 0;
		if (1900 <= year && year <= 1999) {
			start_index = 0;
			end_index = 500;
		} else if (1854 <= year && year <= 1899) {
			start_index = 500;
			end_index = 750;
		} else if (2000 <= year && year <= 2039) {
			start_index = 500;
			end_index = 1000;
		} else if (1940 <= year && year <= 1999) {
			start_index = 900;
			end_index = 1000;
		}

		let fnrs: Array<string> = [];
		for (let index = start_index; index < end_index; index++) {
			const fnr = makeFnr(fdate, String(index).padStart(3, '0'));
			if (fnr === null) {
				continue;
			}
			fnrs.push(fnr);
		}
		const chunkSize = 8;
		let fnr_rows: string[][] = [];
		for (let i = 0; i < fnrs.length; i += chunkSize) {
			fnr_rows.push(fnrs.slice(i, i + chunkSize));
		}

		return fnr_rows;
	};
	const getRandomDate = () => {
		const start = new Date('1854-01-01');
		const end = new Date('2039-12-31');
		return moment(
			new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
		).format('DD/MM/YYYY');
	};
	let fdate = '';
	$: validfnrs = getValidFnrs(moment(fdate, 'DD/MM/YYYY'));
</script>

<div>
	<div>
		<input bind:value={fdate} placeholder="DD/MM/YYYY" />
		<button
			on:click={() => {
				fdate = moment().format('DD/MM/YYYY');
			}}>Today</button
		>
		<button
			on:click={() => {
				fdate = getRandomDate();
			}}>Random</button
		>
	</div>
</div>

<table>
	{#each validfnrs as fnr_row}
		<tr>
			{#each fnr_row as fnr}
				<td>{fnr}</td>
			{/each}
		</tr>
	{/each}
</table>
