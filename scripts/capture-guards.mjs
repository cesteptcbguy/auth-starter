// scripts/capture-guards.mjs
// Production-only capture of unauth + authed redirects with screenshots.
// Saves public/desktop.png plus docs/screenshots/* images.

// Load env for this node script
import * as dotenv from "dotenv";
dotenv.config(); // .env
dotenv.config({ path: ".env.local" }); // .env.local (if present)

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const ORIGIN = `http://${HOST}:${PORT}`;
const FALLBACK_COOKIE = "bb_redirect_to";
const TARGET_PATH = "/dashboard?foo=bar";

const OUTPUTS = {
  unauth: path.join("docs", "screenshots", "unauthed-redirect.png"),
  authedFromRoot: path.join("docs", "screenshots", "authed-root-redirect.png"),
  authedFromSignIn: path.join(
    "docs",
    "screenshots",
    "authed-sign-in-redirect.png"
  ),
  finalDashboard: path.join("public", "desktop.png"),
};

const EMAIL =
  process.env.E2E_USER_EMAIL ||
  process.env.SUPABASE_TEST_EMAIL ||
  "teacher@boldbuilder.app";
const PASSWORD =
  process.env.E2E_USER_PASSWORD || process.env.SUPABASE_PASSWORD || "";

// ---------- helpers ----------
const assert = (c, m) => {
  if (!c) throw new Error(m);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
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
  await page.evaluate(
    ({ label }) => {
      const existing = document.getElementById("screenshot-annotation");
      if (existing) existing.remove();
      const banner = document.createElement("div");
      banner.id = "screenshot-annotation";
      banner.textContent = `${label}\n${window.location.href}`;
      banner.style.position = "fixed";
      banner.style.top = "16px";
      banner.style.right = "16px";
      banner.style.padding = "10px 14px";
      banner.style.background = "rgba(17, 24, 39, 0.8)";
      banner.style.color = "#f9fafb";
      banner.style.fontFamily =
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
      banner.style.fontSize = "12px";
      banner.style.whiteSpace = "pre";
      banner.style.borderRadius = "8px";
      banner.style.zIndex = "99999";
      document.body.appendChild(banner);
    },
    { label }
  );
}

async function readFallbackTarget(page) {
  try {
    const res = await page.request.get("/api/redirect-fallback", {
      timeout: 5000,
    });
    const txt = (await res.text()).trim();
    return txt || null;
  } catch {
    return null;
  }
}

// Robust sign-in using multiple selectors
async function signIn(page, { email, password }) {
  await page.goto(`${ORIGIN}/sign-in`, { waitUntil: "networkidle" });

  const tryFill = async (selectors, value, regex) => {
    for (const sel of selectors) {
      const el = page.locator(sel);
      if (await el.count()) {
        await el.first().fill(value);
        return true;
      }
    }
    const byLabel = page.getByLabel(regex);
    if (await byLabel.count()) {
      await byLabel.first().fill(value);
      return true;
    }
    const byPlaceholder = page.getByPlaceholder(regex);
    if (await byPlaceholder.count()) {
      await byPlaceholder.first().fill(value);
      return true;
    }
    return false;
  };

  const emailOk = await tryFill(
    [
      'input[name="email"]',
      'input[type="email"]',
      'input[autocomplete="username"]',
      '[data-testid="email"]',
    ],
    email,
    /email|e-mail|username/i
  );
  assert(emailOk, "Could not locate email field");

  const pwOk = await tryFill(
    [
      'input[name="password"]',
      'input[type="password"]',
      'input[autocomplete="current-password"]',
      '[data-testid="password"]',
    ],
    password,
    /password/i
  );
  assert(pwOk, "Could not locate password field");

  const submit = page
    .getByRole("button", { name: /sign in|log in|continue|submit/i })
    .first();
  if (await submit.count()) {
    await Promise.all([page.waitForLoadState("networkidle"), submit.click()]);
  } else {
    const btn = page.locator('button[type="submit"]');
    assert(await btn.count(), "Could not find sign-in submit button");
    await Promise.all([
      page.waitForLoadState("networkidle"),
      btn.first().click(),
    ]);
  }
}

