import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp', 'ffmpeg-static', 'fluent-ffmpeg', 'firebase-admin'],
};

export default nextConfig;
