/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Vercel stripping trailing slashes (causes redirect loop with FastAPI)
  skipTrailingSlashRedirect: true,
  // Proxy API requests to backend
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
