/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};
export default nextConfig;
