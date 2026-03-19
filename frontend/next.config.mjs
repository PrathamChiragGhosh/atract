/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  reactStrictMode: false,
  
  // Subdomain and multi-tenant configuration
  // This enables: tools.atract.in, resume.atract.in, jd.atract.in, etc.
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'atract.in',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.atract.in',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Subdomain-based routing configuration
  // Maps subdomains to internal routes
  async redirects() {
    const redirects = [
      // Tools Hub - tools.atract.in -> /free-tools
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'tools.atract.in',
          },
        ],
        destination: '/free-tools',
        permanent: true,
      },
      // Resume Builder - resume.atract.in -> /jobseeker/resume-builder
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'resume.atract.in',
          },
        ],
        destination: '/jobseeker/resume-builder',
        permanent: true,
      },
      // JD Generator - jd.atract.in -> /free-tools/jd-generator
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'jd.atract.in',
          },
        ],
        destination: '/free-tools/jd-generator',
        permanent: true,
      },
      // PDF Compressor - pdf.atract.in -> /compress-pdf
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'pdf.atract.in',
          },
        ],
        destination: '/compress-pdf',
        permanent: true,
      },
      // Interview Questions - interview.atract.in -> /free-tools/interview-questions-generator
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'interview.atract.in',
          },
        ],
        destination: '/free-tools/interview-questions-generator',
        permanent: true,
      },
      // Smart Filter - filter.atract.in -> /employer/smart-filter
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'filter.atract.in',
          },
        ],
        destination: '/employer/smart-filter',
        permanent: true,
      },
      // Smart Select - select.atract.in -> /employer/smart-select
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'select.atract.in',
          },
        ],
        destination: '/employer/smart-select',
        permanent: true,
      },
      // Voice Agent - voice.atract.in -> /employer/voice-agent
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'voice.atract.in',
          },
        ],
        destination: '/employer/voice-agent',
        permanent: true,
      },
      // Jobs - jobs.atract.in -> /jobs
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'jobs.atract.in',
          },
        ],
        destination: '/jobs',
        permanent: true,
      },
      // Blog - blog.atract.in -> /blogs
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'blog.atract.in',
          },
        ],
        destination: '/blogs',
        permanent: true,
      },
      // Employer Portal - hiring.atract.in -> /employer
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'hiring.atract.in',
          },
        ],
        destination: '/employer',
        permanent: true,
      },
    ];
    return redirects;
  },

  // Reverse-proxy /api/blogs to backend
  async rewrites() {
    const apiBackend = process.env.BLOG_BACKEND_URL || "http://localhost:5002";
    return [
      {
        source: "/api/blogs",
        destination: `${apiBackend}/api/blogs`
      },
      {
        source: "/api/blogs/:path*",
        destination: `${apiBackend}/api/blogs/:path*`
      },
    ];
  },

  // Environment variables exposed to the browser
  env: {
    // Domain configuration
    NEXT_PUBLIC_MAIN_DOMAIN: process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'atract.in',
    NEXT_PUBLIC_TOOLS_DOMAIN: process.env.NEXT_PUBLIC_TOOLS_DOMAIN || 'tools.atract.in',
    NEXT_PUBLIC_RESUME_DOMAIN: process.env.NEXT_PUBLIC_RESUME_DOMAIN || 'resume.atract.in',
    NEXT_PUBLIC_JD_DOMAIN: process.env.NEXT_PUBLIC_JD_DOMAIN || 'jd.atract.in',
    
    // Site metadata
    NEXT_PUBLIC_SITE_NAME: 'Atract',
    NEXT_PUBLIC_SITE_DESCRIPTION: 'AI-Powered Recruitment Platform - Find Jobs, Build Resumes, and Hire Talent',
  },

  // Headers for security and SEO
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
