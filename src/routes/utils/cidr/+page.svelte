<script lang="ts">
	let ip: string = '192.168.1.10';
	let cidr: number = 24;

	interface IpRangeResult {
		ip: string;
		cidr: number;
		subnetMask: string;
		network: string;
		broadcast: string;
		firstUsable: string;
		lastUsable: string;
		usableCount: number;
		error?: string;
	}

	let result: IpRangeResult | null = null;

	function ipToInt(ip: string): number {
		return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
	}

	function intToIp(int: number): string {
		return [(int >>> 24) & 0xff, (int >>> 16) & 0xff, (int >>> 8) & 0xff, int & 0xff].join('.');
	}

	function cidrToMask(bits: number): number {
		return bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
	}

	function getIpRange(ipStr: string, cidr: number): IpRangeResult {
		const ip = ipToInt(ipStr);
		const mask = cidrToMask(cidr);
		const network = ip & mask;
		const broadcast = network | (~mask >>> 0);

		const firstUsable = cidr >= 31 ? null : network + 1;
		const lastUsable = cidr >= 31 ? null : broadcast - 1;
		function calculateUsableCount(cidr: number): number {
			if (cidr === 32) return 0;
			if (cidr === 31) return 2;
			return Math.max(0, 2 ** (32 - cidr) - 2);
		}
		const usableCount = calculateUsableCount(cidr);
		return {
			ip: ipStr,
			cidr,
			subnetMask: intToIp(mask),
			network: intToIp(network),
			broadcast: intToIp(broadcast),
			firstUsable: firstUsable !== null ? intToIp(firstUsable) : 'N/A',
			lastUsable: lastUsable !== null ? intToIp(lastUsable) : 'N/A',
			usableCount
		};
	}

	function calculate(): void {
		try {
			result = getIpRange(ip, cidr);
		} catch (e) {
			result = {
				ip,
				cidr,
				subnetMask: '',
				network: '',
				broadcast: '',
				firstUsable: '',
				lastUsable: '',
				usableCount: 0,
				error: 'Invalid input'
			};
		}
	}
</script>

<title>Ip Range Calculator</title>
<h1>IP Range Calculator</h1>

<div>
	<label
		>IP Address:
		<input bind:value={ip} placeholder="e.g. 192.168.1.10" />
	</label>
</div>

<div>
	<label
		>CIDR:
		<input type="number" min="0" max="32" bind:value={cidr} />
	</label>
</div>

<button on:click={calculate}>Calculate</button>

{#if result}
	<div class="output">
		{#if result.error}
			<p style="color: red;">{result.error}</p>
		{:else}
			<p><strong>IP:</strong> {result.ip}/{result.cidr}</p>
			<p><strong>Subnet Mask:</strong> {result.subnetMask}</p>
			<p><strong>Network Address:</strong> {result.network}</p>
			<p><strong>Broadcast Address:</strong> {result.broadcast}</p>
			<p><strong>First Usable:</strong> {result.firstUsable}</p>
			<p><strong>Last Usable:</strong> {result.lastUsable}</p>
			<p><strong>Usable Hosts:</strong> {result.usableCount}</p>
		{/if}
	</div>
{/if}
