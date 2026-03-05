# ellewsen.no

Personal website. Built with SvelteKit, deployed to GitHub Pages via a custom domain.

## Stack

- [SvelteKit](https://kit.svelte.dev/) with `adapter-static` for full static prerendering
- [Vite](https://vitejs.dev/)
- TypeScript
- Hosted on GitHub Pages at [ellewsen.no](https://ellewsen.no)

## Project structure

```
src/
  app.html          # HTML shell, Google Fonts
  app.css           # Global design system (CSS variables, shared classes)
  lib/
    Nav.svelte      # Site navigation
    Timestamp.svelte
    FnrGenerator.svelte
  routes/
    +layout.svelte  # Shell wrapper, footer
    +page.svelte    # Homepage
    posts/          # Blog posts (one directory per post, YYYYMMDD)
    utils/          # Browser-based utility tools
```

## Development

```bash
pnpm install
pnpm dev
```

## Build & deploy

```bash
pnpm build       # Output to /build
pnpm preview     # Preview the build locally
pnpm deploy      # Push /build to GitHub Pages
```

## Adding a post

Create a new directory under `src/routes/posts/YYYYMMDD/` with two files:

**`+page.js`** — metadata:
```js
export const load = () => ({
  metadata: {
    title: "Post title",
    date: "2026-01-01T12:00:00+01:00",
  }
});
```

**`+page.svelte`** — content:
```svelte
<script>
  import Timestamp from '$lib/Timestamp.svelte';
  export let data;
</script>

<article>
  <h1>{data.metadata.title}</h1>
  <small><Timestamp iso={data.metadata.date} /></small>
  <hr />
  <p>...</p>
</article>
```

The post index at `/posts` picks up new posts automatically via `import.meta.glob`.
