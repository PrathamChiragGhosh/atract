/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
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
};

export default nextConfig;