// ---------- capture phases ----------
async function captureUnauthed(context) {
  const page = await context.newPage();
  page.on("response", (res) => {
    if (res.status() === 307 || res.status() === 308) {
      const h = res.headers();
      console.log("[unauth] redirect", res.url(), "→", h["location"]);
    }
  });

  await page.goto(`${ORIGIN}${TARGET_PATH}`, { waitUntil: "networkidle" });
  await page.waitForLoadState("networkidle");
  await wait(300);

  const finalUrl = page.url();
  console.log("[unauth] landed on", finalUrl);

  if (!finalUrl.includes("redirectTo=")) {
    const cookies = await context.cookies();
    const fallback = cookies.find((c) => c.name === FALLBACK_COOKIE);
    assert(fallback?.value, `Missing ${FALLBACK_COOKIE} cookie`);
    let decoded = "";
    try {
      decoded = decodeURIComponent(fallback.value);
    } catch {
      throw new Error(`Failed to decode ${FALLBACK_COOKIE}: ${fallback.value}`);
    }
    assert(
      decoded === TARGET_PATH,
      `Cookie mismatch: expected ${TARGET_PATH}, got ${decoded}`
    );
    console.log("[unauth] using fallback cookie", decoded);
  }

  await annotate(page, "Unauthenticated redirect captured");
  fs.mkdirSync(path.dirname(OUTPUTS.unauth), { recursive: true });
  await page.screenshot({ path: OUTPUTS.unauth, fullPage: true });
  await page.close();
}

async function captureAuthed(context) {
  const page = await context.newPage();

  // Enter via protected URL so redirectTo/cookie is exercised
  await page.goto(`${ORIGIN}${TARGET_PATH}`, { waitUntil: "networkidle" });
  assert(
    page.url().includes("/sign-in"),
    "Expected to be on /sign-in for login"
  );

  await signIn(page, { email: EMAIL, password: PASSWORD });

  // Resolve expected target: prefer query param; else cookie fallback; else /dashboard
  const u = new URL(page.url());
  let expected = u.searchParams.get("redirectTo");
  if (!expected) expected = (await readFallbackTarget(page)) || "/dashboard";

  await page.waitForURL(
    (loc) => {
      try {
        const now = new URL(loc);
        return (
          now.pathname + now.search === expected ||
          now.pathname === "/dashboard"
        );
      } catch {
        return false;
      }
    },
    { timeout: 20000 }
  );

  await annotate(page, "Dashboard (authed)");
  fs.mkdirSync(path.dirname(OUTPUTS.finalDashboard), { recursive: true });
  await page.screenshot({ path: OUTPUTS.finalDashboard, fullPage: true });

  // Verify redirects from public entry points while authed
  await page.goto(`${ORIGIN}/`, { waitUntil: "networkidle" });
  await page.waitForURL("**/dashboard**", { timeout: 10000 });
  await annotate(page, "Authed redirect from / → /dashboard");
  fs.mkdirSync(path.dirname(OUTPUTS.authedFromRoot), { recursive: true });
  await page.screenshot({ path: OUTPUTS.authedFromRoot, fullPage: true });

  await page.goto(`${ORIGIN}/sign-in`, { waitUntil: "networkidle" });
  await page.waitForURL("**/dashboard**", { timeout: 10000 });
  await annotate(page, "Authed redirect from /sign-in → /dashboard");
  fs.mkdirSync(path.dirname(OUTPUTS.authedFromSignIn), { recursive: true });
  await page.screenshot({ path: OUTPUTS.authedFromSignIn, fullPage: true });

  await page.close();
}

// ---------- main ----------
async function main() {
  console.log(
    "[capture-guards] starting… HEADFUL=",
    process.env.HEADFUL,
    "PWDEBUG=",
    process.env.PWDEBUG
  );
  assert(
    PASSWORD,
    "E2E_USER_PASSWORD (or SUPABASE_PASSWORD) is required for authed screenshots."
  );

  // Build should be run beforehand, but starting server here
  const serverProc = spawn("pnpm", ["start", "-p", String(PORT)], {
    stdio: "inherit",
    env: { ...process.env, PORT: String(PORT), HOST },
  });

  const ready = await waitForServer(60000);
  assert(ready, "Production server failed to start on time");

  const headed = process.env.HEADFUL === "1" || !!process.env.PWDEBUG;
  const browser = await chromium.launch({
    headless: !headed,
    slowMo: headed ? 50 : 0,
  });

  try {
    const unauthContext = await browser.newContext();
    await captureUnauthed(unauthContext);
    await unauthContext.close();

    const authedContext = await browser.newContext();
    await captureAuthed(authedContext);
    await authedContext.close();
  } finally {
    await browser.close();
    await stopProcess(serverProc, { timeoutMs: 8000 });
  }
}

main().catch((err) => {
  console.error("[capture-guards] failed:", err);
  process.exit(1);
});
