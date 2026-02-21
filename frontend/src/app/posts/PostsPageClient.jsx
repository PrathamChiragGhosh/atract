"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBlogs } from '@/hooks/useBlogs';
import './page.css';

export default function PostsPageClient() {
  const router = useRouter();
  const { data, isLoading, isError, error } = useBlogs();

  if (isLoading) {
    return (
      <div className="blogview-container">
        <div className="blogview-loading">Loading blogs...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="blogview-container">
        <div className="blogview-error">
          Error loading blogs: {error?.message || 'Unknown error'}
        </div>
      </div>
    );
  }

  const blogs = data?.blogs || [];

  return (
    <div className="blogview-container">
      <div className="blogview-header">
        <h1>Generated Blogs</h1>
        <Link href="/" className="blogview-linkButton">
          Generate New Blogs
        </Link>
      </div>

      {blogs.length === 0 ? (
        <div className="blogview-emptyState">
          <p>No blogs generated yet.</p>
          <Link href="/" className="blogview-linkButton">
            Generate Your First Blog
          </Link>
        </div>
      ) : (
        <div className="blogview-blogsList">
          {blogs.map((blog) => (
            <div
              key={blog._id}
              className="blogview-blogCard"
              onClick={() => router.push(`/posts/${blog.slug}`)}
              style={{ cursor: 'pointer' }}
            >
              <h2 className="blogview-blogTitle">{blog.title}</h2>
              <div className="blogview-blogMeta">
                <span className="blogview-blogTopic">{blog.topic}</span>
                <span className="blogview-blogDate">
                  {new Date(blog.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="blogview-blogStatus">
                Status: <span className={blog.status === 'published' ? 'blogview-statusPublished' : 'blogview-statusDraft'}>{blog.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

