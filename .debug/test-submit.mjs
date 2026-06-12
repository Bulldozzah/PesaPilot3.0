import { chromium } from "playwright";

const BASE = "http://localhost:4517";
const browser = await chromium.launch();
const page = await browser.newPage();
const msgs = [];
page.on("console", (m) => msgs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => msgs.push(`[pageerror] ${e.message}`));
page.on("requestfailed", (r) => msgs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));

await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
await page.fill("#email", "probe@example.com");
await page.fill("#password", "wrongpassword123");
await page.click('button[type="submit"]');

// wait for either an error toast or a stuck spinner
await page.waitForTimeout(6000);
const btnText = await page.locator('button[type="submit"]').innerText();
console.log("button text after 6s:", JSON.stringify(btnText));
const toast = await page.locator("[data-sonner-toast]").allInnerTexts();
console.log("toasts:", toast);
try {
  await page.evaluate(() => 1 + 1);
  console.log("main thread alive: true");
} catch {
  console.log("main thread alive: FALSE");
}
console.log("--- console ---");
for (const m of msgs.slice(-15)) console.log(m);
await browser.close();
