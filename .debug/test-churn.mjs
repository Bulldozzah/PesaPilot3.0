import { chromium } from "playwright";

const BASE = "http://localhost:4517";
const browser = await chromium.launch();
const page = await browser.newPage();
const msgs = [];
page.on("console", (m) => msgs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => msgs.push(`[pageerror] ${e.message}`));

await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

const probe = await page.evaluate(async () => {
  const el = document.querySelector("#email");
  if (!el) return { found: false };
  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);

  // count DOM mutations under body for 4 seconds
  let mutations = 0;
  const obs = new MutationObserver((list) => (mutations += list.length));
  obs.observe(document.body, { childList: true, subtree: true, attributes: true });

  // count animation frames in the same window (low count => busy main thread)
  let frames = 0;
  const t0 = performance.now();
  function tick() {
    frames++;
    if (performance.now() - t0 < 4000) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  await new Promise((r) => setTimeout(r, 4100));
  obs.disconnect();

  const el2 = document.querySelector("#email");
  return {
    found: true,
    disabled: el.disabled,
    readOnly: el.readOnly,
    rect: { w: rect.width, h: rect.height, x: rect.x, y: rect.y },
    visibility: cs.visibility,
    display: cs.display,
    pointerEvents: cs.pointerEvents,
    sameNodeAfter4s: el === el2,
    mutationsIn4s: mutations,
    framesIn4s: frames,
  };
});
console.log(JSON.stringify(probe, null, 2));
console.log("--- console ---");
for (const m of msgs.slice(-10)) console.log(m);
await browser.close();
