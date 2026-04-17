import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // cone-editor is installed via file:../cone_editor. Let Next transpile it
  // so the symlinked package resolves cleanly in both dev and production.
  transpilePackages: ["cone-editor"],
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;
