import type { PageLoad } from './$types';

type PostMetadata = {
  title: string;
  date: string;
  summary: string;
};

type Post = PostMetadata & {
  slug: string;
};

export const load: PageLoad = async () => {
  const modules = import.meta.glob('./*/+page.js');

  const posts: Post[] = await Promise.all(
    Object.entries(modules).map(async ([path, resolver]) => {
      const slug = path.split('/')[1]; // './20250715/+page.js' => '20250715'
      const mod = await resolver() as { load: () => { metadata: PostMetadata } };
      const { metadata } = mod.load();
      return { slug, ...metadata };
    })
  );

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { posts };
};
