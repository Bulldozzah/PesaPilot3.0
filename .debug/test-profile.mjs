import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:4517";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 200)));

await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);

const cdp = await page.context().newCDPSession(page);
await cdp.send("Profiler.enable");
await cdp.send("Profiler.start");

// trigger the jam: focus + type via CDP raw input (does not wait on main thread)
await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: 960, y: 376, button: "left", clickCount: 1 });
await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 960, y: 376, button: "left", clickCount: 1 });
for (const ch of "probe@example.com") {
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", text: ch });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp" });
}

// let it spin for 8 seconds
await new Promise((r) => setTimeout(r, 8000));

const { profile } = await cdp.send("Profiler.stop");
writeFileSync("profile.cpuprofile", JSON.stringify(profile));

// aggregate self time per function
const totals = new Map();
const hitMap = new Map();
for (const node of profile.nodes) hitMap.set(node.id, node);
const interval = profile.timeDeltas ? null : 1000;
const selfTime = new Map();
if (profile.samples && profile.timeDeltas) {
  for (let i = 0; i < profile.samples.length; i++) {
    const id = profile.samples[i];
    selfTime.set(id, (selfTime.get(id) ?? 0) + profile.timeDeltas[i]);
  }
}
const rows = [...selfTime.entries()]
  .map(([id, t]) => {
    const n = hitMap.get(id);
    const f = n.callFrame;
    return { t: Math.round(t / 1000), fn: f.functionName || "(anon)", url: f.url.split("/").pop() + ":" + f.lineNumber };
  })
  .sort((a, b) => b.t - a.t)
  .slice(0, 15);
console.log("Top self-time (ms over 8s):");
for (const r of rows) console.log(`${String(r.t).padStart(6)}ms  ${r.fn}  ${r.url}`);

await browser.close();
