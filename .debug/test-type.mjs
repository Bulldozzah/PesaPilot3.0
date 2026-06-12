import { chromium } from "playwright";

const BASE = "http://localhost:4517";
const browser = await chromium.launch();

for (let run = 1; run <= 3; run++) {
  const page = await browser.newPage();
  const msgs = [];
  page.on("console", (m) => msgs.push(`[${m.type()}] ${m.text().slice(0, 300)}`));
  page.on("pageerror", (e) => msgs.push(`[pageerror] ${e.message.slice(0, 300)}`));

  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  let result = "ok";
  try {
    await page.click("#email", { timeout: 5000 });
    await page.keyboard.type("probe@example.com", { delay: 50 });
    await page.waitForTimeout(1000);
    const state = await page.evaluate(() => ({
      emailValue: document.querySelector("#email")?.value ?? "GONE",
      hasPassword: !!document.querySelector("#password"),
      bodyStart: document.body.innerText.slice(0, 120).replace(/\n+/g, " | "),
    }));
    result = JSON.stringify(state);
  } catch (e) {
    result = "INTERACTION FAILED: " + e.message.split("\n")[0];
    try {
      const txt = await Promise.race([
        page.evaluate(() => document.body.innerText.slice(0, 200).replace(/\n+/g, " | ")),
        new Promise((r) => setTimeout(() => r("(evaluate timed out — thread busy)"), 3000)),
      ]);
      result += " || body: " + txt;
    } catch {}
  }
  console.log(`run ${run}: ${result}`);
  if (msgs.length) console.log(`run ${run} console:`, msgs.slice(-8).join(" ;; "));
  await page.close();
}
await browser.close();
