import { chromium } from "playwright";

const BASE = "http://localhost:4517";

const browser = await chromium.launch();
const page = await browser.newPage();

const consoleMsgs = [];
page.on("console", (m) => consoleMsgs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => consoleMsgs.push(`[pageerror] ${e.message}`));

// helper: check whether the main thread responds within `ms`
async function mainThreadAlive(ms = 3000) {
  try {
    await page.evaluate(() => 1 + 1, { timeout: ms });
    return true;
  } catch {
    return false;
  }
}

console.log("=== 1. Load home page ===");
await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForTimeout(2000);
console.log("home title:", await page.title());
console.log("main thread alive on home:", await mainThreadAlive());

console.log("=== 2. Navigate to /login directly ===");
try {
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 20000 });
} catch (e) {
  console.log("goto /login threw:", e.message.split("\n")[0]);
}
await page.waitForTimeout(3000);
console.log("main thread alive on /login:", await mainThreadAlive());
try {
  const hasForm = await page.locator("#email").count({ timeout: 2000 });
  console.log("login form rendered:", hasForm > 0);
} catch {
  console.log("login form rendered: COULD NOT CHECK (page hung)");
}

console.log("=== 3. Click Log in from home (client-side nav) ===");
const page2 = await browser.newPage();
page2.on("console", (m) => consoleMsgs.push(`[p2:${m.type()}] ${m.text()}`));
page2.on("pageerror", (e) => consoleMsgs.push(`[p2:pageerror] ${e.message}`));
await page2.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 20000 });
await page2.waitForTimeout(1500);
try {
  await page2.getByRole("link", { name: "Log in" }).first().click({ timeout: 5000 });
  await page2.waitForTimeout(3000);
  console.log("url after click:", page2.url());
  try {
    await page2.evaluate(() => 1 + 1);
    console.log("main thread alive after client-side nav to login: true");
  } catch {
    console.log("main thread alive after client-side nav to login: FALSE (FROZEN)");
  }
} catch (e) {
  console.log("click failed:", e.message.split("\n")[0]);
}

console.log("\n=== console output (last 30) ===");
for (const m of consoleMsgs.slice(-30)) console.log(m);

await browser.close();
