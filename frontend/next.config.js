/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Vercel stripping trailing slashes (causes redirect loop with FastAPI)
  skipTrailingSlashRedirect: true,
  // Proxy API requests to backend
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        // Use regex to preserve trailing slashes in proxied path
        source: '/api/:path(.*)',
        destination: `${apiUrl}/api/:path`,
      },
    ];
  },
};

module.exports = nextConfig;
