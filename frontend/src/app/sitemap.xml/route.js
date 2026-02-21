import { NextResponse } from 'next/server';

/**
 * Dynamic sitemap for blogs
 * Returns XML sitemap with all published blog URLs
 */
export async function GET() {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://atract.in';
        
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

        const blogApiUrl = getBlogApiUrl();
        
        // Fetch all published blogs by paginating through all pages
        let allBlogs = [];
        let currentPage = 1;
        let hasMorePages = true;
        const pageSize = 100; // Fetch 100 blogs per page
        const maxPages = 1000; // Safety limit

        while (hasMorePages && currentPage <= maxPages) {
            const response = await fetch(`${blogApiUrl}/api/blogs/seo/list?page=${currentPage}&limit=${pageSize}`, {
                cache: 'no-store', // Ensure fresh data
                next: { revalidate: 3600 }, // Revalidate every hour
            });

            if (!response.ok) {
                console.error(`Failed to fetch blogs on page ${currentPage}: ${response.status}`);
                break;
            }

            const data = await response.json();
            
            if (data.success && data.blogs && Array.isArray(data.blogs)) {
                // Filter only published blogs
                const publishedBlogs = data.blogs.filter(blog => blog.status === 'published' && blog.slug);
                allBlogs = [...allBlogs, ...publishedBlogs];
                
                // Check if there are more pages
                hasMorePages = data.page < data.totalPages;
                currentPage++;
                
                // Safety check: stop if we've fetched more than 50,000 blogs (Google's limit)
                if (allBlogs.length >= 50000) {
                    hasMorePages = false;
                }
            } else {
                hasMorePages = false;
            }
        }

        // Generate XML sitemap
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(`${baseUrl}/blogs`)}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
${allBlogs.map(blog => {
            const blogUrl = `${baseUrl}/blogs/${blog.slug}`;
            const lastmod = blog.createdAt 
                ? new Date(blog.createdAt).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            
            return `  <url>
    <loc>${escapeXml(blogUrl)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
        }).join('\n')}
</urlset>`;

        return new NextResponse(sitemap, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400', // Cache for 1 hour, stale for 24 hours
            },
        });
    } catch (error) {
        console.error('Sitemap generation error:', error);
        
        // Return minimal sitemap on error (at least include /blogs)
        const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://atract.in';
        const minimalSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(`${baseUrl}/blogs`)}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

        return new NextResponse(minimalSitemap, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
            },
        });
    }
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

