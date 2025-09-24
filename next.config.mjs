// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  // images: {
  //   // domains: ["res.cloudinary.com"],
  //   // or:
  //   remotePatterns: [
  //     { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
  //   ],
  // },
};
export default nextConfig;
