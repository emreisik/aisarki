import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ADMIN_DIR = dirname(fileURLToPath(import.meta.url));
// Turbopack root repo kökünde olmalı — shared kod (../src/lib/*) buradan erişilebilir.
const REPO_ROOT = resolve(ADMIN_DIR, "..");

const nextConfig: NextConfig = {
  turbopack: {
    root: REPO_ROOT,
  },
};

export default nextConfig;
