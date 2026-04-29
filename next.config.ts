import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @resvg/resvg-js gebruikt native .node binaries die Turbopack niet
  // kan bundelen — als 'external' markeren laat Node ze runtime-laden.
  serverExternalPackages: ["@resvg/resvg-js"],
};

export default nextConfig;
