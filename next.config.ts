import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't prerender pages that depend on runtime env vars (Supabase)
  experimental: {},
};

export default nextConfig;
