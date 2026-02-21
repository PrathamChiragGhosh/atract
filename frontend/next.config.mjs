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
  // Reverse-proxy /store to Lovable Store; proxy /api/blogs and /job to backend
  async rewrites() {
    const apiBackend = process.env.BLOG_BACKEND_URL || "http://localhost:5001";
    return [
      {
        source: "/store",
        destination: "http://localhost:8080/store/"
      },
      {
        source: "/store/:path*",
        destination: "http://localhost:8080/store/:path*"
      },
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
