<script lang="ts">
	let input: string = '192.168.1.10/24';

	type RangeResult = {
		version: 4 | 6;
		ip: string;
		cidr: number;
		network: string;
		broadcast?: string;
		firstUsable: string;
		lastUsable: string;
		usableCount?: number;
		error?: string;
	};

	let result: RangeResult | null = null;

	$: if (input.includes('/')) {
		try {
			result = parseIpRange(input);
		} catch (err) {
			result = {
				ip: input,
				cidr: 0,
				version: 4,
				network: '',
				firstUsable: '',
				lastUsable: '',
				error: 'Invalid input'
			};
		}
	}

	// IPv4 helpers
	function ipToInt(ip: string): number {
		return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
	}

	function intToIp(int: number): string {
		return [(int >>> 24) & 0xff, (int >>> 16) & 0xff, (int >>> 8) & 0xff, int & 0xff].join('.');
	}

	function ipv4Range(ip: string, cidr: number): RangeResult {
		const ipInt = ipToInt(ip);
		const mask = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
		const network = ipInt & mask;
		const broadcast = network | (~mask >>> 0);
		const usableCount = cidr === 32 ? 0 : cidr === 31 ? 2 : 2 ** (32 - cidr) - 2;

		const first = cidr >= 31 ? network : network + 1;
		const last = cidr >= 31 ? broadcast : broadcast - 1;

		return {
			version: 4,
			ip,
			cidr,
			network: intToIp(network),
			broadcast: intToIp(broadcast),
			firstUsable: intToIp(first),
			lastUsable: intToIp(last),
			usableCount
		};
	}

	// IPv6 helpers
	function expandIpv6(ip: string): string {
		const parts = ip.split('::');
		const head = parts[0]?.split(':') ?? [];
		const tail = parts[1]?.split(':') ?? [];
		const missing = 8 - (head.length + tail.length);
		const full = [...head, ...Array(missing).fill('0'), ...tail];
		return full.map((part) => part.padStart(4, '0')).join(':');
	}

	function ipv6ToBigInt(ip: string): bigint {
		return expandIpv6(ip)
			.split(':')
			.reduce((acc, part) => (acc << 16n) + BigInt(`0x${part}`), 0n);
	}

	function bigIntToIpv6(big: bigint): string {
		const parts: string[] = [];
		for (let i = 0; i < 8; i++) {
			const shift = BigInt((7 - i) * 16);
			parts.push(((big >> shift) & 0xffffn).toString(16));
		}
		// Compress zeros
		return parts.join(':').replace(/(:0)+(:|$)/, '::');
	}

	function ipv6Range(ip: string, cidr: number): RangeResult {
		const ipBig = ipv6ToBigInt(ip);
		const mask = (1n << 128n) - (1n << BigInt(128 - cidr));
		const network = ipBig & mask;
		const last = network | (~mask & ((1n << 128n) - 1n));

		return {
			version: 6,
			ip,
			cidr,
			network: bigIntToIpv6(network),
			firstUsable: bigIntToIpv6(network),
			lastUsable: bigIntToIpv6(last)
		};
	}

	function parseIpRange(input: string): RangeResult {
		const [ip, cidrStr] = input.split('/');
		const cidr = parseInt(cidrStr);

		if (ip.includes(':')) {
			// IPv6
			if (cidr < 0 || cidr > 128) throw new Error('Invalid CIDR');
			return ipv6Range(ip, cidr);
		} else {
			// IPv4
			if (cidr < 0 || cidr > 32) throw new Error('Invalid CIDR');
			return ipv4Range(ip, cidr);
		}
	}
</script>

<h2>IP Range Calculator (IPv4 & IPv6)</h2>

<label>
	IP/CIDR:
	<input bind:value={input} placeholder="e.g. 192.168.1.10/24 or 2001:db8::/64" />
</label>

{#if result}
	<div class="output">
		{#if result.error}
			<p style="color: red;">{result.error}</p>
		{:else}
			<p><strong>Version:</strong> IPv{result.version}</p>
			<p><strong>Input:</strong> {result.ip}/{result.cidr}</p>
			<p><strong>Network:</strong> {result.network}</p>
			{#if result.version === 4}
				<p><strong>Broadcast:</strong> {result.broadcast}</p>
				<p><strong>First Usable:</strong> {result.firstUsable}</p>
				<p><strong>Last Usable:</strong> {result.lastUsable}</p>
				<p><strong>Usable Count:</strong> {result.usableCount}</p>
			{:else}
				<p><strong>Range:</strong> {result.firstUsable} – {result.lastUsable}</p>
				<p><em>Note: IPv6 address ranges are massive; count not shown.</em></p>
			{/if}
		{/if}
	</div>
{/if}

<style>
	.output {
		margin-top: 2rem;
		padding: 1rem;
		border: 1px solid #ccc;
		border-radius: 0.5rem;
		font-family: monospace;
	}

	input {
		width: 100%;
		max-width: 400px;
		margin-bottom: 1rem;
	}
</style>
