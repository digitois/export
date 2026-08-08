import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSite, getPublicBlogPost } from '@/lib/site/data';

export async function generateMetadata({ params }: { params: Promise<{ site: string; slug: string }> }): Promise<Metadata> {
  const { site: identifier, slug } = await params;
  const siteData = await getSite(decodeURIComponent(identifier));
  if (!siteData) return {};
  const post = await getPublicBlogPost(siteData.organization_id, slug);
  return {
    title: post?.title ?? siteData.company_name,
    description: post?.excerpt ?? undefined
  };
}

export default async function SiteBlogPostPage({ params }: { params: Promise<{ site: string; slug: string }> }) {
  const { site: identifier, slug } = await params;
  const siteData = await getSite(decodeURIComponent(identifier));
  if (!siteData) notFound();

  const base = `/s/${identifier}`;
  const post = await getPublicBlogPost(siteData.organization_id, slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <nav className="text-sm text-zinc-500">
        <Link href={base} className="hover:text-zinc-900">Home</Link>
        <span className="mx-2">/</span>
        <Link href={`${base}/blog`} className="hover:text-zinc-900">Blog</Link>
      </nav>

      <h1 className="mt-6 text-3xl font-bold leading-tight text-zinc-900">{post.title}</h1>
      {post.published_at && (
        <p className="mt-3 text-sm text-zinc-400">
          Published {new Date(post.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      )}

      {post.cover_image_url && (
        <div className="mt-6 overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.cover_image_url} alt={post.title} className="w-full object-cover" />
        </div>
      )}

      {post.excerpt && <p className="mt-6 text-lg text-zinc-600">{post.excerpt}</p>}

      {post.content && (
        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-zinc-800">
          {post.content.split(/\n\n+/).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      )}
    </article>
  );
}