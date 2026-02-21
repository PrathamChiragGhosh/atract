import Link from "next/link";
import BlogDetailPageClient from "./BlogDetailPageClient";
import { FaArrowLeft, FaCalendarAlt, FaTag, FaCheckCircle, FaClock } from 'react-icons/fa';
import './page.css';

export const dynamic = 'force-dynamic';

// Get blog API URL (server-side)
// Blogs are served from the main backend, so fallback to main backend URL
const getBlogApiUrl = () => {
  // Priority 1: Explicit blog API URL
  if (process.env.NEXT_PUBLIC_BLOG_API_URL) {
    return process.env.NEXT_PUBLIC_BLOG_API_URL;
  }
  
  // Priority 2: Extract from main backend URL
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  
  // Priority 3: Extract from main API URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Priority 4: Extract from employer URL (if available)
  if (process.env.NEXT_PUBLIC_EMPLOYER_URL) {
    const employerUrl = process.env.NEXT_PUBLIC_EMPLOYER_URL;
    return employerUrl.includes('/employer') 
      ? employerUrl.replace('/employer', '') 
      : employerUrl;
  }
  
  // Priority 5: Extract from jobseeker URL (if available)
  if (process.env.NEXT_PUBLIC_JOBSEEKER_URL) {
    const jobseekerUrl = process.env.NEXT_PUBLIC_JOBSEEKER_URL;
    return jobseekerUrl.replace(/\/jobseeker\/?$/, '');
  }
  
  // Priority 6: Extract from job URL (if available)
  if (process.env.NEXT_PUBLIC_JOB_URL) {
    const jobUrl = process.env.NEXT_PUBLIC_JOB_URL;
    return jobUrl.replace(/\/job\/?$/, '');
  }
  
  // Fallback: Default to main backend (blogs are on same server)
  return 'http://localhost:5001';
};

// Fetch blog data server-side
async function fetchBlogBySlug(slug) {
  const blogApiUrl = getBlogApiUrl();
  const encodedSlug = encodeURIComponent(slug.trim());
  const apiUrl = `${blogApiUrl}/api/blogs/${encodedSlug}`;

  try {
    const response = await fetch(apiUrl, {
      cache: 'no-store', // Always fetch fresh data for SEO
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.success && data.blog) {
      return data.blog;
    }
    return null;
  } catch (error) {
    console.error('Error fetching blog:', error);
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  let resolvedParams;
  if (params && typeof params.then === 'function') {
    resolvedParams = await params;
  } else {
    resolvedParams = params;
  }
  
  const slug = resolvedParams?.slug;
  if (!slug) {
    return {
      title: 'Blog Not Found',
    };
  }

  const blog = await fetchBlogBySlug(String(slug).trim());
  
  if (!blog) {
    return {
      title: 'Blog Not Found',
    };
  }

  // Create description from content (strip HTML, take first 160 chars)
  const stripHtml = (html = '') => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const description = stripHtml(blog.content).substring(0, 160) || blog.title;
  
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://atract.in';
  const canonicalUrl = `${baseUrl}/blogs/${blog.slug}`;

  return {
    title: blog.title,
    description: description,
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function Page({ params }) {
  // Handle params - it might be a Promise or a direct object
  let resolvedParams;
  if (params && typeof params.then === 'function') {
    resolvedParams = await params;
  } else {
    resolvedParams = params;
  }
  
  const slug = resolvedParams?.slug;
  
  if (!slug) {
    return (
      <div className="blogview-container">
        <div className="blogview-error">Invalid blog URL</div>
        <Link href="/blogs" className="blogview-backLink">
          ← Back to Blogs
        </Link>
      </div>
    );
  }
  
  // Ensure slug is a string
  const slugStr = String(slug).trim();
  
  // Fetch blog data server-side
  const blog = await fetchBlogBySlug(slugStr);
  
  if (!blog) {
    return (
      <div className="blogview-container">
        <div className="blogview-error">Blog not found</div>
        <Link href="/blogs" className="blogview-backLink">
          ← Back to Blogs
        </Link>
      </div>
    );
  }
  
  // Render blog content server-side for SEO (visible in HTML source)
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
          <h1 className="blogview-detail-title">{blog.title}</h1>
          <div className="blogview-detail-meta">
            <span className="blogview-detail-badge">
              <FaTag />
              {blog.topic}
            </span>
            <span className="blogview-detail-date">
              <FaCalendarAlt />
              {new Date(blog.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span
              className={`blogview-detail-status ${
                blog.status === 'published' ? 'published' : 'draft'
              }`}
            >
              {blog.status === 'published' ? <FaCheckCircle /> : <FaClock />}
              <span>{blog.status}</span>
            </span>
          </div>
        </div>

        <div
          className="blogview-detail-content"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />
      </article>

      {/* Client component for interactive features (views, comments) */}
      <BlogDetailPageClient slug={slugStr} initialBlog={blog} />
    </div>
  );
}

