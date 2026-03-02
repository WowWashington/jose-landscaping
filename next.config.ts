import type { NextConfig } from "next";
import { execSync } from "child_process";

let buildId = process.env.GITHUB_SHA?.slice(0, 7) ?? "";
if (!buildId) {
  try {
    buildId = execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    buildId = "dev";
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
};

export default nextConfig;
