<svelte:head>
	<title>Andreas Ellewsen</title>
</svelte:head>

<!-- Hero -->
<section class="hero">
	<h1 class="fade-in">Andreas<br /><span class="highlight">Ellewsen</span></h1>
	<p class="hero-sub fade-in">
		<span class="tag">software_developer</span>
		<span class="sep"> · </span>
		<span>backend systems, modern frontends, occasionally gazing at stars</span>
	</p>
	<div class="hero-cta fade-in">
		<a href="/posts" class="btn btn-primary">→ read posts</a>
		<a href="/utils" class="btn btn-secondary">⚙ utilities</a>
	</div>
</section>

<!-- Terminal block -->
<div class="terminal fade-in">
	<div class="terminal-bar">
		<div class="terminal-dot dot-red"></div>
		<div class="terminal-dot dot-yellow"></div>
		<div class="terminal-dot dot-green"></div>
		<span class="terminal-title">ellewsen.no — about.sh</span>
	</div>
	<div class="terminal-body">
		<div class="t-line">
			<span class="t-prompt">$ </span>
			<span class="t-cmd">cat</span>&nbsp;<span class="t-val">profile.json</span>
		</div>
		<span class="t-blank"></span>
		<span class="t-out">{"{"}</span>
		<span class="t-out">&nbsp;&nbsp;<span class="t-key">"name"</span>: <span class="t-string">"Andreas Ellewsen"</span>,</span>
		<span class="t-out">&nbsp;&nbsp;<span class="t-key">"education"</span>: <span class="t-string">"MSc Astronomy, University of Oslo (2018)"</span>,</span>
		<span class="t-out">&nbsp;&nbsp;<span class="t-key">"current"</span>: <span class="t-string">"Software Developer @ <a class="t-link" href="https://itera.com" target="_blank">Itera</a>"</span>,</span>
		<span class="t-out">&nbsp;&nbsp;<span class="t-key">"prev"</span>: <span class="t-string">"5+ years @ <a class="t-link" href="https://uio.no" target="_blank">University of Oslo</a>"</span>,</span>
		<span class="t-out">&nbsp;&nbsp;<span class="t-key">"stack"</span>: [<span class="t-string">"Python"</span>, <span class="t-string">"React"</span>, <span class="t-string">"Svelte"</span>],</span>
		<span class="t-out">&nbsp;&nbsp;<span class="t-key">"interests"</span>: [<span class="t-string">"backend arch"</span>, <span class="t-string">"API design"</span>, <span class="t-string">"video games"</span>]</span>
		<span class="t-out">{"}"}</span>
		<span class="t-blank"></span>
		<div class="t-line">
			<span class="t-prompt">$ </span>
			<span class="cursor"></span>
		</div>
	</div>
</div>

<!-- About -->
<section class="about">
	<div class="section-label">// about</div>
	<div class="about-grid">
		<div class="card">
			<div class="card-label">the astronomy thing</div>
			<div class="card-val">
				Studying physics and astronomy means spending a lot of time turning messy data into something useful. That carries over — I tend to approach software problems the same way.
			</div>
		</div>
		<div class="card">
			<div class="card-label">what I enjoy</div>
			<div class="card-val">
				Clean APIs, systems that do one thing well, and frontend work that doesn't feel like a compromise. Backend by preference, full-stack by necessity.
			</div>
		</div>
		<div class="card">
			<div class="card-label">outside work</div>
			<div class="card-val">
				Video games, personal projects, and the occasional trip down an astronomy rabbit hole just to remember where I came from.
			</div>
		</div>
		<div class="card">
			<div class="card-label">this site</div>
			<div class="card-val">
				Fast to load, minimal by design. Utilities I reach for occasionally, experiments in frontend development, and the rare post.
			</div>
		</div>
	</div>
</section>

<!-- Stack -->
<section class="stack">
	<div class="section-label">// stack</div>
	<div class="stack-list">
		<span class="chip featured">Python</span>
		<span class="chip featured">React</span>
		<span class="chip featured">Svelte</span>
		<span class="chip">REST APIs</span>
		<span class="chip">PostgreSQL</span>
		<span class="chip">GitHub Actions</span>
		<span class="chip">Docker</span>
		<span class="chip">TypeScript</span>
		<span class="chip">Linux</span>
		<span class="chip">data analysis</span>
		<span class="chip">scientific computing</span>
	</div>
</section>

<style>
	/* Hero */
	.hero {
		padding: 72px 0 56px;
		border-bottom: 1px solid var(--border);
	}

	.hero h1 {
		font-family: var(--sans);
		font-size: clamp(36px, 7vw, 64px);
		font-weight: 800;
		line-height: 1.05;
		color: var(--bright);
		letter-spacing: -0.02em;
		margin-bottom: 10px;
	}

	.highlight {
		color: transparent;
		-webkit-text-stroke: 1.5px var(--accent);
	}

	.hero-sub {
		font-family: var(--mono);
		font-size: 13px;
		color: var(--muted);
		margin-top: 16px;
		max-width: 480px;
		line-height: 1.6;
		margin-bottom: 0;
	}

	.tag  { color: var(--accent2); }
	.sep  { color: var(--dim); }

	.hero-cta {
		margin-top: 36px;
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}

	/* Terminal */
	.terminal {
		margin: 56px 0;
		background: var(--bg2);
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}

	.terminal-bar {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 10px 16px;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}

	.terminal-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.dot-red    { background: #f78166; }
	.dot-yellow { background: #e3b341; }
	.dot-green  { background: var(--accent); }

	.terminal-title {
		margin-left: 6px;
		font-size: 11px;
		color: var(--muted);
		letter-spacing: 0.04em;
	}

	.terminal-body {
		padding: 24px 28px;
		font-size: 13px;
		line-height: 1.9;
	}

	.t-line    { display: flex; flex-wrap: wrap; align-items: center; }
	.t-prompt  { color: var(--accent); user-select: none; white-space: pre; }
	.t-cmd     { color: var(--bright); }
	.t-val     { color: var(--accent3); }
	.t-out     { color: var(--text); display: block; margin: 2px 0; }
	.t-blank   { display: block; height: 10px; }
	.t-key     { color: var(--accent2); }
	.t-string  { color: var(--accent3); }

	.t-link {
		color: var(--accent2);
		text-decoration: none;
		border-bottom: 1px solid transparent;
		transition: border-color 0.15s;
	}

	.t-link:hover { border-color: var(--accent2); }

	.cursor {
		display: inline-block;
		width: 8px;
		height: 14px;
		background: var(--accent);
		margin-left: 2px;
		vertical-align: baseline;
		animation: blink 1.1s step-end infinite;
	}

	@keyframes blink {
		0%, 100% { opacity: 1; }
		50%       { opacity: 0; }
	}

	/* About */
	.about {
		padding: 56px 0;
		border-bottom: 1px solid var(--border);
	}

	.about-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	@media (max-width: 600px) {
		.about-grid { grid-template-columns: 1fr; }
	}

	.card-label {
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--muted);
		margin-bottom: 8px;
	}

	.card-val {
		font-size: 13px;
		color: var(--bright);
		line-height: 1.5;
	}

	/* Stack */
	.stack {
		padding: 56px 0;
	}

	.stack-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
</style>
