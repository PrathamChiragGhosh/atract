import { NextResponse } from 'next/server';

/**
 * Dynamic sitemap for Google Jobs
 * Returns XML sitemap with all active job postings
 */
export async function GET() {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://atract.in';
        const jobApiUrl = process.env.NEXT_PUBLIC_JOB_URL || 'http://localhost:5000/api/jobs';

        // Fetch all active jobs from the API by paginating through all pages
        // Note: Google allows up to 50,000 URLs per sitemap
        let allJobs = [];
        let currentPage = 1;
        let hasMorePages = true;
        const pageSize = 100; // Fetch 100 jobs per page to minimize API calls
        const maxPages = 1000; // Safety limit to prevent infinite loops

        while (hasMorePages && currentPage <= maxPages) {
            const response = await fetch(`${jobApiUrl}/public?page=${currentPage}&limit=${pageSize}`, {
                cache: 'no-store', // Ensure fresh data
                next: { revalidate: 3600 }, // Revalidate every hour
            });

            if (!response.ok) {
                console.error(`Failed to fetch jobs on page ${currentPage}: ${response.status}`);
                break; // Stop pagination on error
            }

            const data = await response.json();
            
            if (data.success && data.data && Array.isArray(data.data)) {
                // If no jobs returned, stop pagination
                if (data.data.length === 0) {
                    hasMorePages = false;
                    break;
                }
                
                allJobs = [...allJobs, ...data.data];
                
                // Check if there are more pages
                const pagination = data.pagination || {};
                hasMorePages = pagination.hasNextPage === true;
                currentPage++;
                
                // Safety check: stop if we've fetched more than 50,000 jobs (Google's limit)
                if (allJobs.length >= 50000) {
                    hasMorePages = false;
                }
            } else {
                hasMorePages = false;
            }
        }

        const jobs = allJobs;

        // Filter only active jobs that haven't expired
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeJobs = jobs.filter(job => {
            if (job.status !== 'Active') return false;
            const closingDate = new Date(job.applicationClosingDate);
            closingDate.setHours(0, 0, 0, 0);
            return closingDate >= today && job.shortId;
        });

        // Generate XML sitemap
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:job="https://schema.org/JobPosting">
${activeJobs.map(job => {
            const jobUrl = `${baseUrl}/${job.shortId}`;
            const lastmod = job.updatedAt 
                ? new Date(job.updatedAt).toISOString().split('T')[0]
                : new Date(job.createdAt).toISOString().split('T')[0];
            
            return `  <url>
    <loc>${escapeXml(jobUrl)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
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
        
        // Return empty sitemap on error
        const emptySitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

        return new NextResponse(emptySitemap, {
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

