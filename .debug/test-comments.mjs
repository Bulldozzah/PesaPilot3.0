import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:4517/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

const comments = await page.evaluate(() => {
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_COMMENT);
  const out = [];
  while (walker.nextNode()) {
    const n = walker.currentNode;
    out.push({
      data: n.data,
      parent: n.parentNode?.nodeName,
      prevSib: n.previousSibling?.nodeName ?? null,
      nextSib: n.nextSibling?.nodeName ?? null,
    });
  }
  return out;
});
console.log(JSON.stringify(comments, null, 1));
await browser.close();
