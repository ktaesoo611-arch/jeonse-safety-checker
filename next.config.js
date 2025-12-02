/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server actions are enabled by default in Next.js 14+
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increase from default 1mb to 10mb for PDF uploads
    },
  },
  // API route body size limit
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
