"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { useBlogBySlug } from '@/hooks/useBlogs';
import { useTrackBlogView, useBlogViewCount } from '@/hooks/useBlogView';
import { useBlogComments } from '@/hooks/useBlogComments';
import { FaArrowLeft, FaCalendarAlt, FaTag, FaCheckCircle, FaClock, FaEye, FaComments } from 'react-icons/fa';
import CommentSection from './CommentSection';
import './page.css';

export default function BlogDetailPageClient({ slug, initialBlog }) {
  // Ensure slug is a string
  const slugStr = slug ? String(slug).trim() : '';
  const { data, isLoading, isError, error } = useBlogBySlug(slugStr);
  
  // Use initial blog data from server if available, otherwise use client-side data
  // This ensures server-rendered content is visible immediately
  const blog = initialBlog || data?.blog;
  
  // Always call hooks at the top level - cannot be conditional
  const trackViewMutation = useTrackBlogView(slugStr, blog?._id);
  const { data: viewCount } = useBlogViewCount(slugStr);
  const { data: commentsData } = useBlogComments(slugStr);
  const totalComments = commentsData?.pages?.[0]?.totalCount || 0;

  // Track view when blog loads
  useEffect(() => {
    if (blog && blog._id) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        trackViewMutation.mutate();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [blog?._id, trackViewMutation]);

  if (!slugStr) {
    return (
      <div className="blogview-detail-container">
        <div className="blogview-loading">
          <div className="blogview-loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // If we have initial blog from server, render immediately (no loading state)
  // Only show loading if we don't have initial blog data and are still loading
  if (!initialBlog && isLoading) {
    return (
      <div className="blogview-detail-container">
        <div className="blogview-loading">
          <div className="blogview-loading-spinner"></div>
          <p>Loading blog...</p>
        </div>
      </div>
    );
  }

  // Only show error if we don't have initial blog and there's an error
  if (!initialBlog && isError) {
    return (
      <div className="blogview-detail-container">
        <div className="blogview-error">{error?.message || 'Blog not found'}</div>
        <Link href="/blogs" className="blogview-backLink">
          <FaArrowLeft />
          <span>Back to Blogs</span>
        </Link>
      </div>
    );
  }

  // If no blog data at all, show error
  if (!blog) {
    return (
      <div className="blogview-detail-container">
        <div className="blogview-error">Blog not found</div>
        <Link href="/blogs" className="blogview-backLink">
          <FaArrowLeft />
          <span>Back to Blogs</span>
        </Link>
      </div>
    );
  }

  // This component only handles interactive features (views, comments)
  // Main blog content is rendered server-side in page.jsx for SEO
  // If no initial blog, this component handles the full render (fallback for client navigation)
  if (!initialBlog) {
    // Fallback: render full page if server-side data not available (client navigation)
    return (
      <div className="blogview-detail-container">
        <header className="blogview-detail-header">
          <Link href="/blogs" className="blogview-backLink">
            <FaArrowLeft />
            <span>Back to Blogs</span>
          </Link>
        </header>

        <article className="blogview-detail-article">
          <div className="blogview-detail-header-content">
            <h1 className="blogview-detail-title">{blog?.title || 'Loading...'}</h1>
            <div className="blogview-detail-meta">
              {blog?.topic && (
                <span className="blogview-detail-badge">
                  <FaTag />
                  {blog.topic}
                </span>
              )}
              <span className="blogview-detail-badge">
                <FaEye />
                {viewCount || 0} {viewCount === 1 ? 'view' : 'views'}
              </span>
              <span className="blogview-detail-badge">
                <FaComments />
                {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
              </span>
              {blog?.createdAt && (
                <span className="blogview-detail-date">
                  <FaCalendarAlt />
                  {new Date(blog.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              )}
              {blog?.status && (
                <span
                  className={`blogview-detail-status ${
                    blog.status === 'published' ? 'published' : 'draft'
                  }`}
                >
                  {blog.status === 'published' ? <FaCheckCircle /> : <FaClock />}
                  <span>{blog.status}</span>
                </span>
              )}
            </div>
          </div>

          {blog?.content && (
            <div
              className="blogview-detail-content"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />
          )}
        </article>

        <CommentSection blogSlug={slugStr} />
      </div>
    );
  }

  // When initial blog is provided (server-rendered), only add interactive features
  return (
    <>
      {/* Comment Section - interactive feature */}
      <CommentSection blogSlug={slugStr} />
    </>
  );
}

