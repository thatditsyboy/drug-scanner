/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pharmeasy.in"
      },
      {
        protocol: "https",
        hostname: "cdn01.pharmeasy.in"
      },
      {
        protocol: "https",
        hostname: "img.pharmeasy.in"
      },
      {
        protocol: "https",
        hostname: "cdn.pharmeasy.in"
      }
    ]
  }
};

module.exports = nextConfig;
