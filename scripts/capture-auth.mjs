// scripts/capture-auth.mjs
// Builds (if needed), starts the production server, captures auth flows, then exits.

import * as dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local" });

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";

import { chromium } from "playwright";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const ORIGIN = `http://${HOST}:${PORT}`;
const VIEWPORT = { width: 1440, height: 900 };
const BUILD_ID_PATH = path.join(".next", "BUILD_ID");
const OUTPUT_DIR = path.join("docs", "screenshots");

const OUTPUTS = {
  signUpForm: path.join(OUTPUT_DIR, "auth-sign-up-form.png"),
  signUpSuccess: path.join(OUTPUT_DIR, "auth-sign-up-success.png"),
  verifyVerified: path.join(OUTPUT_DIR, "auth-verify-verified.png"),
  verifyAlready: path.join(OUTPUT_DIR, "auth-verify-already.png"),
  verifyError: path.join(OUTPUT_DIR, "auth-verify-error.png"),
  resetForm: path.join(OUTPUT_DIR, "auth-reset-form.png"),
  resetSuccess: path.join(OUTPUT_DIR, "auth-reset-success.png"),
  updateForm: path.join(OUTPUT_DIR, "auth-update-password.png"),
  desktop: path.join("public", "desktop.png"),
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function runCommand(cmd, args, { cwd = process.cwd(), env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", cwd, env });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

async function ensureBuild() {
  const forceBuild =
    process.env.SCREENSHOT_FORCE_BUILD === "1" ||
    process.env.NEXT_PUBLIC_SCREENSHOT_MODE === "1";

  if (fs.existsSync(BUILD_ID_PATH) && !forceBuild) {
    return;
  }
  console.log("[capture-auth] Running pnpm build...");
  await runCommand("pnpm", ["build"], {
    env: {
      ...process.env,
      NEXT_DISABLE_FONT_DOWNLOADS: process.env.NEXT_DISABLE_FONT_DOWNLOADS || "1",
    },
  });
}

async function isServerUp() {
  return new Promise((resolve) => {
    const req = http.get(`${ORIGIN}/`, { timeout: 1000 }, (res) => {
      res.resume();
      resolve(Boolean(res.statusCode));
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerUp()) return true;
    await wait(300);
  }
  return false;
}

function stopProcess(proc, { timeoutMs = 10000 } = {}) {
  if (!proc) return Promise.resolve();
  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    const timer = setTimeout(() => {
      try {
        process.kill(proc.pid, "SIGKILL");
      } catch {}
      finish();
    }, timeoutMs);

    proc.once("exit", () => {
      clearTimeout(timer);
      finish();
    });

    try {
      proc.kill("SIGINT");
    } catch {
      clearTimeout(timer);
      finish();
    }
  });
}

async function annotate(page, label) {
  await page.evaluate(({ label }) => {
    const existing = document.getElementById("screenshot-annotation");
    if (existing) existing.remove();
    const banner = document.createElement("div");
    banner.id = "screenshot-annotation";
    banner.textContent = `${label}\n${window.location.href}`;
    banner.style.position = "fixed";
    banner.style.top = "16px";
    banner.style.right = "16px";
    banner.style.padding = "10px 14px";
    banner.style.background = "rgba(17, 24, 39, 0.85)";
    banner.style.color = "#f9fafb";
    banner.style.fontFamily =
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    banner.style.fontSize = "12px";
    banner.style.whiteSpace = "pre";
    banner.style.borderRadius = "8px";
    banner.style.zIndex = "99999";
    document.body.appendChild(banner);
  }, { label });
}

async function capture(page, filePath, label) {
  ensureDir(filePath);
  if (label) {
    await annotate(page, label);
  }
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`[capture-auth] Saved ${filePath}`);
}

async function captureAuthFlows(browser) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  // Sign-up form (filled)
  await page.goto(`${ORIGIN}/sign-up?redirectTo=%2Fdashboard`, {
    waitUntil: "networkidle",
  });
  await page.getByLabel("Email").fill("teacher@example.com");
  await page.getByLabel("Password", { exact: true }).fill("ExamplePass1!");
  await page.getByLabel("Confirm password").fill("ExamplePass1!");
  await capture(page, OUTPUTS.signUpForm, "Sign up – filled form");

  await Promise.all([
    page.waitForSelector('[role="alert"]'),
    page.getByRole("button", { name: /create account/i }).click(),
  ]);
  await wait(200);
  await capture(page, OUTPUTS.signUpSuccess, "Sign up – success state");
  await capture(page, OUTPUTS.desktop, "Main screenshot");

  // Verify states via mock parameter
  const verifyStates = [
    { value: "verified", label: "Verify – verified" },
    { value: "already", label: "Verify – already" },
    { value: "error", label: "Verify – error" },
  ];

  for (const state of verifyStates) {
    await page.goto(
      `${ORIGIN}/verify?mock=${state.value}&redirectTo=%2Fdashboard`,
      { waitUntil: "networkidle" }
    );
    const filePath =
      state.value === "verified"
        ? OUTPUTS.verifyVerified
        : state.value === "already"
          ? OUTPUTS.verifyAlready
          : OUTPUTS.verifyError;
    await capture(page, filePath, state.label);
  }

  // Reset password
  await page.goto(`${ORIGIN}/reset-password?redirectTo=%2Fdashboard`, {
    waitUntil: "networkidle",
  });
  await page.getByLabel("Email").fill("teacher@example.com");
  await capture(page, OUTPUTS.resetForm, "Reset password – filled form");

  await Promise.all([
    page.waitForSelector('[role="alert"]'),
    page.getByRole("button", { name: /send reset link/i }).click(),
  ]);
  await wait(200);
  await capture(page, OUTPUTS.resetSuccess, "Reset password – success");

  // Update password form
  await page.goto(`${ORIGIN}/update-password?redirectTo=%2Fdashboard`, {
    waitUntil: "networkidle",
  });
  await page.getByLabel("New password").fill("ExamplePass1!");
  await page.getByLabel("Confirm password").fill("ExamplePass1!");
  await capture(page, OUTPUTS.updateForm, "Update password – form view");

  await context.close();
}

async function main() {
  await ensureBuild();

  let serverProcess = null;
  let startedServer = false;

  if (!(await isServerUp())) {
    console.log("[capture-auth] Starting production server...");
    serverProcess = spawn("pnpm", ["start", "-p", String(PORT)], {
      stdio: "inherit",
      env: {
        ...process.env,
        PORT: String(PORT),
        SCREENSHOT_MODE: "1",
        NEXT_PUBLIC_SCREENSHOT_MODE: "1",
      },
    });
    startedServer = true;

    const ready = await waitForServer(60000);
    if (!ready) {
      await stopProcess(serverProcess, { timeoutMs: 3000 });
      throw new Error("Server did not become ready on time.");
    }
  }

  const browser = await chromium.launch();
  try {
    await captureAuthFlows(browser);
  } finally {
    await browser.close();
    if (startedServer) {
      await stopProcess(serverProcess, { timeoutMs: 8000 });
    }
  }
}

main().catch((error) => {
  console.error("[capture-auth] Failed", error);
  process.exit(1);
});
