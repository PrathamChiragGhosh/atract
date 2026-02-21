"use client";

import Link from 'next/link';
import { useBlogBySlug } from '@/hooks/useBlogs';
import '../page.css';

export default function PostDetailPageClient({ slug }) {
  // Ensure slug is a string
  const slugStr = slug ? String(slug).trim() : '';
  const { data, isLoading, isError, error } = useBlogBySlug(slugStr);

  if (!slugStr) {
    return (
      <div className="blogview-container">
        <div className="blogview-loading">Loading...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="blogview-container">
        <div className="blogview-loading">Loading blog...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="blogview-container">
        <div className="blogview-error">
          {error?.message || 'Blog not found'}
        </div>
        <Link href="/posts" className="blogview-backLink">
          ← Back to Blogs
        </Link>
      </div>
    );
  }

  const blog = data?.blog;

  if (!blog) {
    return (
      <div className="blogview-container">
        <div className="blogview-error">Blog not found</div>
        <Link href="/posts" className="blogview-backLink">
          ← Back to Blogs
        </Link>
      </div>
    );
  }

  return (
    <div className="blogview-container">
      <div className="blogview-header">
        <Link href="/posts" className="blogview-backLink">
          ← Back to Blogs
        </Link>
      </div>

      <article className="blogview-article">
        <h1 className="blogview-title">{blog.title}</h1>
        
        <div className="blogview-meta">
          <span className="blogview-topic">{blog.topic}</span>
          <span className="blogview-date">
            {new Date(blog.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <span className={blog.status === 'published' ? 'blogview-statusPublished' : 'blogview-statusDraft'}>
            {blog.status}
          </span>
        </div>

        <div
          className="blogview-content"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />
      </article>
    </div>
  );
}

