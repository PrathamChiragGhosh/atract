"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useSeoBlogs } from '@/hooks/useBlogs';
import { FaArrowRight, FaCalendarAlt, FaTag, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './page.css';

export default function BlogsPageClient() {
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading, isError, error } = useSeoBlogs(currentPage);

  const blogs = data?.blogs || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.totalCount || 0;
  const currentPageData = data?.page || 1;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPageData - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  if (isLoading) {
    return (
      <div className="blogview-container">
        <div className="blogview-loading">
          <div className="blogview-loading-spinner"></div>
          <p>Loading blogs...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    const errorMessage = error?.message || 'Failed to load blogs';
    // Provide user-friendly error messages
    const friendlyMessage = errorMessage.includes('Network Error') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ERR_NETWORK')
      ? 'Unable to connect to blog server. Please check if the blog service is running.'
      : errorMessage;
    
    return (
      <div className="blogview-container">
        <div className="blogview-error">
          {friendlyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="blogview-container">
      <header className="blogview-header">
        <div>
          <p className="blogview-eyebrow">
            <FaTag style={{ marginRight: '0.5rem', fontSize: '0.7rem' }} />
            Recruitment Insights
          </p>
          <h1 className="blogview-title">Blogs for Employers & Job Seekers</h1>
          <p className="blogview-subtitle">
            Fresh hiring strategies, market trends, and career growth insights.
          </p>
        </div>
      </header>

      {blogs.length === 0 ? (
        <div className="blogview-empty">
          <p>No blogs yet. Generate some to get started.</p>
        </div>
      ) : (
        <>
          <div className="blogview-grid">
            {blogs.map((blog) => (
              <Link key={blog._id} href={`/blogs/${blog.slug}`} className="blogview-card">
                <div className="blogview-cardHeader">
                  <span className="blogview-badge">
                    <FaTag style={{ marginRight: '0.35rem', fontSize: '0.7rem' }} />
                    {blog.topic}
                  </span>
                  <span className="blogview-date">
                    <FaCalendarAlt style={{ marginRight: '0.4rem', fontSize: '0.75rem' }} />
                    {new Date(blog.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <h2 className="blogview-cardTitle">{blog.title}</h2>
                <p className="blogview-excerpt">{blog.excerpt}</p>
                <div className="blogview-readMore">
                  Read more
                  <FaArrowRight />
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="blogview-pagination">
              <div className="blogview-pagination-info">
                Showing {((currentPageData - 1) * 20) + 1} - {Math.min(currentPageData * 20, totalCount)} of {totalCount} blogs
              </div>
              <div className="blogview-pagination-controls">
                <button
                  className="blogview-pagination-btn"
                  onClick={() => handlePageChange(currentPageData - 1)}
                  disabled={currentPageData === 1}
                  aria-label="Previous page"
                >
                  <FaChevronLeft />
                  <span>Previous</span>
                </button>

                <div className="blogview-pagination-numbers">
                  {currentPageData > 3 && (
                    <>
                      <button
                        className="blogview-pagination-number"
                        onClick={() => handlePageChange(1)}
                      >
                        1
                      </button>
                      {currentPageData > 4 && (
                        <span className="blogview-pagination-ellipsis">...</span>
                      )}
                    </>
                  )}

                  {getPageNumbers().map((pageNum) => (
                    <button
                      key={pageNum}
                      className={`blogview-pagination-number ${currentPageData === pageNum ? 'active' : ''}`}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  ))}

                  {currentPageData < totalPages - 2 && (
                    <>
                      {currentPageData < totalPages - 3 && (
                        <span className="blogview-pagination-ellipsis">...</span>
                      )}
                      <button
                        className="blogview-pagination-number"
                        onClick={() => handlePageChange(totalPages)}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  className="blogview-pagination-btn"
                  onClick={() => handlePageChange(currentPageData + 1)}
                  disabled={currentPageData === totalPages}
                  aria-label="Next page"
                >
                  <span>Next</span>
                  <FaChevronRight />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

