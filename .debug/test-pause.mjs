import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:4517";
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);

const cdp = await page.context().newCDPSession(page);
await cdp.send("Debugger.enable");

const scripts = new Map();
cdp.on("Debugger.scriptParsed", (p) => scripts.set(p.scriptId, p.url));

const pausedPromise = new Promise((resolve) => cdp.on("Debugger.paused", resolve));

// trigger the jam via raw CDP input — fire and forget; acks never come once
// the renderer jams, so awaiting them would deadlock this script
const fire = (method, params) => cdp.send(method, params).catch(() => {});
fire("Input.dispatchMouseEvent", { type: "mousePressed", x: 960, y: 376, button: "left", clickCount: 1 });
fire("Input.dispatchMouseEvent", { type: "mouseReleased", x: 960, y: 376, button: "left", clickCount: 1 });
for (const ch of "probe@example.com") {
  fire("Input.dispatchKeyEvent", { type: "keyDown", text: ch });
  fire("Input.dispatchKeyEvent", { type: "keyUp" });
}

// give it time to enter the loop, then interrupt
await new Promise((r) => setTimeout(r, 5000));
console.log("sending Debugger.pause...");
await cdp.send("Debugger.pause");
const paused = await Promise.race([
  pausedPromise,
  new Promise((r) => setTimeout(() => r(null), 10000)),
]);

if (!paused) {
  console.log("never paused — loop may be in a different context");
} else {
  console.log(`PAUSED. ${paused.callFrames.length} frames:`);
  for (const f of paused.callFrames.slice(0, 12)) {
    const url = (scripts.get(f.location.scriptId) || "?").split("/").pop();
    console.log(`  ${f.functionName || "(anon)"}  @ ${url}:${f.location.lineNumber}:${f.location.columnNumber}`);
  }
  // dump source around the top frame to identify the code
  const top = paused.callFrames[0];
  try {
    const { scriptSource } = await cdp.send("Debugger.getScriptSource", { scriptId: top.location.scriptId });
    const lines = scriptSource.split("\n");
    const line = lines[top.location.lineNumber] ?? "";
    const col = top.location.columnNumber;
    const snippet = line.slice(Math.max(0, col - 400), col + 400);
    writeFileSync("paused-snippet.txt", snippet);
    console.log("--- code around pause point (saved to paused-snippet.txt) ---");
    console.log(snippet.slice(0, 600));
  } catch (e) {
    console.log("could not get source:", e.message);
  }
}
await browser.close();
