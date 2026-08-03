import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autorise le HMR quand on ouvre le site via 127.0.0.1 (Edge/Chrome)
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.100.5"],
};

export default nextConfig;
