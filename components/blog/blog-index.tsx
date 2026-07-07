import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { NewsletterSignup } from "@/components/newsletter-signup";
import { getAuthor, type BlogAuthor } from "@/lib/blog/authors";
import type { BlogPostMeta } from "@/lib/blog/posts";

export type BlogIndexPost = BlogPostMeta & {
  formattedDate: string;
};

export default function BlogIndex({ posts }: { posts: BlogIndexPost[] }) {
  return (
    <main className="archive-main blog-main">
      <section className="archive-hero blog-hero" aria-labelledby="blog-title">
        <p className="section-label">Blog</p>
        <h1 id="blog-title">Notas y guías.</h1>
        <p className="archive-copy">
          Escritura de la comunidad: cómo construimos con IA, qué aprendemos y cómo llevamos ideas
          a producción.
        </p>
        <div className="archive-signup">
          <p>Recibe nuevas notas junto con The Build Log.</p>
          <NewsletterSignup className="archive-signup-form" />
        </div>
      </section>

      <section className="blog-post-grid" aria-label="Notas publicadas">
        {posts.length === 0 ? (
          <article className="archive-card">
            <p className="archive-meta">Blog</p>
            <h2>Próximamente</h2>
            <p>Las notas aparecerán aquí cuando estén publicadas.</p>
            <span className="archive-link is-muted">Próximamente</span>
          </article>
        ) : (
          posts.map((post) => <PostCard key={post.slug} post={post} />)
        )}
      </section>
    </main>
  );
}

function PostCard({ post }: { post: BlogIndexPost }) {
  const author = getAuthor(post.author);

  return (
    <Link href={`/blog/${post.slug}`} className="blog-post-card">
      <article>
        <div className="blog-card-meta">
          <span>{post.formattedDate}</span>
          <span>{post.readTime}</span>
        </div>
        {author ? <CardAuthor author={author} /> : null}

        <h2>{post.title}</h2>
        <p>{post.description}</p>

        <div className="blog-card-footer">
          <span className="blog-card-tags">
            {post.tags?.slice(0, 2).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </span>
          <span className="blog-card-link">
            Leer
            <ArrowRight aria-hidden="true" />
          </span>
        </div>
      </article>
    </Link>
  );
}

function CardAuthor({ author }: { author: BlogAuthor }) {
  return (
    <span className="blog-card-author">
      <Image src={author.avatar} alt="" width={48} height={48} />
      <span>{author.name}</span>
    </span>
  );
}
