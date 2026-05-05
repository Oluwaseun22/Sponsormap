/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["sponsormap.engtx.co.uk"],
    },
  },
  images: {
    domains: [],
  },
};

export default nextConfig;
