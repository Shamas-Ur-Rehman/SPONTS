import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "randomuser.me",
        port: "",
        pathname: "/api/portraits/**",
      },
      {
        protocol: "https",
        hostname: "shnylfwfncjpjleuyavv.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/mandats/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/expediteur",
        permanent: true,
      },
      {
        source: "/dashboard/:path*",
        destination: "/expediteur/:path*",
        permanent: true,
      },
      {
        source: "/expediteur",
        destination: "/expediteur/mandats",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
