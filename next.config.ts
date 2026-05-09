import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @resvg/resvg-js gebruikt native .node binaries die Turbopack niet
  // kan bundelen — als 'external' markeren laat Node ze runtime-laden.
  serverExternalPackages: ["@resvg/resvg-js"],
  // Canva-OAuth eist 127.0.0.1 als redirect-host; whitelist 'm voor de
  // dev-server zodat HMR en cookies werken op die origin.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
