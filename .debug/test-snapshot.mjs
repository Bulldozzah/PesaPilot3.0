import { chromium } from "playwright";

const BASE = "http://localhost:4517";
const browser = await chromium.launch();
const page = await browser.newPage();
const msgs = [];
page.on("console", (m) => msgs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => msgs.push(`[pageerror] ${e.message}`));
page.on("framenavigated", (f) => {
  if (f === page.mainFrame()) msgs.push(`[nav] ${f.url()}`);
});

await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });

for (const t of [2, 6, 12, 20]) {
  await page.waitForTimeout(t === 2 ? 2000 : (t - [2, 6, 12, 20][[2, 6, 12, 20].indexOf(t) - 1]) * 1000);
  const snap = await page.evaluate(() => ({
    url: location.pathname,
    hasEmail: !!document.querySelector("#email"),
    hasPassword: !!document.querySelector("#password"),
    bodyText: document.body.innerText.slice(0, 200).replace(/\n+/g, " | "),
  }));
  console.log(`t=${t}s`, JSON.stringify(snap));
}

await page.screenshot({ path: "login-after-20s.png", fullPage: false });
console.log("--- console/nav messages ---");
for (const m of msgs.slice(-20)) console.log(m);
await browser.close();
