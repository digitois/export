import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSite, getPublicBlogPosts } from '@/lib/site/data';

export default async function SiteBlogPage({ params }: { params: Promise<{ site: string }> }) {
  const { site: identifier } = await params;
  const siteData = await getSite(decodeURIComponent(identifier));
  if (!siteData) notFound();

  const base = `/s/${identifier}`;
  const posts = await getPublicBlogPosts(siteData.organization_id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="text-sm font-semibold" style={{ color: 'var(--site-accent)' }}>
        BLOG
      </p>
      <h1 className="mt-1 text-3xl font-bold">Insights & Guides</h1>

      {posts.length === 0 ? (
        <p className="mt-10 text-zinc-500">No articles published yet.</p>
      ) : (
        <div className="mt-8 space-y-10">
          {posts.map((post) => (
            <Link key={post.id} href={`${base}/blog/${post.slug}`} className="group block">
              <article>
                {post.cover_image_url && (
                  <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl bg-zinc-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                )}
                <h2 className="mt-4 text-2xl font-semibold text-zinc-900 group-hover:underline">{post.title}</h2>
                {post.published_at && (
                  <p className="mt-1 text-xs text-zinc-400">
                    {new Date(post.published_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
                {post.excerpt && <p className="mt-2 text-sm text-zinc-600">{post.excerpt}</p>}
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}