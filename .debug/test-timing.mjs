import { chromium } from "playwright";

const BASE = "http://localhost:4517";
const browser = await chromium.launch();
const page = await browser.newPage();
const msgs = [];
page.on("console", (m) => msgs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => msgs.push(`[pageerror] ${e.message}`));

await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
const t0 = Date.now();

for (let i = 0; i < 12; i++) {
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  let alive = false;
  try {
    await Promise.race([
      page.evaluate(() => 1 + 1).then(() => (alive = true)),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  } catch {}
  console.log(`t=${elapsed}s main-thread-alive=${alive}`);
  if (!alive) break;
  await new Promise((r) => setTimeout(r, 1500));
}

console.log("--- console messages ---");
for (const m of msgs.slice(-20)) console.log(m);
await browser.close();
