import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.100.5"],
  serverExternalPackages: ["libsql", "@libsql/client", "better-sqlite3"],
};

export default nextConfig;
