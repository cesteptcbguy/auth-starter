/* scripts/postinstall.js */
const { execSync } = require("node:child_process");

const isVercel = !!process.env.VERCEL;
const isCI = !!process.env.CI;
const isRailway = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY;

if (isVercel || isCI || isRailway) {
  console.log("Skipping Playwright install (platform CI detected).");
  process.exit(0);
}

try {
  execSync("pnpm exec playwright install chromium", { stdio: "inherit" });
} catch (e) {
  console.error("Playwright install failed:", e?.message || e);
  process.exit(1);
}
