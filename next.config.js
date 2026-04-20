/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
        port: '',
        pathname: '/**', // Разрешить все пути на этом домене
      },
      {
        protocol: 'https',
        hostname: 'another-site.org',
        port: '',
        pathname: '/uploads/**', // Разрешить только папку uploads
      },
    ],
  },
}

module.exports = nextConfig